// js/api/achievements.js
import { supabase } from '../supabaseClient.js';

/**
 * Todas as conquistas disponíveis para o tipo de conta, com o progresso
 * real (atual x alvo) calculado no banco a partir dos resultados.
 * Antes de ler, pede ao banco para liberar o que já foi alcançado
 * (cobre resultados anteriores à gamificação). Nada é liberado só por
 * abrir a tela: o banco confere os números de verdade.
 */
export async function listarConquistasComProgresso() {
  const sincronizacao = await supabase.rpc('sincronizar_conquistas');
  if (sincronizacao.error) console.error('Falha ao sincronizar conquistas:', sincronizacao.error);

  const { data, error } = await supabase.rpc('progresso_conquistas');
  if (error) throw error;
  return (data ?? []).map((c) => ({
    ...c,
    atual: c.atual == null ? null : Number(c.atual),
    alvo: c.alvo == null ? null : Number(c.alvo),
  }));
}
