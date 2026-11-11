// Os 5 níveis da trilha oficial (4 etapas de 5 exercícios cada).
// Cada exercício do banco tem "nivel_trilha" (1 a 5) e "ordem" (1 a 20); os textos
// estão na migração 20261111000017_nova_trilha_progressiva.sql.
// `teclas`: letras que a etapa pode usar; `maiusculas`/`extras`: o que mais
// ela libera (pontuação e acentos só no Nível 5). Conferido em tests/trilha.test.js.
export const NIVEIS = [
  {
    nivel: 1,
    titulo: "Posição base",
    descricao: "Dedos na fileira do meio: F e J guiam as mãos.",
    etapas: [
      { inicio: 1, fim: 5, titulo: "Teclas F e J", descricao: "Indicadores nas teclas com relevo: F (mão esquerda) e J (mão direita).", teclas: "fj", maiusculas: false, extras: "" },
      { inicio: 6, fim: 10, titulo: "Mão esquerda: A S D F G", descricao: "Mínimo no A, anelar no S, médio no D, indicador no F; o indicador também alcança o G.", teclas: "adfgs", maiusculas: false, extras: "" },
      { inicio: 11, fim: 15, titulo: "Mão direita: H J K L Ç", descricao: "Indicador no J (alcança o H), médio no K, anelar no L e mínimo no Ç.", teclas: "hjklç", maiusculas: false, extras: "" },
      { inicio: 16, fim: 20, titulo: "Fileira do meio completa", descricao: "As duas mãos juntas em A S D F G H J K L Ç, já formando palavras.", teclas: "adfghjklsç", maiusculas: false, extras: "" },
    ],
  },
  {
    nivel: 2,
    titulo: "Fileira superior",
    descricao: "Os dedos sobem para a fileira de cima e voltam sempre para a base.",
    etapas: [
      { inicio: 1, fim: 5, titulo: "Lado esquerdo: Q W E R T", descricao: "Da base, cada dedo da mão esquerda sobe uma tecla: Q W E R T.", teclas: "adefghjklqrstwç", maiusculas: false, extras: "" },
      { inicio: 6, fim: 10, titulo: "Lado direito: Y U I O P", descricao: "A mão direita sobe da base para Y U I O P.", teclas: "adfghijklopsuyç", maiusculas: false, extras: "" },
      { inicio: 11, fim: 15, titulo: "Fileira superior completa", descricao: "As dez teclas de cima com as duas mãos, voltando sempre para a base.", teclas: "adefghijklopqrstuwyç", maiusculas: false, extras: "" },
      { inicio: 16, fim: 20, titulo: "Frases com as duas fileiras", descricao: "Frases curtas usando só a fileira do meio e a de cima.", teclas: "adefghijklopqrstuwyç", maiusculas: false, extras: "" },
    ],
  },
  {
    nivel: 3,
    titulo: "Fileira inferior",
    descricao: "Os dedos descem para a fileira de baixo: o teclado de letras fica completo.",
    etapas: [
      { inicio: 1, fim: 5, titulo: "Lado esquerdo: Z X C V", descricao: "A mão esquerda desce da base para Z X C V.", teclas: "acdefghijklopqrstuvwxyzç", maiusculas: false, extras: "" },
      { inicio: 6, fim: 10, titulo: "Lado direito: B N M", descricao: "A mão direita desce para N e M; o indicador esquerdo alcança o B.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: false, extras: "" },
      { inicio: 11, fim: 15, titulo: "Fileira inferior completa", descricao: "Z X C V B N M juntas, em palavras que pedem a fileira de baixo.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: false, extras: "" },
      { inicio: 16, fim: 20, titulo: "Frases com o teclado inteiro", descricao: "Frases que usam as três fileiras, sem pressa e sem olhar para as mãos.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: false, extras: "" },
    ],
  },
  {
    nivel: 4,
    titulo: "Combinação de teclas",
    descricao: "As três fileiras juntas: palavras cada vez maiores e frases inteiras.",
    etapas: [
      { inicio: 1, fim: 5, titulo: "Palavras curtas", descricao: "Palavras de duas a quatro letras para ganhar ritmo.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: false, extras: "" },
      { inicio: 6, fim: 10, titulo: "Palavras médias", descricao: "Palavras de cinco a sete letras com letras das três fileiras.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: false, extras: "" },
      { inicio: 11, fim: 15, titulo: "Palavras longas", descricao: "Palavras grandes que pedem atenção do começo ao fim.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: false, extras: "" },
      { inicio: 16, fim: 20, titulo: "Frases completas", descricao: "Frases inteiras, ainda sem acentos e sem pontuação, para treinar a fluidez.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: false, extras: "" },
    ],
  },
  {
    nivel: 5,
    titulo: "Digitação avançada",
    descricao: "Maiúsculas, pontuação, acentos e textos completos, com fluidez.",
    etapas: [
      { inicio: 1, fim: 5, titulo: "Maiúsculas, ponto e vírgula", descricao: "Shift (com a outra mão) para as maiúsculas, ponto final e vírgula.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: true, extras: ",." },
      { inicio: 6, fim: 10, titulo: "Acentuação", descricao: "Acento agudo, circunflexo, crase e til em palavras do dia a dia.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: true, extras: ",.àáâãéêíóôõú" },
      { inicio: 11, fim: 15, titulo: "Pontuação completa", descricao: "Interrogação, exclamação, dois-pontos, ponto e vírgula, aspas, parênteses e hífen.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: true, extras: "!\"(),-.:;?àáâãéêíóôõú" },
      { inicio: 16, fim: 20, titulo: "Textos completos", descricao: "Parágrafos inteiros com tudo o que você aprendeu: ritmo, precisão e fluidez.", teclas: "abcdefghijklmnopqrstuvwxyzç", maiusculas: true, extras: "!\"(),-.:;?àáâãéêíóôõú" },
    ],
  },
];

/** Último nível da trilha (o Nível 6, Extremo, foi aposentado na migração 17). */
export const ULTIMO_NIVEL = NIVEIS.length;
