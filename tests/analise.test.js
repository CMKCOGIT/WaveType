// Análise individual das tentativas (js/analise/tentativa.js) e transcrição do motor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisarTentativa, compararLetras, teclasMaisErradas } from '../js/analise/tentativa.js';
import { criarMotor } from '../js/digitacao/motor.js';

test('compara letra a letra: trocada, faltando e sobrando', () => {
  assert.deepEqual(compararLetras('gato', 'gado').map((l) => l.estado), ['ok', 'ok', 'trocada', 'ok']);
  assert.deepEqual(compararLetras('muro', 'mur').map((l) => l.estado), ['ok', 'ok', 'ok', 'faltou']);
  assert.deepEqual(compararLetras('sol', 'sola').map((l) => l.estado), ['ok', 'ok', 'ok', 'sobrou']);
});

test('classifica palavras e lista onde estão os erros', () => {
  const a = analisarTentativa('o gato pulou o muro alto', [
    ['o', 'o', 0], ['gato', 'gado', 1], ['pulou', 'pulou', 2], ['o', 'o', 0], ['muro', 'mur', 0],
  ]);
  assert.deepEqual(a.palavras.map((p) => p.situacao), ['certa', 'errada', 'corrigida', 'certa', 'errada', 'nao_digitada']);
  assert.deepEqual(a.erros.map((e) => [e.posicao, e.esperado, e.digitado, e.tipo]), [
    [2, 'gato', 'gado', 'Letra trocada'],
    [5, 'muro', 'mur', 'Incompleta'],
  ]);
  assert.equal(a.erros[0].letras[0], '3ª letra: “t” virou “d”');
  assert.equal(a.resumo.errosApagados, 2);
  assert.equal(a.resumo.naoDigitadas, 1);
  assert.equal(a.resumo.letrasTrocadas, 1);
  assert.equal(a.resumo.letrasFaltando, 1);
});

test('tipos de erro: acento e maiúscula', () => {
  const a = analisarTentativa('Você está', [['Você', 'voce', 1], ['está', 'esta', 1]]);
  assert.equal(a.erros[0].tipo, 'Letra trocada');
  assert.equal(analisarTentativa('Ana', [['Ana', 'ana', 1]]).erros[0].tipo, 'Maiúscula/minúscula');
  assert.equal(a.erros[1].tipo, 'Acento');
});

test('teclas mais erradas em ordem', () => {
  assert.deepEqual(teclasMaisErradas({ a: 1, t: 3, espaço: 2, z: 0 }), [['t', 3], ['espaço', 2], ['a', 1]]);
});

test('motor: transcrição guarda o digitado e os erros apagados por palavra', () => {
  const m = criarMotor({ palavras: ['gato', 'pulou', 'muro'] });
  for (const c of 'gado') m.digitar(c, 0);
  m.espaco(0);
  for (const c of 'puk') m.digitar(c, 0);
  m.apagar(0);
  for (const c of 'lou') m.digitar(c, 0);
  m.espaco(0);
  for (const c of 'mu') m.digitar(c, 0);
  assert.deepEqual(m.transcricao(), [['gato', 'gado', 1], ['pulou', 'pulou', 1], ['muro', 'mu', 0]]);
  const a = analisarTentativa('gato pulou muro', m.transcricao());
  assert.deepEqual(a.palavras.map((p) => p.situacao), ['errada', 'corrigida', 'errada']);
});
