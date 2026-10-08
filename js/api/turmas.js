// js/api/turmas.js
import { supabase } from '../supabaseClient.js';

/** Professor: lista as próprias turmas com contagem de alunos e médias. */
export async function listarMinhasTurmas() {
  const { data, error } = await supabase
    .from('turmas')
    .select(`
      id, nome, ano_letivo, status, codigo_convite, criado_em,
      matriculas:matriculas(count)
    `)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data;
}

/** Aluno: lista as turmas em que está matriculado. */
export async function listarMinhasMatriculas() {
  const { data, error } = await supabase
    .from('matriculas')
    .select('turma_id, ativa, turmas(id, nome, status)')
    .eq('ativa', true);
  if (error) throw error;
  return data;
}

/** Professor: cria uma turma nova, pedindo o código de convite ao banco. */
export async function criarTurma({ nome, ano_letivo }) {
  const { data: sessao } = await supabase.auth.getSession();
  const professorId = sessao.session?.user.id;
  if (!professorId) throw new Error('Sessão expirada. Entre novamente.');

  const { data: codigo, error: erroCodigo } = await supabase.rpc('gerar_codigo_convite');
  if (erroCodigo) throw erroCodigo;

  const { data, error } = await supabase
    .from('turmas')
    .insert({ nome, ano_letivo, professor_id: professorId, codigo_convite: codigo })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Aluno: entra numa turma usando o código do professor (RPC, ver schema.sql). */
export async function entrarNaTurma(codigoConvite) {
  const { data, error } = await supabase.rpc('entrar_na_turma', { p_codigo: codigoConvite });
  if (error) throw new Error('Código inválido ou turma encerrada.');
  return data;
}

/** Professor: alunos matriculados numa turma específica, com estatísticas. */
export async function listarAlunosDaTurma(turmaId) {
  const { data, error } = await supabase
    .from('matriculas')
    .select('aluno_id, usuarios(id, nome, email)')
    .eq('turma_id', turmaId)
    .eq('ativa', true);
  if (error) throw error;
  return data;
}
