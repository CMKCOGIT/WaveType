// Acompanhamento do professor (análise individual das atividades), exportação
// em PDF, cartões de acesso, navegação pelo logo e abas de exercícios do aluno.
// Supabase simulado; as regras do banco estão em
// supabase/testes/detalhe_das_tentativas.test.sql.
//   VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon-teste npx vite --port 5173
//   node tests/e2e/acompanhamento.e2e.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const XLSX = require('xlsx');
const { simular, criarBanco, sessao, PROFESSOR, ALUNO } = require('./gestao.e2e.cjs');

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const ATIVIDADE = {
  id: 21, titulo: 'Kaike troxa', instrucoes: null, texto_referencia: 'o gato pulou o muro alto', nivel: 'facil',
  tempo_limite_seg: 60, prazo: '2026-11-20T23:23:00Z', meta_precisao: 90, publicado: true, criado_em: '2026-11-01T10:00:00Z',
  turmas: [{ id: 3, nome: 'Turma IF' }], entregas: 3, alunos_concluiram: 1,
};

// Rotas desta suíte; o resto cai no simulador de gestao.e2e.cjs.
async function simularAcompanhamento(ctx, banco, extra = {}) {
  await simular(ctx, banco);
  await ctx.route('https://mock.supabase.co/**', async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const corpo = req.method() === 'POST' ? req.postDataJSON() : null;
    if (url.pathname.startsWith('/rest/v1/rpc/')) banco.chamadas.push({ rpc: url.pathname.replace('/rest/v1/rpc/', ''), corpo });
    switch (url.pathname) {
      case '/rest/v1/rpc/atividades_do_professor':
        return rota.fulfill({ json: [ATIVIDADE] });
      case '/rest/v1/rpc/entregas_da_atividade':
        return rota.fulfill({
          json: [
            { aluno_id: 'a1', nome: 'Bruno Reis', codigo_aluno: 'K7Q2MX', turma_id: 3, turma_nome: 'Turma IF', tentativas: 2, concluida: true, melhor_precisao: 92, melhor_ppm: 31, menor_tempo: 18, media_erros: 2.5, ultima_tentativa: '2026-11-10T12:00:00Z', com_detalhe: true },
            { aluno_id: 'x9', nome: 'Carla Matos', codigo_aluno: 'P9R3ST', turma_id: 3, turma_nome: 'Turma IF', tentativas: 1, concluida: false, melhor_precisao: 70, melhor_ppm: 12, menor_tempo: null, media_erros: 9, ultima_tentativa: '2026-11-09T12:00:00Z', com_detalhe: false },
            { aluno_id: 'z3', nome: 'Davi Luz', codigo_aluno: 'M4N5PQ', turma_id: 3, turma_nome: 'Turma IF', tentativas: 0, concluida: false, melhor_precisao: null, melhor_ppm: null, menor_tempo: null, media_erros: null, ultima_tentativa: null, com_detalhe: false },
          ],
        });
      case '/rest/v1/rpc/tentativas_do_aluno':
        if (corpo.p_aluno_id === 'a1') {
          return rota.fulfill({
            json: [
              { resultado_id: 2, criado_em: '2026-11-10T12:00:00Z', ppm: 31, precisao: 92, acertos: 22, erros: 2, tempo_seg: 18, tempo_limite_seg: 60, concluido: true, concluiu_texto: true,
                detalhes: { palavras: [['o', 'o', 0], ['gato', 'gado', 1], ['pulou', 'pulou', 2], ['o', 'o', 0], ['muro', 'mur', 0]], erros_por_tecla: { t: 1, o: 2 }, ppm_bruto: 34, consistencia: 72, erros_corrigidos: 2, omitidas: 1, extras: 0, modo_erros: 'fluxo' } },
              { resultado_id: 1, criado_em: '2026-11-09T12:00:00Z', ppm: 20, precisao: 80, acertos: 20, erros: 5, tempo_seg: 30, tempo_limite_seg: 60, concluido: false, concluiu_texto: true, detalhes: null },
            ],
          });
        }
        return rota.fulfill({ json: [{ resultado_id: 3, criado_em: '2026-11-09T12:00:00Z', ppm: 12, precisao: 70, acertos: 10, erros: 9, tempo_seg: 60, tempo_limite_seg: 60, concluido: false, concluiu_texto: false, detalhes: null }] });
      case '/rest/v1/rpc/minhas_atividades':
        return rota.fulfill({
          json: [
            { id: 21, titulo: 'Kaike troxa', nivel: 'facil', tempo_limite_seg: 60, meta_precisao: 90, turma_id: 3, turmas: 'Turma IF', professor_nome: 'Ana', tentativas: 0, situacao: 'pendente' },
            { id: 22, titulo: 'Ditado 2', nivel: 'medio', tempo_limite_seg: 90, meta_precisao: 85, turma_id: 3, turmas: 'Turma IF', professor_nome: 'Ana', tentativas: 1, melhor_ppm: 30, melhor_precisao: 95, situacao: 'concluida' },
          ],
        });
      case '/rest/v1/exercicios':
        if (extra.exercicio) return rota.fulfill({ json: extra.exercicio });
        return rota.fallback();
      case '/rest/v1/resultados':
        if (req.method() === 'POST') return rota.fulfill({ status: 201, json: { id: 99, ...corpo, concluido: true, criado_em: new Date().toISOString() } });
        return rota.fallback();
      case '/rest/v1/rpc/registrar_detalhes_resultado':
        return rota.fulfill({ status: 204, body: '' });
      default:
        return rota.fallback();
    }
  });
}

async function paginaComo(nav, banco, usuario, caminho, { viewport = { width: 1440, height: 900 }, extra } = {}) {
  const ctx = await nav.newContext({ viewport, acceptDownloads: true });
  await simularAcompanhamento(ctx, banco, extra);
  if (usuario) await ctx.addInitScript((s) => localStorage.setItem('sb-mock-auth-token', s), JSON.stringify(sessao(usuario)));
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(`${BASE}${caminho}`);
  return { ctx, p, erros };
}

async function baixar(p, acao) {
  const [download] = await Promise.all([p.waitForEvent('download'), acao()]);
  const caminho = await download.path();
  return { nome: download.suggestedFilename(), bytes: fs.readFileSync(caminho) };
}

const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('logo leva ao painel do papel (aluno, professor e site público logado)', async (nav) => {
  const banco = criarBanco();
  const { ctx, p } = await paginaComo(nav, banco, ALUNO, '/app/aluno/ranking.html');
  await p.waitForSelector('.app-brand');
  assert.equal(new URL(await p.$eval('.app-brand', (a) => a.href)).pathname, '/app/aluno/index.html');
  await p.goto(`${BASE}/index.html`);
  await p.waitForFunction(() => document.querySelector('a.brand')?.getAttribute('href') === '/app/aluno/index.html');
  await ctx.close();
  const prof = await paginaComo(nav, banco, PROFESSOR, '/app/professor/exercicios.html');
  await prof.p.waitForSelector('.app-brand');
  assert.equal(new URL(await prof.p.$eval('.app-brand', (a) => a.href)).pathname, '/app/professor/index.html');
  await prof.ctx.close();
  // Visitante: o logo continua na página pública
  const visita = await paginaComo(nav, banco, null, '/index.html');
  assert.equal(await visita.p.getAttribute('a.brand', 'href'), 'index.html');
  await visita.ctx.close();
});

caso('login e cadastro: "Voltar para tela inicial" vai para a página inicial', async (nav) => {
  const banco = criarBanco();
  const { ctx, p } = await paginaComo(nav, banco, null, '/login.html');
  for (const pagina of ['login.html', 'cadastro.html']) {
    await p.goto(`${BASE}/${pagina}`);
    const link = p.locator('.auth-card a.eyebrow').first();
    assert.match(await link.textContent(), /Voltar para tela inicial/);
    assert.equal(await link.getAttribute('href'), 'index.html');
  }
  await ctx.close();
});

caso('aluno faz a atividade e o detalhe palavra por palavra é enviado ao banco', async (nav) => {
  const banco = criarBanco();
  const exercicio = { id: 21, nivel_trilha: null, ordem: null, titulo: 'Kaike troxa', texto_referencia: 'o gato pulou', instrucoes: null, prazo: null, meta_precisao: 90, tempo_limite_seg: 60 };
  const { ctx, p } = await paginaComo(nav, banco, ALUNO, '/app/aluno/treinar.html?id=21&turma=3', { extra: { exercicio } });
  await p.waitForFunction(() => document.querySelectorAll('#words-wrapper .word').length === 3);
  await p.click('#typing-stage');
  await p.keyboard.type('o gado pulou', { delay: 30 });
  await p.waitForFunction(() => document.querySelector('[data-salvo]')?.textContent.includes('salvo'), null, { timeout: 15000 });
  const chamada = banco.chamadas.find((c) => c.rpc === 'registrar_detalhes_resultado');
  assert.ok(chamada, 'detalhe enviado');
  assert.equal(chamada.corpo.p_resultado_id, 99);
  assert.deepEqual(chamada.corpo.p_detalhes.palavras, [['o', 'o', 0], ['gato', 'gado', 1], ['pulou', 'pulou', 0]]);
  assert.ok(chamada.corpo.p_detalhes.erros_por_tecla.t >= 1);
  await ctx.close();
});

caso('professor: lista de atividades leva à visão da turma e à análise individual', async (nav) => {
  const banco = criarBanco();
  const { ctx, p, erros } = await paginaComo(nav, banco, PROFESSOR, '/app/professor/exercicios.html');
  await p.waitForSelector('[data-atividade="21"] a[href="atividade.html?id=21"]');
  await p.click('[data-atividade="21"] .row-actions a');
  await p.waitForURL(/atividade\.html\?id=21/);
  await p.waitForSelector('.entrega');
  assert.equal(await p.textContent('[data-atividade-titulo]'), 'Kaike troxa');
  assert.equal(await p.textContent('[data-m="alunos"]'), '3');
  assert.equal(await p.textContent('[data-m="concluiram"]'), '1');
  assert.equal(await p.locator('.entrega').count(), 3, 'inclui quem não fez');
  // Filtros
  await p.click('[data-filtro="pendentes"]');
  assert.equal(await p.locator('.entrega').count(), 1);
  await p.click('[data-filtro="todos"]');
  // Análise do Bruno
  await p.click('.entrega[data-aluno="a1"]');
  await p.waitForSelector('[data-texto-analisado]');
  assert.match(p.url(), /aluno=a1/);
  const texto = await p.textContent('[data-texto-analisado]');
  assert.match(texto, /o\s+gado\s+pulou\s+o\s+muro\s+alto/, 'texto com o que foi digitado');
  assert.equal(await p.locator('[data-texto-analisado] .pl.errada').count(), 2);
  assert.equal(await p.locator('[data-texto-analisado] .pl.corrigida').count(), 1);
  assert.equal(await p.locator('[data-texto-analisado] .pl.nao_digitada').count(), 1);
  assert.equal(await p.locator('.lt.trocada').first().textContent(), 'd');
  const tabela = await p.textContent('.tabela-erros');
  assert.match(tabela, /gato[\s\S]*gado[\s\S]*Letra trocada[\s\S]*3ª letra: “t” virou “d”/);
  assert.match(tabela, /muro[\s\S]*mur[\s\S]*Incompleta/);
  const metricas = await p.textContent('.analise-metricas');
  for (const r of [/WPM\s*31/, /Precisão\s*92%/, /Tempo/, /Erros\s*2/, /Erros apagados\s*2/, /Consistência\s*72%/]) assert.match(metricas, r);
  assert.match(await p.textContent('.teclas-erradas'), /o\s*2 erros/);
  // Tentativa antiga, sem detalhe
  await p.click('[data-tentativa="1"]');
  await p.waitForSelector('.analise-aviso');
  assert.match(await p.textContent('.analise-aviso'), /antes de o WaveType guardar/);
  // Aluno sem tentativa
  await p.click('.entrega[data-aluno="z3"]');
  assert.match(await p.textContent('[data-detalhe-aluno]'), /Ainda não fez/);
  // Exportação da visão da turma
  const pdf = await baixar(p, () => p.click('[data-exportar-entregas="pdf"]'));
  assert.equal(pdf.bytes.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.nome, /\.pdf$/);
  const xlsx = await baixar(p, () => p.click('[data-exportar-entregas="xlsx"]'));
  const linhas = XLSX.utils.sheet_to_json(XLSX.read(xlsx.bytes).Sheets.Resultados, { header: 1 });
  assert.equal(linhas.length, 4);
  assert.equal(linhas[1][0], 'Bruno Reis');
  assert.deepEqual(erros, []);
  await ctx.close();
});

caso('cartão de acesso no tema, sem logo nem "Entre em", e PDF com a senha', async (nav) => {
  // Fluxo real: importar 2 alunos → cartões → Exportar PDF
  const banco2 = criarBanco();
  const arquivo = `${require('node:os').tmpdir()}/wt-pdf-${Date.now()}.csv`;
  fs.writeFileSync(arquivo, 'Nome\nKaike Elias Oliveira\nLara Nunes Prado\n');
  const s = await paginaComo(nav, banco2, PROFESSOR, '/app/professor/alunos.html?turma=3');
  await s.p.waitForFunction(() => document.querySelector('[data-tabela-alunos]').textContent.includes('Bruno Reis'));
  await s.p.click('[data-aba="importar"]');
  await s.p.setInputFiles('[data-arquivo-planilha]', arquivo);
  await s.p.waitForSelector('[data-previa-importacao]:not([hidden])');
  s.p.once('dialog', (d) => d.accept());
  await s.p.click('[data-confirmar-importacao]');
  await s.p.waitForSelector('[data-credenciais]:not([hidden]) .cartao-acesso');
  assert.equal(await s.p.locator('[data-cartoes] .cartao-acesso img').count(), 0);
  assert.doesNotMatch(await s.p.textContent('[data-cartoes]'), /Entre em/);
  // Cor do cartão acompanha o tema (claro aqui: superfície da plataforma, não um branco fixo)
  const [fundo, superficie] = await s.p.evaluate(() => [
    getComputedStyle(document.querySelector('.cartao-acesso')).backgroundColor,
    getComputedStyle(document.querySelector('.panel')).backgroundColor,
  ]);
  assert.equal(fundo, superficie, 'cartão usa a cor de superfície do tema');
  const senhas = await s.p.$$eval('[data-cartoes] dd', (dds) => dds.filter((_, i) => i % 2 === 1).map((d) => d.textContent.trim()));
  const pdf = await baixar(s.p, () => s.p.click('[data-pdf-criados]'));
  const conteudo = pdf.bytes.toString('latin1');
  assert.equal(conteudo.slice(0, 5), '%PDF-');
  assert.match(conteudo, /Kaike Elias Oliveira/);
  assert.match(conteudo, /Lara Nunes Prado/);
  assert.match(conteudo, /kaike\.elias\.oliveira/);
  for (const senha of senhas) assert.ok(conteudo.includes(senha), 'senha aparece no PDF dos acessos criados');
  assert.match(conteudo, /Senha/);
  // PDF da turma inteira pelo menu Exportar
  await s.p.click('[data-botao-exportar]');
  const turma = await baixar(s.p, () => s.p.click('[data-exportar="pdf"]'));
  assert.equal(turma.bytes.subarray(0, 5).toString(), '%PDF-');
  assert.match(turma.bytes.toString('latin1'), /K7Q2MX/);
  // Mensagem de remoção clara
  assert.match(await s.p.textContent('.lista-alunos .auth-demo'), /não exclui a conta do aluno/);
  await s.ctx.close();
  fs.rmSync(arquivo, { force: true });
});

caso('relatórios: sem aviso interno e com exportação em PDF e planilha', async (nav) => {
  const banco = criarBanco();
  const { ctx, p } = await paginaComo(nav, banco, PROFESSOR, '/app/professor/relatorios.html');
  await p.waitForSelector('[data-exportar-relatorio="pdf"]:not([disabled])');
  const corpo = await p.textContent('main');
  assert.doesNotMatch(corpo, /não está implementado|README|função de servidor/);
  const pdf = await baixar(p, () => p.click('[data-exportar-relatorio="pdf"]'));
  assert.equal(pdf.bytes.subarray(0, 5).toString(), '%PDF-');
  const xlsx = await baixar(p, () => p.click('[data-exportar-relatorio="xlsx"]'));
  assert.equal(XLSX.read(xlsx.bytes).SheetNames[0], 'Turmas');
  await ctx.close();
});

caso('aluno: abas separam exercícios do professor (pendentes/concluídos) e trilha', async (nav) => {
  const banco = criarBanco();
  const { ctx, p, erros } = await paginaComo(nav, banco, ALUNO, '/app/aluno/exercicios.html');
  await p.waitForSelector('[data-aba-exercicios="atividades"][aria-selected="true"]');
  assert.equal(await p.isVisible('#atividades'), true, 'com pendência, abre nas atividades');
  assert.equal(await p.isVisible('#trilha'), false);
  assert.equal(await p.textContent('[data-contador-pendentes]'), '1');
  assert.match(await p.textContent('[data-aba-resumo-atividades]'), /2 no total · 1 pendente/);
  assert.equal(await p.locator('[data-lista-atividades] .practice-row').count(), 1);
  await p.click('[data-filtro="concluidas"]');
  assert.match(await p.textContent('[data-lista-atividades]'), /Ditado 2/);
  await p.click('[data-filtro="todas"]');
  assert.equal(await p.locator('[data-lista-atividades] .practice-row').count(), 2);
  await p.click('[data-aba-exercicios="trilha"]');
  assert.equal(await p.isVisible('#trilha'), true);
  assert.match(p.url(), /#trilha/);
  assert.deepEqual(erros, []);
  await ctx.close();
});

module.exports = { simularAcompanhamento };

if (require.main === module) (async () => {
  const nav = await chromium.launch();
  let falhas = 0;
  for (const [nome, fn] of casos) {
    try {
      await fn(nav);
      console.log(`ok - ${nome}`);
    } catch (erro) {
      falhas += 1;
      console.log(`not ok - ${nome}\n  ${erro.message.split("\n").slice(0, 6).join(" | ")}`);
    }
  }
  await nav.close();
  console.log(`# ${casos.length - falhas}/${casos.length}`);
  process.exit(falhas ? 1 : 0);
})();
