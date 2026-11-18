import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analisarTexto, moderarCampos, normalizar } from '../js/moderacao/conteudo.js';

const termos = (texto) => analisarTexto(texto).map((o) => `${o.gravidade}:${o.termo.toLowerCase()}`);

test('palavrões são identificados como ofensivos', () => {
  assert.deepEqual(termos('Que porra é essa?'), ['ofensivo:porra']);
  assert.deepEqual(termos('Isso é uma MERDA.'), ['ofensivo:merda']);
});

test('disfarces comuns são desfeitos', () => {
  assert.equal(normalizar('P0RR4'), 'porra');
  assert.ok(termos('p0rr4 de texto').includes('ofensivo:p0rr4'));
  assert.ok(termos('que porrrrra').some((t) => t.startsWith('ofensivo')));
  assert.ok(termos('isso é m.e.r.d.a').some((t) => t.startsWith('ofensivo')));
  assert.ok(termos('Mérdà').length === 1);
});

test('busca por palavra inteira evita falsos positivos', () => {
  for (const texto of [
    'O computador da escola está ligado.',
    'Tenha cuidado ao atravessar a rua.',
    'Recife é a capital de Pernambuco.',
    'A disputa terminou empatada.',
    'Os cientistas estudam a reprodução e o sexo das espécies.',
    'a s d f g h j k l ç',
    'fff jjj fff jjj ff jj',
  ]) {
    assert.deepEqual(analisarTexto(texto), [], texto);
  }
});

test('palavras de duplo sentido em contexto educacional não geram aviso', () => {
  for (const texto of [
    'O burro puxava a carroça pela fazenda.',
    'O macaco pulava de galho em galho na floresta.',
    'Use o macaco para trocar o pneu do carro.',
    'O haitiano é uma língua crioula falada no Haiti.',
    'As piranhas vivem nos rios da Amazônia.',
    'Separe o lixo para a reciclagem.',
    'A lombriga, também chamada de bicha, é um verme intestinal.',
    'Campanhas de prevenção alertam sobre os riscos da maconha para a saúde.',
    'Comprei um cacete na padaria para o café.',
  ]) {
    assert.deepEqual(analisarTexto(texto), [], texto);
  }
});

test('insultos dirigidos a alguém viram ofensivos', () => {
  assert.deepEqual(termos('Você é burro demais.'), ['ofensivo:burro']);
  assert.deepEqual(termos('Seu idiota!'), ['ofensivo:idiota']);
  assert.deepEqual(termos('Sai daqui, seu macaco.'), ['ofensivo:macaco']);
});

test('termos discriminatórios e expressões graves', () => {
  assert.ok(termos('Ele é um retardado').includes('ofensivo:retardado'));
  assert.ok(analisarTexto('filho da puta').some((o) => o.categoria === 'Palavrão'));
  assert.ok(analisarTexto('Eu vou te matar amanhã').some((o) => o.categoria === 'Ameaça'));
});

test('temas sensíveis pedem atenção, mas não em textos de prevenção', () => {
  assert.equal(analisarTexto('Ele pensou em suicídio.')[0]?.gravidade, 'atencao');
  assert.deepEqual(analisarTexto('Setembro Amarelo: prevenção ao suicídio. Ligue 188 (CVV).'), []);
});

test('ocorrências trazem posição e trecho para revisão', () => {
  const [o] = analisarTexto('Primeira frase. Uma merda aqui.');
  assert.equal(o.inicio, 20);
  assert.equal(o.fim, 25);
  assert.match(o.trecho, /merda/);
});

test('moderarCampos resume por campo e gravidade', () => {
  const r = moderarCampos({ titulo: 'Exercício de porra', texto: 'Você é burro', instrucoes: 'Digite com calma.' });
  assert.equal(r.ofensivas, 2);
  assert.deepEqual(r.ocorrencias.map((o) => o.campo), ['titulo', 'texto']);
});

test('o contexto não atravessa frases e não desculpa ofensa dirigida', () => {
  const r = termos('O burro puxava a carroça. Que texto, seu idiota.');
  assert.deepEqual(r, ['ofensivo:idiota']);
  assert.deepEqual(termos('Na fazenda, você é burro se não cuidar dos animais.'), ['ofensivo:burro']);
});
