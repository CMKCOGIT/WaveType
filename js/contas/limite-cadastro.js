// js/contas/limite-cadastro.js
// Limite de frequência do cadastro de alunos, do lado da tela.
// A regra que vale é a do banco (migração 20261118000019: 10 envios por
// minuto — 50 desde a migração 21 —, 300 contas por hora e 1000 por dia,
// por professor). Aqui a tela:
//  - recusa antes de enviar quando já houve 50 envios no último minuto
//    (economiza a ida ao servidor e avisa na hora);
//  - trava o botão por alguns segundos entre um envio e outro (clique duplo);
//  - quando o banco recusa por limite, mostra a contagem regressiva.

export const ENVIOS_POR_MINUTO = 50;
const INTERVALO_MINIMO_MS = 1000;
const CHAVE = 'wavetype_cadastros_alunos';

function lerEnvios(agora = Date.now()) {
  try {
    const lista = JSON.parse(sessionStorage.getItem(CHAVE) || '[]');
    return Array.isArray(lista) ? lista.filter((t) => typeof t === 'number' && agora - t < 60_000) : [];
  } catch {
    return [];
  }
}

function gravarEnvios(lista) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem armazenamento: o banco continua garantindo o limite */
  }
}

/** Segundos que faltam para poder enviar de novo (0 = pode enviar agora). */
export function esperaParaEnviar(agora = Date.now()) {
  const envios = lerEnvios(agora);
  if (envios.length && agora - envios[envios.length - 1] < INTERVALO_MINIMO_MS) {
    return Math.ceil((INTERVALO_MINIMO_MS - (agora - envios[envios.length - 1])) / 1000);
  }
  if (envios.length < ENVIOS_POR_MINUTO) return 0;
  const maisAntigo = envios[envios.length - ENVIOS_POR_MINUTO];
  return Math.max(1, Math.ceil((60_000 - (agora - maisAntigo)) / 1000));
}

/** Registra um envio que chegou ao servidor. */
export function registrarEnvio(agora = Date.now()) {
  gravarEnvios([...lerEnvios(agora), agora]);
}

export function mensagemDeEspera(segundos) {
  return `Muitos cadastros seguidos. Aguarde ${segundos} ${segundos === 1 ? 'segundo' : 'segundos'} e tente de novo.`;
}

/**
 * Trava o botão com contagem regressiva ("Aguarde 12 s") e devolve o texto
 * original ao terminar. `aoTerminar` é chamado quando o botão volta.
 */
export function travarComContagem(botao, segundos, { aoTerminar } = {}) {
  if (!botao || !(segundos > 0)) return;
  const original = botao.dataset.textoOriginal ?? botao.textContent;
  botao.dataset.textoOriginal = original;
  clearInterval(botao.wtContagem);
  let restante = Math.ceil(segundos);
  const passo = () => {
    if (restante <= 0) {
      clearInterval(botao.wtContagem);
      botao.disabled = false;
      botao.textContent = original;
      delete botao.dataset.textoOriginal;
      aoTerminar?.();
      return;
    }
    botao.disabled = true;
    botao.textContent = `Aguarde ${restante} s`;
    restante -= 1;
  };
  passo();
  botao.wtContagem = setInterval(passo, 1000);
}
