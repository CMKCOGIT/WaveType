// Ano letivo e período da turma (js/turmas/periodo.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarAnoLetivo, lerAnoLetivo, validarAnoLetivo, anoAtual } from '../js/turmas/periodo.js';

test('monta e lê o texto gravado', () => {
  assert.equal(montarAnoLetivo({ ano: 2026, tipo: 'semestre', numero: 2 }), '2026 · 2º semestre');
  assert.equal(montarAnoLetivo({ ano: 2027 }), '2027');
  assert.deepEqual(lerAnoLetivo('2026 · 3º bimestre'), { ano: 2026, tipo: 'bimestre', numero: 3 });
  assert.deepEqual(lerAnoLetivo('2026'), { ano: 2026, tipo: '', numero: null });
  assert.equal(lerAnoLetivo('turma da manhã'), null, 'texto antigo livre');
});

test('ano passado é recusado; atual e próximos aceitos', () => {
  assert.match(validarAnoLetivo({ ano: 2025 }, 2026), /já passou/);
  assert.equal(validarAnoLetivo({ ano: 2026 }, 2026), null);
  assert.equal(validarAnoLetivo({ ano: 2028 }, 2026), null);
  assert.match(validarAnoLetivo({ ano: 2040 }, 2026), /até 2031/);
});

test('número do período conforme o tipo', () => {
  assert.equal(validarAnoLetivo({ ano: 2026, tipo: 'semestre', numero: 2 }, 2026), null);
  assert.match(validarAnoLetivo({ ano: 2026, tipo: 'semestre', numero: 3 }, 2026), /de 1 a 2/);
  assert.equal(validarAnoLetivo({ ano: 2026, tipo: 'bimestre', numero: 4 }, 2026), null);
  assert.match(validarAnoLetivo({ ano: 2026, tipo: 'bimestre', numero: 5 }, 2026), /de 1 a 4/);
  assert.match(validarAnoLetivo({ ano: 2026, tipo: 'trimestre', numero: 0 }, 2026), /de 1 a 3/);
  assert.match(validarAnoLetivo({ ano: 2026, tipo: 'trimestre', numero: 1.5 }, 2026), /de 1 a 3/);
});

test('ano atual no fuso de Brasília', () => {
  assert.equal(anoAtual(new Date('2027-01-01T02:00:00Z')), 2026, 'ainda é 31/12 em Brasília');
  assert.equal(anoAtual(new Date('2027-01-01T04:00:00Z')), 2027);
});
