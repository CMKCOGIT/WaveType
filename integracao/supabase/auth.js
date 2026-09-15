// auth.js
// Funcionalidades de autenticação. Toda a autenticação real (hashing de
// senha, sessões, tokens) é feita pelo Supabase Auth — este módulo só
// valida entradas antes de mandar pro Supabase e traduz erros.

import { supabase } from './supabaseClient.js';

function validarEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 190;
}

function validarSenha(senha) {
  // mínimo 8 caracteres, pelo menos 1 letra e 1 número.
  // (a validação DEFINITIVA de força de senha pode ser reforçada nas
  // configurações de Auth do próprio painel do Supabase)
  return typeof senha === 'string' && senha.length >= 8 && /[A-Za-z]/.test(senha) && /[0-9]/.test(senha);
}

export async function cadastrarUsuario({ nome, email, senha, tipo }) {
  if (!nome || nome.trim().length < 2 || nome.length > 120) {
    throw new Error('Nome inválido (2 a 120 caracteres).');
  }
  if (!validarEmail(email)) {
    throw new Error('E-mail inválido.');
  }
  if (!validarSenha(senha)) {
    throw new Error('Senha deve ter no mínimo 8 caracteres, com letras e números.');
  }
  if (!['professor', 'aluno'].includes(tipo)) {
    throw new Error('Tipo de usuário inválido.');
  }

  // options.data vai para auth.users.raw_user_meta_data e é lido pelo
  // trigger handle_new_user() no banco para criar o perfil em public.usuarios.
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome: nome.trim(), tipo } },
  });

  if (error) throw new Error(error.message);
  return data; // pode exigir confirmação de e-mail, dependendo da config do projeto
}

export async function loginComEmailSenha({ email, senha }) {
  if (!validarEmail(email) || !senha) {
    throw new Error('E-mail ou senha incorretos.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  // mensagem genérica de propósito: evita que um atacante descubra
  // quais e-mails têm cadastro (enumeração de contas)
  if (error) throw new Error('E-mail ou senha incorretos.');
  return data;
}

export async function loginComGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getUsuarioAtual() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, tipo, ativo')
    .eq('id', session.user.id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function exigirSessao() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('É necessário estar autenticado.');
  return session;
}
