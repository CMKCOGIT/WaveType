// Cadastros do professor: ano letivo e período da turma, prazo e situação da
// atividade, e a coluna do aluno na gestão. Supabase simulado; as regras do
// banco estão em supabase/testes/cadastros_professor.test.sql.
//   VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon-teste npx vite --port 5173
//   node tests/e2e/cadastros.e2e.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { criarBanco, sessao, PROFESSOR, ALUNO } = require('./gestao.e2e.cjs');
const { simularAcompanhamento } = require('./acompanhamento.e2e.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const ANO = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date()));

async function pagina(nav, usuario, caminho, viewport = { width: 1280, height: 900 }) {
  const banco = criarBanco();
  const enviados = [];
  const ctx = await nav.newContext({ viewport });
  await simularAcompanhamento(ctx, banco);
  await ctx.route('https://mock.supabase.co/rest/v1/{turmas,rpc/salvar_atividade}*', async (rota) => {
    const req = rota.request();
    if (req.method() === 'GET') return rota.fulfill({ json: [] });
    const corpo = req.postDataJSON();
    enviados.push({ url: req.url(), metodo: req.method(), corpo });
    if (req.url().includes('salvar_atividade')) return rota.fulfill({ json: 30 });
    return rota.fulfill({ status: 201, json: { id: 9, ...corpo } });
  });
  // Trilha: o banco ainda tem o Nível 6 (aposentado); a página precisa filtrar.
  await ctx.route('https://mock.supabase.co/rest/v1/exercicios?*', async (rota) => {
    const url = new URL(rota.request().url());
    if (url.searchParams.get('nivel_trilha') !== 'not.is.null') return rota.fallback();
    const limite = Number((url.searchParams.getAll('nivel_trilha').find((v) => v.startsWith('lte.')) ?? 'lte.6').slice(4));
    const linhas = [];
    for (let nivel = 1; nivel <= 6; nivel += 1) for (let ordem = 1; ordem <= 20; ordem += 1) linhas.push({ id: nivel * 100 + ordem, nivel_trilha: nivel, ordem, titulo: `Exercício ${nivel}.${ordem}` });
    return rota.fulfill({ json: linhas.filter((l) => l.nivel_trilha <= limite) });
  });
  await ctx.addInitScript((s) => localStorage.setItem('sb-mock-auth-token', s), JSON.stringify(sessao(usuario)));
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(`${BASE}${caminho}`);
  return { ctx, p, erros, enviados, banco };
}

const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('turma: só o ano atual em diante, tipo de período e número validado', async (nav) => {
  const { ctx, p, enviados, erros } = await pagina(nav, PROFESSOR, '/app/professor/turmas.html');
  await p.click('[data-abrir-form-turma]');
  const anos = await p.$$eval('[name="ano"] option', (os) => os.map((o) => Number(o.value)));
  assert.equal(anos[0], ANO, 'primeiro ano é o atual');
  assert.ok(anos.every((a) => a >= ANO), 'nenhum ano passado');
  assert.equal(await p.inputValue('[name="ano"]'), String(ANO));
  assert.deepEqual(await p.$$eval('[name="tipo_periodo"] option', (os) => os.map((o) => o.textContent)), ['Ano inteiro', 'Semestre', 'Bimestre', 'Trimestre']);
  assert.equal(await p.isDisabled('[name="numero_periodo"]'), true, 'número só depois do tipo');

  await p.fill('[data-form-turma] [name="nome"]', '7º Ano B');
  await p.selectOption('[name="tipo_periodo"]', 'bimestre');
  assert.match(await p.textContent('[data-ajuda-periodo]'), /de 1 a 4/);
  await p.fill('[name="numero_periodo"]', '5');
  await p.click('[data-salvar-turma]');
  assert.match(await p.textContent('[data-feedback-form]'), /Bimestre: digite um número de 1 a 4/);
  assert.equal(enviados.length, 0, 'nada enviado com número inválido');

  await p.selectOption('[name="tipo_periodo"]', 'semestre');
  await p.fill('[name="numero_periodo"]', '2');
  await p.selectOption('[name="ano"]', String(ANO + 1));
  await p.click('[data-salvar-turma]');
  await p.waitForFunction(() => document.querySelector('[data-form-turma]').hidden);
  assert.equal(enviados[0].corpo.ano_letivo, `${ANO + 1} · 2º semestre`);
  assert.deepEqual(erros, []);
  await ctx.close();
});

caso('turma antiga (ano passado) pode ser editada sem mudar o ano', async (nav) => {
  const { ctx, p, enviados } = await pagina(nav, PROFESSOR, '/app/professor/turmas.html');
  await p.waitForSelector('[data-turma="5"] [data-acao="editar"]');
  await p.click('[data-turma="5"] [data-acao="editar"]');
  assert.equal(await p.inputValue('[name="ano"]'), '2025');
  assert.match(await p.textContent('[name="ano"] option[value="2025"]'), /ano encerrado/);
  await p.fill('[data-form-turma] [name="nome"]', 'Reforço 2025 (revisado)');
  await p.click('[data-salvar-turma]');
  await p.waitForFunction(() => document.querySelector('[data-form-turma]').hidden);
  assert.equal(enviados[0].metodo, 'PATCH');
  assert.equal(enviados[0].corpo.ano_letivo, '2025', 'ano antigo preservado');
  await ctx.close();
});

caso('atividade: prazo no passado é recusado; situação com três opções e explicação', async (nav) => {
  const { ctx, p, enviados, erros } = await pagina(nav, PROFESSOR, '/app/professor/exercicios.html');
  await p.click('[data-abrir-form]');
  const minimo = await p.getAttribute('[name="prazo"]', 'min');
  assert.ok(minimo && new Date(minimo).getTime() <= Date.now() + 60000 && new Date(minimo).getTime() > Date.now() - 120000, 'mínimo = agora');
  await p.fill('[name="titulo"]', 'Ditado da semana');
  await p.fill('[name="texto_referencia"]', 'o gato pulou o muro');
  await p.check('input[name="turmas"][value="3"]');
  const ontem = new Date(Date.now() - 86400000);
  const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await p.fill('[name="prazo"]', local(ontem));
  await p.click('[data-salvar]');
  assert.match(await p.textContent('[data-feedback-form]'), /prazo de entrega precisa ser uma data e um horário no futuro/);
  assert.equal(enviados.length, 0);

  // Situação: três opções, cada uma com o "i"
  assert.deepEqual(await p.$$eval('input[name="situacao"]', (r) => r.map((x) => x.value)), ['publicada', 'rascunho', 'arquivada']);
  assert.equal(await p.locator('.info-dica').count(), 3);
  await p.hover('.info-dica[data-dica="rascunho"]');
  await p.waitForFunction(() => getComputedStyle(document.getElementById('dica-rascunho')).visibility === 'visible');
  assert.match(await p.textContent('#dica-rascunho'), /só com você/);
  await p.click('.info-dica[data-dica="arquivada"]');
  assert.equal(await p.getAttribute('.info-dica[data-dica="arquivada"]', 'aria-expanded'), 'true');
  assert.equal(await p.isChecked('input[value="arquivada"]'), false, 'clicar no i não muda a situação');
  await p.check('input[name="situacao"][value="rascunho"]');

  const amanha = new Date(Date.now() + 86400000);
  await p.fill('[name="prazo"]', local(amanha));
  await p.click('[data-salvar]');
  await p.waitForFunction(() => document.querySelector('[data-form-exercicio]').hidden);
  const corpo = enviados[0].corpo;
  assert.equal(corpo.p_publicado, false, 'rascunho = não publicada');
  assert.ok(Math.abs(new Date(corpo.p_prazo).getTime() - new Date(local(amanha)).getTime()) < 60000, 'horário local convertido certo');
  assert.deepEqual(erros, []);
  await ctx.close();
});

caso('atividade: editar uma com prazo vencido sem mudar o prazo continua possível', async (nav) => {
  const { ctx, p, enviados } = await pagina(nav, PROFESSOR, '/app/professor/exercicios.html');
  await p.waitForSelector('[data-atividade="21"] [data-acao="editar"]');
  // A atividade simulada tem prazo 20/11/2026; força um prazo vencido para o teste
  await p.click('[data-atividade="21"] [data-acao="editar"]');
  await p.evaluate(() => {
    const campo = document.querySelector('[name="prazo"]');
    campo.value = '2020-01-01T10:00';
  });
  await p.click('[data-salvar]');
  assert.match(await p.textContent('[data-feedback-form]'), /futuro/, 'mudou para o passado: recusado');
  assert.equal(enviados.length, 0);
  assert.equal(await p.isChecked('input[value="publicada"]'), true, 'situação atual marcada');
  await ctx.close();
});

caso('gestão de alunos: nome e usuário/código alinhados, sem o aviso de remoção', async (nav) => {
  const { ctx, p } = await pagina(nav, PROFESSOR, '/app/professor/alunos.html?turma=3', { width: 1024, height: 800 });
  await p.waitForFunction(() => document.querySelector('[data-tabela-alunos]').textContent.includes('Bruno Reis'));
  const linhas = await p.$$eval('[data-tabela-alunos] .aluno-identidade .id-linha', (ls) => ls.map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
  assert.deepEqual(linhas, ['Usuário bruno.reis', 'Código K7Q2MX']);
  const alturaNome = await p.$eval('[data-tabela-alunos] .aluno-identidade strong', (s) => s.getBoundingClientRect().height);
  assert.ok(alturaNome < 30, `nome numa linha só (${alturaNome}px)`);
  assert.doesNotMatch(await p.textContent('main'), /Remover da turma não exclui/);
  await ctx.close();
});

caso('trilha do aluno: 5 níveis, sem o Nível 6', async (nav) => {
  const { ctx, p } = await pagina(nav, ALUNO, '/app/aluno/exercicios.html#trilha');
  await p.waitForSelector('.nivel-bloco');
  const titulos = await p.$$eval('.nivel-bloco h2', (hs) => hs.map((h) => h.textContent.trim()));
  assert.deepEqual(titulos, ['Nível 1: Posição base', 'Nível 2: Fileira superior', 'Nível 3: Fileira inferior', 'Nível 4: Combinação de teclas', 'Nível 5: Digitação avançada']);
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
      console.log(`not ok - ${nome}\n  ${erro.message.split('\n').slice(0, 4).join(' | ')}`);
    }
  }
  await nav.close();
  console.log(`# ${casos.length - falhas}/${casos.length}`);
  process.exit(falhas ? 1 : 0);
})();
