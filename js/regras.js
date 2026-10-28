// js/regras.js
// Regras de conclusão. A fonte da verdade é o banco (trigger
// resultados_validar / função precisao_minima_trilha); este arquivo só
// repete as mesmas regras para a interface explicar o resultado.
//
// Trilha oficial (níveis 1 a 6): precisão ACIMA de 85% e texto terminado
// dentro do tempo máximo do exercício.
// Atividade de professor: precisão mínima e tempo máximo definidos por ele.

export const PRECISAO_MINIMA_TRILHA = 85;

export function precisaoMinimaDoNivel() {
  return PRECISAO_MINIMA_TRILHA;
}

/** true se o resultado conclui o exercício (usa o que o banco decidiu). */
export function resultadoConcluiu(resultado) {
  return resultado?.concluido === true;
}

/** Motivo de um resultado não ter concluído o exercício, para mostrar à pessoa. */
export function motivoNaoConcluiu(resultado, exercicio) {
  const precisao = formatar(resultado.precisao);
  const limite = Number(resultado.tempo_limite_seg ?? exercicio?.tempo_limite_seg) || null;
  const motivos = [];

  if (resultado.concluiu_texto === false) {
    motivos.push(`O tempo máximo de ${formatarTempo(limite)} acabou antes do fim do texto.`);
  } else if (limite && Number(resultado.tempo_seg) > limite) {
    motivos.push(`Você levou ${formatarTempo(resultado.tempo_seg)}; o máximo é ${formatarTempo(limite)}.`);
  }

  if (exercicio?.atividade) {
    const meta = exercicio.meta_precisao;
    if (meta != null && Number(resultado.precisao) < Number(meta)) {
      motivos.push(`Precisão de ${precisao}%; a meta desta atividade é ${formatar(meta)}%.`);
    }
  } else if (Number(resultado.precisao) <= PRECISAO_MINIMA_TRILHA) {
    motivos.push(`Precisão de ${precisao}%; é preciso mais de ${PRECISAO_MINIMA_TRILHA}%.`);
  }

  return motivos.length ? motivos.join(' ') : 'O resultado não atingiu os critérios de conclusão.';
}

export function formatarTempo(segundos) {
  const total = Math.max(0, Math.round(Number(segundos) || 0));
  if (total < 60) return `${total} s`;
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return resto ? `${minutos} min ${resto} s` : `${minutos} min`;
}

function formatar(valor) {
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
