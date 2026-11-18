import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometriaVelocidade, ondaDaVelocidade, suavizar } from '../js/ui/onda-velocidade.js';
import { limitarEscala } from '../js/ui/preferencias.js';

test('suavizar mantém o tamanho e reduz picos isolados', () => {
  const s = suavizar([10, 10, 90, 10, 10]);
  assert.equal(s.length, 5);
  assert.ok(s[2] < 90 && s[2] > 10);
});

test('geometria: média, pico e caminhos dentro da área do gráfico', () => {
  const g = geometriaVelocidade([20, 40, 60, 40]);
  assert.equal(g.media, 40);
  assert.equal(g.pico.valor, 60);
  assert.match(g.linha, /^M20 /);
  assert.match(g.area, /Z$/);
  assert.ok(g.yMedia > 30 && g.yMedia < 180);
  assert.ok(g.pico.y >= 30, 'o pico não passa do topo');
});

test('geometria: sem amostras desenha uma linha na base', () => {
  const g = geometriaVelocidade([]);
  assert.equal(g.media, 0);
  assert.equal(g.pico.valor, 0);
  assert.equal(g.fim.y, 180);
});

test('onda ao vivo: parada sem digitação, mais alta e rápida com mais velocidade', () => {
  assert.equal(ondaDaVelocidade(0).duracao, 0);
  const lenta = ondaDaVelocidade(20);
  const rapida = ondaDaVelocidade(100);
  assert.ok(rapida.amplitude > lenta.amplitude);
  assert.ok(rapida.duracao < lenta.duracao);
  assert.ok(rapida.comprimento <= lenta.comprimento);
  assert.ok(ondaDaVelocidade(500).amplitude <= 9);
});

test('escala do texto fica entre 80% e 180%', () => {
  assert.equal(limitarEscala(5), 1.8);
  assert.equal(limitarEscala(0.1), 0.8);
  assert.equal(limitarEscala('abc'), 1);
  assert.equal(limitarEscala(1.25), 1.3);
});
