// Uso: node medir.cjs <baseUrl> <rotulo>   (ex.: http://localhost:4174 antes)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [BASE, ROTULO, TEMA = 'light'] = process.argv.slice(2);
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
  await ctx.addInitScript((t) => localStorage.setItem('wavetype_theme', t), TEMA);
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
  ['login', '/login.html'], ['cadastro', '/cadastro.html'], ['recuperar-senha', '/recuperar-senha.html'],
  ['aluno-inicio', '/app/aluno/index.html', 'aluno'], ['aluno-exercicios', '/app/aluno/exercicios.html', 'aluno'],
  ['aluno-perfil', '/app/aluno/perfil.html', 'aluno'], ['aluno-conquistas', '/app/aluno/conquistas.html', 'aluno'], ['aluno-treinar', '/app/aluno/treinar.html', 'aluno'],
  ['aluno-turmas', '/app/aluno/turmas.html', 'aluno'], ['aluno-resultados', '/app/aluno/resultados.html', 'aluno'],
  ['professor-inicio', '/app/professor/index.html', 'professor'], ['professor-turmas', '/app/professor/turmas.html', 'professor'], ['professor-alunos', '/app/professor/alunos.html', 'professor'], ['professor-exercicios', '/app/professor/exercicios.html', 'professor'],
];

(async () => {
  const browser = await chromium.launch();
  const falhas = [];
  for (const tema of ['light', 'dark']) for (const [nome, rota, tipo] of PAGINAS) {
    const ctx = await contexto(browser, 1280, Boolean(tipo), tipo);
    await ctx.addInitScript((t) => localStorage.setItem('wavetype_theme', t), tema);
    const pg = await ctx.newPage();
    await pg.goto(BASE + rota, { waitUntil: 'networkidle' });
    await pg.waitForTimeout(1500);
    const r = await pg.evaluate(() => {
      const rgb = (c) => { const m = c.match(/[\d.]+/g); if (!m) return null; let v = m.map(Number); if (c.startsWith('color(')) { v = m.slice(0, 3).map((x) => Number(x) * 255).concat(m[3] !== undefined ? [Number(m[3])] : []); } return v; };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const mix = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)); };
      const fundo = (el) => { let cor = [255, 255, 255]; const pilha = []; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage !== 'none') return null; const c = rgb(s.backgroundColor); if (c && (c[3] ?? 1) > 0) { pilha.push(c); if ((c[3] ?? 1) >= 1) break; } } let base = pilha.length && (pilha[pilha.length - 1][3] ?? 1) >= 1 ? pilha.pop().slice(0, 3) : (document.documentElement.dataset.theme === 'dark' ? [10, 16, 34] : [255, 255, 255]); while (pilha.length) base = mix(pilha.pop(), base); return base; };
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0 || !el.offsetParent && s.position !== 'fixed') continue;
        const bg = fundo(el); if (!bg) continue;
        const fg = mix(rgb(s.color), bg); const L1 = lum(fg), L2 = lum(bg); const cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const grande = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
        if (cr < (grande ? 3 : 4.5)) out.push(`${el.tagName}.${el.className} "${el.textContent.trim().slice(0, 28)}" ${cr.toFixed(2)}`);
      }
      return [...new Set(out)].slice(0, 12);
    });
    if (r.length) falhas.push(`${tema} ${nome}: ` + r.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(falhas.length ? falhas.join('\n') : 'CONTRASTE OK');
})();
