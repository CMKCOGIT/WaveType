
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