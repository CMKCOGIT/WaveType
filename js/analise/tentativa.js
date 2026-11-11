// js/analise/tentativa.js
// Análise de uma tentativa para o professor: compara, palavra por palavra e
// letra por letra, o texto da atividade com o que o aluno digitou
// (resultados_detalhes.palavras = [[esperado, digitado, errosCometidos], ...]).
// Sem DOM: testado em tests/analise.test.js.

/**
 * Situação de cada palavra:
 *   certa        digitada igual, sem nenhum erro no caminho
 *   corrigida    ficou certa, mas o aluno errou e apagou antes
 *   errada       ficou com letra trocada, faltando ou sobrando
 *   nao_digitada o aluno não chegou nela (tempo acabou ou parou antes)
 */
export function analisarTentativa(textoReferencia, palavras = []) {
  const referencia = String(textoReferencia ?? '').trim().split(/\s+/).filter(Boolean);
  const total = Math.max(referencia.length, palavras.length);
  const linhas = [];
  const erros = [];

  for (let i = 0; i < total; i += 1) {
    const registro = palavras[i];
    const esperado = registro ? String(registro[0]) : referencia[i];
    if (esperado == null) continue;
    if (!registro) {
      linhas.push({ indice: i, esperado, digitado: '', situacao: 'nao_digitada', letras: [], errosCometidos: 0 });
      continue;
    }
    const digitado = String(registro[1] ?? '');
    const errosCometidos = Number(registro[2]) || 0;
    const letras = compararLetras(esperado, digitado);
    const ficouCerta = digitado === esperado;
    const situacao = ficouCerta ? (errosCometidos > 0 ? 'corrigida' : 'certa') : 'errada';
    linhas.push({ indice: i, esperado, digitado, situacao, letras, errosCometidos });
    if (!ficouCerta) {
      erros.push({
        posicao: i + 1,
        esperado,
        digitado,
        tipo: tipoDoErro(esperado, digitado),
        letras: letras.filter((l) => l.estado !== 'ok').map(descreverLetra),
      });
    }
  }

  const contar = (s) => linhas.filter((l) => l.situacao === s).length;
  const letrasDigitadas = linhas.flatMap((l) => l.letras);
  return {
    palavras: linhas,
    erros,
    resumo: {
      totalPalavras: linhas.length,
      certas: contar('certa'),
      corrigidas: contar('corrigida'),
      erradas: contar('errada'),
      naoDigitadas: contar('nao_digitada'),
      letrasTrocadas: letrasDigitadas.filter((l) => l.estado === 'trocada').length,
      letrasFaltando: letrasDigitadas.filter((l) => l.estado === 'faltou').length,
      letrasSobrando: letrasDigitadas.filter((l) => l.estado === 'sobrou').length,
      errosApagados: linhas.reduce((s, l) => s + (l.situacao === 'corrigida' ? l.errosCometidos : 0), 0),
    },
  };
}

/** Letra a letra, na mesma posição (como o motor de digitação conta). */
export function compararLetras(esperado, digitado) {
  const letras = [];
  const tamanho = Math.max(esperado.length, digitado.length);
  for (let i = 0; i < tamanho; i += 1) {
    const e = esperado[i];
    const d = digitado[i];
    if (e != null && d != null) letras.push({ posicao: i, esperado: e, digitado: d, estado: e === d ? 'ok' : 'trocada' });
    else if (e != null) letras.push({ posicao: i, esperado: e, digitado: null, estado: 'faltou' });
    else letras.push({ posicao: i, esperado: null, digitado: d, estado: 'sobrou' });
  }
  return letras;
}

function tipoDoErro(esperado, digitado) {
  if (!digitado) return 'Não digitou';
  if (digitado.length < esperado.length && esperado.startsWith(digitado)) return 'Incompleta';
  if (digitado.length > esperado.length && digitado.startsWith(esperado)) return 'Letras a mais';
  if (esperado.toLocaleLowerCase('pt-BR') === digitado.toLocaleLowerCase('pt-BR')) return 'Maiúscula/minúscula';
  if (esperado.normalize('NFD').replace(/[̀-ͯ]/g, '') === digitado.normalize('NFD').replace(/[̀-ͯ]/g, '')) return 'Acento';
  return 'Letra trocada';
}

const NOME_DA_TECLA = { ' ': 'espaço' };

function descreverLetra(l) {
  const mostrar = (c) => NOME_DA_TECLA[c] ?? c;
  if (l.estado === 'trocada') return `${l.posicao + 1}ª letra: “${mostrar(l.esperado)}” virou “${mostrar(l.digitado)}”`;
  if (l.estado === 'faltou') return `faltou “${mostrar(l.esperado)}” (${l.posicao + 1}ª letra)`;
  return `sobrou “${mostrar(l.digitado)}”`;
}

/** Teclas que mais erraram, do detalhe salvo ({ tecla: erros }). */
export function teclasMaisErradas(errosPorTecla = {}, limite = 8) {
  return Object.entries(errosPorTecla ?? {})
    .map(([tecla, erros]) => [tecla, Number(erros) || 0])
    .filter(([, erros]) => erros > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite);
}
