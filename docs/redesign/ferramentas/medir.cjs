// Uso: node medir.cjs <baseUrl> <rotulo>   (ex.: http://localhost:4174 antes)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [BASE, ROTULO] = process.argv.slice(2);
const DIR = path.join(__dirname, 'redesign', ROTULO);
fs.mkdirSync(DIR, { recursive: true });
const SUPA = 'https://wt.supabase.co';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.c2ln`;

const PERFIL = { id: '20000000-0000-0000-0000-000000000001', nome: 'Ana Souza', email: 'ana@x.com', tipo: 'aluno', tipo_definido: true, codigo_aluno: 'K7Q2MX', xp: 420, nivel: 3, sequencia_dias: 4, ultima_pratica_em: new Date().toISOString().slice(0, 10) };
const TRILHA = [];
for (let n = 1, id = 1; n <= 6; n++) for (let o = 1; o <= 20; o++) TRILHA.push({ id: id++, nivel_trilha: n, ordem: o, titulo: `Ex ${n}.${o}` });
const RESULTADOS = TRILHA.slice(0, 27).map((e, i) => ({ id: i + 1, exercicio_id: e.id, ppm: 30 + i, precisao: 90 + (i % 9), acertos: 80, erros: 3, tempo_seg: 40, concluido: true, criado_em: new Date(Date.now() - i * 36e5).toISOString(), exercicios: { titulo: e.titulo, nivel_trilha: e.nivel_trilha } }));
const RPC = {
  minhas_atividades: [
    { id: 900, titulo: 'Ditado do rei', nivel: 'medio', tempo_limite_seg: 120, prazo: new Date(Date.now() + 864e5).toISOString(), meta_precisao: 90, turma_id: 7, turmas: '3º Ano A', professor_nome: 'Carlos Menezes', tentativas: 0, situacao: 'pendente' },
    { id: 902, titulo: 'Frases curtas', nivel: 'facil', tempo_limite_seg: 60, meta_precisao: 85, turma_id: 8, turmas: 'Reforço', professor_nome: 'Carlos Menezes', tentativas: 2, melhor_precisao: 97, melhor_ppm: 41, situacao: 'concluida' },
  ],
  progresso_conquistas: [
    { codigo: 'primeiros_passos', titulo: 'Primeiros passos', descricao: 'Concluiu o primeiro exercício.', icone: 'flag', categoria: 'exercicios', ordem: 10, atual: 27, alvo: 1, desbloqueada: true, desbloqueada_em: new Date().toISOString() },
    { codigo: 'dedicacao', titulo: 'Dedicação', descricao: 'Concluiu 50 exercícios da trilha.', icone: 'star', categoria: 'exercicios', ordem: 12, atual: 27, alvo: 50, desbloqueada: false },
    { codigo: 'digitador_veloz', titulo: 'Digitador veloz', descricao: 'Atingiu 40 WPM em uma sessão.', icone: 'bolt', categoria: 'velocidade', ordem: 31, atual: 56, alvo: 40, desbloqueada: true, desbloqueada_em: new Date().toISOString() },
  ],
  sincronizar_conquistas: [], ranking_exercicio: [],
  resumo_turmas_professor: [
    { id: 7, nome: '3º Ano A', descricao: 'Turma da manhã', ano_letivo: '2026', status: 'ativa', codigo_convite: 'K7Q2M9XA', alunos: 24, atividades: 3, sessoes: 120, ppm_medio: 51.2, precisao_media: 93.1 },
    { id: 8, nome: 'Reforço', ano_letivo: '2026', status: 'encerrada', codigo_convite: 'PZ4H8NCW', alunos: 6, atividades: 1, sessoes: 0 },
  ],
};

async function contexto(browser, largura, logado, tipo = 'aluno') {
  const ctx = await browser.newContext({ viewport: { width: largura, height: largura < 500 ? 800 : 900 } });
  await ctx.addInitScript(() => localStorage.setItem('wavetype_theme', 'light'));
  if (logado) {
    const s = { access_token: jwt(PERFIL.id), refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: PERFIL.id, email: PERFIL.email, app_metadata: { providers: ['email'] } } };
    await ctx.addInitScript((v) => localStorage.setItem('sb-wt-auth-token', v), JSON.stringify(s));
  }
  const perfil = { ...PERFIL, tipo };
  await ctx.route(`${SUPA}/**`, async (rota) => {
    const req = rota.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const json = (d) => rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) });
    const obj = (req.headers().accept || '').includes('vnd.pgrst.object');
    const resp = (l) => json(obj ? (Array.isArray(l) ? l[0] ?? null : l) : Array.isArray(l) ? l : [l]);
    if (p === '/auth/v1/user') return json({ id: perfil.id, email: perfil.email, app_metadata: { providers: ['email'] } });
    if (p === '/rest/v1/usuarios') return resp([perfil]);
    if (p.startsWith('/rest/v1/rpc/')) return json(RPC[p.slice(13)] ?? []);
    if (p === '/rest/v1/exercicios') return resp(TRILHA);
    if (p === '/rest/v1/resultados') {
      if (req.method() === 'HEAD') return rota.fulfill({ status: 200, headers: { 'content-range': `0-0/${RESULTADOS.length}` } });
      return resp(RESULTADOS);
    }
    if (p === '/rest/v1/matriculas') return resp([{ turma_id: 7, entrou_em: new Date().toISOString(), turmas: { id: 7, nome: '3º Ano A', ano_letivo: '2026', status: 'ativa' } }]);
    return json([]);
  });
  return ctx;
}

const PAGINAS = [
  ['index', '/index.html'], ['escolas', '/escolas.html'], ['como-funciona', '/como-funciona.html'], ['sobre', '/sobre.html'],
  ['login', '/login.html'], ['cadastro', '/cadastro.html'], ['recuperar-senha', '/recuperar-senha.html'],
  ['aluno-inicio', '/app/aluno/index.html', 'aluno'], ['aluno-exercicios', '/app/aluno/exercicios.html', 'aluno'],
  ['aluno-perfil', '/app/aluno/perfil.html', 'aluno'], ['professor-turmas', '/app/professor/turmas.html', 'professor'],
];

(async () => {
  const browser = await chromium.launch();
  const erros = [];
  for (const largura of [375, 768, 1280]) {
    for (const [nome, rota, tipo] of PAGINAS) {
      const ctx = await contexto(browser, largura, Boolean(tipo), tipo);
      const pg = await ctx.newPage();
      pg.on('pageerror', (e) => erros.push(`${nome}@${largura}: ${e.message}`));
      await pg.goto(BASE + rota, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(900);
      // Rola a página inteira para disparar as revelações ao rolar (módulo de movimento).
      await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 80)); } window.scrollTo({ top: 0, behavior: 'instant' }); });
      await pg.waitForTimeout(700);
      const largo = await pg.evaluate(() => document.documentElement.scrollWidth);
      if (largo > largura + 1) erros.push(`${nome}@${largura}: rolagem horizontal (${largo}px)`);
      await pg.screenshot({ path: path.join(DIR, `${nome}-${largura}.png`), fullPage: true });
      await ctx.close();
    }
  }

  // Métricas da página inicial (1280px)
  const ctx = await contexto(browser, 1280, false);
  const pg = await ctx.newPage();
  await pg.addInitScript(() => {
    window.__cls = 0; window.__lcp = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries().pop(); if (e) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await pg.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(1500);
  await pg.locator('#typing-input').focus();
  // Latência: tempo do handler de keydown + até o próximo quadro pintado.
  const lat = await pg.evaluate(async () => {
    const input = document.getElementById('typing-input');
    const letras = [...document.querySelectorAll('#words-wrapper .word')].slice(0, 12).map((w) => w.dataset.text).join(' ');
    const handler = [], quadro = [];
    for (const ch of letras.slice(0, 60)) {
      const t0 = performance.now();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }));
      const t1 = performance.now();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      handler.push(t1 - t0); quadro.push(performance.now() - t0);
    }
    const ord = (a) => [...a].sort((x, y) => x - y);
    const p = (a, q) => ord(a)[Math.floor(a.length * q)];
    return { handler_med: +p(handler, 0.5).toFixed(3), handler_p95: +p(handler, 0.95).toFixed(3), quadro_med: +p(quadro, 0.5).toFixed(2), quadro_p95: +p(quadro, 0.95).toFixed(2) };
  });
  await pg.waitForTimeout(300);
  const vitais = await pg.evaluate(() => ({ cls: +window.__cls.toFixed(4), lcp_ms: Math.round(window.__lcp) }));
  const peso = await pg.evaluate(() => performance.getEntriesByType('resource').filter((r) => /\.(css|js)$/.test(r.name)).reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0));
  await ctx.close();
  await browser.close();

  const relatorio = { rotulo: ROTULO, vitais, latencia_digitacao_ms: lat, css_js_bytes: peso, erros };
  fs.writeFileSync(path.join(DIR, 'metricas.json'), JSON.stringify(relatorio, null, 2));
  console.log(JSON.stringify(relatorio, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
