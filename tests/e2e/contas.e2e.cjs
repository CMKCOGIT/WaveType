// Fluxo completo das contas de aluno criadas pelo professor, com o Supabase
// simulado (o banco de verdade é testado em supabase/testes/*.test.sql).
// Requer Playwright e o servidor de desenvolvimento no projeto falso:
//   VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon-teste npx vite --port 5173
//   node tests/e2e/contas.e2e.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const PROFESSOR = { id: 'p1', nome: 'Ana Professora', email: 'ana@escola.com', tipo: 'professor', tipo_definido: true, ativo: true };

function sessao(usuario) {
  const agora = Math.floor(Date.now() / 1000);
  return {
    access_token: `token-${usuario.id}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: agora + 3600,
    user: { id: usuario.id, email: usuario.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
  };
}

// "Banco" em memória compartilhado entre o professor e o aluno.
function criarBanco() {
  const contas = new Map(); // login → { id, nome, senha, email }
  const usuarios = new Map([[PROFESSOR.id, PROFESSOR]]);
  const senhas = new Map([[PROFESSOR.email, 'Senha1234']]);
  return { contas, usuarios, senhas };
}

async function simular(contexto, banco) {
  await contexto.route('https://mock.supabase.co/**', async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const corpo = req.method() === 'POST' ? req.postDataJSON() : null;
    const token = (req.headers().authorization || '').replace('Bearer ', '');
    const eu = [...banco.usuarios.values()].find((u) => token === `token-${u.id}`);
    switch (url.pathname) {
      case '/auth/v1/user':
        return eu ? rota.fulfill({ json: { id: eu.id, email: eu.email } }) : rota.fulfill({ status: 401, json: { msg: 'invalid' } });
      case '/auth/v1/token': {
        const usuario = [...banco.usuarios.values()].find((u) => u.email === corpo?.email);
        if (!usuario || banco.senhas.get(usuario.email) !== corpo.password) {
          return rota.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } });
        }
        return rota.fulfill({ json: sessao(usuario) });
      }
      case '/auth/v1/logout':
        return rota.fulfill({ status: 204, body: '' });
      case '/rest/v1/usuarios': {
        const id = (url.searchParams.get('id') || '').replace('eq.', '');
        const u = banco.usuarios.get(id) || eu;
        return rota.fulfill({ json: u ? [u] : [] });
      }
      case '/rest/v1/rpc/resumo_turmas_professor':
        return rota.fulfill({ json: [{ id: 3, nome: '5º Ano A', status: 'ativa', codigo_convite: 'ABC123', alunos: banco.contas.size, atividades: 0 }] });
      case '/rest/v1/rpc/alunos_da_turma':
        return rota.fulfill({ json: [...banco.contas.values()].map((c) => ({ aluno_id: c.id, nome: c.nome, email: c.email, sessoes: 0, atividades_concluidas: 0 })) });
      case '/rest/v1/contas_escolares':
        return rota.fulfill({ json: [...banco.contas.entries()].map(([login, c]) => ({ usuario_id: c.id, login })) });
      case '/rest/v1/rpc/professor_criar_alunos': {
        if (eu?.tipo !== 'professor') return rota.fulfill({ status: 403, json: { code: '42501', message: 'Só professores podem criar contas de aluno.' } });
        const criados = corpo.p_alunos.map((a, i) => {
          let login = a.login_base;
          for (let n = 2; banco.contas.has(login); n += 1) login = `${a.login_base}${n}`;
          const id = `a${banco.contas.size + 1 + i}`;
          const email = `${id}@aluno.wavetype.com.br`;
          banco.contas.set(login, { id, nome: a.nome, email });
          banco.usuarios.set(id, { id, nome: a.nome, email, tipo: 'aluno', tipo_definido: true, ativo: true });
          banco.senhas.set(email, a.senha); // no Supabase real: só o hash bcrypt
          return { novo_id: id, novo_nome: a.nome, novo_login: login };
        });
        return rota.fulfill({ json: criados });
      }
      case '/rest/v1/rpc/login_escolar': {
        const c = banco.contas.get(corpo.p_login);
        return rota.fulfill({ json: c && banco.senhas.get(c.email) === corpo.p_senha ? c.email : null });
      }
      default:
        return rota.fulfill({ json: [] });
    }
  });
}

const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);
let credenciais = null;
const banco = criarBanco();

caso('cadastro público não oferece mais conta de aluno', async (nav) => {
  const ctx = await nav.newContext();
  await simular(ctx, banco);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/cadastro.html`);
  assert.equal(await p.locator('input[name="tipo"][value="aluno"]').count(), 0);
  assert.equal(await p.locator('[data-auth-form="cadastro"] .role-option').count(), 2);
  assert.ok(await p.isVisible('.auth-aviso-aluno a[href="login.html?modo=escola"]'));
  await ctx.close();
});

caso('professor entra com e-mail e senha e vai para o painel do professor', async (nav) => {
  const ctx = await nav.newContext();
  await simular(ctx, banco);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login.html?modo=email`);
  await p.fill('[data-auth-form="login"] [name="email"]', PROFESSOR.email);
  await p.fill('[data-auth-form="login"] [name="senha"]', 'Senha1234');
  await p.click('[data-auth-form="login"] .auth-submit');
  await p.waitForURL(/\/app\/professor\/index\.html/);
  await ctx.close();
});

caso('professor cadastra aluno no perfil e recebe usuário e senha', async (nav) => {
  const ctx = await nav.newContext();
  await simular(ctx, banco);
  await ctx.addInitScript((s) => localStorage.setItem('sb-mock-auth-token', s), JSON.stringify(sessao(PROFESSOR)));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/app/professor/perfil.html`);
  await p.waitForSelector('[data-form-cadastrar-aluno] select option[value="3"]', { state: 'attached' });
  await p.fill('[data-form-cadastrar-aluno] [name="nome"]', 'Lucas Ferreira Lima');
  assert.match(await p.textContent('[data-previa-cadastro]'), /lucas\.ferreira\.lima/);
  await p.click('[data-botao-cadastrar]');
  await p.waitForSelector('[data-credenciais-geradas]:not([hidden]) .cartao-acesso');
  const [login, senha] = await p.$$eval('[data-cartoes-perfil] dd', (dds) => dds.map((d) => d.textContent.trim()));
  assert.equal(login, 'lucas.ferreira.lima');
  assert.match(senha, /^[a-z]+[2-9]{3}$/);
  await p.waitForFunction(() => document.querySelector('[data-meus-alunos]')?.textContent.includes('lucas.ferreira.lima'));
  credenciais = { login, senha };
  await ctx.close();
});

caso('aluno entra com as credenciais geradas e vai para a área do aluno', async (nav) => {
  assert.ok(credenciais, 'depende do caso anterior');
  const ctx = await nav.newContext();
  await simular(ctx, banco);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login.html?modo=escola`);
  await p.fill('[data-auth-form="escola"] [name="login"]', credenciais.login);
  await p.fill('[data-auth-form="escola"] [name="senha"]', credenciais.senha);
  await p.click('[data-auth-form="escola"] .auth-submit');
  await p.waitForURL(/\/app\/aluno\/index\.html/);
  await ctx.close();
});

caso('aluno não acessa o painel do professor', async (nav) => {
  const aluno = banco.usuarios.get(banco.contas.get(credenciais.login).id);
  const ctx = await nav.newContext();
  await simular(ctx, banco);
  await ctx.addInitScript((s) => localStorage.setItem('sb-mock-auth-token', s), JSON.stringify(sessao(aluno)));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/app/professor/perfil.html`);
  await p.waitForURL(/\/app\/aluno\/index\.html/);
  await ctx.close();
});

caso('botão de tema: onda cobre a tela e troca o tema nos dois sentidos', async (nav) => {
  const ctx = await nav.newContext();
  await simular(ctx, banco);
  await ctx.addInitScript(() => localStorage.setItem('wavetype_theme', 'light'));
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login.html`);
  await p.click('.wt-tema');
  await p.waitForSelector('.wt-tema-cortina.descendo', { state: 'attached' });
  await p.waitForSelector('.wt-tema-cortina', { state: 'detached' });
  assert.equal(await p.getAttribute('html', 'data-theme'), 'dark');
  await p.click('.wt-tema');
  await p.waitForSelector('.wt-tema-cortina.subindo', { state: 'attached' });
  await p.waitForSelector('.wt-tema-cortina', { state: 'detached' });
  assert.equal(await p.getAttribute('html', 'data-theme'), 'light');
  await ctx.close();
});

(async () => {
  const nav = await chromium.launch();
  let falhas = 0;
  for (const [nome, fn] of casos) {
    try {
      await fn(nav);
      console.log(`ok - ${nome}`);
    } catch (erro) {
      falhas += 1;
      console.log(`not ok - ${nome}\n  ${erro.message.split('\n')[0]}`);
    }
  }
  await nav.close();
  console.log(`# ${casos.length - falhas}/${casos.length}`);
  process.exit(falhas ? 1 : 0);
})();
