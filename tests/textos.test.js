// Variedade dos textos de treino (js/digitacao/textos.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  alvoDeCaracteres, completarTexto, estiloDoTexto, palavrasCompativeis, letrasDoTexto,
  criarSorteador, criarPraticaLivre, FRASES, PALAVRAS, MIN_CARACTERES,
} from '../js/digitacao/textos.js';

// Acaso previsível para os testes
function semente(n = 7) {
  let x = n;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
}

test('alvo igual ao cálculo do banco (tempo_limite_trilha)', () => {
  assert.equal(alvoDeCaracteres('fff jjj'), 151); // ciclo 8 → 19 rodadas → 19*8-1
  const longo = 'x'.repeat(200);
  assert.equal(alvoDeCaracteres(longo), 200); // texto longo: sem complemento
});

test('texto longo não muda', () => {
  const texto = FRASES.avancado[0] + ' ' + FRASES.avancado[1];
  assert.deepEqual(completarTexto(texto, { nivel: 5 }), texto.split(' '));
});

test('lição de F e J: mínimo atingido, só F/J e sem repetir o mesmo bloco', () => {
  const texto = 'fff jjj fjfj jfjf';
  const palavras = completarTexto(texto, { nivel: 1, aleatorio: semente(3) });
  const final = palavras.join(' ');
  assert.ok(final.length <= alvoDeCaracteres(texto), 'não passa do tamanho usado para o tempo');
  assert.ok(final.length >= MIN_CARACTERES - 5, `quase o mínimo (${final.length})`);
  assert.match(final, /^[fj ]+$/, 'só as teclas da lição');
  assert.equal(final.split(texto).length - 1, 1, 'o texto original aparece uma vez só');
  for (let i = 1; i < palavras.length; i += 1) assert.notEqual(palavras[i], palavras[i - 1], 'nada de palavra repetida em seguida');
});

test('lição da fileira do meio usa palavras reais com essas letras', () => {
  const texto = 'asdf jklç gala sala';
  const letras = letrasDoTexto(texto);
  const reais = palavrasCompativeis(letras);
  assert.ok(reais.includes('salada') && reais.includes('fada'));
  const final = completarTexto(texto, { nivel: 1, aleatorio: semente(11) });
  assert.ok(final.join(' ').length <= alvoDeCaracteres(texto));
  assert.ok([...final.join('')].every((c) => letras.has(c)), 'só letras da lição');
  assert.ok(final.slice(4).some((p) => reais.includes(p)), 'complemento com palavras reais');
});

test('frase curta (nível 4) ganha outras frases inteiras do mesmo nível', () => {
  const texto = 'A prática diária transforma pequenos avanços em grandes conquistas.';
  const final = completarTexto(texto, { nivel: 4, aleatorio: semente(5) }).join(' ');
  assert.ok(final.startsWith(texto));
  assert.ok(final.length <= alvoDeCaracteres(texto));
  assert.ok(final.length >= 100, `texto com conteúdo suficiente (${final.length})`);
  assert.equal(final.split(texto).length - 1, 1, 'sem repetir a frase original');
  const extras = FRASES.medio.filter((f) => final.includes(f));
  assert.ok(extras.length >= 1, 'usa frases do banco');
});

test('nível 6: o complemento segue o estilo da lição', () => {
  assert.equal(estiloDoTexto('Pedido 4721: 3 cadernos a R$ 12,90', 6), 'numeros');
  assert.equal(estiloDoTexto('pão mãe avô avó café saúde órgão ímã', 6), 'acentos');
  assert.equal(estiloDoTexto('"Quem lê mais, escreve melhor", disse a Profa. Ana', 6), 'pontuacao');
  assert.equal(estiloDoTexto('Não há razão para pânico: a exceção também é útil', 6), 'acentos');
  assert.equal(estiloDoTexto('Rio de Janeiro, Sao Paulo e Belo Horizonte ficam no Sudeste', 6), 'pontuacao');
  assert.equal(estiloDoTexto('otorrinolaringologista paralelepípedo inconstitucionalidade', 6), 'monstruosas');
  const final = completarTexto('otorrinolaringologista paralelepípedo inconstitucionalidade', { nivel: 6, aleatorio: semente(2) });
  assert.equal(new Set(final).size, final.length, 'palavras gigantes sem repetição');
  assert.ok(final.join(' ').length <= alvoDeCaracteres('otorrinolaringologista paralelepípedo inconstitucionalidade'));
});

test('sorteador não repete antes de esgotar nem repete em seguida', () => {
  const sortear = criarSorteador(['a', 'b', 'c', 'd'], semente(9));
  const vistos = Array.from({ length: 40 }, sortear);
  for (let i = 0; i < 40; i += 4) assert.equal(new Set(vistos.slice(i, i + 4)).size, 4);
  for (let i = 1; i < 40; i += 1) assert.notEqual(vistos[i], vistos[i - 1]);
});

test('prática livre: muito mais variedade do que antes', () => {
  const palavras = criarPraticaLivre({ modo: 'words', nivel: 'medium', aleatorio: semente(4) })(150);
  assert.ok(new Set(palavras).size >= 100, `palavras diferentes: ${new Set(palavras).size}`);
  const frases = criarPraticaLivre({ modo: 'sentences', nivel: 'easy', aleatorio: semente(4) })(20);
  assert.ok(frases.length > 100);
  assert.ok(PALAVRAS.length > 400 && FRASES.facil.length >= 20 && FRASES.medio.length >= 20 && FRASES.avancado.length >= 15);
});
