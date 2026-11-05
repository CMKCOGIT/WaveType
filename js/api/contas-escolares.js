// js/api/contas-escolares.js
// Contas de aluno criadas pelo professor (migração 20261105000009).
import { supabase } from '../supabaseClient.js';
import { traduzErro } from '../auth.js';
import { gerarSenha, sugerirLogins } from '../contas/credenciais.js';

/**
 * Professor: cria contas de aluno na turma. A senha inicial é gerada aqui,
 * devolvida UMA vez para o professor (tela/cartões) e guardada só como hash.
 * Devolve [{ id, nome, login, senha }].
 */
export async function criarAlunosNaTurma(turmaId, nomes) {
  const sugestoes = sugerirLogins(nomes);
  const pedido = sugestoes.map(({ nome, login }) => ({ nome, login_base: login, senha: gerarSenha() }));
  const { data, error } = await supabase.rpc('professor_criar_alunos', { p_turma_id: turmaId, p_alunos: pedido });
  if (error) throw traduzErro(error);
  return (data ?? []).map((linha, i) => ({ id: linha.novo_id, nome: linha.novo_nome, login: linha.novo_login, senha: pedido[i].senha }));
}

/** Professor: nova senha para um aluno da escola. Devolve { login, senha }. */
export async function redefinirSenhaDoAluno(alunoId) {
  const senha = gerarSenha();
  const { data, error } = await supabase.rpc('professor_redefinir_senha_aluno', { p_aluno_id: alunoId, p_senha: senha });
  if (error) throw traduzErro(error);
  return { login: data, senha };
}

/** Professor: mapa aluno_id → login dos alunos com conta da escola (RLS filtra). */
export async function loginsDosAlunos(ids) {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from('contas_escolares').select('usuario_id, login').in('usuario_id', ids);
  if (error) {
    console.warn('Contas escolares indisponíveis (migração 09 aplicada?):', error.message);
    return new Map();
  }
  return new Map((data ?? []).map((c) => [c.usuario_id, c.login]));
}

/** Aluno: a própria conta da escola, ou null se não for conta escolar. */
export async function minhaContaEscolar() {
  const { data, error } = await supabase.rpc('minha_conta_escolar');
  if (error) {
    if (!/minha_conta_escolar|PGRST202/.test(`${error.code} ${error.message}`)) console.error(error);
    return null;
  }
  return data?.[0] ?? null;
}

/** Aluno: transforma a conta da escola em conta pessoal (mesmo ID e histórico). */
export async function transferirContaEscolar() {
  const { error } = await supabase.rpc('transferir_conta_escolar');
  if (error) throw traduzErro(error);
}

/** Professor: troca o usuário da escola. Devolve o usuário final (com sufixo se já existir). */
export async function alterarLoginDoAluno(alunoId, login) {
  const { data, error } = await supabase.rpc('professor_alterar_login_aluno', { p_aluno_id: alunoId, p_login: login });
  if (error) throw traduzErro(error);
  return data;
}
