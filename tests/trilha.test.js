// Trilha oficial (migração 20261111000017): 5 níveis x 20 exercícios, cada
// texto usando só as teclas já ensinadas na etapa (js/exercicios-dados.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NIVEIS, ULTIMO_NIVEL } from '../js/exercicios-dados.js';
import { alvoDeCaracteres, MIN_CARACTERES } from '../js/digitacao/textos.js';

const sql = readFileSync(new URL('../supabase/migrations/20261111000017_nova_trilha_progressiva.sql', import.meta.url), 'utf8');
const exercicios = [...sql.matchAll(/^\s*\((\d), (\d+), '((?:[^']|'')*)', '((?:[^']|'')*)', '(facil|medio|avancado)'\)/gm)].map((m) => ({
  nivel: Number(m[1]),
  ordem: Number(m[2]),
  titulo: m[3].replace(/''/g, "'"),
  texto: m[4].replace(/''/g, "'"),
}));

test('5 níveis, 4 etapas de 5, 100 exercícios', () => {
  assert.equal(ULTIMO_NIVEL, 5);
  assert.equal(NIVEIS.length, 5);
  for (const n of NIVEIS) {
    assert.deepEqual(n.etapas.map((e) => [e.inicio, e.fim]), [[1, 5], [6, 10], [11, 15], [16, 20]]);
  }
  assert.equal(exercicios.length, 100);
  for (let nivel = 1; nivel <= 5; nivel += 1) {
    assert.deepEqual(exercicios.filter((e) => e.nivel === nivel).map((e) => e.ordem), [...Array(20).keys()].map((i) => i + 1));
  }
});

test('cada texto usa só as teclas já ensinadas', () => {
  for (const e of exercicios) {
    const etapa = NIVEIS[e.nivel - 1].etapas.find((x) => e.ordem >= x.inicio && e.ordem <= x.fim);
    const permitidas = new Set([...etapa.teclas, ...etapa.extras, ' ']);
    for (const c of e.texto) {
      const tecla = etapa.maiusculas ? c.toLocaleLowerCase('pt-BR') : c;
      assert.ok(permitidas.has(tecla), `Nível ${e.nivel}, exercício ${e.ordem}: “${c}” ainda não foi ensinada`);
    }
    if (!etapa.maiusculas) assert.equal(e.texto, e.texto.toLocaleLowerCase('pt-BR'), `${e.nivel}.${e.ordem} sem maiúsculas`);
  }
});

test('progressão: cada nível mantém as teclas do anterior e termina juntando todas as suas', () => {
  for (const [i, n] of NIVEIS.entries()) {
    const ultima = n.etapas[n.etapas.length - 1];
    for (const e of n.etapas) for (const c of e.teclas) assert.ok(ultima.teclas.includes(c), `Nível ${n.nivel}: a última etapa esqueceu “${c}”`);
    if (i === 0) continue;
    const anterior = NIVEIS[i - 1].etapas[NIVEIS[i - 1].etapas.length - 1];
    for (const e of n.etapas) for (const c of anterior.teclas) assert.ok(e.teclas.includes(c), `${e.titulo} esqueceu “${c}” do nível anterior`);
  }
});

test('sem textos repetidos e todos com o mínimo de caracteres (o treino não precisa completar)', () => {
  assert.equal(new Set(exercicios.map((e) => e.texto)).size, 100);
  for (const e of exercicios) {
    assert.ok(e.texto.length >= MIN_CARACTERES, `${e.nivel}.${e.ordem}: ${e.texto.length} caracteres`);
    assert.equal(alvoDeCaracteres(e.texto), e.texto.length, 'sem rodadas extras');
    assert.doesNotMatch(e.texto, /\s{2,}|^\s|\s$/);
  }
});

test('acentos, maiúsculas e pontuação só aparecem no Nível 5', () => {
  for (const e of exercicios.filter((x) => x.nivel < 5)) {
    assert.doesNotMatch(e.texto, /[áéíóúâêôãõàA-Z.,;:!?"()-]/, `${e.nivel}.${e.ordem}`);
  }
  const n5 = exercicios.filter((x) => x.nivel === 5);
  assert.ok(n5.slice(0, 5).every((e) => /[A-Z]/.test(e.texto) && /[.,]/.test(e.texto) && !/[áéíóúâêôãõà]/.test(e.texto)), 'etapa 1: maiúsculas, ponto e vírgula, sem acentos');
  assert.ok(n5.slice(5, 10).every((e) => /[áéíóúâêôãõà]/.test(e.texto)), 'etapa 2: acentos');
  assert.ok(n5.slice(10, 15).every((e) => /[?!:;"()-]/.test(e.texto)), 'etapa 3: pontuação completa');
});
