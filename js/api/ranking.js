// js/api/ranking.js
import { supabase } from '../supabaseClient.js';

/** Top 20 de um exercício específico (ranking.html). */
export async function buscarRankingExercicio(exercicioId) {
  const { data, error } = await supabase.rpc('ranking_exercicio', { p_exercicio_id: exercicioId });
  if (error) throw error;
  return data;
}
