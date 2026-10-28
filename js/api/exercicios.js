// js/api/exercicios.js
import { supabase } from '../supabaseClient.js';

/** Trilha oficial do WaveType (níveis 1 a 6, 20 exercícios cada). */
export async function listarExercicios() {
  const { data, error } = await supabase
    .from('exercicios')
    .select('id, nivel_trilha, ordem, titulo')
    .not('nivel_trilha', 'is', null)
    .order('nivel_trilha', { ascending: true })
    .order('ordem', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((e) => ({
    id: e.id,
    nivel: Number(e.nivel_trilha),
    ordem: Number(e.ordem),
    titulo: e.titulo,
  }));
}

/**
 * Um exercício para a tela de treino: da trilha (nivel/ordem preenchidos)
 * ou atividade de professor (atividade = true). A RLS só devolve o que a
 * pessoa pode ver.
 */
export async function buscarExercicio(id) {
  const { data, error } = await supabase
    .from('exercicios')
    .select('id, nivel_trilha, ordem, titulo, texto_referencia, instrucoes, prazo, meta_precisao, tempo_limite_seg')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const atividade = data.nivel_trilha == null;
  return {
    id: data.id,
    atividade,
    nivel: atividade ? null : Number(data.nivel_trilha),
    ordem: atividade ? null : Number(data.ordem),
    titulo: data.titulo,
    texto_referencia: data.texto_referencia,
    instrucoes: data.instrucoes ?? null,
    prazo: data.prazo ?? null,
    meta_precisao: data.meta_precisao == null ? null : Number(data.meta_precisao),
    tempo_limite_seg: data.tempo_limite_seg,
  };
}

// --- Atividades de professor: área do aluno ---

/**
 * Atividades das turmas do aluno, já com turma(s), professor e situação
 * (pendente / concluida / atrasada). Uma linha por atividade.
 */
export async function listarMinhasAtividades() {
  const { data, error } = await supabase.rpc('minhas_atividades');
  if (error) throw error;
  return data ?? [];
}

/** Atividades visíveis ao aluno (ranking e painel). */
export async function listarExerciciosDisponiveis() {
  const atividades = await listarMinhasAtividades();
  return atividades.map((a) => ({ id: a.id, titulo: a.titulo, turma_nome: a.turmas }));
}

// --- Atividades de professor: área do professor ---

export async function listarAtividadesDoProfessor() {
  const { data, error } = await supabase.rpc('atividades_do_professor');
  if (error) throw error;
  return data ?? [];
}

/** Cria (id null) ou edita uma atividade e define as turmas destinatárias. */
export async function salvarAtividade({
  id = null,
  titulo,
  instrucoes,
  texto_referencia,
  nivel,
  tempo_limite_seg,
  prazo,
  meta_precisao,
  turmas,
  publicado = true,
}) {
  const { data, error } = await supabase.rpc('salvar_atividade', {
    p_id: id,
    p_titulo: titulo,
    p_instrucoes: instrucoes || null,
    p_texto: texto_referencia,
    p_nivel: nivel,
    p_tempo_limite_seg: tempo_limite_seg,
    p_prazo: prazo || null,
    p_meta_precisao: meta_precisao ?? null,
    p_turmas: turmas,
    p_publicado: publicado,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Exclui; se já houver resultados, arquiva. Devolve 'excluida' ou 'arquivada'. */
export async function excluirAtividade(id) {
  const { data, error } = await supabase.rpc('excluir_atividade', { p_id: id });
  if (error) throw new Error(error.message);
  return data;
}
