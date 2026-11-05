// js/digitacao/metricas.js
// Contas das métricas do teste. Funções puras (sem DOM), cobertas por testes.
import { METRICAS } from './config.js';

/** Intervalos (ms) entre marcas de tempo consecutivas. */
export function intervalosEntreTeclas(tempos) {
  const intervalos = [];
  for (let i = 1; i < tempos.length; i += 1) intervalos.push(tempos[i] - tempos[i - 1]);
  return intervalos;
}

/**
 * Consistência do ritmo, de 0 a 100.
 *
 *   consistência = 100 − CV × 100,  com  CV = desvio-padrão ÷ média
 *
 * calculados sobre os intervalos entre teclas consecutivas (ms). Ritmo
 * perfeitamente regular → CV 0 → 100%. Quanto mais os intervalos variam,
 * menor o número (limitado a 0).
 *
 * - Intervalos acima de `pausaMaximaMs` (2 s) são pausas: saem do cálculo e
 *   são devolvidos à parte, em `pausas`.
 * - Intervalos ≤ 0 (eventos no mesmo instante) também saem.
 * - Com menos de `amostraMinimaIntervalos` (15) intervalos válidos, `valor` é
 *   null: ainda não dá para medir, e a interface mostra "—".
 *
 * Antes desta versão a métrica usava o WPM de cada segundo do teste: os
 * segundos parados entravam como 0, o CV passava de 100% e o resultado
 * ficava em 0% mesmo com a pessoa digitando de forma regular.
 */
export function consistencia(intervalos, opcoes = {}) {
  const minimo = opcoes.amostraMinima ?? METRICAS.amostraMinimaIntervalos;
  const pausaMaxima = opcoes.pausaMaximaMs ?? METRICAS.pausaMaximaMs;

  const validos = [];
  let pausas = 0;
  for (const valor of intervalos) {
    if (!Number.isFinite(valor) || valor <= 0) continue;
    if (valor > pausaMaxima) pausas += 1;
    else validos.push(valor);
  }
  if (validos.length < minimo) return { valor: null, validos: validos.length, pausas };

  const media = validos.reduce((soma, v) => soma + v, 0) / validos.length;
  const variancia = validos.reduce((soma, v) => soma + (v - media) ** 2, 0) / validos.length;
  const cv = Math.sqrt(variancia) / media;
  const valor = Math.max(0, Math.min(100, Math.round(100 - cv * 100)));
  return { valor, validos: validos.length, pausas };
}

/**
 * Precisão (%) = teclas corretas ÷ total de teclas digitadas × 100.
 * O total inclui as teclas erradas que a pessoa corrigiu depois: corrigir
 * não apaga o erro. Abaixo da amostra mínima devolve null.
 */
export function precisao(corretas, total, { amostraMinima = METRICAS.amostraMinimaPrecisao } = {}) {
  if (!total || total < amostraMinima) return null;
  return Math.max(0, Math.min(100, Math.round((corretas / total) * 100)));
}

/** Palavras por minuto a partir de caracteres (1 palavra = 5 caracteres). */
export function ppm(caracteres, segundos) {
  const minutos = Math.max(segundos, 1) / 60;
  return Math.max(0, Math.round(caracteres / 5 / minutos));
}
