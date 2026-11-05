// js/sessao/sessao.js
// Camada de sessão: valida a sessão no servidor, protege as áreas por papel,
// redireciona as telas de acesso e encerra a sessão de verdade.
//
// Não depende do método de entrada (e-mail, Google ou usuário da escola na
// Etapa 3): todos terminam numa sessão do Supabase Auth ligada a um user_id,
// e o papel vem do perfil (public.usuarios). Um método novo de login só
// precisa abrir a sessão e chamar irParaArea().
//
// IMPORTANTE: isto é a experiência de navegação. Quem protege os dados é a
// RLS no banco (políticas por auth.uid() e meu_tipo()).
import { supabase } from '../supabaseClient.js';
import {
  decidirAcessoArea,
  decidirPaginaDeAcesso,
  destinoAposLogin,
  iniciais,
  urlDeLogin,
  MENSAGENS_MOTIVO,
  PAGINA_INICIAL,
  cadastroIncompleto,
  destinoDoPerfil,
} from './regras.js';
import {
  CHAVE_PAPEL,
  CHAVE_REDIRECT,
  avisarOutrasAbas,
  gravarLocal,
  lerLocal,
  limparDadosLocais,
  ouvirOutrasAbas,
  registrarAtividade,
  temSessaoSalva,
  ultimaAtividade,
} from './local.js';

export { cadastroIncompleto, destinoDoPerfil, MENSAGENS_MOTIVO };

/** Sessão guardada no navegador (sem ir ao servidor), ou null. */
export async function obterSessao() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Perfil (public.usuarios) do usuário logado, ou null. */
export async function obterPerfil(usuarioId = null) {
  const id = usuarioId ?? (await obterSessao())?.user.id;
  if (!id) return null;
  const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Confere a sessão NO SERVIDOR (getUser), não só o que está salvo no
 * navegador. Token expirado sem renovação ou usuário removido → 'invalida'.
 * Devolve { estado: 'valida' | 'invalida' | 'ausente', usuario?, perfil? }.
 */
export async function validarSessao({ comPerfil = true, perfilEntregue = null } = {}) {
  const sessao = await obterSessao().catch(() => null);
  if (!sessao) return { estado: temSessaoSalva() ? 'invalida' : 'ausente' };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    // Falha de rede não é sessão inválida: não derruba ninguém por estar offline.
    if (error && (error.status === 0 || /fetch|network/i.test(error.message || ''))) throw error;
    return { estado: 'invalida' };
  }
  if (!comPerfil) return { estado: 'valida', usuario: data.user };
  const perfil = perfilEntregue?.id === data.user.id ? perfilEntregue : await obterPerfil(data.user.id);
  return { estado: 'valida', usuario: data.user, perfil };
}

// ---------- Encerrar ----------

let encerrando = false;

/**
 * Encerra a sessão: revoga no servidor (scope 'local' = só esta sessão;
 * outros aparelhos da mesma pessoa continuam), limpa tokens e dados locais,
 * avisa as outras abas e vai para o destino.
 */
export async function encerrarSessao({ destino = PAGINA_INICIAL, motivo = null, avisarAbas = true } = {}) {
  if (encerrando) return;
  encerrando = true;
  // Avisa ANTES de revogar: assim as outras abas mostram "saiu em outra aba"
  // em vez de reagirem ao token sumindo como se a sessão tivesse expirado.
  if (avisarAbas) avisarOutrasAbas({ tipo: 'saiu', motivo });
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (erro) {
    console.warn('Não foi possível encerrar a sessão no servidor; limpando localmente.', erro);
  }
  limparDadosLocais();
  window.location.replace(destino);
}

/** Botão "Sair". */
export function sair({ destino = PAGINA_INICIAL } = {}) {
  return encerrarSessao({ destino, motivo: 'saiu' });
}

/** Limpa uma sessão inválida sem sair da página (telas de acesso). */
async function limparSessaoInvalida() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* o token já não vale */
  }
  limparDadosLocais();
}

// ---------- Depois de entrar ----------

// Entrega do perfil entre o login e a primeira página interna (economiza
// uma ida ao Supabase logo depois do Google). Vale uma vez, por poucos
// segundos, nesta aba e para o mesmo usuário.
const PERFIL_ENTREGUE = 'wavetype_perfil_entregue';
const VALIDADE_ENTREGA_MS = 15000;

/** Guarda o ?redirect= da tela de login antes de ir ao Google. */
export function guardarRedirect(redirect) {
  try {
    if (redirect) sessionStorage.setItem(CHAVE_REDIRECT, redirect);
    else sessionStorage.removeItem(CHAVE_REDIRECT);
  } catch {
    /* sem sessionStorage */
  }
}

function redirectPendente() {
  const daUrl = new URLSearchParams(window.location.search).get('redirect');
  if (daUrl) return daUrl;
  try {
    return sessionStorage.getItem(CHAVE_REDIRECT);
  } catch {
    return null;
  }
}

/** Vai para a área certa (por papel, respeitando ?redirect= válido). */
export function irParaArea(perfil, { redirect = redirectPendente() } = {}) {
  if (!cadastroIncompleto(perfil)) {
    gravarLocal(CHAVE_PAPEL, perfil.tipo);
    registrarAtividade({ forcar: true });
    try {
      sessionStorage.setItem(PERFIL_ENTREGUE, JSON.stringify({ em: Date.now(), perfil }));
      sessionStorage.removeItem(CHAVE_REDIRECT);
    } catch {
      /* a página seguinte busca o perfil normalmente */
    }
  }
  window.location.replace(destinoAposLogin(perfil, redirect, window.location.origin));
}

/** Atualiza o papel guardado depois de uma troca feita pela própria pessoa. */
export function atualizarPapelDaSessao(tipo) {
  gravarLocal(CHAVE_PAPEL, tipo);
}

function receberPerfilEntregue() {
  try {
    const bruto = sessionStorage.getItem(PERFIL_ENTREGUE);
    sessionStorage.removeItem(PERFIL_ENTREGUE);
    if (!bruto) return null;
    const { em, perfil } = JSON.parse(bruto);
    return Date.now() - em < VALIDADE_ENTREGA_MS ? perfil : null;
  } catch {
    return null;
  }
}

/**
 * Telas de login e cadastro. Com sessão válida, redireciona pelo papel (nunca
 * fica "parada"). Com sessão inválida, limpa e deixa o formulário à mostra.
 * Devolve { acao, perfil } para a página decidir o que mostrar.
 */
export async function protegerPaginaDeAcesso({ naConclusaoDoCadastro = false } = {}) {
  let resultado;
  try {
    resultado = await validarSessao();
  } catch (erro) {
    console.error('Falha ao confirmar a sessão:', erro);
    return { acao: 'erro' };
  }
  const decisao = decidirPaginaDeAcesso({
    sessao: resultado.estado,
    perfil: resultado.perfil,
    redirect: redirectPendente(),
    origem: window.location.origin,
    naConclusaoDoCadastro,
  });
  if (decisao.acao === 'limpar') {
    await limparSessaoInvalida();
    return { ...decisao, motivo: decisao.motivo ?? (resultado.estado === 'invalida' ? 'expirada' : null) };
  }
  if (decisao.acao === 'redirecionar') {
    irParaArea(resultado.perfil);
    return { acao: 'redirecionando', perfil: resultado.perfil };
  }
  return { ...decisao, perfil: resultado.perfil ?? null, estado: resultado.estado };
}

/** Mensagem do ?motivo= da tela de login (ou null). */
export function mensagemDoMotivo() {
  const motivo = new URLSearchParams(window.location.search).get('motivo');
  return MENSAGENS_MOTIVO[motivo] ?? null;
}

// ---------- Área logada ----------

/**
 * Chame no topo de cada página interna (usuário, aluno ou professor).
 * Sem sessão → login (com ?redirect= desta página). Sessão inválida, conta
 * desativada, papel trocado ou inatividade → encerra e vai para o login com
 * uma mensagem curta. Papel diferente → vai para a área correta.
 */
export async function exigirPapel(papelEsperado) {
  const caminhoAtual = window.location.pathname + window.location.search;
  let resultado;
  try {
    resultado = await validarSessao({ perfilEntregue: receberPerfilEntregue() });
  } catch (erro) {
    console.error('Falha ao carregar a sessão:', erro);
    window.location.replace(urlDeLogin({ redirect: caminhoAtual }));
    return null;
  }

  const decisao = decidirAcessoArea({
    sessao: resultado.estado,
    perfil: resultado.perfil,
    papelEsperado,
    papelDaSessao: lerLocal(CHAVE_PAPEL),
    caminhoAtual,
    ultimaAtividade: ultimaAtividade(),
  });

  if (decisao.acao === 'login' || decisao.acao === 'redirecionar') {
    if (window.location.pathname + window.location.search !== decisao.destino) window.location.replace(decisao.destino);
    return null;
  }
  if (decisao.acao === 'derrubar') {
    await encerrarSessao({ destino: decisao.destino, motivo: decisao.motivo });
    return null;
  }

  const perfil = resultado.perfil;
  if (!lerLocal(CHAVE_PAPEL)) gravarLocal(CHAVE_PAPEL, perfil.tipo);
  registrarAtividade({ forcar: true });
  vigiarSessao(perfil);
  montarPerfilNaInterface(perfil);
  return perfil;
}

let vigiando = false;
/** Logout em outra aba, sessão encerrada pelo provedor e inatividade. */
function vigiarSessao(perfil) {
  if (vigiando) return;
  vigiando = true;

  ouvirOutrasAbas((aviso) => {
    if (aviso.tipo !== 'saiu' || encerrando) return;
    encerrando = true;
    limparDadosLocais();
    window.location.replace(urlDeLogin({ motivo: aviso.motivo === 'inatividade' ? 'inatividade' : 'outra_aba' }));
  });

  supabase.auth.onAuthStateChange((evento) => {
    if (evento !== 'SIGNED_OUT' || encerrando) return;
    encerrando = true;
    limparDadosLocais();
    window.location.replace(urlDeLogin({ motivo: 'expirada', redirect: window.location.pathname + window.location.search }));
  });

  const atividade = () => registrarAtividade();
  ['keydown', 'pointerdown', 'touchstart', 'scroll'].forEach((tipo) =>
    window.addEventListener(tipo, atividade, { passive: true, capture: true })
  );

  // Inatividade (só alunos): confere a cada 30 s e ao voltar para a aba.
  const conferir = () => {
    const decisao = decidirAcessoArea({
      sessao: 'valida',
      perfil,
      papelEsperado: perfil.tipo,
      ultimaAtividade: ultimaAtividade(),
    });
    if (decisao.acao === 'derrubar') {
      encerrarSessao({ destino: urlDeLogin({ motivo: decisao.motivo }), motivo: decisao.motivo });
    }
  };
  window.setInterval(conferir, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') conferir();
  });
}

// Nome, iniciais e botão "Sair" (sempre visível) no topo de toda página interna.
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
    botao.addEventListener('click', () => sair());
    topo.append(botao);
  }
}
