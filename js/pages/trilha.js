// js/pages/trilha.js
// Desenha a trilha oficial (níveis → etapas → exercícios) com o progresso.
// Usado pela área do usuário e pela área do aluno.
import { NIVEIS } from '../exercicios-dados.js';
import { precisaoMinimaDoNivel } from '../regras.js';

const ETAPAS_PADRAO = [
  { inicio: 1, fim: 5, titulo: 'Etapa 1', descricao: 'Pratique as primeiras teclas.' },
  { inicio: 6, fim: 10, titulo: 'Etapa 2', descricao: 'Continue o treinamento.' },
  { inicio: 11, fim: 15, titulo: 'Etapa 3', descricao: 'Pratique novas combinações.' },
  { inicio: 16, fim: 20, titulo: 'Etapa 4', descricao: 'Combine as teclas aprendidas.' },
];

/**
 * Conjunto de ids de exercícios concluídos a partir dos resultados.
 * O banco já marca "concluido" (ex.: Nível 6 só com precisão > 85%).
 */
export function exerciciosConcluidos(resultados) {
  const concluidos = new Set();
  resultados.forEach((r) => {
    if (r.exercicio_id != null && r.concluido !== false) concluidos.add(r.exercicio_id);
  });
  return concluidos;
}

export function desenharTrilha({ container, resumo, exercicios, concluidos, tentados = new Set() }) {
  if (!container) return;

  const feitosTotal = exercicios.filter((e) => concluidos.has(e.id)).length;
  if (resumo) {
    resumo.textContent = exercicios.length
      ? `${feitosTotal} de ${exercicios.length} exercícios concluídos.`
      : 'Ainda não há exercícios cadastrados.';
  }

  container.innerHTML = NIVEIS.map((n) => {
    const doNivel = exercicios
      .filter((e) => Number(e.nivel) === Number(n.nivel))
      .sort((a, b) => Number(a.ordem) - Number(b.ordem));

    const feitos = doNivel.filter((e) => concluidos.has(e.id)).length;
    const pct = doNivel.length ? Math.round((feitos / doNivel.length) * 100) : 0;
    const minima = precisaoMinimaDoNivel(n.nivel);

    const etapasHTML = (n.etapas ?? ETAPAS_PADRAO)
      .map((etapa, indice) => {
        const daEtapa = doNivel.filter((e) => e.ordem >= etapa.inicio && e.ordem <= etapa.fim);
        const feitosEtapa = daEtapa.filter((e) => concluidos.has(e.id)).length;
        const pctEtapa = daEtapa.length ? Math.round((feitosEtapa / daEtapa.length) * 100) : 0;
        const completa = daEtapa.length > 0 && feitosEtapa === daEtapa.length;

        // Abre o primeiro exercício ainda não concluído.
        const proximo = daEtapa.find((e) => !concluidos.has(e.id)) ?? daEtapa[0];
        const textoBotao = completa ? 'Revisar' : tentados.has(proximo?.id) ? 'Tentar de novo' : 'Iniciar';
        const botao = proximo
          ? `<a class="etapa-iniciar" href="treinar.html?id=${encodeURIComponent(proximo.id)}">${textoBotao}</a>`
          : '<span class="etapa-indisponivel">Sem exercícios</span>';

        return `
        <article class="etapa-linha${completa ? ' is-concluida' : ''}">
          <div class="etapa-numero">${completa ? '✓' : indice + 1}</div>
          <div class="etapa-conteudo">
            <strong>${escapar(etapa.titulo)}</strong>
            <small>${escapar(etapa.descricao)}</small>
            <div class="etapa-barra"><div class="etapa-barra-preenchida" style="width: ${pctEtapa}%"></div></div>
            <span class="etapa-percentual">${feitosEtapa}/${daEtapa.length} exercícios · ${pctEtapa}%</span>
          </div>
          ${botao}
        </article>`;
      })
      .join('');

    return `
      <section class="panel panel-pad nivel-bloco">
        <div class="nivel-cabecalho">
          <div class="nivel-titulo">
            <h2>Nível ${n.nivel}: ${escapar(n.titulo)}</h2>
            <p>${escapar(n.descricao)}</p>
            ${minima != null ? `<span class="nivel-regra">Conclui só com precisão acima de ${minima}%</span>` : ''}
          </div>
          <div class="nivel-percentual">${pct}%</div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width: ${pct}%"></div></div>
        <div class="nivel-resumo">${feitos}/${doNivel.length} exercícios concluídos</div>
        <div class="etapas-lista">${etapasHTML}</div>
      </section>`;
  }).join('');
}

function escapar(texto) {
  const elemento = document.createElement('div');
  elemento.textContent = texto ?? '';
  return elemento.innerHTML;
}
