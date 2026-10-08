// js/auth.js
// Toda a lógica de autenticação fica aqui para não duplicar código
// entre cadastro.html, login.html e as páginas internas.

import { supabase } from './supabaseClient.js';

/**
 * Cria a conta no Supabase Auth. O perfil em public.usuarios é criado
 * sozinho pelo trigger on_auth_user_created (veja schema.sql) — o front
 * NUNCA deve fazer insert direto em public.usuarios.
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error) throw traduzErro(error);
  return data;
}

export async function entrarComGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/app/redirecionando.html` },
  });
  if (error) throw traduzErro(error);
  return data;
}

export async function sair() {
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}

/** Retorna a sessão atual (ou null) sem lançar erro. */
export async function obterSessao() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Busca o perfil (tabela usuarios) do usuário logado.
 * Usado em quase toda página interna para saudação, nome, tipo, xp etc.
 */
export async function obterPerfil() {
  const sessao = await obterSessao();
  if (!sessao) return null;
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', sessao.user.id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Chame no topo de cada página interna (aluno ou professor).
 * - Se não estiver logado, manda para login.html.
 * - Se o papel do usuário não bater com o esperado, manda para a área correta
 *   (evita aluno acessar tela de professor digitando a URL, por exemplo).
 * IMPORTANTE: isso é só UX. A segurança de verdade é a RLS no banco —
 * nunca confie só nessa checagem do lado do cliente.
 */


export async function exigirPapel(papelEsperado) {
  const perfil = await obterPerfil();
    if (perfil.tipo !== papelEsperado) {
      const destinos = {
        usuario: '/app/usuario/index.html',
        aluno: '/app/aluno/index.html',
        professor: '/app/professor/index.html',
    };
    const destino = destinos[perfil.tipo] ?? '/app/aluno/index.html';
    if (window.location.pathname !== destino) window.location.href = destino;
    return null;
  }
}

function traduzErro(error) {
  const mapa = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'User already registered': 'Já existe uma conta com este e-mail.',
    'Password should be at least 6 characters': 'A senha precisa ter pelo menos 8 caracteres.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  };
  const mensagem = mapa[error.message] || 'Não foi possível concluir. Tente novamente em instantes.';
  return new Error(mensagem);
}
