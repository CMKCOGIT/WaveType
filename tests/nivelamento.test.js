import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regiaoDaTecla, resumirEtapa, deveAvancar, recomendar, licaoRecomendadaAtual, sugestaoDuranteTreino, teclasMuitoAbaixo } from '../js/nivelamento/avaliacao.js';
import { criarMotor } from '../js/digitacao/motor.js';
import { ETAPAS, PRECISAO_PARA_AVANCAR } from '../js/nivelamento/config.js';

const etapa = (id, precisao, extra = {}) => ({
  id, precisao, ppm: 20, consistencia: 60, teclas: 60, segundos: 30, errosPorTecla: [], errosPorRegiao: {}, ...extra,
});

test('regiões do teclado', () => {
  assert.equal(regiaoDaTecla('a'), 'base');
  assert.equal(regiaoDaTecla('ç'), 'base');
  assert.equal(regiaoDaTecla('Q'), 'superior');
  assert.equal(regiaoDaTecla('m'), 'inferior');
  assert.equal(regiaoDaTecla('ã'), 'acentos');
  assert.equal(regiaoDaTecla(','), 'pontuacao');
  assert.equal(regiaoDaTecla('espaço'), 'espaco');
});

test('resumo da etapa a partir do motor real', () => {
  const m = criarMotor({ palavras: ['fada', 'sala'] });
  let t = 0;
  for (const c of 'fxda sala') m.digitar(c, (t += 200));
  const r = resumirEtapa('base', m.estatisticas(10), 10);
  assert.equal(r.precisao, 89); // 8 de 9 teclas
  assert.deepEqual(r.errosPorRegiao, { base: 1 });
});

test('avança só com precisão no limiar', () => {
  assert.equal(deveAvancar(etapa('base', PRECISAO_PARA_AVANCAR)), true);
  assert.equal(deveAvancar(etapa('base', PRECISAO_PARA_AVANCAR - 1)), false);
  assert.equal(deveAvancar(etapa('base', 100, { teclas: 0 })), false);
});

test('parou na fileira base: iniciante, nível 1 lição 1', () => {
  const r = recomendar([etapa('base', 40, { errosPorTecla: [['j', 4], ['k', 2]], errosPorRegiao: { base: 6 } })]);
  assert.equal(r.nivel, 'iniciante');
  assert.deepEqual(r.licao, { nivel: 1, ordem: 1 });
  assert.deepEqual(r.teclasFrageis, ['j', 'k']);
  assert.equal(r.regiaoMaisFragil, 'base');
  assert.match(r.explicacao, /precisão foi de 40%/);
});

test('quase lá na fileira base: pula F e J', () => {
  assert.deepEqual(recomendar([etapa('base', 70)]).licao, { nivel: 1, ordem: 6 });
});

test('parou nas fileiras de cima/baixo: começa pela que mais errou', () => {
  const cima = recomendar([etapa('base', 95), etapa('superior-inferior', 60, { errosPorRegiao: { superior: 6, inferior: 1 } })]);
  assert.deepEqual(cima.licao, { nivel: 2, ordem: 1 });
  const baixo = recomendar([etapa('base', 95), etapa('superior-inferior', 60, { errosPorRegiao: { superior: 1, inferior: 6 } })]);
  assert.deepEqual(baixo.licao, { nivel: 3, ordem: 1 });
  assert.equal(baixo.rotulo, 'Básico');
});

test('passou em tudo: avançado se rápido e preciso, senão intermediário', () => {
  const tudo = (ppm, precisao) => ETAPAS.map((e) => etapa(e.id, 95)).map((r, i, l) => (i === l.length - 1 ? { ...r, ppm, precisao } : r));
  const avancado = recomendar(tudo(45, 96));
  assert.equal(avancado.nivel, 'avancado');
  assert.deepEqual(avancado.licao, { nivel: 6, ordem: 1 });
  assert.equal(avancado.parouEm, null);
  assert.equal(recomendar(tudo(25, 90)).nivel, 'intermediario');
});

test('lição recomendada atual: aceitar fixa, ignorar 3 vezes sobe uma etapa', () => {
  const base = { nivel: 2, ordem: 1 };
  assert.deepEqual(licaoRecomendadaAtual(base, [{ decisao: 'aceitou', recomendado: { nivel: 1, ordem: 6 } }]), { nivel: 1, ordem: 6 });
  const tres = Array.from({ length: 3 }, () => ({ decisao: 'ignorou' }));
  assert.deepEqual(licaoRecomendadaAtual(base, tres), { nivel: 2, ordem: 6 });
  assert.deepEqual(licaoRecomendadaAtual({ nivel: 1, ordem: 18 }, tres), { nivel: 2, ordem: 3 });
  assert.equal(licaoRecomendadaAtual(null, tres), null);
});

test('sugestão no treino: só depois de 2 tentativas ruins acima do recomendado', () => {
  const exercicio = { nivel: 4, ordem: 10, atividade: false };
  const recomendada = { nivel: 2, ordem: 1 };
  assert.equal(sugestaoDuranteTreino({ exercicio, precisoes: [50], recomendada }), null);
  assert.equal(sugestaoDuranteTreino({ exercicio, precisoes: [50, 75], recomendada }), null);
  assert.deepEqual(sugestaoDuranteTreino({ exercicio, precisoes: [90, 50, 60], recomendada }), { recomendado: recomendada, motivo: 'precisao', teclas: [] });
  assert.equal(sugestaoDuranteTreino({ exercicio: { nivel: 1, ordem: 5 }, precisoes: [50, 60], recomendada }), null, 'abaixo do recomendado não sugere');
  assert.deepEqual(sugestaoDuranteTreino({ exercicio, precisoes: [50, 60], recomendada: null }), { fazerNivelamento: true, motivo: 'precisao', teclas: [] });
  assert.equal(sugestaoDuranteTreino({ exercicio: { ...exercicio, atividade: true }, precisoes: [10, 10], recomendada }), null);
});

test('teclas muito abaixo do esperado: taxa de erro alta com amostra mínima', () => {
  const d = [
    ['q', { tentativas: 4, erros: 3 }],
    ['p', { tentativas: 5, erros: 2 }],
    ['z', { tentativas: 2, erros: 2 }], // poucas aparições: não conta
    ['a', { tentativas: 20, erros: 1 }],
    ['espaço', { tentativas: 10, erros: 9 }], // espaço fica de fora
  ];
  assert.deepEqual(teclasMuitoAbaixo(d), ['q', 'p']);
});

test('sugestão por teclas: 3 teclas muito abaixo sugerem mesmo com precisão boa', () => {
  const exercicio = { nivel: 4, ordem: 10, atividade: false };
  const recomendada = { nivel: 2, ordem: 1 };
  assert.equal(sugestaoDuranteTreino({ exercicio, precisoes: [85], recomendada, teclasAbaixo: ['q', 'p'] }), null);
  assert.deepEqual(sugestaoDuranteTreino({ exercicio, precisoes: [85], recomendada, teclasAbaixo: ['q', 'p', 'z', 'x'] }), {
    recomendado: recomendada,
    motivo: 'teclas',
    teclas: ['q', 'p', 'z'],
  });
});

test('motor conta tentativas por tecla para a sugestão', () => {
  const m = criarMotor({ palavras: ['qa', 'qa', 'qa'] });
  let t = 0;
  for (const c of 'xa xa qa ') m.digitar(c, (t += 100));
  const q = new Map(m.estatisticas(10).desempenhoPorTecla).get('q');
  assert.deepEqual(q, { tentativas: 3, erros: 2 });
  assert.deepEqual(teclasMuitoAbaixo(m.estatisticas(10).desempenhoPorTecla), ['q']);
});
