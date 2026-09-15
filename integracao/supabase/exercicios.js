// exercicios.js
import { supabase } from './supabaseClient.js';
import { exigirSessao } from './auth.js';

const LIMITE_TEXTO_REFERENCIA = 20000; // trava contra payloads absurdamente grandes

export async function criarExercicio({ titulo, textoReferencia, tempoLimiteSeg, turmaId = null }) {
  if (!titulo || titulo.trim().length < 2 || titulo.length > 150) {
    throw new Error('Título inválido (2 a 150 caracteres).');
  }
  if (!textoReferencia || textoReferencia.trim().length < 10 || textoReferencia.length > LIMITE_TEXTO_REFERENCIA) {
    throw new Error(`Texto de referência inválido (10 a ${LIMITE_TEXTO_REFERENCIA} caracteres).`);
  }
  if (!Number.isInteger(tempoLimiteSeg) || tempoLimiteSeg <= 0 || tempoLimiteSeg > 3600) {
    throw new Error('Tempo limite inválido (1 a 3600 segundos).');
  }
  if (turmaId !== null && !Number.isInteger(turmaId)) {
    throw new Error('Turma inválida.');
  }

  const session = await exigirSessao();

  const { data, error } = await supabase
    .from('exercicios')
    .insert({
      titulo: titulo.trim(),
      texto_referencia: textoReferencia,
      tempo_limite_seg: tempoLimiteSeg,
      criado_por: session.user.id,
      turma_id: turmaId,
    })
    .select()
    .single();

  // a RLS barra quem não é professor, mas devolvemos mensagem clara mesmo assim
  if (error) throw new Error(error.message);
  return data;
}

export async function listarExercicios({ turmaId } = {}) {
  await exigirSessao();

  let query = supabase
    .from('exercicios')
    .select('id, titulo, texto_referencia, tempo_limite_seg, turma_id, criado_em');

  if (turmaId !== undefined) query = query.eq('turma_id', turmaId);

  const { data, error } = await query.order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function buscarExercicio(exercicioId) {
  if (!Number.isInteger(exercicioId)) throw new Error('Exercício inválido.');
  await exigirSessao();

  const { data, error } = await supabase
    .from('exercicios')
    .select('id, titulo, texto_referencia, tempo_limite_seg, turma_id, criado_em')
    .eq('id', exercicioId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
