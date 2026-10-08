// js/api/dashboard.js
import { supabase } from '../supabaseClient.js';

/** Resumo do dashboard do aluno: perfil + últimas sessões + XP calculado. */
export async function carregarDashboardAluno() {
  const { data: sessao } = await supabase.auth.getSession();
  const alunoId = sessao.session?.user.id;
  if (!alunoId) throw new Error('Sessão expirada.');

  const [{ data: perfil, error: e1 }, { data: recentes, error: e2 }] = await Promise.all([
    supabase.from('usuarios').select('nome, xp, nivel, sequencia_dias').eq('id', alunoId).single(),
    supabase
      .from('resultados')
      .select('ppm, precisao, criado_em, exercicios(titulo)')
      .order('criado_em', { ascending: false })
      .limit(3),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const xpParaProximoNivel = perfil.nivel * 200;
  return {
    ...perfil,
    xpParaProximoNivel,
    progressoNivel: Math.min(100, Math.round((perfil.xp / xpParaProximoNivel) * 100)),
    sessoesRecentes: recentes,
  };
}

/** Resumo do dashboard do professor: turmas ativas, médias e alunos sem prática recente. */
export async function carregarDashboardProfessor() {
  const { data: turmas, error } = await supabase
    .from('turmas')
    .select(`
      id, nome, status,
      matriculas:matriculas(count),
      exercicios:exercicios(resultados(ppm, precisao, criado_em))
    `);
  if (error) throw error;

  return turmas.map((t) => {
    const resultados = t.exercicios.flatMap((e) => e.resultados);
    const ppmMedio = media(resultados.map((r) => r.ppm));
    const precisaoMedia = media(resultados.map((r) => r.precisao));
    return {
      id: t.id,
      nome: t.nome,
      status: t.status,
      alunos: t.matriculas?.[0]?.count ?? 0,
      ppmMedio,
      precisaoMedia,
    };
  });
}

function media(numeros) {
  if (!numeros.length) return 0;
  return Math.round((numeros.reduce((a, b) => a + Number(b), 0) / numeros.length) * 10) / 10;
}
