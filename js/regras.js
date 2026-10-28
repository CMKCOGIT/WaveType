// js/regras.js
// Regras de conclusão da trilha. A fonte da verdade é o banco
// (trigger resultados_validar / função precisao_minima_trilha); este
// arquivo só repete a mesma regra para a interface explicar o resultado.

// Precisão que precisa ser SUPERADA para concluir um exercício do nível.
// Níveis fora da tabela não têm exigência (qualquer tentativa conclui).
export const PRECISAO_MINIMA_POR_NIVEL = { 6: 85 };

export function precisaoMinimaDoNivel(nivel) {
  return PRECISAO_MINIMA_POR_NIVEL[Number(nivel)] ?? null;
}

/** true se o resultado conclui o exercício (usa o que o banco decidiu). */
export function resultadoConcluiu(resultado, nivel) {
  if (typeof resultado?.concluido === 'boolean') return resultado.concluido;
  const minima = precisaoMinimaDoNivel(nivel);
  return minima == null || Number(resultado?.precisao) > minima;
}
