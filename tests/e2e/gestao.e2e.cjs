// Gestão de alunos (professor), turmas e ranking (aluno) e textos do treino,
// com o Supabase simulado (as regras do banco são testadas em
// supabase/testes/gestao_alunos_e_ranking.test.sql).
// Requer Playwright e o servidor de desenvolvimento no projeto falso:
//   VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon-teste npx vite --port 5173
//   node tests/e2e/gestao.e2e.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const XLSX = require('xlsx');

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const PROFESSOR = { id: 'p1', nome: 'Ana Professora', email: 'ana@escola.com', tipo: 'professor', tipo_definido: true, ativo: true };
const ALUNO = { id: 'a1', nome: 'Bruno Reis', email: 'a1@aluno.wavetype.com.br', tipo: 'aluno', tipo_definido: true, ativo: true, codigo_aluno: 'K7Q2MX' };
const OUTRA = { id: 'x9', nome: 'Carla Matos', email: 'carla@gmail.com', tipo: 'aluno', tipo_definido: true, ativo: true, codigo_aluno: 'P9R3ST' };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-gestao-'));

function sessao(usuario) {
  const agora = Math.floor(Date.now() / 1000);
  return {
    access_token: `token-${usuario.id}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: agora + 3600,
    user: { id: usuario.id, email: usuario.email, aud: 'authenticated', role: 'authenticated', app_metadata: { providers: ['email'] }, user_metadata: {} },
  };
}

function criarBanco() {
  return {
    usuarios: new Map([[PROFESSOR.id, PROFESSOR], [ALUNO.id, ALUNO], [OUTRA.id, OUTRA]]),
    turmas: [
      { id: 3, nome: 'Português 7A', ano_letivo: '2026', status: 'ativa', alunos: 1, atividades: 2, ppm_medio: 28.4, precisao_media: 93.1 },
      { id: 4, nome: 'Matemática 7A', ano_letivo: '2026', status: 'ativa', alunos: 0, atividades: 0, ppm_medio: null, precisao_media: null },
      { id: 5, nome: 'Reforço 2025', ano_letivo: '2025', status: 'encerrada', alunos: 0, atividades: 1 },
    ],
    matriculas: new Map([[3, new Set(['a1'])], [4, new Set()], [5, new Set()]]),
    logins: new Map([['a1', 'bruno.reis']]),
    chamadas: [],
  };
}

async function simular(contexto, banco) {
  await contexto.route('https://mock.supabase.co/**', async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const corpo = req.method() === 'POST' ? req.postDataJSON() : null;
    const token = (req.headers().authorization || '').replace('Bearer ', '');
    const eu = [...banco.usuarios.values()].find((u) => token === `token-${u.id}`);
    const rpc = url.pathname.replace('/rest/v1/rpc/', '');
    if (url.pathname.startsWith('/rest/v1/rpc/')) banco.chamadas.push({ rpc, corpo });
    const alunosDa = (turmaId) => [...(banco.matriculas.get(turmaId) ?? [])].map((id) => banco.usuarios.get(id));
    switch (url.pathname) {
      case '/auth/v1/user':
        return eu ? rota.fulfill({ json: { id: eu.id, email: eu.email, app_metadata: { providers: ['email'] } } }) : rota.fulfill({ status: 401, json: {} });
      case '/rest/v1/usuarios': {
        const id = (url.searchParams.get('id') || '').replace('eq.', '');
        const u = banco.usuarios.get(id) || eu;
        return rota.fulfill({ json: u ? [u] : [] });
      }
      case '/rest/v1/rpc/resumo_turmas_professor':
        return rota.fulfill({ json: banco.turmas.map((t) => ({ ...t, alunos: banco.matriculas.get(t.id)?.size ?? 0 })) });
      case '/rest/v1/rpc/alunos_da_turma':
        return rota.fulfill({
          json: alunosDa(corpo.p_turma_id).map((u, i) => ({
            aluno_id: u.id, nome: u.nome, email: u.email, codigo_aluno: u.codigo_aluno, entrou_em: '2026-03-01T12:00:00Z',
            sessoes: 4 + i, ppm_medio: 30.5, precisao_media: 95.2, atividades_concluidas: 1, ultima_pratica: '2026-11-01T12:00:00Z',
          })),
        });
      case '/rest/v1/contas_escolares':
        return rota.fulfill({ json: [...banco.logins.entries()].map(([usuario_id, login]) => ({ usuario_id, login })) });
      case '/rest/v1/rpc/buscar_aluno_por_codigo': {
        const u = [...banco.usuarios.values()].find((x) => x.tipo === 'aluno' && x.codigo_aluno === String(corpo.p_codigo).toUpperCase());
        if (!u) return rota.fulfill({ status: 404, json: { code: 'P0002', message: 'Nenhum aluno encontrado com este código.' } });
        const turmas = [...banco.matriculas.entries()].filter(([, s]) => s.has(u.id)).length;
        return rota.fulfill({ json: [{ aluno_id: u.id, nome: u.nome, codigo_aluno: u.codigo_aluno, turmas_ativas: turmas, ja_na_turma: banco.matriculas.get(corpo.p_turma_id).has(u.id), matricula_inativa: false }] });
      }
      case '/rest/v1/rpc/adicionar_aluno_existente': {
        const u = [...banco.usuarios.values()].find((x) => x.codigo_aluno === String(corpo.p_codigo).toUpperCase());
        const conjunto = banco.matriculas.get(corpo.p_turma_id);
        const ja = conjunto.has(u.id);
        conjunto.add(u.id);
        return rota.fulfill({ json: ja ? 'ja_estava' : 'adicionado' });
      }
      case '/rest/v1/rpc/professor_importar_alunos': {
        const nomesNaTurma = new Set(alunosDa(corpo.p_turma_id).map((u) => u.nome.toLowerCase()));
        const linhas = corpo.p_alunos.map((a, indice) => {
          if (nomesNaTurma.has(a.nome.toLowerCase())) return { indice, nome: a.nome, situacao: 'ja_na_turma', novo_id: null, novo_login: null };
          const id = `n${banco.usuarios.size + 1}`;
          banco.usuarios.set(id, { id, nome: a.nome, email: `${id}@aluno.wavetype.com.br`, tipo: 'aluno', tipo_definido: true, ativo: true, codigo_aluno: `Z${String(banco.usuarios.size).padStart(5, '2')}` });
          banco.matriculas.get(corpo.p_turma_id).add(id);
          banco.logins.set(id, a.login_base);
          return { indice, nome: a.nome, situacao: 'criado', novo_id: id, novo_login: a.login_base };
        });
        return rota.fulfill({ json: linhas });
      }
      case '/rest/v1/matriculas':
        return rota.fulfill({
          json: [...banco.matriculas.entries()].filter(([, s]) => s.has(eu?.id)).map(([id]) => ({
            turma_id: id, entrou_em: '2026-03-01T12:00:00Z', turmas: banco.turmas.find((t) => t.id === id),
          })),
        });
      case '/rest/v1/rpc/ranking_turma':
        return rota.fulfill({
          json: [
            { posicao: 1, animal: 'Guepardo', emoji: '🐆', pontuacao: 52.3, ppm: 55, precisao: 95.1, treinos: 12, voce: false, participantes: 8 },
            { posicao: 2, animal: 'Lebre', emoji: '🐇', pontuacao: 47.9, ppm: 50, precisao: 95.8, treinos: 9, voce: false, participantes: 8 },
            { posicao: 3, animal: 'Raposa', emoji: '🦊', pontuacao: 41.2, ppm: 43, precisao: 95.8, treinos: 7, voce: true, participantes: 8 },
            { posicao: 4, animal: 'Cavalo', emoji: '🐎', pontuacao: 35, ppm: 38, precisao: 92.1, treinos: 4, voce: false, participantes: 8 },
            { posicao: 5, animal: 'Gato', emoji: '🐈', pontuacao: 30.4, ppm: 33, precisao: 92.1, treinos: 3, voce: false, participantes: 8 },
          ],
        });
      case '/rest/v1/exercicios':
        return rota.fulfill({
          json: { id: 7, nivel_trilha: 1, ordem: 2, titulo: 'Teclas F e J 2', texto_referencia: 'fff jjj fjfj jfjf', instrucoes: null, prazo: null, meta_precisao: null, tempo_limite_seg: 95 },
        });
      default:
        return rota.fulfill({ json: [] });
    }
  });
}

async function paginaComo(nav, banco, usuario, caminho, viewport = { width: 1440, height: 900 }) {
  const ctx = await nav.newContext({ viewport, acceptDownloads: true });
  await simular(ctx, banco);
  await ctx.addInitScript((s) => localStorage.setItem('sb-mock-auth-token', s), JSON.stringify(sessao(usuario)));
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(`${BASE}${caminho}`);
  return { ctx, p, erros };
}

const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('professor vê as turmas em cartões, com a turma ativa destacada, e troca de turma', async (nav) => {
  const banco = criarBanco();
  const { ctx, p, erros } = await paginaComo(nav, banco, PROFESSOR, '/app/professor/alunos.html');
  await p.waitForSelector('.turma-opcao[aria-checked="true"]');
  assert.equal(await p.locator('.turma-opcao').count(), 2, 'encerrada escondida por padrão');
  assert.match(await p.textContent('.turma-opcao[aria-checked="true"]'), /Português 7A/);
  assert.match(await p.textContent('[data-turma-nome]'), /Português 7A/);
  await p.waitForFunction(() => document.querySelector('[data-tabela-alunos]').textContent.includes('Bruno Reis'));
  assert.match(await p.textContent('[data-tabela-alunos]'), /K7Q2MX/, 'código do aluno visível na lista');
  await p.click('.turma-opcao[data-turma="4"]');
  await p.waitForSelector('.turma-opcao[data-turma="4"][aria-checked="true"]');
  assert.match(await p.textContent('[data-turma-nome]'), /Matemática 7A/);
  await p.waitForFunction(() => document.querySelector('[data-tabela-alunos]').textContent.includes('Nenhum aluno nesta turma'));
  assert.match(p.url(), /turma=4/);
  // Teclado: seta volta para a outra turma
  await p.focus('.turma-opcao[data-turma="4"]');
  await p.keyboard.press('ArrowLeft');
  await p.waitForSelector('.turma-opcao[data-turma="3"][aria-checked="true"]');
  // Encerradas aparecem pelo filtro
  await p.check('[data-mostrar-encerradas]');
  assert.equal(await p.locator('.turma-opcao').count(), 3);
  assert.deepEqual(erros, []);
  await ctx.close();
});

caso('adicionar aluno existente pelo código: confirma antes e não cria conta nova', async (nav) => {
  const banco = criarBanco();
  const { ctx, p } = await paginaComo(nav, banco, PROFESSOR, '/app/professor/alunos.html?turma=4');
  await p.waitForSelector('.turma-opcao[data-turma="4"][aria-checked="true"]');
  await p.fill('[data-form-adicionar] [name="aluno_id"]', 'abc');
  await p.click('[data-form-adicionar] button[type="submit"]');
  assert.match(await p.textContent('[data-feedback-adicionar]'), /Código inválido/);
  await p.fill('[data-form-adicionar] [name="aluno_id"]', 'k7q2mx');
  await p.click('[data-form-adicionar] button[type="submit"]');
  await p.waitForSelector('[data-confirmar-aluno]:not([hidden])');
  assert.equal(await p.textContent('[data-confirmar-nome]'), 'Bruno Reis');
  assert.match(await p.textContent('[data-confirmar-detalhe]'), /1 outra turma/);
  assert.ok(!banco.chamadas.some((c) => c.rpc === 'adicionar_aluno_existente'), 'nada gravado antes de confirmar');
  await p.click('[data-confirmar-adicionar]');
  await p.waitForFunction(() => document.querySelector('[data-tabela-alunos]').textContent.includes('Bruno Reis'));
  assert.match(await p.textContent('[data-feedback-adicionar]'), /adicionado/);
  assert.equal(banco.usuarios.size, 3, 'nenhum usuário novo');
  assert.ok(banco.matriculas.get(3).has('a1') && banco.matriculas.get(4).has('a1'), 'mesmo aluno nas duas turmas');
  // Já está na turma: avisa sem pedir confirmação
  await p.fill('[data-form-adicionar] [name="aluno_id"]', 'K7Q2MX');
  await p.click('[data-form-adicionar] button[type="submit"]');
  await p.waitForFunction(() => /já está nesta turma/.test(document.querySelector('[data-feedback-adicionar]').textContent));
  await ctx.close();
});

caso('importar .xlsx: prévia com duplicados e erros, só os novos são criados', async (nav) => {
  const banco = criarBanco();
  const arquivo = path.join(TMP, 'lista.xlsx');
  const planilha = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(planilha, XLSX.utils.aoa_to_sheet([
    ['Nº', 'Nome completo'], [1, 'Maria Silva Santos'], [2, 'bruno   reis'], [3, 'Maria Silva Santos'], [4, 'João 2'], [5, 'Pedro Henrique Alves'],
  ]), 'Alunos');
  XLSX.writeFile(planilha, arquivo);

  const { ctx, p } = await paginaComo(nav, banco, PROFESSOR, '/app/professor/alunos.html?turma=3');
  await p.waitForFunction(() => document.querySelector('[data-tabela-alunos]').textContent.includes('Bruno Reis'));
  await p.click('[data-ir-importar]');
  assert.equal(await p.getAttribute('[data-aba="importar"]', 'aria-selected'), 'true');
  assert.equal(await p.inputValue('[data-turma-importacao]'), '3');
  assert.equal(await p.locator('[data-turma-importacao] option').count(), 2, 'só turmas ativas como destino');
  await p.setInputFiles('[data-arquivo-planilha]', arquivo);
  await p.waitForSelector('[data-previa-importacao]:not([hidden])');
  const resumo = await p.textContent('[data-resumo-importacao]');
  assert.match(resumo, /2\s*alunos novos/);
  assert.match(resumo, /1\s*já na turma/);
  assert.match(resumo, /1\s*repetidos/);
  assert.match(resumo, /1\s*com erro/);
  assert.equal(await p.textContent('[data-confirmar-importacao]'), 'Importar 2 alunos');
  p.once('dialog', (d) => d.accept());
  await p.click('[data-confirmar-importacao]');
  await p.waitForSelector('[data-credenciais]:not([hidden]) .cartao-acesso');
  assert.equal(await p.locator('[data-cartoes] .cartao-acesso').count(), 2, 'cartões de acesso dos criados');
  const enviado = banco.chamadas.find((c) => c.rpc === 'professor_importar_alunos').corpo.p_alunos.map((a) => a.nome);
  assert.deepEqual(enviado, ['Maria Silva Santos', 'Pedro Henrique Alves']);
  assert.match(await p.textContent('[data-feedback-importar]'), /2 alunos importados/);
  await p.waitForFunction(() => document.querySelector('[data-tabela-alunos]').textContent.includes('Pedro Henrique Alves'));
  await ctx.close();
});

caso('importar .csv do Excel em português (ponto e vírgula, Windows-1252) para outra turma', async (nav) => {
  const banco = criarBanco();
  const arquivo = path.join(TMP, 'lista.csv');
  fs.writeFileSync(arquivo, Buffer.from('Nome;Sobrenome\r\nJoão;Araújo\r\nLúcia;Gonçalves\r\n', 'latin1'));
  const { ctx, p } = await paginaComo(nav, banco, PROFESSOR, '/app/professor/alunos.html?turma=3');
  await p.click('[data-aba="importar"]');
  await p.selectOption('[data-turma-importacao]', '4');
  await p.setInputFiles('[data-arquivo-planilha]', arquivo);
  await p.waitForSelector('[data-previa-importacao]:not([hidden])');
  assert.match(await p.textContent('[data-linhas-importacao]'), /João Araújo[\s\S]*Lúcia Gonçalves/);
  p.once('dialog', (d) => d.accept());
  await p.click('[data-confirmar-importacao]');
  await p.waitForSelector('.turma-opcao[data-turma="4"][aria-checked="true"]');
  const chamada = banco.chamadas.find((c) => c.rpc === 'professor_importar_alunos');
  assert.equal(chamada.corpo.p_turma_id, 4, 'turma escolhida na importação');
  // Arquivo inválido
  const ruim = path.join(TMP, 'foto.png');
  fs.writeFileSync(ruim, 'x');
  await p.setInputFiles('[data-arquivo-planilha]', ruim);
  assert.match(await p.textContent('[data-feedback-importar]'), /Formato não aceito/);
  await ctx.close();
});

caso('modelo para download e exportação em .xlsx e .csv', async (nav) => {
  const banco = criarBanco();
  banco.matriculas.get(3).add('x9');
  const { ctx, p } = await paginaComo(nav, banco, PROFESSOR, '/app/professor/alunos.html?turma=3');
  await p.waitForFunction(() => document.querySelector('[data-tabela-alunos]').textContent.includes('Carla Matos'));

  await p.click('[data-aba="importar"]');
  const [modelo] = await Promise.all([p.waitForEvent('download'), p.click('[data-baixar-modelo]')]);
  const caminhoModelo = await modelo.path();
  const lidoModelo = XLSX.readFile(caminhoModelo);
  assert.deepEqual(lidoModelo.SheetNames, ['Alunos', 'Instruções']);
  assert.equal(lidoModelo.Sheets.Alunos.A1.v, 'Nome completo');

  await p.click('[data-botao-exportar]');
  const [xlsx] = await Promise.all([p.waitForEvent('download'), p.click('[data-exportar="xlsx"]')]);
  assert.match(xlsx.suggestedFilename(), /^alunos-portugues-7a-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const lido = XLSX.readFile(await xlsx.path());
  const linhas = XLSX.utils.sheet_to_json(lido.Sheets.Alunos, { header: 1 });
  assert.equal(linhas[0][0], 'Nome');
  assert.equal(linhas.length, 3);
  const bruno = linhas.find((l) => l[0] === 'Bruno Reis');
  assert.equal(bruno[1], 'K7Q2MX');
  assert.equal(bruno[2], 'bruno.reis');
  assert.equal(bruno[3] ?? '', '', 'e-mail interno não sai');
  assert.equal(linhas.find((l) => l[0] === 'Carla Matos')[3], 'carla@gmail.com');
  assert.equal(typeof bruno[6], 'number', 'WPM como número');

  await p.click('[data-botao-exportar]');
  const [csv] = await Promise.all([p.waitForEvent('download'), p.click('[data-exportar="csv"]')]);
  const texto = fs.readFileSync(await csv.path(), 'utf8');
  assert.ok(texto.startsWith('﻿Nome;Código do aluno;Usuário da escola;E-mail'));
  assert.match(texto, /Bruno Reis;K7Q2MX;bruno\.reis;;/);
  assert.match(texto, /;30,5;95,2;/);
  await ctx.close();
});

caso('aluno: sem entrar por código; vê turmas e o próprio código', async (nav) => {
  const banco = criarBanco();
  const { ctx, p, erros } = await paginaComo(nav, banco, ALUNO, '/app/aluno/turmas.html');
  await p.waitForFunction(() => document.querySelector('[data-meu-id]').textContent === 'K7Q2MX');
  assert.equal(await p.locator('[data-form-entrar-turma], [name="codigoConvite"]').count(), 0, 'formulário de código da turma removido');
  await p.waitForFunction(() => document.querySelector('[data-lista-turmas]').textContent.includes('Português 7A'));
  assert.ok(!banco.chamadas.some((c) => c.rpc === 'entrar_na_turma'));
  assert.deepEqual(erros, []);
  await ctx.close();
});

caso('ranking da turma: só animais, top 5, destaque do 1º e marca "você"', async (nav) => {
  const banco = criarBanco();
  const { ctx, p, erros } = await paginaComo(nav, banco, ALUNO, '/app/aluno/ranking.html');
  await p.waitForSelector('.ranking-animal.posicao-1');
  assert.equal(await p.locator('.ranking-animal').count(), 5);
  const texto = await p.textContent('[data-ranking-area]');
  for (const animal of ['Guepardo', 'Lebre', 'Raposa', 'Cavalo', 'Gato']) assert.match(texto, new RegExp(animal));
  assert.doesNotMatch(texto, /Bruno|Carla|@/, 'nenhum nome ou e-mail');
  assert.match(await p.textContent('.ranking-animal.is-you'), /Raposa.*você/);
  assert.equal(await p.textContent('[data-minha-posicao]'), '3º');
  assert.match(await p.textContent('[data-minha-mensagem]'), /Você é a Raposa/);
  // Painel inicial usa o mesmo ranking anônimo
  await p.goto(`${BASE}/app/aluno/index.html`);
  await p.waitForSelector('[data-ranking-list] .ranking-animal');
  assert.doesNotMatch(await p.textContent('[data-ranking-list]'), /Bruno|Carla/);
  assert.deepEqual(erros, []);
  await ctx.close();
});

caso('perfil: o campo de e-mail explica para que serve', async (nav) => {
  const banco = criarBanco();
  const { ctx, p } = await paginaComo(nav, banco, PROFESSOR, '/app/professor/perfil.html');
  await p.waitForFunction(() => document.querySelector('[data-form-dados] [name="email"]').value === 'ana@escola.com');
  assert.equal(await p.textContent('[data-rotulo-email]'), 'E-mail de acesso');
  assert.match(await p.textContent('[data-ajuda-email]'), /entrar.*Esqueci a senha/);
  await ctx.close();
});

caso('treino da trilha: lição curta completada sem repetir o mesmo texto', async (nav) => {
  const banco = criarBanco();
  const { ctx, p } = await paginaComo(nav, banco, ALUNO, '/app/aluno/treinar.html?id=7');
  await p.waitForFunction(() => document.querySelectorAll('#words-wrapper .word').length > 4);
  const texto = await p.$$eval('#words-wrapper .word', (ws) => ws.map((w) => w.dataset.text).join(' '));
  assert.ok(texto.startsWith('fff jjj fjfj jfjf'));
  assert.equal(texto.split('fff jjj fjfj jfjf').length - 1, 1, 'texto original uma vez só');
  assert.match(texto, /^[fj ]+$/);
  assert.ok(texto.length >= 140 && texto.length <= 161, // 161 = 9 rodadas × 18 − 1 (tempo_limite_trilha)
    `tamanho ${texto.length}: ${texto}`);
  await ctx.close();
});

module.exports = { simular, criarBanco, sessao, PROFESSOR, ALUNO };

if (require.main === module) (async () => {
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
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`# ${casos.length - falhas}/${casos.length}`);
  process.exit(falhas ? 1 : 0);
})();
