// js/contas/credenciais.js
// Usuário e senha inicial das contas de aluno criadas pelo professor.
// Funções puras (testadas). O banco confere o formato e resolve colisões
// de verdade (RPC professor_criar_alunos); aqui só sugerimos.

// Partículas que não entram no usuário (Maria da Silva → maria.silva).
const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du', 'del']);
export const LOGIN_VALIDO = /^[a-z0-9]+(\.[a-z0-9]+)*$/;
const LOGIN_MAXIMO = 50;

/** Minúsculas, sem acentos e só letras/números/espaços. */
export function normalizarNome(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Usuário legível a partir do nome completo:
 *   "Maria Silva Santos"            → maria.silva.santos
 *   "José da Conceição"             → jose.conceicao
 *   "Ana Beatriz Ferreira Lima Costa" → ana.lima.costa (primeiro + dois últimos)
 */
export function loginBase(nome) {
  const partes = normalizarNome(nome).split(' ').filter((p) => p && !PARTICULAS.has(p));
  if (!partes.length) return '';
  const escolhidas = partes.length > 3 ? [partes[0], ...partes.slice(-2)] : partes;
  let login = escolhidas.join('.');
  if (login.length > LOGIN_MAXIMO) login = login.slice(0, LOGIN_MAXIMO).replace(/\.+$/, '');
  if (login.length < 3) login = `${login}.aluno`.replace(/^\./, '');
  return login;
}

/** Igual ao banco: base, base2, base3... */
export function resolverColisao(base, existentes) {
  const usados = existentes instanceof Set ? existentes : new Set(existentes);
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

/** Sugestões para uma lista de nomes (prévia antes de criar em lote). */
export function sugerirLogins(nomes, existentes = []) {
  const usados = new Set(existentes);
  return nomes.map((nome) => {
    const login = resolverColisao(loginBase(nome), usados);
    usados.add(login);
    return { nome: String(nome).trim(), login };
  });
}

// Palavras curtas e conhecidas, sem acento: fáceis de ler e digitar para
// crianças. Os algarismos não usam 0 nem 1, que se confundem com "o" e "l".
export const PALAVRAS_SENHA = [
  'gato', 'sapo', 'pato', 'vaca', 'casa', 'mesa', 'bica', 'dado', 'faca', 'fada',
  'rede', 'rua', 'sumo', 'suco', 'tatu', 'urso', 'zebra', 'nave', 'pipa', 'peixe',
  'barco', 'carro', 'chuva', 'nuvem', 'praia', 'serra', 'terra', 'tigre', 'arara', 'banana',
  'caju', 'cereja', 'figo', 'manga', 'pera', 'uva', 'jaca', 'café', 'mapa', 'tinta',
  'vento', 'sabia', 'estrada', 'ponte', 'trem', 'jabuti', 'capivara', 'tucano', 'panda', 'baleia',
].map((p) => normalizarNome(p).replace(/\s/g, ''));
const DIGITOS = '23456789'; // sem 0 e 1 (parecem O e l)

function inteiroAleatorio(limite, aleatorio) {
  if (aleatorio) return Math.floor(aleatorio() * limite);
  const valores = new Uint32Array(1);
  globalThis.crypto.getRandomValues(valores);
  return valores[0] % limite;
}

/** Senha inicial: palavra + 3 algarismos (ex.: tucano472). */
export function gerarSenha({ aleatorio = null } = {}) {
  const palavra = PALAVRAS_SENHA[inteiroAleatorio(PALAVRAS_SENHA.length, aleatorio)];
  let numero = '';
  for (let i = 0; i < 3; i += 1) numero += DIGITOS[inteiroAleatorio(DIGITOS.length, aleatorio)];
  return palavra + numero;
}

/** Normaliza o que a pessoa digitou no campo "usuário da escola". */
export function normalizarLoginDigitado(texto) {
  return String(texto ?? '').trim().toLowerCase();
}

/** Lê uma lista colada (um nome por linha; ignora linhas vazias e repetidas). */
export function nomesDaLista(texto) {
  const vistos = new Set();
  return String(texto ?? '')
    .split(/\r?\n/)
    .map((linha) => linha.replace(/\s+/g, ' ').trim())
    .filter((linha) => {
      const chave = linha.toLowerCase();
      if (linha.length < 2 || vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
}

/**
 * Usuário escolhido pelo professor ao trocar: aceita "Maria Silva" ou
 * "maria.silva" e devolve no formato do banco (minúsculas, sem acento,
 * partes separadas por ponto), ou '' se não sobrar nada válido.
 */
export function normalizarLoginEscolhido(texto) {
  const login = normalizarNome(String(texto ?? '').replace(/[._-]+/g, ' '))
    .split(' ')
    .filter(Boolean)
    .join('.')
    .slice(0, LOGIN_MAXIMO)
    .replace(/\.+$/, '');
  return LOGIN_VALIDO.test(login) && login.length >= 3 ? login : '';
}
