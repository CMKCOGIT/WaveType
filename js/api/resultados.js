// js/api/resultados.js
import { supabase } from '../supabaseClient.js';

/**
 * Chamado ao final de uma sessão de digitação (treinar.html).
 * O banco decide sozinho, no trigger resultados_validar, se o resultado
 * conclui o exercício (ex.: Nível 6 exige precisão acima de 85%) e em
 * qual turma uma atividade é registrada. Os gatilhos seguintes atualizam
 * XP, sequência de dias e conquistas. Nada disso é confiado ao navegador.
 *
 * Devolve { resultado, novasConquistas }.
 */
export async function registrarResultado({ exercicio_id, turma_id = null, ppm, precisao, acertos, erros, tempo_seg }) {
  const { data: sessao } = await supabase.auth.getSession();
  const alunoId = sessao.session?.user.id;
  if (!alunoId) throw new Error('Sessão expirada. Entre novamente.');

  const { data, error } = await supabase
    .from('resultados')
    .insert({ aluno_id: alunoId, exercicio_id, turma_id, ppm, precisao, acertos, erros, tempo_seg })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return { resultado: data, novasConquistas: await conquistasLiberadasEm(alunoId, data.criado_em) };
}

// As conquistas liberadas pelo trigger têm o mesmo horário da transação do resultado.
async function conquistasLiberadasEm(usuarioId, momento) {
  try {
    const { data, error } = await supabase
      .from('usuario_conquistas')
      .select('desbloqueada_em, conquistas(codigo, titulo, descricao, icone)')
      .eq('usuario_id', usuarioId)
      .gte('desbloqueada_em', momento);
    if (error) throw error;
    return (data ?? []).map((d) => d.conquistas).filter(Boolean);
  } catch (erro) {
    console.error('Falha ao buscar conquistas novas:', erro);
    return [];
  }
}

/** Histórico de sessões (resultados.html e progresso dos exercícios). */
export async function listarMeusResultados({ limite = 20 } = {}) {
  const { data: sessao } = await supabase.auth.getSession();
  const alunoId = sessao.session?.user.id;
  if (!alunoId) throw new Error('Sessão expirada. Entre novamente.');

  const { data, error } = await supabase
    .from('resultados')
    .select('id, exercicio_id, turma_id, ppm, precisao, acertos, erros, tempo_seg, concluido, criado_em, exercicios(titulo, nivel_trilha)')
    .eq('aluno_id', alunoId)
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}
