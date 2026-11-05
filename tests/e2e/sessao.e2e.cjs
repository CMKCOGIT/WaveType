// Teste de ponta a ponta da sessão (1.7) com o Supabase simulado.
// Requer Playwright instalado e o servidor de desenvolvimento apontando para
// o projeto falso:
//   VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon-teste npx vite --port 5173
//   node tests/e2e/sessao.e2e.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const CHAVE_TOKEN = 'sb-mock-auth-token';
const ALUNO = { id: 'a1', nome: 'Maria Silva', email: 'maria@exemplo.com', tipo: 'aluno', tipo_definido: true, ativo: true };

function token(usuario) {
  const agora = Math.floor(Date.now() / 1000);
  return JSON.stringify({
    access_token: 'token-falso', refresh_token: 'refresh-falso', token_type: 'bearer',
    expires_in: 3600, expires_at: agora + 3600,
    user: { id: usuario.id, email: usuario.email, aud: 'authenticated', role: 'authenticated', app_metadata: { providers: ['email'] }, user_metadata: {} },
  });
}

async function simularSupabase(contexto, { usuario = ALUNO, valida = true, atraso = 0 } = {}) {
  await contexto.route('https://mock.supabase.co/**', async (rota) => {
    const url = new URL(rota.request().url());
    if (atraso) await new Promise((r) => setTimeout(r, atraso));
    if (url.pathname === '/auth/v1/user') {
      return valida
        ? rota.fulfill({ json: { id: usuario.id, email: usuario.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } })
        : rota.fulfill({ status: 403, json: { code: 403, error_code: 'session_not_found', msg: 'Session from session_id claim in JWT does not exist' } });
    }
    if (url.pathname === '/auth/v1/logout') return rota.fulfill({ status: 204, body: '' });
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const corpo = rota.request().postDataJSON();
      if (corpo.password !== 'tucano472') return rota.fulfill({ status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } });
      const sessao = JSON.parse(token(usuario));
      return rota.fulfill({ json: sessao });
    }
    if (url.pathname === '/rest/v1/rpc/login_escolar') {
      const corpo = rota.request().postDataJSON();
      return rota.fulfill({ json: corpo.p_login === 'maria.silva.santos' && corpo.p_senha === 'tucano472' ? usuario.email : null });
    }
    if (url.pathname === '/auth/v1/token') return rota.fulfill({ status: 400, json: { error: 'invalid_grant' } });
    if (url.pathname === '/rest/v1/usuarios') return rota.fulfill({ json: [usuario] });
    if (url.pathname.startsWith('/rest/v1/rpc/')) return rota.fulfill({ json: [] });
    return rota.fulfill({ json: [] });
  });
}

async function novoContexto(navegador, { logado = true, ...opcoes } = {}) {
  const contexto = await navegador.newContext();
  await simularSupabase(contexto, opcoes);
  if (logado) {
    await contexto.addInitScript(([chave, valor]) => {
      if (!sessionStorage.getItem('e2e_iniciado')) {
        sessionStorage.setItem('e2e_iniciado', '1');
        if (!localStorage.getItem('e2e_token_posto')) {
          localStorage.setItem(chave, valor);
          localStorage.setItem('e2e_token_posto', '1');
        }
      }
    }, [CHAVE_TOKEN, token(opcoes.usuario || ALUNO)]);
  }
  return contexto;
}

const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('visitante vê Entrar e Criar conta', async (nav) => {
  const ctx = await novoContexto(nav, { logado: false });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/index.html`);
  assert.equal(await p.getAttribute('html', 'data-sessao'), 'visitante');
  assert.ok(await p.isVisible('.header-auth-link'));
  assert.ok(await p.isHidden('[data-header-conta]'));
  await ctx.close();
});

caso('logado: sem "piscar" Entrar e com menu da conta', async (nav) => {
  const ctx = await novoContexto(nav, { atraso: 600 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  assert.equal(await p.getAttribute('html', 'data-sessao'), 'carregando');
  assert.ok(await p.isHidden('.header-auth-link'), 'Entrar não pode aparecer enquanto carrega');
  await p.waitForSelector('html[data-sessao="conectado"]');
  assert.ok(await p.isHidden('.header-auth-link'));
  assert.ok(await p.isHidden('.header-cta'));
  assert.match(await p.textContent('.conta-nome'), /Maria/);
  assert.match(await p.textContent('[data-sessao-aviso]'), /Não é você\?/);
  await ctx.close();
});

for (const pagina of ['login.html', 'cadastro.html']) {
  caso(`logado acessando /${pagina} vai para a área do aluno`, async (nav) => {
    const ctx = await novoContexto(nav);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/${pagina}`);
    await p.waitForURL(/\/app\/aluno\/index\.html/);
    await ctx.close();
  });
}

caso('acesso cruzado: aluno no painel do professor vai para a área do aluno', async (nav) => {
  const ctx = await novoContexto(nav);
  const p = await ctx.newPage();
  await p.goto(`${BASE}/app/professor/index.html`);
  await p.waitForURL(/\/app\/aluno\/index\.html/);
  await ctx.close();
});

caso('sessão expirada: login com mensagem, token limpo e sem loop', async (nav) => {
  const ctx = await novoContexto(nav, { valida: false });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/app/aluno/resultados.html`);
  await p.waitForURL(/\/login\.html\?motivo=expirada/);
  await p.waitForSelector('[data-form-feedback]:not([hidden])');
  assert.match(await p.textContent('[data-form-feedback]'), /Sua sessão expirou/);
  await p.waitForTimeout(800);
  assert.match(p.url(), /\/login\.html/, 'continua no login');
  assert.equal(await p.evaluate((c) => localStorage.getItem(c), CHAVE_TOKEN), null);
  await ctx.close();
});

caso('logout numa aba derruba a outra', async (nav) => {
  const ctx = await novoContexto(nav);
  const area = await ctx.newPage();
  await area.goto(`${BASE}/app/aluno/index.html`);
  await area.waitForSelector('[data-sair]');
  const inicio = await ctx.newPage();
  await inicio.goto(`${BASE}/index.html`);
  await inicio.waitForSelector('html[data-sessao="conectado"]');
  await inicio.click('.conta-botao');
  await inicio.click('.conta-menu [data-sair]');
  await inicio.waitForURL(/\/index\.html$/);
  await area.waitForURL(/\/login\.html\?motivo=outra_aba/);
  assert.equal(await inicio.evaluate((c) => localStorage.getItem(c), CHAVE_TOKEN), null);
  await ctx.close();
});

caso('aluno entra com usuário da escola e vai para a área do aluno', async (nav) => {
  const ctx = await novoContexto(nav, { logado: false });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login.html?modo=escola`);
  assert.ok(await p.isVisible('[data-auth-form="escola"]'));
  await p.fill('[data-auth-form="escola"] [name="login"]', ' Maria.Silva.Santos ');
  await p.fill('[data-auth-form="escola"] [name="senha"]', 'errada99');
  await p.click('[data-auth-form="escola"] .auth-submit');
  await p.waitForSelector('[data-feedback-escola]:not([hidden])');
  assert.match(await p.textContent('[data-feedback-escola]'), /Usuário ou senha incorretos/);
  await p.fill('[data-auth-form="escola"] [name="senha"]', 'tucano472');
  await p.click('[data-auth-form="escola"] .auth-submit');
  await p.waitForURL(/\/app\/aluno\/index\.html/);
  await ctx.close();
});

caso('abas do login funcionam pelo teclado', async (nav) => {
  const ctx = await novoContexto(nav, { logado: false });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login.html?modo=email`);
  await p.focus('#modo-email');
  await p.keyboard.press('ArrowRight');
  assert.equal(await p.getAttribute('#modo-escola', 'aria-selected'), 'true');
  assert.ok(await p.isHidden('#painel-email'));
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
