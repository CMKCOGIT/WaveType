// js/api/exercicios.js
import { supabase } from '../supabaseClient.js';

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
