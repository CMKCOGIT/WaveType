// js/sessao/regras.js
// Regras de sessão e redirecionamento, sem Supabase e sem DOM (testáveis).
// A camada js/sessao/sessao.js aplica estas decisões. Ela não depende de
// COMO a pessoa entrou (e-mail, Google ou, na Etapa 3, usuário da escola):
// só da sessão válida e do perfil (papel) ligado ao user_id.

export const DESTINOS = {
  usuario: '/app/usuario/index.html',
  aluno: '/app/aluno/index.html',
  professor: '/app/professor/index.html',
};
export const PAGINA_LOGIN = '/login.html';
export const PAGINA_COMPLETAR_CADASTRO = '/cadastro.html?completar=1';
export const PAGINA_INICIAL = '/index.html';

// Encerramento automático por inatividade (computadores compartilhados).
// Só para alunos; professores e usuários seguem a expiração do provedor.
export const LIMITE_INATIVIDADE_MS = {
  aluno: 30 * 60 * 1000,
};

export const MENSAGENS_MOTIVO = {
  expirada: 'Sua sessão expirou. Entre novamente.',
  inatividade: 'Sua sessão foi encerrada por inatividade. Entre novamente.',
  outra_aba: 'Você saiu da sua conta em outra aba.',
  papel: 'O tipo da sua conta mudou. Entre novamente.',
  desativada: 'Esta conta está desativada. Fale com o professor ou com a escola.',
  saiu: 'Você saiu da sua conta.',
};

/** Perfil sem tipo escolhido (ex.: primeira entrada com Google). */
export function cadastroIncompleto(perfil) {
  return !perfil || perfil.tipo_definido === false || !DESTINOS[perfil.tipo];
}

/** Área padrão do perfil. */
export function destinoDoPerfil(perfil) {
  return cadastroIncompleto(perfil) ? PAGINA_COMPLETAR_CADASTRO : DESTINOS[perfil.tipo];
}

/**
 * Valida um ?redirect= contra open redirect. Aceita só caminhos internos
 * da área logada (/app/...). Devolve o caminho normalizado ou null.
 */
export function redirectInternoSeguro(valor, origem = 'https://wavetype.com.br') {
  if (typeof valor !== 'string' || !valor) return null;
  if (valor.length > 512 || /[\u0000-\u001f\\]/.test(valor)) return null;
  if (!valor.startsWith('/') || valor.startsWith('//')) return null;
  let url;
  try {
    url = new URL(valor, origem);
  } catch {
    return null;
  }
  if (url.origin !== new URL(origem).origin) return null;
  if (!url.pathname.startsWith('/app/') || url.pathname.includes('..')) return null;
  return url.pathname + url.search + url.hash;
}

/**
 * Para onde ir depois de entrar ou concluir o cadastro: o ?redirect= vale
 * só se for interno E da área do papel da pessoa; senão, a área padrão.
 */
export function destinoAposLogin(perfil, redirect, origem) {
  if (cadastroIncompleto(perfil)) return PAGINA_COMPLETAR_CADASTRO;
  const seguro = redirectInternoSeguro(redirect, origem);
  if (seguro && seguro.startsWith(`/app/${perfil.tipo}/`)) return seguro;
  return DESTINOS[perfil.tipo];
}

/** Monta /login.html?motivo=...&redirect=... */
export function urlDeLogin({ motivo = null, redirect = null } = {}) {
  const parametros = new URLSearchParams();
  if (motivo) parametros.set('motivo', motivo);
  if (redirect) parametros.set('redirect', redirect);
  const busca = parametros.toString();
  return busca ? `${PAGINA_LOGIN}?${busca}` : PAGINA_LOGIN;
}

export function inatividadeExpirada(papel, ultimaAtividade, agora = Date.now()) {
  const limite = LIMITE_INATIVIDADE_MS[papel];
  if (!limite || !Number.isFinite(ultimaAtividade)) return false;
  return agora - ultimaAtividade > limite;
}

/**
 * Decide o que fazer numa página da área logada.
 *   sessao: 'valida' | 'invalida' (token expirado, usuário removido) | 'ausente'
 *   papelDaSessao: papel gravado no login (detecta troca de papel no servidor)
 * Devolve { acao: 'permitir' | 'login' | 'derrubar' | 'redirecionar', destino?, motivo? }.
 */
export function decidirAcessoArea({ sessao, perfil, papelEsperado, papelDaSessao = null, caminhoAtual = '', ultimaAtividade = null, agora = Date.now() }) {
  if (sessao === 'ausente') return { acao: 'login', destino: urlDeLogin({ redirect: caminhoAtual || null }) };
  if (sessao === 'invalida') return { acao: 'derrubar', motivo: 'expirada', destino: urlDeLogin({ motivo: 'expirada', redirect: caminhoAtual || null }) };
  if (perfil && perfil.ativo === false) return { acao: 'derrubar', motivo: 'desativada', destino: urlDeLogin({ motivo: 'desativada' }) };
  if (cadastroIncompleto(perfil)) return { acao: 'redirecionar', destino: PAGINA_COMPLETAR_CADASTRO };
  if (papelDaSessao && papelDaSessao !== perfil.tipo) {
    return { acao: 'derrubar', motivo: 'papel', destino: urlDeLogin({ motivo: 'papel' }) };
  }
  if (inatividadeExpirada(perfil.tipo, ultimaAtividade, agora)) {
    return { acao: 'derrubar', motivo: 'inatividade', destino: urlDeLogin({ motivo: 'inatividade', redirect: caminhoAtual || null }) };
  }
  if (perfil.tipo !== papelEsperado) return { acao: 'redirecionar', destino: DESTINOS[perfil.tipo] };
  return { acao: 'permitir' };
}

/**
 * Telas de acesso (login, cadastro): com sessão válida, nunca ficam
 * "paradas". Cadastro incompleto segue para a conclusão do cadastro (que é
 * a própria tela de cadastro com ?completar=1).
 * Devolve { acao: 'ficar' | 'limpar' | 'redirecionar', destino? }.
 */
export function decidirPaginaDeAcesso({ sessao, perfil, redirect = null, origem, naConclusaoDoCadastro = false }) {
  if (sessao === 'ausente') return { acao: 'ficar' };
  if (sessao === 'invalida') return { acao: 'limpar' }; // limpa e mostra o formulário, sem loop
  if (perfil && perfil.ativo === false) return { acao: 'limpar', motivo: 'desativada' };
  if (cadastroIncompleto(perfil)) {
    return naConclusaoDoCadastro ? { acao: 'ficar' } : { acao: 'redirecionar', destino: PAGINA_COMPLETAR_CADASTRO };
  }
  return { acao: 'redirecionar', destino: destinoAposLogin(perfil, redirect, origem) };
}

/** Iniciais para o avatar do menu da conta. */
export function iniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'WT';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : partes[0][1] || '';
  return (primeira + ultima).toUpperCase();
}

export const NOME_DO_PAPEL = { usuario: 'Conta pessoal', aluno: 'Aluno', professor: 'Professor' };
