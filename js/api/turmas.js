// js/api/turmas.js
import { supabase } from '../supabaseClient.js';

/** Professor: as próprias turmas com alunos ativos, atividades e médias. */
export async function listarMinhasTurmas() {
  const { data, error } = await supabase.rpc('resumo_turmas_professor');
  if (error) throw error;
  return data ?? [];
}

/** Aluno: turmas em que está matriculado. */
export async function listarMinhasMatriculas() {
  const { data: sessao } = await supabase.auth.getSession();
  const alunoId = sessao.session?.user.id;
  const { data, error } = await supabase
    .from('matriculas')
    .select('turma_id, entrou_em, turmas(id, nome, descricao, ano_letivo, status)')
    .eq('aluno_id', alunoId)
    .eq('ativa', true)
    .order('entrou_em', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Professor: cria uma turma. O código de convite é gerado pelo banco. */
export async function criarTurma({ nome, descricao, ano_letivo, modo_erros = null }) {
  const { data: sessao } = await supabase.auth.getSession();
  const professorId = sessao.session?.user.id;
  if (!professorId) throw new Error('Sessão expirada. Entre novamente.');

  const registro = { nome, descricao: descricao || null, ano_letivo: ano_letivo || null, professor_id: professorId };
  if (modo_erros) registro.modo_erros = modo_erros;
  const { data, error } = await semColunaModoErros(registro, (r) => supabase.from('turmas').insert(r).select().single());
  if (error) throw new Error('Não foi possível criar a turma.');
  return data;
}

/** Professor: edita nome, descrição, ano letivo ou status (ativa/encerrada). */
export async function atualizarTurma(id, campos) {
  const permitidos = ['nome', 'descricao', 'ano_letivo', 'status', 'modo_erros'];
  const dados = Object.fromEntries(Object.entries(campos).filter(([chave]) => permitidos.includes(chave)));
  const { data, error } = await semColunaModoErros(dados, (r) => supabase.from('turmas').update(r).eq('id', id).select().single());
  if (error) throw new Error('Não foi possível salvar a turma.');
  return data;
}

export async function excluirTurma(id) {
  const { error } = await supabase.rpc('excluir_turma', { p_turma_id: id });
  if (error) throw new Error(error.message);
}

export async function regenerarCodigoTurma(id) {
  const { data, error } = await supabase.rpc('regenerar_codigo_turma', { p_turma_id: id });
  if (error) throw new Error(error.message);
  return data;
}

/** Aluno: entra numa turma usando o código do professor. */
export async function entrarNaTurma(codigoConvite) {
  const { data, error } = await supabase.rpc('entrar_na_turma', { p_codigo: codigoConvite });
  if (error) throw new Error(error.message || 'Código inválido ou turma encerrada.');
  return data;
}

/** Professor: alunos ativos de uma turma, com estatísticas. */
export async function listarAlunosDaTurma(turmaId) {
  const { data, error } = await supabase.rpc('alunos_da_turma', { p_turma_id: turmaId });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Professor: adiciona um aluno pelo código curto (ou pelo ID longo). */
export async function adicionarAluno(turmaId, identificador) {
  const { error } = await supabase.rpc('adicionar_aluno', { p_turma_id: turmaId, p_identificador: identificador });
  if (error) throw new Error(error.message);
}

/** Professor: adiciona um aluno pelo ID do perfil. */
export async function adicionarAlunoPorId(turmaId, alunoId) {
  const { error } = await supabase.rpc('adicionar_aluno_por_id', { p_turma_id: turmaId, p_aluno_id: alunoId });
  if (error) throw new Error(error.message);
}

/** Professor: remove o aluno da turma (os resultados dele são mantidos). */
export async function removerAlunoDaTurma(turmaId, alunoId) {
  const { error } = await supabase.rpc('remover_aluno_da_turma', { p_turma_id: turmaId, p_aluno_id: alunoId });
  if (error) throw new Error(error.message);
}

/**
 * Modo de erros das turmas (id → 'fluxo' | 'correcao' | null).
 * Banco sem a migração 08 (coluna modo_erros): devolve um mapa vazio.
 */
export async function modosDeErroDasTurmas(ids = null) {
  let consulta = supabase.from('turmas').select('id, modo_erros');
  if (ids) consulta = consulta.in('id', ids);
  const { data, error } = await consulta;
  if (error) {
    if (/modo_erros/.test(error.message || '')) console.warn('Banco sem a coluna turmas.modo_erros: rode a migração 20261105000008.');
    else console.error(error);
    return new Map();
  }
  return new Map((data ?? []).map((t) => [t.id, t.modo_erros ?? null]));
}

// Banco sem a migração 08: o PostgREST recusa a coluna ANTES de gravar
// (PGRST204), então repetir sem ela não duplica nada.
async function semColunaModoErros(registro, enviar) {
  let resposta = await enviar(registro);
  if (resposta.error?.code === 'PGRST204' && /modo_erros/.test(resposta.error.message) && 'modo_erros' in registro) {
    console.warn('Banco sem a coluna turmas.modo_erros: rode a migração 20261105000008.');
    const { modo_erros: _ignorado, ...resto } = registro;
    resposta = await enviar(resto);
  }
  return resposta;
}
