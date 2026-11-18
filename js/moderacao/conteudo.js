// js/moderacao/conteudo.js
// Moderação do conteúdo que o professor envia aos alunos (título, instruções
// e texto dos exercícios). Funções puras, testadas em tests/moderacao.test.js.
//
// Abordagem de AVISO E REVISÃO (nada é bloqueado sozinho):
//  - "ofensivo": palavrões, insultos diretos e termos discriminatórios;
//  - "atencao": palavras com outros sentidos (ex.: "burro" o animal, "macaco"
//    a ferramenta) ou temas sensíveis que podem ser legítimos em aula.
//    Só viram aviso quando o contexto não indica o sentido educacional.
//
// Para evitar falsos positivos:
//  - a busca é por PALAVRA inteira (computador, cuidado, Pernambuco não casam);
//  - palavras de duplo sentido têm "contextos de uso legítimo" (palavras
//    próximas que mostram o sentido escolar, científico ou cotidiano);
//  - disfarces comuns são desfeitos (acentos, letras repetidas, números no
//    lugar de letras, letras separadas por pontos: p.o.r.r.a).

const NEUTRO = {
  categoria: '',
  gravidade: 'ofensivo',
  motivo: '',
  legitimo: null, // RegExp de palavras próximas que indicam uso legítimo
  direcionado: false, // só é ofensivo quando dirigido a alguém (seu/sua/você é)
};

function termo(lista, extra) {
  return lista.map((palavra) => ({ ...NEUTRO, ...extra, palavra }));
}

const JANELA = 6; // palavras antes/depois consideradas como contexto

// Palavras já normalizadas (minúsculas, sem acento).
const TERMOS = [
  ...termo(
    ['porra', 'caralho', 'caralhos', 'merda', 'merdas', 'foda', 'fodase', 'foder', 'fodido', 'fodida', 'fodendo',
      'cu', 'cuzao', 'buceta', 'bucetas', 'piroca', 'puta', 'putas', 'puto', 'putos', 'arrombado',
      'arrombada', 'bosta', 'bostas', 'pqp', 'fdp', 'vsf', 'tnc', 'krl', 'xoxota', 'boquete', 'punheta'],
    { categoria: 'Palavrão', motivo: 'Palavrão ou expressão vulgar, inadequada ao ambiente escolar.' }
  ),
  ...termo(['cacete', 'caceta'], {
    categoria: 'Palavrão',
    motivo: 'Palavrão em muitas regiões (em outras, nome de pão). Revise o contexto.',
    legitimo: /\b(pao|paes|padaria|padeiro|trigo|forno|cafe|manteiga)\b/,
  }),
  ...termo(['viado', 'viadinho', 'traveco', 'sapatao', 'boiola', 'baitola'], {
    categoria: 'Discriminação',
    motivo: 'Termo usado de forma pejorativa contra pessoas LGBTQIA+.',
  }),
  ...termo(['neguinho', 'neguinha', 'macaca'], {
    categoria: 'Discriminação',
    motivo: 'Pode ser usado de forma racista. Revise o contexto.',
    gravidade: 'atencao',
    legitimo: /\b(animal|animais|zoologico|floresta|primata|primatas|selva|especie|especies|femea)\b/,
  }),
  ...termo(['retardado', 'retardada', 'mongoloide', 'aleijado', 'aleijada', 'debiloide'], {
    categoria: 'Discriminação',
    motivo: 'Termo capacitista, ofensivo a pessoas com deficiência.',
  }),
  ...termo(['vagabundo', 'vagabunda', 'desgracado', 'desgracada', 'otario', 'otaria', 'babaca', 'imbecil', 'imbecis',
    'cretino', 'cretina', 'escroto', 'escrota', 'piranha', 'vadia', 'corno', 'corna', 'lixo'], {
    categoria: 'Insulto',
    motivo: 'Insulto ou xingamento dirigido a alguém.',
    gravidade: 'atencao',
    direcionado: true,
    // piranha (peixe), lixo (reciclagem) e afins em textos de ciências
    legitimo: /\b(peixe|peixes|rio|rios|amazonia|aquario|reciclagem|reciclar|coleta|seletiva|organico|lixeira|residuo|residuos)\b/,
  }),
  ...termo(['idiota', 'idiotas', 'burro', 'burra', 'burros', 'burras', 'estupido', 'estupida', 'anta', 'jumento', 'jumenta'], {
    categoria: 'Insulto',
    motivo: 'Pode ofender quando dirigido a uma pessoa.',
    gravidade: 'atencao',
    direcionado: true,
    legitimo: /\b(animal|animais|fazenda|carroca|equino|equinos|mula|mulas|cavalo|cavalos|pasto|mamifero|mamiferos|especie|anta|tapir)\b/,
  }),
  ...termo(['macaco', 'macacos'], {
    categoria: 'Discriminação',
    motivo: 'Quando dirigido a uma pessoa, é uma ofensa racista.',
    gravidade: 'atencao',
    direcionado: true,
    legitimo: /\b(animal|animais|zoologico|floresta|primata|primatas|banana|bananas|selva|especie|carro|pneu|mecanico|hidraulico|trocar|galho|galhos|arvore|arvores)\b/,
  }),
  ...termo(['crioulo', 'crioula'], {
    categoria: 'Discriminação',
    motivo: 'Pode ser um termo racista. Em linguística (línguas crioulas) é legítimo.',
    gravidade: 'atencao',
    legitimo: /\b(lingua|linguas|idioma|idiomas|linguistica|cozinha|culinaria|galinha|arroz|cabo|verde|haiti|haitiano)\b/,
  }),
  ...termo(['bicha', 'bichas'], {
    categoria: 'Discriminação',
    motivo: 'Usado de forma pejorativa contra pessoas LGBTQIA+.',
    legitimo: /\b(verme|vermes|lombriga|lombrigas|intestino|intestinal|solitaria|parasita|parasitas|fila)\b/,
  }),
  ...termo(['porno', 'pornografia', 'pornografico', 'pornografica', 'nudes', 'putaria'], {
    categoria: 'Conteúdo inadequado',
    motivo: 'Conteúdo sexual inadequado para estudantes.',
    gravidade: 'atencao',
    legitimo: /\b(seguranca|proteger|protecao|denunciar|denuncia|crime|criminoso|lei|eca|estatuto|perigo|perigos|cuidado|cuidados)\b/,
  }),
  ...termo(['cocaina', 'crack', 'maconha', 'heroina', 'lsd', 'ecstasy'], {
    categoria: 'Tema sensível',
    motivo: 'Drogas: confirme se o texto tem finalidade educativa (prevenção, saúde).',
    gravidade: 'atencao',
    legitimo: /\b(prevencao|prevenir|saude|dependencia|vicio|riscos|risco|efeitos|efeito|campanha|combate|tratamento|medicina|medicinal|lei|crime|ilegal|pesquisa|estudo)\b/,
  }),
];

// Expressões de mais de uma palavra (já normalizadas).
const EXPRESSOES = [
  { padrao: /\bfilh[oa]s? d[ae] put[ao]\b/, categoria: 'Palavrão', gravidade: 'ofensivo', motivo: 'Xingamento grave.' },
  { padrao: /\bvai (te|se) f[ou]d[ea]r?\b/, categoria: 'Palavrão', gravidade: 'ofensivo', motivo: 'Xingamento grave.' },
  { padrao: /\bvai tomar no\b/, categoria: 'Palavrão', gravidade: 'ofensivo', motivo: 'Xingamento grave.' },
  { padrao: /\b(vou|vamos|vai) te (matar|bater|pegar|espancar)\b/, categoria: 'Ameaça', gravidade: 'ofensivo', motivo: 'Ameaça de violência.' },
  { padrao: /\b(se mat(a|ar|e)|suicid(io|ar|e))\b/, categoria: 'Tema sensível', gravidade: 'atencao',
    motivo: 'Tema sensível (autolesão). Use apenas com cuidado pedagógico e orientação de apoio.',
    legitimo: /\b(prevencao|prevenir|apoio|ajuda|cvv|188|saude|mental|setembro|amarelo|campanha|valorizacao|vida)\b/ },
  { padrao: /\b(nazista|nazismo|hitler)\b.*\b(bom|certo|melhor|viva|heil)\b|\bheil\b/, categoria: 'Discurso de ódio', gravidade: 'ofensivo',
    motivo: 'Apologia a ideologia de ódio.' },
];

const DIRECIONADORES = /\b(seu|sua|seus|suas|voce e|vc e|voces sao|tu e|e um|e uma|que|seu grande|sua grande|bando de)$/;

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i' };

/** Normaliza um trecho: minúsculas, sem acento, sem disfarces numéricos. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$!](?=[a-z0-9@$!]*[a-z])|(?<=[a-z][a-z0-9@$!]*)[0134578@$!]/g, (c) => LEET[c] ?? c)
    .replace(/([a-z])\1{2,}/g, '$1$1');
}

/**
 * Quebra o texto em palavras guardando a posição original de cada uma.
 * Letras isoladas separadas por ponto, hífen, espaço ou asterisco
 * ("p.o.r.r.a", "p o r r a", "m*e*r*d*a") viram uma palavra só.
 */
export function palavras(texto) {
  const original = String(texto ?? '');
  const lista = [];
  const regex = /[\p{L}\p{N}@$*]+/gu;
  let m;
  while ((m = regex.exec(original))) {
    lista.push({ bruto: m[0], inicio: m.index, fim: m.index + m[0].length });
  }
  // Junta sequências de 3+ letras isoladas com o MESMO separador entre elas
  // (disfarce letra a letra: "p.o.r.r.a", "p o r r a").
  const unica = (p) => p.bruto.replace(/\*/g, '').length === 1;
  const separador = (a, b) => original.slice(a.fim, b.inicio);
  const juntas = [];
  for (let i = 0; i < lista.length; ) {
    let j = i + 1;
    if (unica(lista[i])) {
      const sep = j < lista.length ? separador(lista[i], lista[j]) : null;
      while (j < lista.length && unica(lista[j]) && sep.length <= 2 && separador(lista[j - 1], lista[j]) === sep) j += 1;
    }
    if (j - i >= 3) {
      juntas.push({ bruto: lista.slice(i, j).map((p) => p.bruto).join(''), inicio: lista[i].inicio, fim: lista[j - 1].fim });
      i = j;
    } else {
      juntas.push(lista[i]);
      i += 1;
    }
  }
  return juntas.map((p) => ({ ...p, norma: normalizar(p.bruto.replace(/\*/g, '')) }));
}

/** Letras repetidas viram uma só (porrrra → pora; porra → pora). */
export function compactar(palavra) {
  return palavra.replace(/([a-z])\1+/g, '$1');
}
const POR_PALAVRA = new Map(TERMOS.map((t) => [t.palavra, t]));
const POR_COMPACTA = new Map(TERMOS.map((t) => [compactar(t.palavra), t]));
const regraDe = (norma) => POR_PALAVRA.get(norma) ?? POR_COMPACTA.get(compactar(norma));

function trechoDe(texto, inicio, fim) {
  const de = Math.max(0, inicio - 30);
  const ate = Math.min(texto.length, fim + 30);
  return `${de > 0 ? '…' : ''}${texto.slice(de, ate).replace(/\s+/g, ' ').trim()}${ate < texto.length ? '…' : ''}`;
}

/**
 * Analisa um texto. Devolve as ocorrências encontradas:
 *   { termo, inicio, fim, trecho, categoria, gravidade: 'ofensivo'|'atencao', motivo }
 */
export function analisarTexto(texto) {
  const original = String(texto ?? '');
  if (!original.trim()) return [];
  const lista = palavras(original);
  const normas = lista.map((p) => p.norma);
  const textoNormalizado = normas.join(' ');
  const ocorrencias = [];

  // Frase de cada palavra: o contexto não atravessa ponto final.
  let frase = 0;
  const frases = lista.map((p, i) => {
    if (i > 0 && /[.!?;\n]/.test(original.slice(lista[i - 1].fim, p.inicio))) frase += 1;
    return frase;
  });

  lista.forEach((p, i) => {
    const regra = regraDe(p.norma);
    if (!regra) return;
    const mesmaFrase = (j) => frases[j] === frases[i];
    const indices = [];
    for (let j = Math.max(0, i - JANELA); j <= Math.min(lista.length - 1, i + JANELA); j += 1) if (mesmaFrase(j)) indices.push(j);
    const vizinhanca = indices.map((j) => normas[j]).join(' ');
    const antes = normas.slice(Math.max(0, i - 2), i).filter((_, k, arr) => mesmaFrase(i - arr.length + k)).join(' ');
    const dirigido = DIRECIONADORES.test(antes);
    // Dirigido a alguém ("seu idiota") é ofensa mesmo perto de palavras neutras;
    // fora disso, o contexto educacional/científico afasta o aviso.
    if (regra.legitimo && regra.legitimo.test(vizinhanca) && !(regra.direcionado && dirigido)) return;
    if (regra.direcionado && regra.gravidade === 'atencao' && !dirigido) {
      // Sem alvo claro: em textos escolares costuma ser legítimo (ex.: "o burro puxava a carroça").
      return;
    }
    ocorrencias.push({
      termo: p.bruto,
      inicio: p.inicio,
      fim: p.fim,
      trecho: trechoDe(original, p.inicio, p.fim),
      categoria: regra.categoria,
      gravidade: regra.direcionado && dirigido ? 'ofensivo' : regra.gravidade,
      motivo: regra.motivo,
    });
  });

  for (const expressao of EXPRESSOES) {
    const achado = expressao.padrao.exec(textoNormalizado);
    if (!achado) continue;
    if (expressao.legitimo && expressao.legitimo.test(textoNormalizado)) continue;
    // Volta da posição no texto normalizado para a palavra original
    const indicePalavra = textoNormalizado.slice(0, achado.index).split(' ').length - 1;
    const ultimaPalavra = indicePalavra + achado[0].split(' ').length - 1;
    const inicio = lista[Math.max(0, indicePalavra)]?.inicio ?? 0;
    const fim = lista[Math.min(lista.length - 1, ultimaPalavra)]?.fim ?? original.length;
    if (ocorrencias.some((o) => o.inicio >= inicio && o.fim <= fim && o.gravidade === 'ofensivo')) continue;
    ocorrencias.push({
      termo: original.slice(inicio, fim),
      inicio,
      fim,
      trecho: trechoDe(original, inicio, fim),
      categoria: expressao.categoria,
      gravidade: expressao.gravidade,
      motivo: expressao.motivo,
    });
  }

  return ocorrencias.sort((a, b) => a.inicio - b.inicio);
}

/**
 * Analisa vários campos ({ titulo: '...', texto: '...' }).
 * Devolve { ocorrencias: [{ campo, ...ocorrencia }], ofensivas, atencao }.
 */
export function moderarCampos(campos) {
  const ocorrencias = Object.entries(campos).flatMap(([campo, texto]) => analisarTexto(texto).map((o) => ({ campo, ...o })));
  return {
    ocorrencias,
    ofensivas: ocorrencias.filter((o) => o.gravidade === 'ofensivo').length,
    atencao: ocorrencias.filter((o) => o.gravidade === 'atencao').length,
  };
}
