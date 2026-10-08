// js/api/achievements.js
import { supabase } from '../supabaseClient.js';

/**
 * Retorna todas as conquistas do catálogo já marcadas com
 * { desbloqueada: boolean, desbloqueada_em } para renderizar
 * conquistas.html sem lógica extra na página.
 */
export async function listarConquistasComProgresso() {
  const { data: sessao } = await supabase.auth.getSession();
  const usuarioId = sessao.session?.user.id;

  const [{ data: catalogo, error: erro1 }, { data: minhas, error: erro2 }] = await Promise.all([
    supabase.from('conquistas').select('id, codigo, titulo, descricao, icone').order('id'),
    usuarioId
      ? supabase.from('usuario_conquistas').select('conquista_id, desbloqueada_em').eq('usuario_id', usuarioId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (erro1) throw erro1;
  if (erro2) throw erro2;

  const mapaDesbloqueadas = new Map(minhas.map((m) => [m.conquista_id, m.desbloqueada_em]));
  return catalogo.map((c) => ({
    ...c,
    desbloqueada: mapaDesbloqueadas.has(c.id),
    desbloqueada_em: mapaDesbloqueadas.get(c.id) || null,
  }));
}
