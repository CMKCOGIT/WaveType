// js/ui/onda-caminho.js
// Geometria da onda da identidade WaveType (funções puras, testadas).
// Usada pelos componentes de js/ui/onda.js e pelo gráfico de ritmo.

const arredondar = (n) => Math.round(n * 10) / 10;

/**
 * Onda senoidal suave como caminho SVG (curvas de Bézier cúbicas).
 * Periódica: com `largura` múltipla de `comprimento`, o fim encaixa no
 * começo, o que permite deslizar a onda sem emenda.
 *   base: altura da linha média (y); amplitude: meia altura da onda;
 *   fechar: fecha o caminho até o fundo (preenchimento) em vez de só traço.
 */
export function caminhoOnda({ largura = 1440, altura = 80, base = altura / 2, amplitude = 12, comprimento = 360, fase = 0, fechar = false } = {}) {
  const meio = comprimento / 2;
  // Controle de Bézier que aproxima meia senoide: 0,3642 × meio comprimento.
  const k = meio * 0.3642;
  let x = -fase;
  let sinal = -1;
  let d = `M${arredondar(x)} ${arredondar(base)}`;
  while (x < largura) {
    const pico = base + sinal * amplitude;
    const xMeio = x + meio / 2;
    const xFim = x + meio;
    d += ` C${arredondar(x + k)} ${arredondar(base)} ${arredondar(xMeio - k)} ${arredondar(pico)} ${arredondar(xMeio)} ${arredondar(pico)}`;
    d += ` S${arredondar(xFim - k)} ${arredondar(base)} ${arredondar(xFim)} ${arredondar(base)}`;
    x = xFim;
    sinal = -sinal;
  }
  if (fechar) d += ` V${altura} H${arredondar(-fase)} Z`;
  return d;
}

/**
 * Liga pontos [[x, y], ...] com curvas suaves (Catmull-Rom → Bézier),
 * para o gráfico de ritmo desenhar um traço em onda em vez de serrilhado.
 */
export function caminhoSuave(pontos) {
  if (!pontos.length) return '';
  if (pontos.length === 1) return `M${arredondar(pontos[0][0])} ${arredondar(pontos[0][1])}`;
  let d = `M${arredondar(pontos[0][0])} ${arredondar(pontos[0][1])}`;
  for (let i = 0; i < pontos.length - 1; i += 1) {
    const p0 = pontos[i - 1] ?? pontos[i];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${arredondar(c1[0])} ${arredondar(c1[1])} ${arredondar(c2[0])} ${arredondar(c2[1])} ${arredondar(p2[0])} ${arredondar(p2[1])}`;
  }
  return d;
}

/**
 * Amplitude da onda do indicador de consistência: ritmo estável → onda
 * calma; ritmo irregular → onda agitada. null (sem amostra) → linha reta.
 */
export function amplitudeDaConsistencia(valor, { minima = 1, maxima = 7 } = {}) {
  if (valor == null || !Number.isFinite(Number(valor))) return 0;
  const irregularidade = 1 - Math.max(0, Math.min(100, Number(valor))) / 100;
  return arredondar(minima + irregularidade * (maxima - minima));
}
