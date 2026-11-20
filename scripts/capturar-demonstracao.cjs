// Captura as telas reais da plataforma com dados de demonstração (Supabase simulado)
// para a vitrine do site (index.html > #demonstracao). Como usar:
//   VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon-teste npx vite --port 5173
//   node scripts/capturar-demonstracao.cjs /pasta/de/saida
// Depois converta os PNG para WebP em assets/images/demonstracao/ (ex.: cwebp -q 82).
const { chromium } = require('playwright');
const OUT = process.argv[2];
const hoje = new Date(); const dia = (d, h) => { const x = new Date(hoje); x.setDate(x.getDate() - d); x.setHours(h, 12, 0, 0); return x.toISOString(); };
const PERFIS = {
  aluno: { id: 'a1', nome: 'Lucas Ferreira', email: 'lucas@escola.exemplo', tipo: 'aluno', codigo_aluno: 'FDU3PW' },
  professor: { id: 'p1', nome: 'Carlos Menezes', email: 'carlos@escola.exemplo', tipo: 'professor' },
  usuario: { id: 'u1', nome: 'Ana Ribeiro', email: 'ana@exemplo.com', tipo: 'usuario' },
};
const recentes = [
  { ppm: 56, precisao: 98.2, tempo_seg: 120, criado_em: dia(0, 10), exercicios: { titulo: 'Acentuação e pontuação' } },
  { ppm: 54.5, precisao: 97.4, tempo_seg: 90, criado_em: dia(1, 15), exercicios: { titulo: 'Fileira superior · lição 8' } },
  { ppm: 52, precisao: 96.8, tempo_seg: 120, criado_em: dia(2, 9), exercicios: { titulo: 'Texto: A prática diária' } },
];
const ranking = [
  { posicao: 1, pontuacao: 72.9, ppm: 71, precisao: 98.9, voce: false, participantes: 28 },
  { posicao: 2, pontuacao: 56.0, ppm: 56, precisao: 98.2, voce: true, participantes: 28 },
  { posicao: 3, pontuacao: 52.8, ppm: 54, precisao: 96.1, voce: false, participantes: 28 },
  { posicao: 4, pontuacao: 51.9, ppm: 53, precisao: 95.4, voce: false, participantes: 28 },
  { posicao: 5, pontuacao: 48.3, ppm: 50, precisao: 94.7, voce: false, participantes: 28 },
];
const turmasProf = [
  { id: 1, nome: '3º Ano A', status: 'ativa', alunos: 28, ppm_medio: 55.2, precisao_media: 95.6 },
  { id: 2, nome: '3º Ano B', status: 'ativa', alunos: 31, ppm_medio: 51.8, precisao_media: 94.1 },
  { id: 3, nome: '2º Ano C', status: 'ativa', alunos: 26, ppm_medio: 53.1, precisao_media: 94.7 },
  { id: 4, nome: 'Oficina 2025', status: 'encerrada', alunos: 18, ppm_medio: 47.9, precisao_media: 92.3 },
];
function token(u) { const a = Math.floor(Date.now() / 1000); return JSON.stringify({ access_token: 't', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: a + 3600, user: { id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated', app_metadata: { providers: ['email'] }, user_metadata: { convite_nivelamento_visto: true } } }); }
async function capturar(nav, papel, tema) {
  const U = { ...PERFIS[papel], tipo_definido: true, ativo: true, xp: 420, nivel: 4, sequencia_dias: 7, ultima_pratica_em: hoje.toISOString().slice(0, 10) };
  const c = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
  await c.route('https://mock.supabase.co/**', async (r) => {
    const u = new URL(r.request().url()); const metodo = r.request().method();
    const objeto = r.request().headers()['accept']?.includes('vnd.pgrst.object');
    if (u.pathname === '/auth/v1/user') return r.fulfill({ json: { id: U.id, email: U.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { convite_nivelamento_visto: true } } });
    if (u.pathname === '/rest/v1/usuarios') return r.fulfill({ json: objeto ? U : [U] });
    if (u.pathname === '/rest/v1/nivelamentos') return r.fulfill({ json: [{ nivel: 'intermediario', licao_nivel: 3, licao_ordem: 4, teclas_frageis: [], criado_em: dia(6, 14) }] });
    if (u.pathname === '/rest/v1/exercicios') return r.fulfill({ json: [{ id: 'e34', nivel_trilha: 3, ordem: 4, titulo: 'Fileira inferior' }] });
    if (u.pathname === '/rest/v1/matriculas') return r.fulfill({ json: papel === 'aluno' ? [{ turma_id: 1, entrou_em: dia(40, 8), turmas: { id: 1, nome: '3º Ano A', descricao: '', ano_letivo: '2026', status: 'ativa' } }] : [] });
    if (u.pathname === '/rest/v1/rpc/ranking_turma') return r.fulfill({ json: ranking });
    if (u.pathname === '/rest/v1/rpc/resumo_turmas_professor') return r.fulfill({ json: turmasProf });
    if (u.pathname === '/rest/v1/resultados') {
      if (metodo === 'HEAD') return r.fulfill({ status: 200, headers: { 'content-range': '0-2/24' }, body: '' });
      return r.fulfill({ json: recentes });
    }
    return r.fulfill({ json: [] });
  });
  await c.addInitScript(([k, v, t]) => { localStorage.setItem(k, v); localStorage.setItem('wavetype_theme', t); }, ['sb-mock-auth-token', token(U), tema]);
  const p = await c.newPage();
  p.on('pageerror', (e) => console.log('ERR', papel, e.message));
  await p.goto(`http://localhost:5173/app/${papel}/index.html`);
  await p.waitForTimeout(2500);
  // Mostra tudo já "revelado" (sem animação de entrada)
  await p.addStyleTag({ content: '*{animation:none!important;transition:none!important} [data-wt-reveal],[data-reveal]{opacity:1!important;transform:none!important}' });
  await p.evaluate(() => document.querySelectorAll('*').forEach((e) => { if (getComputedStyle(e).opacity === '0' && e.closest('.app-main')) e.style.opacity = '1'; }));
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${papel}-${tema}.png` });
  await c.close();
}
(async () => {
  const nav = await chromium.launch();
  for (const papel of ['aluno', 'professor', 'usuario']) for (const tema of ['light', 'dark']) await capturar(nav, papel, tema);
  await nav.close();
})();
