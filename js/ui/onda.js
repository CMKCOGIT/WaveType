// js/ui/onda.js
// Componentes da identidade "Wave" (Web Components, sem dependências):
//
//   <wave-divider>                 divisor de seção ondulado (cor = --wave-cor)
//   <wave-divider tipo="linha">    só o traço da onda, em gradiente
//   <wave-background variante="clara|suave">  ondas em gradiente ao fundo
//   <wave-loader>                  indicador de carregamento em onda
//   <wave-meter valor="81">        onda do indicador de consistência
//
// Todos são decorativos (aria-hidden). As animações só rodam com
// prefers-reduced-motion: no-preference e sem "Reduzir movimentos"
// (regras em css/redesign/onda.css).
import { caminhoOnda, amplitudeDaConsistencia } from './onda-caminho.js';

let sequencia = 0;
const novoId = (prefixo) => `${prefixo}-${(sequencia += 1)}`;

function decorativo(elemento) {
  elemento.setAttribute('aria-hidden', 'true');
}

function gradiente(id, cores, { x2 = '100%', y2 = '0%' } = {}) {
  const paradas = cores
    .map(([cor, opacidade = 1], i) => `<stop offset="${(i / (cores.length - 1)) * 100}%" style="stop-color:${cor};stop-opacity:${opacidade}"/>`)
    .join('');
  return `<linearGradient id="${id}" x1="0%" y1="0%" x2="${x2}" y2="${y2}">${paradas}</linearGradient>`;
}

export class WaveDivider extends HTMLElement {
  connectedCallback() {
    if (this.firstChild) return;
    decorativo(this);
    if (this.getAttribute('tipo') === 'linha') {
      const id = novoId('wt-onda-linha');
      this.innerHTML = `<svg viewBox="0 0 1440 24" preserveAspectRatio="none" focusable="false">
        <defs>${gradiente(id, [['var(--wt-blue-500)'], ['var(--wt-violet-500)'], ['var(--wt-aqua-500)']])}</defs>
        <path d="${caminhoOnda({ largura: 1440, altura: 24, base: 12, amplitude: 6, comprimento: 480 })}" fill="none" stroke="url(#${id})" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
      </svg>`;
      return;
    }
    // Duas camadas: a de trás, translúcida, dá profundidade à onda.
    this.innerHTML = `<svg viewBox="0 0 1440 80" preserveAspectRatio="none" focusable="false">
      <path class="wt-onda-tras" d="${caminhoOnda({ largura: 1440, altura: 80, base: 40, amplitude: 14, comprimento: 960, fase: 240, fechar: true })}"/>
      <path d="${caminhoOnda({ largura: 1440, altura: 80, base: 52, amplitude: 16, comprimento: 720, fechar: true })}"/>
    </svg>`;
  }
}

export class WaveBackground extends HTMLElement {
  connectedCallback() {
    if (this.firstChild) return;
    decorativo(this);
    const clara = this.getAttribute('variante') !== 'suave';
    const id = novoId('wt-onda-fundo');
    const cores = clara
      ? [['#ffffff', 0.16], ['#ffffff', 0.04]]
      : [['var(--wt-blue-500)', 0.07], ['var(--wt-violet-500)', 0.02]];
    const traco = clara ? 'var(--wt-aqua-300)' : 'var(--wt-aqua-500)';
    // Largura dupla e comprimento divisor de 1440: a camada desliza 1440 px sem emenda.
    const camada = (classe, opcoes, preenchimento) =>
      `<g class="wt-onda-camada ${classe}"><path d="${caminhoOnda({ largura: 2880 + 720, altura: 200, ...opcoes })}" ${preenchimento}/></g>`;
    this.innerHTML = `<svg viewBox="0 0 1440 200" preserveAspectRatio="none" focusable="false">
      <defs>${gradiente(id, cores, { x2: '0%', y2: '100%' })}</defs>
      ${camada('lenta', { base: 96, amplitude: 22, comprimento: 720, fechar: true }, `fill="url(#${id})"`)}
      ${camada('media', { base: 128, amplitude: 16, comprimento: 480, fase: 120, fechar: true }, `fill="url(#${id})"`)}
      ${camada('rapida', { base: 112, amplitude: 10, comprimento: 360, fase: 60 }, `fill="none" style="stroke:${traco};stroke-opacity:${clara ? 0.55 : 0.35}" stroke-width="2" vector-effect="non-scaling-stroke"`)}
    </svg>`;
  }
}

export class WaveLoader extends HTMLElement {
  connectedCallback() {
    if (this.firstChild) return;
    decorativo(this);
    this.innerHTML = `<svg viewBox="0 0 48 16" focusable="false">
      <path d="${caminhoOnda({ largura: 48, altura: 16, base: 8, amplitude: 5, comprimento: 16 })}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" pathLength="100"/>
    </svg>`;
  }
}

export class WaveMeter extends HTMLElement {
  static get observedAttributes() {
    return ['valor'];
  }
  connectedCallback() {
    decorativo(this);
    this.desenhar();
  }
  attributeChangedCallback() {
    if (this.isConnected) this.desenhar();
  }
  desenhar() {
    const bruto = this.getAttribute('valor');
    const valor = bruto === '' || bruto == null ? null : Number(bruto);
    const amplitude = amplitudeDaConsistencia(valor);
    const caminho = amplitude
      ? caminhoOnda({ largura: 120, altura: 20, base: 10, amplitude, comprimento: 20 })
      : 'M0 10 H120';
    this.innerHTML = `<svg viewBox="0 0 120 20" preserveAspectRatio="none" focusable="false">
      <path d="${caminho}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ${amplitude ? '' : 'stroke-dasharray="4 5"'} vector-effect="non-scaling-stroke"/>
    </svg>`;
  }
}

const componentes = {
  'wave-divider': WaveDivider,
  'wave-background': WaveBackground,
  'wave-loader': WaveLoader,
  'wave-meter': WaveMeter,
};
for (const [nome, classe] of Object.entries(componentes)) {
  if (!customElements.get(nome)) customElements.define(nome, classe);
}
