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
  ['index','/index.html'],
  ['escolas','/escolas.html'],
  ['como-funciona','/como-funciona.html'],
  ['sobre','/sobre.html'],
  ['login','/login.html'],
  ['cadastro','/cadastro.html'],
  ['recuperar-senha','/recuperar-senha.html'],
  ['redefinir-senha','/redefinir-senha.html'],
  ['usuario-index','/app/usuario/index.html','usuario'],
  ['usuario-exercicios','/app/usuario/exercicios.html','usuario'],
  ['usuario-treinar','/app/usuario/treinar.html','usuario'],
  ['usuario-resultados','/app/usuario/resultados.html','usuario'],
  ['usuario-conquistas','/app/usuario/conquistas.html','usuario'],
  ['usuario-ranking','/app/usuario/ranking.html','usuario'],
  ['usuario-perfil','/app/usuario/perfil.html','usuario'],
  ['aluno-index','/app/aluno/index.html','aluno'],
  ['aluno-exercicios','/app/aluno/exercicios.html','aluno'],
  ['aluno-treinar','/app/aluno/treinar.html','aluno'],
  ['aluno-turmas','/app/aluno/turmas.html','aluno'],
  ['aluno-resultados','/app/aluno/resultados.html','aluno'],
  ['aluno-conquistas','/app/aluno/conquistas.html','aluno'],
  ['aluno-ranking','/app/aluno/ranking.html','aluno'],
  ['aluno-perfil','/app/aluno/perfil.html','aluno'],
  ['professor-index','/app/professor/index.html','professor'],
  ['professor-turmas','/app/professor/turmas.html','professor'],
  ['professor-alunos','/app/professor/alunos.html','professor'],
  ['professor-exercicios','/app/professor/exercicios.html','professor'],
  ['professor-relatorios','/app/professor/relatorios.html','professor'],
  ['professor-perfil','/app/professor/perfil.html','professor']
];

(async () => {
  const LARG = (process.env.LARGURAS || '320,360,390,414,600,768,900,1024,1280,1440').split(',').map(Number);
  const SO = process.env.SO ? process.env.SO.split(',') : null;
  const browser = await chromium.launch();
  const out = [];
  for (const [nome, rota, tipo] of PAGINAS) {
    if (SO && !SO.includes(nome)) continue;
    for (const w of LARG) {
      const ctx = await contexto(browser, w, Boolean(tipo), tipo);
      const pg = await ctx.newPage();
      await pg.goto(BASE + rota, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(700);
      const r = await pg.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const visivel = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const recortado = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(s.overflowX)) return true; } return false; };
        const nome = (e) => (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 60);
        const res = { rolagem: document.documentElement.scrollWidth > vw + 1 ? document.documentElement.scrollWidth : 0, vazando: [], arrastar: [], alvos: [], miudo: 0 };
        for (const e of document.body.querySelectorAll('*')) {
          if (!visivel(e)) continue;
          const r = e.getBoundingClientRect();
          if ((r.right > vw + 1 || r.left < -1) && !recortado(e) && getComputedStyle(e).position !== 'fixed') res.vazando.push(nome(e) + ` (${Math.round(r.left)}..${Math.round(r.right)})`);
          const s = getComputedStyle(e);
          if (/(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2 && e.tagName !== 'TEXTAREA') res.arrastar.push(nome(e) + ` (${e.scrollWidth}/${e.clientWidth})`);
          if (e.matches('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=tab]') && !e.closest('.typing-input') && e.id !== 'typing-input') {
            const inline = e.matches('a') && getComputedStyle(e).display === 'inline' && e.closest('p,li,small,td,span');
            if (!inline && (r.height < 40 || r.width < 40) && !(e.matches('input[type=radio],input[type=checkbox]'))) res.alvos.push(nome(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(s.fontSize) < 11.5) res.miudo++;
        }
        res.vazando = [...new Set(res.vazando)].slice(0, 6); res.alvos = [...new Set(res.alvos)];
        return res;
      });
      const linha = [];
      if (r.rolagem) linha.push(`ROLAGEM LATERAL ${r.rolagem}px`);
      if (r.vazando.length) linha.push('vaza: ' + r.vazando.join(', '));
      if (r.arrastar.length) linha.push('arrastar: ' + r.arrastar.join(', '));
      if (r.alvos.length) linha.push(`alvos<40px (${r.alvos.length}): ` + r.alvos.slice(0, 6).join(', '));
      if (r.miudo) linha.push(`textos<11.5px: ${r.miudo}`);
      if (linha.length) out.push(`${nome}@${w}: ` + linha.join(' | '));
      await ctx.close();
    }
  }
  await browser.close();
  console.log(out.join('\n') || 'SEM PROBLEMAS');
})();
