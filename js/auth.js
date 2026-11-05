// js/auth.js
// Toda a lógica de autenticação fica aqui para não duplicar código
// entre cadastro.html, login.html e as páginas internas.

import { supabase } from './supabaseClient.js';
import {
  obterSessao,
  obterPerfil,
  exigirPapel,
  sair,
  irParaArea,
  atualizarPapelDaSessao,
  cadastroIncompleto,
  destinoDoPerfil,
} from './sessao/sessao.js';
import { DESTINOS, PAGINA_COMPLETAR_CADASTRO } from './sessao/regras.js';

// A sessão (validar, proteger rotas, sair) mora em js/sessao/. Reexportada
// aqui para as páginas que já importam de auth.js.
export { obterSessao, obterPerfil, exigirPapel, sair, irParaArea, cadastroIncompleto, destinoDoPerfil, DESTINOS, PAGINA_COMPLETAR_CADASTRO };
export const TIPO_PENDENTE = 'wavetype_tipo_pendente';

/**
 * Cria a conta no Supabase Auth. O perfil em public.usuarios é criado
 * sozinho pelo trigger on_auth_user_created — o front NUNCA faz insert
 * direto em public.usuarios.
 */
export async function cadastrarUsuario({ nome, email, senha, tipo }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, tipo }, // vai para raw_user_meta_data, lido pelo trigger
      emailRedirectTo: `${window.location.origin}/login.html`,
    },
  });
  if (error) throw traduzErro(error);
  return data;
}

export async function entrarComEmailSenha({ email, senha }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw traduzErro(error);
  return data;
}

/**
 * Login/cadastro com Google. O Google devolve a pessoa para a mesma tela
 * de onde ela saiu (login ou cadastro), que confirma a sessão com um
 * carregamento discreto e segue direto para a área certa.
 * A URL de retorno usa a origem atual, então funciona em localhost, no
 * domínio de produção e nos previews da Vercel — desde que essas origens
 * estejam em Supabase > Authentication > URL Configuration > Redirect URLs.
 */
export async function entrarComGoogle({ origem = 'login' } = {}) {
  const pagina = origem === 'cadastro' ? '/cadastro.html' : '/login.html';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${pagina}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw traduzErro(error);
  return data;
}

/**
 * "Esqueci minha senha": o Supabase envia um link de uso único que volta para
 * /redefinir-senha.html. A resposta é a mesma exista ou não a conta, para não
 * revelar quais e-mails estão cadastrados.
 */
export async function solicitarRecuperacaoSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha.html`,
  });
  if (!error) return;
  if (error.status === 429 || /security purposes|rate limit/i.test(error.message)) {
    throw new Error('Muitas solicitações seguidas. Aguarde um minuto e tente de novo.');
  }
  throw traduzErro(error);
}

/** Define a nova senha da sessão aberta pelo link de recuperação. */
export async function definirNovaSenha(senha) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (!error) return;
  if (/different from the old password/i.test(error.message)) {
    throw new Error('A nova senha precisa ser diferente da anterior.');
  }
  if (/session missing|expired|invalid/i.test(error.message)) {
    throw new Error('Este link expirou ou já foi usado. Peça um novo link de recuperação.');
  }
  throw traduzErro(error);
}

/** Formas de login da conta atual (ex.: ['google'], ['email', 'google']). */
export async function metodosDeLogin() {
  // getUser consulta o Supabase; a sessão guardada no navegador pode estar desatualizada.
  const { data } = await supabase.auth.getUser();
  const usuario = data?.user;
  const providers = usuario?.app_metadata?.providers ?? usuario?.identities?.map((i) => i.provider) ?? [];
  return [...new Set(providers)];
}

/** Troca a própria conta entre "usuario" e "aluno" (RPC alterar_tipo_conta). */
export async function alterarTipoConta(tipo) {
  const { error } = await supabase.rpc('alterar_tipo_conta', { p_tipo: tipo });
  if (error) throw traduzErro(error);
  atualizarPapelDaSessao(tipo);
}

/** Altera o nome exibido (a única coluna do perfil que o próprio usuário edita). */
export async function atualizarNome(nome) {
  const sessao = await obterSessao();
  if (!sessao) throw new Error('Sessão expirada. Entre novamente.');
  const { error } = await supabase.from('usuarios').update({ nome }).eq('id', sessao.user.id);
  if (error) throw traduzErro(error);
}

/**
 * Troca de senha na página Perfil. Quem já tem senha precisa informar a
 * atual (conferida antes da troca). Quem só entra com o Google pode criar
 * uma senha se quiser; nada é criado sem esse pedido.
 */
export async function alterarSenha({ senhaAtual, novaSenha }) {
  const sessao = await obterSessao();
  if (!sessao) throw new Error('Sessão expirada. Entre novamente.');

  if (senhaAtual != null) {
    const { error } = await supabase.auth.signInWithPassword({ email: sessao.user.email, password: senhaAtual });
    if (error) {
      if (error.message === 'Invalid login credentials') throw new Error('A senha atual está incorreta.');
      throw traduzErro(error);
    }
  }

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (!error) return;
  if (/different from the old password/i.test(error.message)) {
    throw new Error('A nova senha precisa ser diferente da atual.');
  }
  if (error.code === 'reauthentication_needed' || /reauthenticat/i.test(error.message)) {
    throw new Error('Por segurança, saia e entre de novo na sua conta antes de trocar a senha.');
  }
  throw traduzErro(error);
}

/**
 * Senha da conta criada com o Google, pedida na conclusão do cadastro.
 * Se a mesma senha já foi gravada numa tentativa anterior, não é erro.
 */
export async function criarSenhaDaConta(senha) {
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (!error || /different from the old password/i.test(error.message)) return;
  if (error.code === 'weak_password' || /weak|at least/i.test(error.message)) {
    throw new Error('Essa senha é fraca demais. Use 8+ caracteres, com letra e número.');
  }
  throw traduzErro(error);
}

/** Regras de senha do cadastro (8+ caracteres, com letra e número). */
export function validarSenha(senha) {
  if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha precisa ter 8+ caracteres, com letra e número.';
  }
  return null;
}

/**
 * Grava tipo e nome de um cadastro incompleto (RPC concluir_cadastro) e
 * confere no banco se ficou gravado. Sem essa conferência, uma falha
 * silenciosa mandava a pessoa de volta para esta mesma tela a cada login.
 */
export async function concluirCadastro({ tipo, nome }) {
  const { error } = await supabase.rpc('concluir_cadastro', { p_tipo: tipo, p_nome: nome });
  if (error) throw traduzErro(error);

  const perfil = await obterPerfil();
  if (cadastroIncompleto(perfil)) {
    console.error('concluir_cadastro respondeu, mas o perfil continua incompleto:', {
      tipo: perfil?.tipo,
      tipo_definido: perfil?.tipo_definido,
    });
    throw new Error('Não foi possível salvar seu cadastro. Tente novamente; se continuar, avise o administrador do site.');
  }
  return perfil;
}

/**
 * Lê um erro devolvido pelo Google/Supabase na URL de retorno do OAuth
 * (?error=...&error_description=... ou no #hash).
 */
export function lerErroDoRetornoOAuth() {
  const busca = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const codigo = busca.get('error') || hash.get('error');
  if (!codigo) return null;
  const descricao = busca.get('error_description') || hash.get('error_description') || '';
  if (codigo === 'access_denied') return 'O acesso com o Google foi cancelado.';
  console.error('Erro no retorno do OAuth:', codigo, descricao);
  return 'Não foi possível entrar com o Google. Tente novamente.';
}

/** Remove tokens e erros do OAuth da barra de endereço. */
export function limparUrlDoOAuth() {
  const url = new URL(window.location.href);
  ['code', 'error', 'error_code', 'error_description', 'state'].forEach((p) => url.searchParams.delete(p));
  url.hash = '';
  window.history.replaceState(null, '', url.pathname + url.search);
}

export function traduzErro(error) {
  const mapa = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'User already registered': 'Já existe uma conta com este e-mail.',
    'Password should be at least 6 characters': 'A senha precisa ter pelo menos 8 caracteres.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
    'Unsupported provider: provider is not enabled': 'O login com Google não está ativado no Supabase.',
  };
  if (mapa[error?.message]) return new Error(mapa[error.message]);
  // PGRST202/PGRST204: função ou coluna que o banco ainda não tem (migração não aplicada).
  if (/^PGRST20[24]$/.test(error?.code ?? '')) {
    console.error('Banco de dados desatualizado:', error.message);
    return new Error('O banco de dados do WaveType ainda não foi atualizado para esta versão. Avise o administrador do site.');
  }
  // Mensagens das nossas RPCs já vêm em português e prontas para a pessoa.
  if (error?.code && /^(P0|22|23|28|42501)/.test(error.code) && error.message) return new Error(error.message);
  console.error(error);
  return new Error('Não foi possível concluir. Tente novamente em instantes.');
}
