// js/ui/onda-velocidade.js
// Onda da velocidade de digitação (identidade WaveType).
//
// 1) Resultado: o gráfico "Ritmo durante o teste" vira uma onda em gradiente,
//    com uma onda-eco translúcida atrás, a linha da média e o pico marcado.
//    O traço é desenhado da esquerda para a direita ao aparecer.
// 2) Ao vivo: uma pequena onda ao lado do WPM. Parada antes do teste; durante
//    a digitação fica mais alta e mais rápida conforme a velocidade sobe.
//
// Com "Reduzir movimentos" (ou prefers-reduced-motion) nada se move: a onda
// ao vivo só muda de forma e o gráfico aparece pronto (regras em CSS).
import { caminhoSuave, caminhoOnda } from './onda-caminho.js';

const arredondar = (n) => Math.round(n * 10) / 10;

/** Média móvel curta: tira o serrilhado de segundo a segundo sem esconder a tendência. */
export function suavizar(valores, janela = 3) {
  if (valores.length < 3) return [...valores];
  const meio = Math.floor(janela / 2);
  return valores.map((_, i) => {
    const trecho = valores.slice(Math.max(0, i - meio), i + meio + 1);
    return trecho.reduce((s, v) => s + v, 0) / trecho.length;
  });
}

/**
 * Geometria do gráfico (função pura, testada).
 * Devolve caminhos da linha, da área e do eco, a altura da média e o pico.
 */
export function geometriaVelocidade(amostras, { largura = 640, altura = 210, esquerda = 20, direita = 620, topo = 30, base = 180 } = {}) {
  const brutos = (amostras ?? []).map((v) => Math.max(0, Number(v) || 0));
  const valores = brutos.length ? suavizar(brutos) : [0, 0];
  if (valores.length === 1) valores.push(valores[0]);
  const maximo = Math.max(40, ...valores) * 1.12; // folga para o pico não encostar no topo
  const x = (i) => esquerda + ((direita - esquerda) * i) / (valores.length - 1);
  const y = (v) => base - (Math.min(v, maximo) / maximo) * (base - topo);
  const pontos = valores.map((v, i) => [x(i), y(v)]);
  const linha = caminhoSuave(pontos);
  const area = `${linha} L ${direita} ${base} L ${esquerda} ${base} Z`;
  // Eco: a mesma onda um pouco atrasada e mais baixa (profundidade, como o mar)
  const eco = caminhoSuave(pontos.map(([px, py], i) => [px, Math.min(base, py + 10 + (i % 2 ? 4 : -2))]));
  const ecoArea = `${eco} L ${direita} ${base} L ${esquerda} ${base} Z`;

  const media = brutos.length ? brutos.reduce((s, v) => s + v, 0) / brutos.length : 0;
  let indicePico = 0;
  valores.forEach((v, i) => {
    if (v > valores[indicePico]) indicePico = i;
  });
  return {
    linha,
    area,
    eco,
    ecoArea,
    media: Math.round(media),
    yMedia: arredondar(y(media)),
    pico: { valor: Math.round(Math.max(...brutos, 0)), x: arredondar(pontos[indicePico][0]), y: arredondar(pontos[indicePico][1]) },
    fim: { x: arredondar(pontos[pontos.length - 1][0]), y: arredondar(pontos[pontos.length - 1][1]) },
    largura,
    altura,
    esquerda,
    direita,
    base,
  };
}

let sequencia = 0;

/** Desenha (ou redesenha) o gráfico de velocidade dentro do <svg> do resultado. */
export function desenharOndaVelocidade(svg, amostras) {
  if (!svg) return;
  const g = geometriaVelocidade(amostras);
  const id = `wt-vel-${(sequencia += 1)}`;
  const rotuloPicoX = Math.min(g.direita - 60, Math.max(g.esquerda + 4, g.pico.x - 30));
  const rotuloPicoY = Math.max(14, g.pico.y - 14);
  const mediaVisivel = g.media > 0;
  svg.classList.add('wt-velocidade');
  svg.setAttribute('aria-label', `Onda de velocidade ao longo do teste. Média de ${g.media} WPM, pico de ${g.pico.valor} WPM.`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}-traco" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" class="wt-vel-cor-1"/><stop offset="55%" class="wt-vel-cor-2"/><stop offset="100%" class="wt-vel-cor-3"/>
      </linearGradient>
      <linearGradient id="${id}-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" class="wt-vel-area-topo"/><stop offset="100%" class="wt-vel-area-base"/>
      </linearGradient>
    </defs>
    <g class="chart-grid" aria-hidden="true">
      <line x1="${g.esquerda}" y1="${g.base}" x2="${g.direita}" y2="${g.base}"></line>
    </g>
    <path class="wt-velocidade-tras" d="${g.ecoArea}" fill="url(#${id}-area)"></path>
    <path class="wt-velocidade-area result-chart-area" d="${g.area}" fill="url(#${id}-area)"></path>
    <path class="wt-velocidade-eco" d="${g.eco}"></path>
    <path class="wt-velocidade-linha result-chart-line" d="${g.linha}" stroke="url(#${id}-traco)" pathLength="1"></path>
    ${mediaVisivel ? `<g class="wt-velocidade-media">
      <line x1="${g.esquerda}" y1="${g.yMedia}" x2="${g.direita}" y2="${g.yMedia}"></line>
      <text x="${g.direita}" y="${g.yMedia - 6}" text-anchor="end">média ${g.media} WPM</text>
    </g>` : ''}
    ${g.pico.valor > 0 ? `<g class="wt-velocidade-pico">
      <circle cx="${g.pico.x}" cy="${g.pico.y}" r="5"></circle>
      <text x="${rotuloPicoX}" y="${rotuloPicoY}">pico ${g.pico.valor}</text>
    </g>` : ''}
    <circle class="wt-velocidade-fim" cx="${g.fim.x}" cy="${g.fim.y}" r="4"></circle>`;
  // Reinicia a animação de desenho a cada resultado
  svg.classList.remove('wt-desenhando');
  void svg.getBoundingClientRect();
  svg.classList.add('wt-desenhando');
}

// ---------- Onda ao vivo ----------

const LARGURA_VIVA = 120;

/** Parâmetros da onda ao vivo para uma velocidade (função pura, testada). */
export function ondaDaVelocidade(wpm) {
  const v = Math.max(0, Math.min(140, Number(wpm) || 0));
  if (v === 0) return { amplitude: 1.2, comprimento: 60, duracao: 0 };
  const faixa = Math.min(v, 120) / 120;
  return {
    amplitude: arredondar(2.5 + faixa * 6.5), // 2,5 a 9 px
    comprimento: [60, 40, 30, 24][Math.min(3, Math.floor(faixa * 4))], // mais rápido, ondas mais curtas
    duracao: arredondar(2.6 - faixa * 1.8), // 2,6 s a 0,8 s por ciclo
  };
}

export function criarOndaAoVivo() {
  const el = document.createElement('div');
  el.className = 'wt-onda-viva';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="0 0 ${LARGURA_VIVA} 28" preserveAspectRatio="none" focusable="false"><g class="wt-onda-viva-faixa"><path></path></g></svg>`;
  atualizarOndaAoVivo(el, 0);
  return el;
}

export function atualizarOndaAoVivo(el, wpm) {
  if (!el) return;
  const { amplitude, comprimento, duracao } = ondaDaVelocidade(wpm);
  const chave = `${amplitude}|${comprimento}|${duracao}`;
  if (el.dataset.chave === chave) return;
  el.dataset.chave = chave;
  // Duas larguras para deslizar sem emenda (deslocamento = um comprimento de onda)
  el.querySelector('path').setAttribute('d', caminhoOnda({ largura: LARGURA_VIVA + comprimento * 2, altura: 28, base: 14, amplitude, comprimento }));
  el.style.setProperty('--wt-viva-passo', `${comprimento}px`);
  el.style.setProperty('--wt-viva-duracao', `${duracao || 0}s`);
  el.classList.toggle('em-movimento', duracao > 0);
}
