// Importação e exportação da lista de alunos (js/contas/planilha.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  normalizarNome, lerCsv, detectarSeparador, decodificarCsv, localizarColunas, prepararImportacao,
  motivoNomeInvalido, emLotes, linhasDaExportacao, gerarCsv, celulaSegura, nomeDoArquivo,
} from '../js/contas/planilha.js';

test('normalizarNome ignora acentos, maiúsculas e espaços extras', () => {
  assert.equal(normalizarNome('  ÍRIS   Nuñes  '), 'iris nunes');
  assert.equal(normalizarNome('João'), normalizarNome('joao'));
});

test('CSV do Excel em português: ponto e vírgula, aspas e Windows-1252', () => {
  assert.equal(detectarSeparador('Nome;Turma\nAna;7A'), ';');
  assert.equal(detectarSeparador('Nome,Turma\nAna,7A'), ',');
  assert.deepEqual(lerCsv('Nome;Obs\n"Silva; Ana";"diz ""oi"""\r\nBia;x'), [['Nome', 'Obs'], ['Silva; Ana', 'diz "oi"'], ['Bia', 'x']]);
  const latin1 = Uint8Array.from([0x4a, 0x6f, 0xe3, 0x6f]); // "João" em Windows-1252
  assert.equal(decodificarCsv(latin1), 'João');
  const utf8 = new TextEncoder().encode('﻿João');
  assert.equal(decodificarCsv(utf8), 'João');
});

test('localiza a coluna de nomes pelo cabeçalho, com ou sem sobrenome', () => {
  assert.deepEqual(localizarColunas([['Nº', 'Nome completo', 'Turma'], [1, 'Ana', '7A']]), { linhaInicial: 1, colunaNome: 1, colunaSobrenome: null });
  assert.deepEqual(localizarColunas([['Lista da turma'], ['Nome', 'Sobrenome'], ['Ana', 'Lima']]), { linhaInicial: 2, colunaNome: 0, colunaSobrenome: 1 });
  // Sem cabeçalho: primeira coluna com letras
  assert.deepEqual(localizarColunas([[1, 'Ana Lima'], [2, 'Bia Reis']]), { linhaInicial: 0, colunaNome: 1, colunaSobrenome: null });
});

test('prévia marca novos, já na turma, repetidos e inválidos', () => {
  const matriz = [
    ['Nome'],
    ['Maria Silva Santos'],
    ['  maria   silva santos '],
    ['João Pedro Souza'],
    [''],
    ['Ana 2'],
    ['Pedro'],
    ['ana@escola.com'],
  ];
  const { linhas, resumo } = prepararImportacao(matriz, ['Joao Pedro Souza']);
  assert.deepEqual(linhas.map((l) => [l.linha, l.situacao]), [
    [2, 'novo'], [3, 'repetido'], [4, 'ja_na_turma'], [6, 'invalido'], [7, 'novo'], [8, 'invalido'],
  ]);
  assert.match(linhas[1].motivo, /linha 2/);
  assert.match(linhas[4].motivo, /sobrenome/);
  assert.deepEqual(resumo, { total: 6, novos: 2, jaNaTurma: 1, repetidos: 1, invalidos: 2, acimaDoLimite: 0 });
});

test('nomes válidos com apóstrofo, hífen e acentos', () => {
  assert.equal(motivoNomeInvalido("Ana D'Ávila Souza-Lima"), null);
  assert.equal(motivoNomeInvalido('A'), 'Nome muito curto');
  assert.equal(motivoNomeInvalido('=HYPERLINK("x")'), 'Caracteres não permitidos');
});

test('lê de verdade um .xlsx gerado (modelo de importação)', () => {
  const planilha = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(planilha, XLSX.utils.aoa_to_sheet([['Nome completo'], ['Maria Silva Santos'], ['João Pedro Souza']]), 'Alunos');
  const bytes = XLSX.write(planilha, { type: 'array', bookType: 'xlsx' });
  const lida = XLSX.read(bytes, { type: 'array' });
  const matriz = XLSX.utils.sheet_to_json(lida.Sheets[lida.SheetNames[0]], { header: 1, blankrows: false, defval: '' });
  const { resumo, linhas } = prepararImportacao(matriz);
  assert.equal(resumo.novos, 2);
  assert.equal(linhas[1].nome, 'João Pedro Souza');
});

test('lê um .xls (formato antigo do Excel)', () => {
  const planilha = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(planilha, XLSX.utils.aoa_to_sheet([['Aluno'], ['Caio Souza']]), 'Lista');
  const bytes = XLSX.write(planilha, { type: 'array', bookType: 'biff8' });
  const lida = XLSX.read(bytes, { type: 'array' });
  const matriz = XLSX.utils.sheet_to_json(lida.Sheets[lida.SheetNames[0]], { header: 1, blankrows: false, defval: '' });
  assert.equal(prepararImportacao(matriz).linhas[0].nome, 'Caio Souza');
});

test('lotes de 60 para o banco', () => {
  assert.deepEqual(emLotes([...Array(130).keys()]).map((l) => l.length), [60, 60, 10]);
});

test('exportação: cabeçalho, números como número, sem e-mail interno', () => {
  const alunos = [
    { aluno_id: 'a', nome: 'Ana Lima', codigo_aluno: 'K7Q2MX', email: 'a@aluno.wavetype.com.br', entrou_em: '2026-03-01T12:00:00Z', sessoes: 4, ppm_medio: 31.5, precisao_media: 96.2, atividades_concluidas: 2, ultima_pratica: null },
    { aluno_id: 'b', nome: '=Bia', codigo_aluno: 'P9R3ST', email: 'bia@gmail.com', entrou_em: '2026-03-01T12:00:00Z', sessoes: 0, ppm_medio: null, precisao_media: null, atividades_concluidas: 0, ultima_pratica: null },
  ];
  const linhas = linhasDaExportacao(alunos, { logins: new Map([['a', 'ana.lima']]), pontoDePartida: (id) => (id === 'a' ? 'Intermediário' : '') });
  assert.equal(linhas.length, 3);
  assert.deepEqual(linhas[1].slice(0, 4), ['Ana Lima', 'K7Q2MX', 'ana.lima', '']);
  assert.equal(linhas[1][6], 31.5);
  assert.equal(linhas[2][3], 'bia@gmail.com');
  const csv = gerarCsv(linhas);
  assert.ok(csv.startsWith('﻿Nome;Código do aluno'));
  assert.match(csv, /;31,5;96,2;/);
  assert.match(csv, /\r\n'=Bia;/, 'fórmula neutralizada');
  assert.equal(celulaSegura('-1+2'), "'-1+2");
  assert.equal(celulaSegura(-3), -3);
});

test('nome do arquivo sem acentos nem símbolos', () => {
  assert.equal(nomeDoArquivo('3º Ano A / Manhã', new Date('2026-11-10T10:00:00Z')), 'alunos-3o-ano-a-manha-2026-11-10');
});
