// js/turmas/periodo.js
// Ano letivo da turma: ano + (opcional) tipo de período e número.
// Gravado em turmas.ano_letivo no formato "2026" ou "2026 · 2º semestre"
// (mesmo texto de antes, então as telas que mostram o ano não mudam).
// O banco confere as mesmas regras (trigger turmas_validar_ano_letivo).

export const TIPOS_DE_PERIODO = {
  semestre: { rotulo: 'Semestre', quantidade: 2 },
  bimestre: { rotulo: 'Bimestre', quantidade: 4 },
  trimestre: { rotulo: 'Trimestre', quantidade: 3 },
};
export const ANOS_A_FRENTE = 5;

/** Ano atual no horário de Brasília (o mesmo que o banco usa). */
export function anoAtual(agora = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(agora));
}

export function montarAnoLetivo({ ano, tipo = '', numero = null }) {
  if (!ano) return '';
  return tipo ? `${ano} · ${numero}º ${tipo}` : String(ano);
}

/** Lê o texto gravado. Texto antigo em formato livre devolve null. */
export function lerAnoLetivo(texto) {
  const m = /^(\d{4})(?: · ([1-9])º (semestre|bimestre|trimestre))?$/.exec(String(texto ?? '').trim());
  if (!m) return null;
  return { ano: Number(m[1]), tipo: m[3] ?? '', numero: m[2] ? Number(m[2]) : null };
}

/** Mensagem de erro, ou null se estiver tudo certo. */
export function validarAnoLetivo({ ano, tipo = '', numero = null }, atual = anoAtual()) {
  const n = Number(ano);
  if (!Number.isInteger(n)) return 'Escolha o ano letivo.';
  if (n < atual) return `Não é possível usar um ano que já passou. Escolha ${atual} ou um ano seguinte.`;
  if (n > atual + ANOS_A_FRENTE) return `Escolha um ano até ${atual + ANOS_A_FRENTE}.`;
  if (!tipo) return null;
  const info = TIPOS_DE_PERIODO[tipo];
  if (!info) return 'Escolha semestre, bimestre ou trimestre.';
  const k = Number(numero);
  if (!Number.isInteger(k) || k < 1 || k > info.quantidade) {
    return `${info.rotulo}: digite um número de 1 a ${info.quantidade}.`;
  }
  return null;
}
