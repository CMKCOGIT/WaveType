// js/api/dashboard.js
import { supabase } from '../supabaseClient.js';
import { listarMinhasTurmas } from './turmas.js';

/** Resumo do dashboard do aluno/usuário: perfil + últimas sessões + XP calculado. */
export async function carregarDashboardAluno() {
  const { data: sessao } = await supabase.auth.getSession();
  const alunoId = sessao.session?.user.id;
  if (!alunoId) throw new Error('Sessão expirada.');

  const [{ data: perfil, error: e1 }, { data: recentes, error: e2 }, { count, error: e3 }] = await Promise.all([
    supabase.from('usuarios').select('nome, xp, nivel, sequencia_dias, ultima_pratica_em').eq('id', alunoId).single(),
    supabase
      .from('resultados')
      .select('ppm, precisao, tempo_seg, criado_em, exercicios(titulo)')
      .eq('aluno_id', alunoId)
      .order('criado_em', { ascending: false })
      .limit(3),
    supabase.from('resultados').select('id', { count: 'exact', head: true }).eq('aluno_id', alunoId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  // A sequência só vale se a última prática foi hoje ou ontem.
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const sequenciaAtiva = perfil.ultima_pratica_em && perfil.ultima_pratica_em >= ontem.toISOString().slice(0, 10);

  const xpParaProximoNivel = perfil.nivel * 200;
  return {
    ...perfil,
    sequencia_dias: sequenciaAtiva ? perfil.sequencia_dias : 0,
    totalSessoes: count ?? recentes.length,
    xpParaProximoNivel,
    progressoNivel: Math.min(100, Math.round((perfil.xp / xpParaProximoNivel) * 100)),
    sessoesRecentes: recentes,
  };
}

/** Resumo do dashboard do professor: turmas, alunos e médias por turma. */
export async function carregarDashboardProfessor() {
  const turmas = await listarMinhasTurmas();
  return turmas.map((t) => ({
    id: t.id,
    nome: t.nome,
    status: t.status,
    alunos: Number(t.alunos ?? 0),
    ppmMedio: Number(t.ppm_medio ?? 0),
    precisaoMedia: Number(t.precisao_media ?? 0),
  }));
}
