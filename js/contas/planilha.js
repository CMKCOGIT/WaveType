// js/contas/planilha.js
// Regras da importação e da exportação da lista de alunos (sem DOM e sem
// Supabase, para poder testar em Node: tests/planilha.test.js).
//
// Importação: a planilha vira uma matriz de células (SheetJS para .xlsx/.xls,
// lerCsv para .csv). Daqui saem os nomes, já validados e marcados como
// novo, já na turma, repetido no arquivo ou inválido. O banco confere de novo
// (professor_importar_alunos), então esta etapa serve para a prévia.

export const MAX_ALUNOS_IMPORTACAO = 300;
export const LOTE_IMPORTACAO = 60; // limite por chamada de professor_importar_alunos

/** Mesmo critério do banco (public.nome_normalizado): sem acentos, minúsculas, espaços simples. */
export function normalizarNome(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Nome como será gravado: espaços simples e sem espaços nas pontas. */
export function limparNome(nome) {
  return String(nome ?? '').replace(/\s+/g, ' ').trim();
}

// ---------- CSV ----------

/** Texto de um arquivo .csv: UTF-8 (com ou sem BOM) ou Windows-1252 (Excel em português). */
export function decodificarCsv(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Separador mais provável na primeira linha: ; (Excel pt-BR), vírgula ou tabulação. */
export function detectarSeparador(texto) {
  const primeira = texto.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const contagem = [';', ',', '\t'].map((s) => [s, primeira.split(s).length - 1]);
  contagem.sort((a, b) => b[1] - a[1]);
  return contagem[0][1] > 0 ? contagem[0][0] : ';';
}

/** CSV → matriz de células. Aceita aspas, aspas duplas escapadas e quebras de linha dentro das aspas. */
export function lerCsv(texto, separador = detectarSeparador(texto)) {
  const linhas = [];
  let linha = [];
  let celula = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        celula += '"';
        i += 1;
      } else if (c === '"') {
        aspas = false;
      } else {
        celula += c;
      }
    } else if (c === '"' && celula === '') {
      aspas = true;
    } else if (c === separador) {
      linha.push(celula);
      celula = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i += 1;
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = '';
    } else {
      celula += c;
    }
  }
  if (celula !== '' || linha.length) {
    linha.push(celula);
    linhas.push(linha);
  }
  return linhas;
}

// ---------- Nomes da planilha ----------

const CABECALHO_NOME = /^(nome( completo)?( do aluno| da aluna| do estudante)?|aluno|aluna|alunos|estudante|name|full name)$/;
const CABECALHO_SOBRENOME = /^(sobrenome|last name|surname)$/;

/**
 * Descobre onde estão os nomes. Procura um cabeçalho ("Nome", "Nome
 * completo", "Aluno"...) nas 5 primeiras linhas; sem cabeçalho, usa a
 * primeira coluna com texto. Se houver "Nome" e "Sobrenome", junta os dois.
 * Devolve { linhaInicial, colunaNome, colunaSobrenome }.
 */
export function localizarColunas(matriz) {
  for (let l = 0; l < Math.min(5, matriz.length); l += 1) {
    const celulas = (matriz[l] ?? []).map((c) => normalizarNome(c));
    const colunaNome = celulas.findIndex((c) => CABECALHO_NOME.test(c));
    if (colunaNome >= 0) {
      const colunaSobrenome = celulas.findIndex((c) => CABECALHO_SOBRENOME.test(c));
      return { linhaInicial: l + 1, colunaNome, colunaSobrenome: colunaSobrenome >= 0 ? colunaSobrenome : null };
    }
  }
  const largura = Math.max(0, ...matriz.slice(0, 20).map((l) => l?.length ?? 0));
  for (let c = 0; c < largura; c += 1) {
    if (matriz.some((l) => /\p{L}/u.test(String(l?.[c] ?? '')))) return { linhaInicial: 0, colunaNome: c, colunaSobrenome: null };
  }
  return { linhaInicial: 0, colunaNome: 0, colunaSobrenome: null };
}

/** Motivo de um nome não poder ser importado, ou null se estiver bom. */
export function motivoNomeInvalido(nome) {
  if (!nome) return 'Nome vazio';
  if (nome.length < 2) return 'Nome muito curto';
  if (nome.length > 120) return 'Nome com mais de 120 caracteres';
  if (/\d/.test(nome)) return 'O nome tem números';
  if (/@/.test(nome)) return 'Parece um e-mail, não um nome';
  if (!/^[\p{L}][\p{L}\p{M}' .-]*$/u.test(nome)) return 'Caracteres não permitidos';
  return null;
}

/**
 * Prévia da importação. `existentes` são os nomes dos alunos que já estão na
 * turma. Devolve as linhas (com a linha original da planilha) e um resumo.
 *   situacao: 'novo' | 'ja_na_turma' | 'repetido' | 'invalido'
 */
export function prepararImportacao(matriz, existentes = []) {
  const { linhaInicial, colunaNome, colunaSobrenome } = localizarColunas(matriz);
  const naTurma = new Set(existentes.map(normalizarNome));
  const vistos = new Map(); // chave → linha da primeira ocorrência
  const linhas = [];

  for (let l = linhaInicial; l < matriz.length; l += 1) {
    const partes = [matriz[l]?.[colunaNome]];
    if (colunaSobrenome != null) partes.push(matriz[l]?.[colunaSobrenome]);
    const nome = limparNome(partes.filter((p) => p != null && String(p).trim()).join(' '));
    if (!nome) continue; // linha em branco: ignora sem contar como erro

    const item = { linha: l + 1, nome, situacao: 'novo', motivo: '' };
    const invalido = motivoNomeInvalido(nome);
    const chave = normalizarNome(nome);
    if (invalido) {
      item.situacao = 'invalido';
      item.motivo = invalido;
    } else if (naTurma.has(chave)) {
      item.situacao = 'ja_na_turma';
      item.motivo = 'Já está nesta turma';
    } else if (vistos.has(chave)) {
      item.situacao = 'repetido';
      item.motivo = `Repetido (linha ${vistos.get(chave)})`;
    } else {
      vistos.set(chave, item.linha);
      if (nome.split(' ').length < 2) item.motivo = 'Só um nome: confira se tem sobrenome';
    }
    linhas.push(item);
  }

  const contar = (s) => linhas.filter((i) => i.situacao === s).length;
  const resumo = {
    total: linhas.length,
    novos: contar('novo'),
    jaNaTurma: contar('ja_na_turma'),
    repetidos: contar('repetido'),
    invalidos: contar('invalido'),
    acimaDoLimite: Math.max(0, contar('novo') - MAX_ALUNOS_IMPORTACAO),
  };
  return { linhas, resumo, colunaNome, temCabecalho: linhaInicial > 0 };
}

/** Divide uma lista em lotes de `tamanho`. */
export function emLotes(lista, tamanho = LOTE_IMPORTACAO) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamanho) lotes.push(lista.slice(i, i + tamanho));
  return lotes;
}

// ---------- Exportação ----------

export const COLUNAS_EXPORTACAO = [
  'Nome',
  'Código do aluno',
  'Usuário da escola',
  'E-mail',
  'Na turma desde',
  'Sessões',
  'WPM médio',
  'Precisão média (%)',
  'Atividades concluídas',
  'Última prática',
  'Ponto de partida',
];

const DOMINIO_INTERNO = /@aluno\.wavetype\.com\.br$/i;

function data(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
}

/**
 * Linhas da exportação (primeira linha = cabeçalho). Números ficam como
 * número (o Excel soma e ordena); o e-mail interno das contas da escola não
 * sai (não serve para nada fora do sistema).
 */
export function linhasDaExportacao(alunos, { logins = new Map(), pontoDePartida = () => '' } = {}) {
  const corpo = alunos.map((a) => [
    a.nome ?? '',
    a.codigo_aluno ?? '',
    logins.get(a.aluno_id) ?? '',
    a.email && !DOMINIO_INTERNO.test(a.email) ? a.email : '',
    data(a.entrou_em),
    Number(a.sessoes ?? 0),
    a.ppm_medio == null ? '' : Number(a.ppm_medio),
    a.precisao_media == null ? '' : Number(a.precisao_media),
    Number(a.atividades_concluidas ?? 0),
    data(a.ultima_pratica),
    pontoDePartida(a.aluno_id) ?? '',
  ]);
  return [COLUNAS_EXPORTACAO, ...corpo];
}

/**
 * Texto que uma planilha poderia executar como fórmula (=, +, -, @, tab, CR)
 * ganha um apóstrofo na frente (proteção contra "CSV injection").
 */
export function celulaSegura(valor) {
  if (typeof valor === 'number') return valor;
  const texto = String(valor ?? '');
  return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
}

/** CSV para o Excel em português: separador ;, vírgula decimal, BOM UTF-8. */
export function gerarCsv(linhas) {
  const corpo = linhas
    .map((linha) =>
      linha
        .map((valor) => {
          const seguro = celulaSegura(valor);
          const texto = typeof seguro === 'number' ? String(seguro).replace('.', ',') : seguro;
          return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
        })
        .join(';')
    )
    .join('\r\n');
  return `﻿${corpo}\r\n`;
}

/** Nome de arquivo seguro: "alunos-3o-ano-a-2026-11-10". */
export function nomeDoArquivo(turma, agora = new Date()) {
  const base = normalizarNome(String(turma ?? '').replace(/º/g, 'o').replace(/ª/g, 'a')).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'turma';
  const dia = agora.toISOString().slice(0, 10);
  return `alunos-${base}-${dia}`;
}
