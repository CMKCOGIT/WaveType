// js/api/exercicios.js
import { supabase } from '../supabaseClient.js';

export async function listarExercicios() {
  const { data, error } = await supabase
    .from('exercicios')
    .select('id, nivel_trilha, ordem, titulo')
    .not('nivel_trilha', 'is', null)
    .order('nivel_trilha', { ascending: true })
    .order('ordem', { ascending: true });

  if (error) {
    console.error('Erro ao buscar exercícios:', error);
    throw error;
  }

  console.log('Exercícios recebidos do Supabase:', data);
  console.log('Quantidade recebida:', data?.length ?? 0);

  return (data ?? []).map((e) => ({
    id: e.id,
    nivel: Number(e.nivel_trilha),
    ordem: Number(e.ordem),
    titulo: e.titulo,
  }));
}
export async function buscarExercicio(id) {
  const { data, error } = await supabase
    .from('exercicios')
    .select('id, nivel_trilha, ordem, titulo, texto_referencia')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar exercício:', error);
    throw error;
  }

  return {
    id: data.id,
    nivel: Number(data.nivel_trilha),
    ordem: Number(data.ordem),
    titulo: data.titulo,
    texto_referencia: data.texto_referencia,
  };
}

// --- Turmas: usadas pelas páginas de aluno e professor ---
/**
 * Aluno: exercícios disponíveis nas turmas em que está matriculado,
 * já filtrado pela RLS (só vê o que a policy exercicios_select libera).
 */
export async function listarExerciciosDisponiveis() {
  const { data, error } = await supabase
    .from('exercicios')
    .select('id, titulo, texto_referencia, tempo_limite_seg, nivel, turma_id, turmas(nome)')
    .eq('publicado', true)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

/** Professor: exercícios criados por ele (rascunhos inclusos). */
export async function listarMeusExercicios() {
  const { data, error } = await supabase
    .from('exercicios')
    .select('id, titulo, texto_referencia, tempo_limite_seg, nivel, publicado, turma_id, turmas(nome), resultados(count)')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

export async function criarExercicio({ titulo, texto_referencia, tempo_limite_seg, nivel, turma_id, publicado }) {
  const { data: sessao } = await supabase.auth.getSession();
  const criadoPor = sessao.session?.user.id;
  if (!criadoPor) throw new Error('Sessão expirada. Entre novamente.');

  const { data, error } = await supabase
    .from('exercicios')
    .insert({ titulo, texto_referencia, tempo_limite_seg, nivel, turma_id: turma_id || null, publicado: publicado ?? true, criado_por: criadoPor })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarExercicio(id, campos) {
  const { data, error } = await supabase.from('exercicios').update(campos).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function excluirExercicio(id) {
  const { error } = await supabase.from('exercicios').delete().eq('id', id);
  if (error) throw error;
}
