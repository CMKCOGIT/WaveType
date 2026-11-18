// js/ui/caps-lock.js
// Aviso discreto de Caps Lock ligado enquanto a pessoa digita em um campo
// de texto, de senha ou em um bloco de escrita. Não rouba o foco nem cobre
// o texto: é um selo junto do campo (role="status", lido pelo leitor de tela).
//
// O estado do Caps Lock só é conhecido nos eventos de teclado/mouse
// (getModifierState). O aviso some quando o Caps Lock é desligado ou o
// campo perde o foco.
//
// Teclas de fixação (Sticky Keys / Teclas de Aderência): os navegadores não
// informam se esse recurso do sistema está ligado, e uma tecla "presa" é
// indistinguível de alguém segurando Shift. Por isso não mostramos aviso
// sobre elas, para não dar informação errada.

const TIPOS_DE_TEXTO = new Set(['text', 'password', 'email', 'search', 'tel', 'url', '']);
let aviso = null;
let alvoAtual = null;

function ehCampoDeTexto(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.disabled || el.readOnly) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    // Campo de senha que a pessoa está vendo (tipo text) continua contando como senha.
    return TIPOS_DE_TEXTO.has(el.type) || el.dataset.senha === '';
  }
  return el.isContentEditable;
}

// Onde ancorar o aviso: blocos de escrita usam o palco; formulários, o campo.
function ancoraDe(campo) {
  return campo.closest('.typing-stage, .nivel-palco') || campo.closest('.wt-campo-senha') || campo;
}

function criarAviso() {
  const el = document.createElement('div');
  el.className = 'wt-aviso-caps';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 3 3.5 10H7v3.5h6V10h3.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 16.5h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Caps Lock ativado</span>`;
  el.hidden = true;
  return el;
}

function posicionar() {
  if (!aviso || !alvoAtual || aviso.hidden) return;
  const ancora = ancoraDe(alvoAtual);
  const caixa = ancora.getBoundingClientRect();
  const noPalco = ancora !== alvoAtual && !ancora.classList.contains('wt-campo-senha');
  aviso.classList.toggle('no-palco', noPalco);
  const largura = aviso.offsetWidth;
  // Palco de digitação: canto superior direito, por dentro. Campo: logo abaixo, à direita.
  const topo = noPalco ? caixa.top + 10 : caixa.bottom + 6;
  const esquerda = Math.max(8, Math.min(window.innerWidth - largura - 8, caixa.right - largura - (noPalco ? 10 : 0)));
  aviso.style.transform = `translate(${Math.round(esquerda)}px, ${Math.round(topo)}px)`;
}

function mostrar(campo) {
  aviso ??= document.body.appendChild(criarAviso());
  alvoAtual = campo;
  if (aviso.hidden) {
    aviso.hidden = false;
    campo.setAttribute('aria-describedby', [campo.getAttribute('aria-describedby'), 'wt-aviso-caps'].filter(Boolean).join(' '));
  }
  aviso.id = 'wt-aviso-caps';
  posicionar();
}

function esconder() {
  if (!aviso || aviso.hidden) return;
  aviso.hidden = true;
  if (alvoAtual) {
    const descritores = (alvoAtual.getAttribute('aria-describedby') || '').split(/\s+/).filter((id) => id && id !== 'wt-aviso-caps');
    if (descritores.length) alvoAtual.setAttribute('aria-describedby', descritores.join(' '));
    else alvoAtual.removeAttribute('aria-describedby');
  }
  alvoAtual = null;
}

function avaliar(evento) {
  if (typeof evento.getModifierState !== 'function') return;
  const campo = document.activeElement;
  if (!ehCampoDeTexto(campo)) return esconder();
  if (evento.getModifierState('CapsLock')) mostrar(campo);
  else esconder();
}

document.addEventListener('keydown', avaliar, true);
document.addEventListener('keyup', avaliar, true);
document.addEventListener('mousedown', (evento) => {
  // Ao clicar em um campo já dá para saber o estado do Caps Lock.
  requestAnimationFrame(() => avaliar(evento));
}, true);
document.addEventListener('focusout', (evento) => {
  if (evento.target === alvoAtual) esconder();
}, true);
window.addEventListener('scroll', posicionar, { passive: true, capture: true });
window.addEventListener('resize', posicionar);
window.addEventListener('blur', esconder);
