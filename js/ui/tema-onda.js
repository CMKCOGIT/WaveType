// js/ui/tema-onda.js
// Botão de tema claro/escuro com a identidade "Wave" (site e plataforma).
//
//   Ícone: uma janelinha com água. No tema claro, a onda se move devagar;
//   no escuro, a água sobe e fica calma (com uma estrela no céu).
//   Ao ativar o escuro, uma onda desce do topo e cobre a tela; o tema troca
//   por baixo dela e a onda se dissolve. Ao voltar para o claro, a onda sobe
//   de baixo (movimento inverso).
//
// Com prefers-reduced-motion, "Reduzir movimentos" (body.reduce-motion) ou
// data-motion="off", a troca é imediata, sem animação.
import { caminhoOnda } from './onda-caminho.js';

export const CHAVE_TEMA = 'wavetype_theme';
const raiz = document.documentElement;
const COR_DA_BARRA = { light: '#315FD6', dark: '#0E1730' };
// Fundo de cada tema (site público e plataforma), para a cortina em onda
// terminar exatamente na cor da página nova.
const FUNDOS = {
  site: { light: '#f5f8ff', dark: '#0e1730' },
  plataforma: { light: '#eef1fa', dark: '#0a1022' },
};

let sequencia = 0;
let animando = false;

export function temaAtual() {
  return raiz.dataset.theme === 'dark' ? 'dark' : 'light';
}

function movimentoReduzido() {
  return (
    matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.body?.classList.contains('reduce-motion') ||
    raiz.dataset.motion === 'off'
  );
}

function aplicar(tema) {
  raiz.dataset.theme = tema;
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    /* navegação privada: o tema vale só nesta página */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_DA_BARRA[tema]);
  document.dispatchEvent(new CustomEvent('wavetype:tema', { detail: { tema } }));
}

/** Ícone do botão (SVG decorativo; o rótulo fica no aria-label do botão). */
export function iconeDoTema() {
  const id = `wt-tema-recorte-${(sequencia += 1)}`;
  const onda = caminhoOnda({ largura: 48, altura: 24, base: 12, amplitude: 1.8, comprimento: 12, fechar: true });
  return `<svg class="wt-tema-icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <defs><clipPath id="${id}"><circle cx="12" cy="12" r="9"/></clipPath></defs>
    <g clip-path="url(#${id})">
      <rect class="wt-tema-ceu" x="0" y="0" width="24" height="24"/>
      <circle class="wt-tema-sol" cx="15.5" cy="8" r="2.8"/>
      <path class="wt-tema-estrela" d="M8 6.2l.55 1.25 1.25.55-1.25.55L8 9.8l-.55-1.25L6.2 8l1.25-.55z"/>
      <g class="wt-tema-agua"><path class="wt-tema-onda" d="${onda}"/></g>
    </g>
    <circle class="wt-tema-aro" cx="12" cy="12" r="9"/>
  </svg>`;
}

function sincronizar(botao) {
  const escuro = temaAtual() === 'dark';
  botao.setAttribute('aria-pressed', String(escuro));
  botao.setAttribute('aria-label', escuro ? 'Ativar tema claro' : 'Ativar tema escuro');
  botao.title = escuro ? 'Tema claro' : 'Tema escuro';
}

/** Cortina em onda que cobre a tela durante a troca. */
function cortina(proximo) {
  const plataforma = Boolean(document.querySelector('.auth-page, .app-layout, .app-shell, [data-role]'));
  const cor = (plataforma ? FUNDOS.plataforma : FUNDOS.site)[proximo];
  const descendo = proximo === 'dark';
  const el = document.createElement('div');
  el.className = `wt-tema-cortina ${descendo ? 'descendo' : 'subindo'}`;
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--cortina-cor', cor);
  const borda = caminhoOnda({ largura: 2880, altura: 80, base: 40, amplitude: 22, comprimento: 480, fechar: true });
  el.innerHTML = `<div class="wt-tema-cortina-corpo"></div>
    <svg class="wt-tema-cortina-borda" viewBox="0 0 1440 80" preserveAspectRatio="none" focusable="false">
      <path class="wt-tema-cortina-onda" d="${borda}"/>
      <path class="wt-tema-cortina-linha" d="${caminhoOnda({ largura: 2880, altura: 80, base: 40, amplitude: 22, comprimento: 480 })}"/>
    </svg>`;
  document.body.append(el);
  return el;
}

/** Troca o tema com a animação em onda (ou direto, se o movimento for reduzido). */
export async function trocarTema() {
  if (animando) return;
  const proximo = temaAtual() === 'dark' ? 'light' : 'dark';
  if (movimentoReduzido() || typeof Element.prototype.animate !== 'function') {
    aplicar(proximo);
    return;
  }
  animando = true;
  const el = cortina(proximo);
  const descendo = proximo === 'dark';
  try {
    // 1) A onda desce do topo (ou sobe de baixo) até cobrir a tela
    await el.animate(
      [{ transform: `translateY(${descendo ? '-100%' : '100%'})` }, { transform: 'translateY(0)' }],
      { duration: 620, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
    ).finished;
    // 2) Troca o tema por baixo da cortina
    aplicar(proximo);
    // 3) A cortina se dissolve e revela a página no tema novo
    await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' }).finished;
  } catch {
    if (temaAtual() !== proximo) aplicar(proximo);
  } finally {
    el.remove();
    animando = false;
  }
}

/** Prepara um botão existente (site) ou novo (plataforma) como botão de tema. */
export function ligarBotaoTema(botao) {
  botao.classList.add('wt-tema-onda');
  botao.innerHTML = iconeDoTema();
  sincronizar(botao);
  botao.addEventListener('click', () => trocarTema());
  document.addEventListener('wavetype:tema', () => sincronizar(botao));
  return botao;
}
