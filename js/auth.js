// js/auth.js
// Toda a lógica de autenticação fica aqui para não duplicar código
// entre cadastro.html, login.html e as páginas internas.

import { supabase } from './supabaseClient.js';

export const DESTINOS = {
  usuario: '/app/usuario/index.html',
  aluno: '/app/aluno/index.html',
  professor: '/app/professor/index.html',
};
export const PAGINA_COMPLETAR_CADASTRO = '/cadastro.html?completar=1';
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

/** Regras de senha do cadastro (8+ caracteres, com letra e número). */
export function validarSenha(senha) {
  if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha precisa ter 8+ caracteres, com letra e número.';
  }
  return null;
}

export async function sair({ destino = '/login.html' } = {}) {
  await supabase.auth.signOut();
  window.location.href = destino;
}

/** Retorna a sessão atual (ou null) sem lançar erro. */
export async function obterSessao() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Busca o perfil (tabela usuarios) do usuário logado, ou null se não
 * houver sessão/perfil.
 */
export async function obterPerfil() {
  const sessao = await obterSessao();
  if (!sessao) return null;
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', sessao.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Perfil sem tipo escolhido (ex.: primeira entrada com Google). */
export function cadastroIncompleto(perfil) {
  return !perfil || perfil.tipo_definido === false || !DESTINOS[perfil.tipo];
}

/** Para onde a pessoa deve ir depois de entrar. */
export function destinoDoPerfil(perfil) {
  return cadastroIncompleto(perfil) ? PAGINA_COMPLETAR_CADASTRO : DESTINOS[perfil.tipo];
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

/**
 * Chame no topo de cada página interna (usuário, aluno ou professor).
 * - Sem sessão: vai para login.html.
 * - Cadastro incompleto: vai para a conclusão do cadastro.
 * - Papel diferente do esperado: vai para a área correta.
 * IMPORTANTE: isso é UX. A segurança de verdade é a RLS no banco.
 */
export async function exigirPapel(papelEsperado) {
  let perfil = null;
  try {
    if (!(await obterSessao())) {
      window.location.replace('/login.html');
      return null;
    }
    perfil = await obterPerfil();
  } catch (erro) {
    console.error('Falha ao carregar o perfil:', erro);
    window.location.replace('/login.html');
    return null;
  }

  if (cadastroIncompleto(perfil)) {
    window.location.replace(PAGINA_COMPLETAR_CADASTRO);
    return null;
  }
  if (perfil.tipo !== papelEsperado) {
    const destino = DESTINOS[perfil.tipo];
    if (window.location.pathname !== destino) window.location.replace(destino);
    return null;
  }

  montarPerfilNaInterface(perfil);
  return perfil;
}

// Nome, iniciais e botão "Sair" no topo de toda página interna.
function montarPerfilNaInterface(perfil) {
  const avatar = document.querySelector('.topbar-avatar');
  if (avatar) avatar.textContent = iniciais(perfil.nome);

  const nomeTopo = document.querySelector('.topbar-profile strong');
  if (nomeTopo) nomeTopo.textContent = perfil.nome;

  const topo = document.querySelector('.app-topbar');
  if (topo && !topo.querySelector('[data-sair]')) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'button ghost small app-sair';
    botao.dataset.sair = '';
    botao.textContent = 'Sair';
    botao.addEventListener('click', sair);
    topo.append(botao);
  }
}

function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'WT';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : partes[0][1] || '';
  return (primeira + ultima).toUpperCase();
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
