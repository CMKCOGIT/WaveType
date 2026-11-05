import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consistencia, intervalosEntreTeclas, precisao, ppm } from '../js/digitacao/metricas.js';

const repetir = (valor, vezes) => Array.from({ length: vezes }, () => valor);

test('consistência: poucas teclas não geram número (mostra "—")', () => {
  const r = consistencia(repetir(200, 5));
  assert.equal(r.valor, null);
  assert.equal(r.validos, 5);
});

test('consistência: ritmo perfeito dá 100%', () => {
  assert.equal(consistencia(repetir(180, 20)).valor, 100);
});

test('consistência: ritmo irregular dá valor menor', () => {
  const irregular = Array.from({ length: 20 }, (_, i) => (i % 2 ? 100 : 400));
  const r = consistencia(irregular);
  // média 250, desvio 150 → CV 0,6 → 40%
  assert.equal(r.valor, 40);
});

test('consistência: pausa longa fica fora do cálculo', () => {
  const comPausa = [...repetir(200, 10), 5000, ...repetir(200, 10)];
  const r = consistencia(comPausa);
  assert.equal(r.valor, 100);
  assert.equal(r.pausas, 1);
  assert.equal(r.validos, 20);
});

test('consistência: variação enorme é limitada a 0, nunca negativa', () => {
  const extremo = [...repetir(10, 15), 1990, 1990];
  assert.ok(consistencia(extremo).valor >= 0);
});

test('consistência: intervalos inválidos são descartados', () => {
  const r = consistencia([0, -5, NaN, ...repetir(150, 15)]);
  assert.equal(r.validos, 15);
  assert.equal(r.valor, 100);
});

test('intervalos entre teclas', () => {
  assert.deepEqual(intervalosEntreTeclas([0, 100, 250, 450]), [100, 150, 200]);
  assert.deepEqual(intervalosEntreTeclas([10]), []);
});

test('precisão: amostra pequena devolve null', () => {
  assert.equal(precisao(1, 5), null);
  assert.equal(precisao(9, 10), 90);
  assert.equal(precisao(0, 0), null);
});

test('ppm: 5 caracteres = 1 palavra', () => {
  assert.equal(ppm(150, 60), 30);
  assert.equal(ppm(150, 30), 60);
  assert.equal(ppm(10, 0), 120); // tempo mínimo de 1 s
});
