// js/api/resultados.js
import { supabase } from '../supabaseClient.js';
import { traduzErro } from '../auth.js';

/**
 * Chamado ao final de uma sessão de digitação (treinar.html).
 * O banco decide sozinho, no trigger resultados_validar, se o resultado
 * conclui o exercício (precisão mínima e tempo máximo) e em
 * qual turma uma atividade é registrada. Os gatilhos seguintes atualizam
 * XP, sequência de dias e conquistas. Nada disso é confiado ao navegador.
 *
 * Devolve { resultado, novasConquistas }.
 */
export async function registrarResultado({ exercicio_id, turma_id = null, ppm, precisao, acertos, erros, tempo_seg, concluiu_texto = true }) {
  const { data: sessao } = await supabase.auth.getSession();
  const alunoId = sessao.session?.user.id;
  if (!alunoId) throw new Error('Sessão expirada. Entre novamente.');

  const registro = { aluno_id: alunoId, exercicio_id, turma_id, ppm, precisao, acertos, erros, tempo_seg, concluiu_texto };
  let { data, error } = await inserir(registro);

  // Banco sem a migração 05 (coluna concluiu_texto): a requisição é recusada
  // ANTES de gravar (PGRST204), então repetir sem a coluna não duplica nada.
  // Assim a tentativa não se perde; a regra de tempo volta a valer quando a
  // migração for aplicada.
  if (error?.code === 'PGRST204' && /concluiu_texto/.test(error.message)) {
    console.warn('Banco sem a coluna resultados.concluiu_texto: rode a migração 20261028000005.');
    delete registro.concluiu_texto;
    ({ data, error } = await inserir(registro));
  }
  if (error) throw traduzErro(error);

  return { resultado: data, novasConquistas: await conquistasLiberadasEm(alunoId, data.criado_em) };
}

function inserir(registro) {
  return supabase.from('resultados').insert(registro).select().single();
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
