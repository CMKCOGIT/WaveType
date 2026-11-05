// js/digitacao/config.js
// Limites das métricas e regras de digitação num só lugar.
// Mudou um número? Os testes em tests/ mostram o efeito.

export const METRICAS = {
  // Consistência só é calculada a partir desta quantidade de intervalos
  // válidos entre teclas (abaixo disso a interface mostra "—").
  amostraMinimaIntervalos: 15,
  // Intervalo acima disto é pausa (a pessoa parou para ler, respirar...).
  // Fica fora do cálculo para uma pausa não derrubar a métrica.
  pausaMaximaMs: 2000,
  // Precisão só aparece depois desta quantidade de teclas digitadas,
  // para não mostrar números absurdos nos primeiros segundos.
  amostraMinimaPrecisao: 10,
  // Abaixo disto, o diagnóstico sugere buscar um ritmo mais constante.
  // Intervalos entre teclas variam naturalmente (pares de letras fáceis e
  // difíceis); um CV de 0,5 já é um ritmo regular para quem está aprendendo.
  consistenciaRitmoIrregular: 40,
};

export const MODOS_ERRO = {
  fluxo: 'fluxo', // o cursor avança mesmo com erro
  correcao: 'correcao', // o cursor só avança com a tecla certa
};

export const DIGITACAO = {
  // Modo correção obrigatória: depois desta quantidade de erros seguidos na
  // mesma posição, sugerimos "seguir mesmo assim" ou "tentar de novo".
  errosSeguidosParaSugerir: 3,
};

// Modo de erros padrão por nível do teste aberto.
export const MODO_ERROS_POR_NIVEL = {
  easy: MODOS_ERRO.correcao,
  medium: MODOS_ERRO.fluxo,
  advanced: MODOS_ERRO.fluxo,
};

// Trilha oficial: até este nível (iniciantes), correção obrigatória por padrão.
export const NIVEL_TRILHA_MAXIMO_CORRECAO = 2;

/** Modo de erros padrão de um exercício (o do professor tem prioridade). */
export function modoErrosDoExercicio(exercicio, modoDaTurma = null) {
  if (modoDaTurma === MODOS_ERRO.fluxo || modoDaTurma === MODOS_ERRO.correcao) return modoDaTurma;
  if (exercicio && !exercicio.atividade && Number(exercicio.nivel) <= NIVEL_TRILHA_MAXIMO_CORRECAO) {
    return MODOS_ERRO.correcao;
  }
  return MODOS_ERRO.fluxo;
}
