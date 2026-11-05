import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caminhoOnda, caminhoSuave, amplitudeDaConsistencia } from '../js/ui/onda-caminho.js';

const numeros = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);

test('onda: começa na base e cobre a largura', () => {
  const d = caminhoOnda({ largura: 720, altura: 80, base: 40, amplitude: 10, comprimento: 360 });
  assert.match(d, /^M0 40 C/);
  const xs = numeros(d).filter((_, i) => i % 2 === 0);
  assert.ok(Math.max(...xs) >= 720);
});

test('onda: respeita a amplitude', () => {
  const ys = numeros(caminhoOnda({ largura: 720, base: 40, amplitude: 10, comprimento: 360 })).filter((_, i) => i % 2 === 1);
  assert.equal(Math.min(...ys), 30);
  assert.equal(Math.max(...ys), 50);
});

test('onda fechada termina no fundo', () => {
  assert.match(caminhoOnda({ largura: 360, altura: 80, fechar: true }), /V80 H0 Z$/);
});

test('curva suave passa pelos pontos', () => {
  const d = caminhoSuave([[0, 10], [10, 20], [20, 5]]);
  assert.match(d, /^M0 10 C/);
  assert.match(d, /10 20 C/);
  assert.match(d, /20 5$/);
  assert.equal(caminhoSuave([]), '');
});

test('consistência: ritmo estável = onda calma; sem amostra = linha reta', () => {
  assert.equal(amplitudeDaConsistencia(100), 1);
  assert.equal(amplitudeDaConsistencia(0), 7);
  assert.ok(amplitudeDaConsistencia(80) < amplitudeDaConsistencia(30));
  assert.equal(amplitudeDaConsistencia(null), 0);
});
