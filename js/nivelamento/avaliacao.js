// js/nivelamento/avaliacao.js
// Regras do teste de nivelamento e da sugestão durante o treino.
// Funções puras (testadas em tests/nivelamento.test.js).
import {
  ETAPAS,
  PRECISAO_PARA_AVANCAR,
  PRECISAO_QUASE_LA,
  RECOMENDACAO_POR_PARADA,
  CONCLUIU_TUDO,
  NIVEIS_RECOMENDADOS,
  SUGESTAO,
} from './config.js';

const REGIOES = {
  base: 'asdfghjklç',
  superior: 'qwertyuiop',
  inferior: 'zxcvbnm',
};
export const NOME_DA_REGIAO = {
  base: 'fileira base',
  superior: 'fileira de cima',
  inferior: 'fileira de baixo',
  acentos: 'acentos',
  pontuacao: 'pontuação',
  espaco: 'espaço',
  outros: 'outras teclas',
};

/** Região do teclado de uma tecla (como o motor registra: minúscula ou "espaço"). */
export function regiaoDaTecla(tecla) {
  if (tecla === 'espaço' || tecla === ' ') return 'espaco';
  const t = String(tecla).toLocaleLowerCase('pt-BR');
  if (t.length !== 1) return 'outros';
  for (const [regiao, letras] of Object.entries(REGIOES)) if (letras.includes(t)) return regiao;
  const semAcento = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (semAcento !== t) return 'acentos';
  if (/[.,;:!?'"()-]/.test(t)) return 'pontuacao';
  return 'outros';
}

/**
 * Resumo de uma etapa a partir das estatísticas do motor de digitação.
 * Usa a precisão bruta (o texto da etapa é curto; a amostra mínima da
 * precisão "ao vivo" não se aplica aqui) e a consistência validada na 1.3.
 */
export function resumirEtapa(id, estatisticas, segundos) {
  const errosPorRegiao = {};
  for (const [tecla, total] of estatisticas.errosPorTecla) {
    const regiao = regiaoDaTecla(tecla);
    errosPorRegiao[regiao] = (errosPorRegiao[regiao] || 0) + total;
  }
  return {
    id,
    precisao: estatisticas.precisaoBruta,
    ppm: estatisticas.ppmLiquido,
    consistencia: estatisticas.consistencia,
    teclas: estatisticas.teclas,
    segundos: Math.round(segundos),
    errosPorTecla: estatisticas.errosPorTecla.slice(0, 8),
    errosPorRegiao,
  };
}

/** Segue para a próxima etapa? (para assim que a precisão fica abaixo do limiar) */
export function deveAvancar(resumo) {
  return resumo.teclas > 0 && resumo.precisao >= PRECISAO_PARA_AVANCAR;
}

function teclasFrageis(resumos, limite = 5) {
  const total = new Map();
  for (const r of resumos) for (const [tecla, n] of r.errosPorTecla) total.set(tecla, (total.get(tecla) || 0) + n);
  return [...total.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite).map(([tecla]) => tecla);
}

function media(valores) {
  const validos = valores.filter((v) => Number.isFinite(v));
  return validos.length ? Math.round(validos.reduce((s, v) => s + v, 0) / validos.length) : null;
}

/**
 * Recomendação final a partir das etapas feitas (na ordem).
 * Devolve { nivel, rotulo, licao: { nivel, ordem }, parouEm, teclasFrageis,
 *           regiaoMaisFragil, precisaoMedia, ppmMedio, explicacao }.
 */
export function recomendar(resumos) {
  if (!resumos.length) throw new Error('Nenhuma etapa feita.');
  const ultima = resumos[resumos.length - 1];
  const parou = !deveAvancar(ultima);
  const concluiuTudo = !parou && resumos.length === ETAPAS.length;
  let escolha;

  if (concluiuTudo) {
    const rapidoEPreciso = ultima.ppm >= CONCLUIU_TUDO.ppmMinimoAvancado && ultima.precisao >= CONCLUIU_TUDO.precisaoMinimaAvancado;
    escolha = rapidoEPreciso ? CONCLUIU_TUDO.avancado : CONCLUIU_TUDO.intermediario;
  } else {
    const regra = RECOMENDACAO_POR_PARADA[ultima.id];
    let licao = regra.licao;
    if (ultima.id === 'base' && ultima.precisao >= PRECISAO_QUASE_LA) licao = regra.licaoSeQuaseLa;
    if (ultima.id === 'superior-inferior' && (ultima.errosPorRegiao.inferior || 0) > (ultima.errosPorRegiao.superior || 0)) {
      licao = regra.licaoInferior;
    }
    escolha = { nivel: regra.nivel, licao };
  }

  const frageis = teclasFrageis(resumos);
  const regioes = {};
  for (const r of resumos) for (const [regiao, n] of Object.entries(r.errosPorRegiao)) regioes[regiao] = (regioes[regiao] || 0) + n;
  const regiaoMaisFragil = Object.entries(regioes).filter(([r]) => r !== 'outros').sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const resultado = {
    nivel: escolha.nivel,
    rotulo: NIVEIS_RECOMENDADOS[escolha.nivel].rotulo,
    licao: { ...escolha.licao },
    parouEm: parou ? ultima.id : null,
    teclasFrageis: frageis,
    regiaoMaisFragil,
    precisaoMedia: media(resumos.map((r) => r.precisao)),
    ppmMedio: media(resumos.map((r) => r.ppm)),
    etapasFeitas: resumos.length,
  };
  resultado.explicacao = explicar(resultado, ultima);
  return resultado;
}

function explicar(r, ultima) {
  const etapa = ETAPAS.find((e) => e.id === ultima.id);
  const partes = [];
  if (r.parouEm) {
    partes.push(`Na etapa “${etapa.titulo}” sua precisão foi de ${ultima.precisao}%, e o ideal para avançar é ${PRECISAO_PARA_AVANCAR}%.`);
    partes.push(`Por isso, o melhor ponto de partida é o nível ${r.licao.nivel} da trilha, lição ${r.licao.ordem}: ali você firma essa parte do teclado antes de acelerar.`);
  } else if (r.nivel === 'avancado') {
    partes.push(`Você passou por todas as etapas com ${ultima.precisao}% de precisão e ${ultima.ppm} palavras por minuto na frase final.`);
    partes.push('Pode começar pelos desafios do nível Extremo.');
  } else {
    partes.push(`Você passou por todas as etapas. Na frase final fez ${ultima.ppm} palavras por minuto com ${ultima.precisao}% de precisão.`);
    partes.push(`Os textos completos do nível ${r.licao.nivel} vão ajudar a ganhar velocidade sem perder a precisão.`);
  }
  if (r.teclasFrageis.length) {
    partes.push(`Vale dar atenção especial a: ${r.teclasFrageis.slice(0, 3).join(', ')}${r.regiaoMaisFragil ? ` (${NOME_DA_REGIAO[r.regiaoMaisFragil]})` : ''}.`);
  }
  return partes.join(' ');
}

// ---------- 4.2: sugestão durante o treino ----------

const posicao = (licao) => (Number(licao.nivel) - 1) * 20 + Number(licao.ordem);

/**
 * Nível recomendado atual: o do último nivelamento, ajustado pelas decisões
 * do aluno. Aceitar uma sugestão fixa o recomendado nela; ignorar várias
 * seguidas sobe uma etapa (5 lições) a partir do recomendado.
 *   decisoes: [{ decisao: 'aceitou' | 'ignorou', recomendado: { nivel, ordem } }] (mais antiga primeiro)
 */
export function licaoRecomendadaAtual(licaoDoNivelamento, decisoes = []) {
  if (!licaoDoNivelamento) return null;
  let licao = { ...licaoDoNivelamento };
  let ignoradasSeguidas = 0;
  for (const d of decisoes) {
    if (d.decisao === 'aceitou' && d.recomendado) {
      licao = { nivel: Number(d.recomendado.nivel), ordem: Number(d.recomendado.ordem) };
      ignoradasSeguidas = 0;
    } else if (d.decisao === 'ignorou') {
      ignoradasSeguidas += 1;
      if (ignoradasSeguidas >= SUGESTAO.ignoradasParaSubir) {
        const proxima = Math.min(posicao(licao) + 5, 6 * 20);
        licao = { nivel: Math.ceil(proxima / 20), ordem: ((proxima - 1) % 20) + 1 };
        ignoradasSeguidas = 0;
      }
    }
  }
  return licao;
}

/**
 * Teclas muito abaixo do esperado numa tentativa (a partir do desempenho
 * por tecla do motor). Devolve as teclas, da pior para a melhor.
 */
export function teclasMuitoAbaixo(desempenhoPorTecla = []) {
  return desempenhoPorTecla
    .filter(([tecla, d]) => tecla !== 'espaço' && d.tentativas >= SUGESTAO.tentativasMinimas && d.erros / d.tentativas >= SUGESTAO.taxaErro)
    .sort((a, b) => b[1].erros / b[1].tentativas - a[1].erros / a[1].tentativas)
    .map(([tecla]) => tecla);
}

/**
 * Deve sugerir um exercício mais fácil? Só quando a pessoa foi mal em N
 * tentativas seguidas DESTE exercício e ele está acima do recomendado.
 *   precisoes: precisões das tentativas deste exercício, a mais recente por último.
 * Devolve { recomendado } ou null. Sem nivelamento, sugere fazer o teste.
 */
export function sugestaoDuranteTreino({ exercicio, precisoes, recomendada, teclasAbaixo = [] }) {
  if (!exercicio || exercicio.atividade) return null; // atividade do professor: não sugerimos trocar
  const ultimas = precisoes.slice(-SUGESTAO.tentativasSeguidas);
  const precisaoBaixa = ultimas.length >= SUGESTAO.tentativasSeguidas && ultimas.every((p) => p < SUGESTAO.precisaoBaixa);
  const muitasTeclas = teclasAbaixo.length >= SUGESTAO.teclasMinimas;
  if (!precisaoBaixa && !muitasTeclas) return null;
  const motivo = precisaoBaixa ? 'precisao' : 'teclas';
  const teclas = teclasAbaixo.slice(0, 3);
  if (!recomendada) return { fazerNivelamento: true, motivo, teclas };
  if (posicao({ nivel: exercicio.nivel, ordem: exercicio.ordem }) <= posicao(recomendada)) return null;
  return { recomendado: { ...recomendada }, motivo, teclas };
}
