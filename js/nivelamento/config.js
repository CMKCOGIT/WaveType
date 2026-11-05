// js/nivelamento/config.js
// Teste de nivelamento ("testar conhecimento") e sugestões durante o treino.
// Todos os limites ficam aqui; a lógica (js/nivelamento/avaliacao.js) só lê.

// Precisão mínima (%) para avançar para a próxima etapa do teste.
export const PRECISAO_PARA_AVANCAR = 80;
// Tempo máximo de cada etapa (s): 5 etapas × 35 s ≈ 3 min no máximo.
export const TEMPO_MAXIMO_ETAPA_SEG = 35;

// Etapas progressivas. `regiao` diz qual parte do teclado a etapa mede.
export const ETAPAS = [
  {
    id: 'base',
    titulo: 'Fileira base',
    instrucao: 'Comece pelas teclas onde os dedos descansam: A S D F G H J K L Ç.',
    texto: 'asdf jklç fada sala gala falha jaja dada lá já saga alfa ação',
  },
  {
    id: 'superior-inferior',
    titulo: 'Fileiras de cima e de baixo',
    instrucao: 'Agora as letras das fileiras de cima (Q a P) e de baixo (Z a M).',
    texto: 'quero porta tropa pipa ouro vaca zebu cabo menina nuvem mexer bambu',
  },
  {
    id: 'palavras',
    titulo: 'Palavras simples',
    instrucao: 'Palavras do dia a dia, com todas as letras.',
    texto: 'casa escola livro amigo tempo janela caderno teclado praticar sorriso',
  },
  {
    id: 'acentos',
    titulo: 'Acentos e pontuação',
    instrucao: 'Agora com acentos, cedilha, vírgula e ponto.',
    texto: 'Você já viu? A lição é fácil, mas exige atenção. Coração, pão e açúcar.',
  },
  {
    id: 'frases',
    titulo: 'Frases',
    instrucao: 'Por último, uma frase completa, no seu ritmo.',
    texto: 'Quem pratica um pouco todos os dias percebe que os dedos encontram as teclas sozinhos.',
  },
];

// Nível recomendado conforme a etapa em que o teste parou.
// licao: exercício exato da trilha (nivel_trilha 1–6, ordem 1–20).
export const NIVEIS_RECOMENDADOS = {
  iniciante: { rotulo: 'Iniciante', ordem: 1 },
  basico: { rotulo: 'Básico', ordem: 2 },
  intermediario: { rotulo: 'Intermediário', ordem: 3 },
  avancado: { rotulo: 'Avançado', ordem: 4 },
};

// Parou na etapa X → nível e lição de início.
export const RECOMENDACAO_POR_PARADA = {
  base: { nivel: 'iniciante', licao: { nivel: 1, ordem: 1 }, licaoSeQuaseLa: { nivel: 1, ordem: 6 } },
  // Fileira superior ou inferior: começa pela que errou mais (ver avaliacao.js).
  'superior-inferior': { nivel: 'basico', licao: { nivel: 2, ordem: 1 }, licaoInferior: { nivel: 3, ordem: 1 } },
  palavras: { nivel: 'basico', licao: { nivel: 4, ordem: 6 } },
  acentos: { nivel: 'intermediario', licao: { nivel: 5, ordem: 1 } },
  frases: { nivel: 'intermediario', licao: { nivel: 5, ordem: 11 } },
};
// Passou em tudo: avançado se for rápido e preciso; senão, textos completos.
export const CONCLUIU_TUDO = {
  ppmMinimoAvancado: 35,
  precisaoMinimaAvancado: 92,
  avancado: { nivel: 'avancado', licao: { nivel: 6, ordem: 1 } },
  intermediario: { nivel: 'intermediario', licao: { nivel: 5, ordem: 16 } },
};
// Na primeira etapa, "quase lá" (entre este valor e PRECISAO_PARA_AVANCAR)
// pula as lições de F e J e começa pela fileira esquerda.
export const PRECISAO_QUASE_LA = 65;

// ---------- Sugestão durante o treino (4.2) ----------
export const SUGESTAO = {
  // Precisão abaixo disto em N tentativas seguidas do mesmo exercício...
  precisaoBaixa: 70,
  tentativasSeguidas: 2,
  // ...e o exercício está acima do nível recomendado → sugere o recomendado.
  // Depois de ignorar esta quantidade de sugestões seguidas, o nível
  // recomendado sobe uma etapa (a pessoa mostrou que quer avançar).
  ignoradasParaSubir: 3,
};
