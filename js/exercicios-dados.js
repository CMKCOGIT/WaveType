// Os 6 níveis da trilha oficial ficam aqui no código. Cada exercício do banco tem a coluna "nivel_trilha" (1 a 6) e "ordem" (1 a 20).
export const NIVEIS = [
  {
    nivel: 1,
    titulo: 'Posição base',
    descricao: 'Aprenda a posição correta dos dedos no teclado.',
    etapas: [
      { inicio: 1, fim: 5, titulo: 'Teclas F e J', descricao: 'Treine as teclas F e J usando os dedos indicadores.' },
      { inicio: 6, fim: 10, titulo: 'Fileira esquerda', descricao: 'Pratique as teclas A, S, D, F e G.' },
      { inicio: 11, fim: 15, titulo: 'Fileira direita', descricao: 'Pratique as teclas H, J, K, L e Ç.' },
      { inicio: 16, fim: 20, titulo: 'Combinação das fileiras', descricao: 'Misture as teclas A, S, D, F, G, H, J, K, L e Ç.' },
    ],
  },
  {
    nivel: 2,
    titulo: 'Fileira superior',
    descricao: 'Aprenda a digitar usando as teclas da fileira de cima.',
    etapas: [
      { inicio: 1, fim: 5, titulo: 'Teclas F e J', descricao: 'Reforce a posição inicial dos dedos indicadores.' },
      { inicio: 6, fim: 10, titulo: 'Lado esquerdo superior', descricao: 'Pratique as teclas Q, W, E, R e T.' },
      { inicio: 11, fim: 15, titulo: 'Lado direito superior', descricao: 'Pratique as teclas Y, U, I, O e P.' },
      { inicio: 16, fim: 20, titulo: 'Fileira superior completa', descricao: 'Combine as teclas Q, W, E, R, T, Y, U, I, O e P.' },
    ],
  },
  {
    nivel: 3,
    titulo: 'Fileira inferior',
    descricao: 'Aprenda a digitar usando as teclas da fileira de baixo.',
    etapas: [
      { inicio: 1, fim: 5, titulo: 'Teclas F e J', descricao: 'Reforce a posição inicial dos dedos indicadores.' },
      { inicio: 6, fim: 10, titulo: 'Lado esquerdo inferior', descricao: 'Pratique as teclas Z, X, C e V.' },
      { inicio: 11, fim: 15, titulo: 'Lado direito inferior', descricao: 'Pratique as teclas B, N e M.' },
      { inicio: 16, fim: 20, titulo: 'Fileira inferior completa', descricao: 'Combine as teclas Z, X, C, V, B, N e M.' }
    ]
  },

  {
    nivel: 4,
    titulo: 'Palavras e frases',
    descricao: 'Pratique palavras comuns e frases curtas.',
    etapas: [
      { inicio: 1, fim: 5, titulo: 'Revisão da posição base', descricao: 'Reforce a precisão com F e J.' },
      { inicio: 6, fim: 10, titulo: 'Palavras curtas', descricao: 'Digite palavras simples com atenção.' },
      { inicio: 11, fim: 15, titulo: 'Palavras variadas', descricao: 'Pratique combinações de letras.' },
      { inicio: 16, fim: 20, titulo: 'Frases completas', descricao: 'Combine palavras em frases.' },
    ],
  },
  {
    nivel: 5,
    titulo: 'Palavras complexas',
    descricao: 'Desenvolva velocidade e precisão em textos maiores.',
    etapas: [
      { inicio: 1, fim: 5, titulo: 'Aquecimento', descricao: 'Revise as teclas e mantenha o ritmo.' },
      { inicio: 6, fim: 10, titulo: 'Palavras complexas', descricao: 'Treine palavras mais longas.' },
      { inicio: 11, fim: 15, titulo: 'Frases avançadas', descricao: 'Pratique frases com diferentes combinações.' },
      { inicio: 16, fim: 20, titulo: 'Textos completos', descricao: 'Treine textos corridos com precisão.' },
    ],
  },
  {
    nivel: 6,
    titulo: 'Extremo',
    descricao: 'Para quem já domina tudo: palavras gigantes, acentos em sequência, maiúsculas, números e símbolos.',
    etapas: [
      { inicio: 1, fim: 5, titulo: 'Palavras monstruosas', descricao: 'Palavras longuíssimas e raras, sem margem para erro.' },
      { inicio: 6, fim: 10, titulo: 'Chuva de acentos', descricao: 'Acentos, cedilhas e til em sequência.' },
      { inicio: 11, fim: 15, titulo: 'Maiúsculas e pontuação', descricao: 'Maiúsculas, hifens, parênteses, aspas e dois-pontos.' },
      { inicio: 16, fim: 20, titulo: 'Números e símbolos', descricao: 'Números, @, #, $, %, & e fórmulas. Sem piedade.' },
    ],
  },


];