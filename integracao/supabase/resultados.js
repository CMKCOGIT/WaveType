// resultados.js
import { supabase } from './supabaseClient.js';
import { exigirSessao } from './auth.js';

export async function salvarResultado({ exercicioId, ppm, precisao, acertos, erros, tempoSeg }) {
  // Validação de sanidade no cliente. O cálculo de PPM/precisão é feito no
  // frontend durante o treino, então NUNCA confie cegamente nesses números:
  // travas de faixa aqui pelo menos filtram erros e tentativas óbvias de
  // manipulação. Para uma proteção mais forte, valide de novo numa Edge
  // Function antes do insert (o cliente pode ser adulterado no navegador).
  if (!Number.isInteger(exercicioId)) throw new Error('Exercício inválido.');
  if (typeof ppm !== 'number' || !Number.isFinite(ppm) || ppm < 0 || ppm > 1000) {
    throw new Error('PPM inválido.');
  }
  if (typeof precisao !== 'number' || !Number.isFinite(precisao) || precisao < 0 || precisao > 100) {
    throw new Error('Precisão inválida.');
  }
  if (!Number.isInteger(acertos) || acertos < 0) throw new Error('Número de acertos inválido.');
  if (!Number.isInteger(erros) || erros < 0) throw new Error('Número de erros inválido.');
  if (!Number.isInteger(tempoSeg) || tempoSeg < 0 || tempoSeg > 3600) throw new Error('Tempo inválido.');

  const session = await exigirSessao();

  const { data, error } = await supabase
    .from('resultados')
    .insert({
      aluno_id: session.user.id,
      exercicio_id: exercicioId,
      ppm,
      precisao,
      acertos,
      erros,
      tempo_seg: tempoSeg,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listarMeusResultados({ exercicioId } = {}) {
  const session = await exigirSessao();

  let query = supabase
    .from('resultados')
    .select('id, exercicio_id, ppm, precisao, acertos, erros, tempo_seg, criado_em')
    .eq('aluno_id', session.user.id);

  if (exercicioId !== undefined) query = query.eq('exercicio_id', exercicioId);

  const { data, error } = await query.order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// Usa a função ranking_exercicio(p_exercicio_id) definida no schema.sql
// (SECURITY DEFINER), porque a RLS de "usuarios" normalmente impediria
// ler o nome de outros alunos direto pelas tabelas.
export async function buscarRankingExercicio(exercicioId) {
  if (!Number.isInteger(exercicioId)) throw new Error('Exercício inválido.');
  await exigirSessao();

  const { data, error } = await supabase.rpc('ranking_exercicio', { p_exercicio_id: exercicioId });
  if (error) throw new Error(error.message);
  return data;
}
