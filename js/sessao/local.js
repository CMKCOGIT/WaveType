// js/sessao/local.js
// O que dá para saber/fazer com a sessão SEM carregar o Supabase:
// existe um token salvo? limpar os dados locais, avisar as outras abas e
// marcar atividade (inatividade em computador compartilhado).
// Usado pelo cabeçalho do site público, que não deve baixar o Supabase
// para quem nunca entrou.

const TOKEN_SUPABASE = /^sb-.+-auth-token(-code-verifier)?$/;
const CANAL = 'wavetype-sessao';
const CHAVE_EVENTO = 'wavetype_evento_sessao';
export const CHAVE_PAPEL = 'wavetype_papel_sessao';
export const CHAVE_ATIVIDADE = 'wavetype_ultima_atividade';
export const CHAVE_REDIRECT = 'wavetype_redirect_pos_login';

// Preferências do aparelho (não são dados da pessoa): sobrevivem ao "Sair".
const PREFERENCIAS = new Set([
  'wavetype_theme',
  'wavetype_large-text',
  'wavetype_high-contrast',
  'wavetype_reduce-motion',
  'wavetype_single-line',
]);

function chaves(armazenamento) {
  try {
    return Object.keys(armazenamento);
  } catch {
    return [];
  }
}

/** Há um token do Supabase salvo neste navegador? (não garante que vale) */
export function temSessaoSalva() {
  try {
    return chaves(localStorage).some((chave) => {
      if (!/^sb-.+-auth-token$/.test(chave)) return false;
      const sessao = JSON.parse(localStorage.getItem(chave) || 'null');
      return Boolean(sessao?.access_token || sessao?.currentSession?.access_token);
    });
  } catch {
    return false;
  }
}

/**
 * Remove tokens, perfil em cache e demais dados da pessoa deste navegador.
 * Mantém só preferências do aparelho (tema, acessibilidade).
 */
export function limparDadosLocais() {
  for (const chave of chaves(localStorage)) {
    if (TOKEN_SUPABASE.test(chave) || (chave.startsWith('wavetype_') && !PREFERENCIAS.has(chave))) {
      if (chave === CHAVE_EVENTO) continue; // usado para avisar as outras abas
      try {
        localStorage.removeItem(chave);
      } catch {
        /* nada a fazer */
      }
    }
  }
  for (const chave of chaves(sessionStorage)) {
    if (chave.startsWith('wavetype_') || TOKEN_SUPABASE.test(chave)) {
      try {
        sessionStorage.removeItem(chave);
      } catch {
        /* nada a fazer */
      }
    }
  }
}

// ---------- Outras abas ----------

let canal = null;
function abrirCanal() {
  if (canal || typeof BroadcastChannel === 'undefined') return canal;
  try {
    canal = new BroadcastChannel(CANAL);
  } catch {
    canal = null;
  }
  return canal;
}

/** Avisa as outras abas (ex.: { tipo: 'saiu' }). */
export function avisarOutrasAbas(mensagem) {
  const dados = { ...mensagem, em: Date.now() };
  abrirCanal()?.postMessage(dados);
  // Plano B para navegadores sem BroadcastChannel: o evento "storage".
  try {
    localStorage.setItem(CHAVE_EVENTO, JSON.stringify(dados));
    localStorage.removeItem(CHAVE_EVENTO);
  } catch {
    /* sem localStorage */
  }
}

/** Escuta os avisos das outras abas. Cada aviso chega uma vez. */
export function ouvirOutrasAbas(aoReceber) {
  let ultimo = 0;
  const entregar = (dados) => {
    if (!dados?.tipo || dados.em === ultimo) return;
    ultimo = dados.em;
    aoReceber(dados);
  };
  abrirCanal()?.addEventListener('message', (evento) => entregar(evento.data));
  window.addEventListener('storage', (evento) => {
    if (evento.key !== CHAVE_EVENTO || !evento.newValue) return;
    try {
      entregar(JSON.parse(evento.newValue));
    } catch {
      /* aviso ilegível */
    }
  });
}

// ---------- Atividade (inatividade) ----------

let ultimaGravacao = 0;
/** Marca atividade agora (compartilhado entre abas; gravado no máx. a cada 15 s). */
export function registrarAtividade({ forcar = false, agora = Date.now() } = {}) {
  if (!forcar && agora - ultimaGravacao < 15000) return;
  ultimaGravacao = agora;
  try {
    localStorage.setItem(CHAVE_ATIVIDADE, String(agora));
  } catch {
    /* sem localStorage */
  }
}

export function ultimaAtividade() {
  try {
    const valor = Number(localStorage.getItem(CHAVE_ATIVIDADE));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

export function lerLocal(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function gravarLocal(chave, valor) {
  try {
    if (valor == null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch {
    /* sem localStorage */
  }
}
