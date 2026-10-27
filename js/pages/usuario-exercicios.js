
 // js/pages/usuario-exercicios.js
import { exigirPapel } from '../auth.js';
import { listarMeusResultados } from '../api/resultados.js';
import { listarExercicios } from '../api/exercicios.js';
import { NIVEIS } from '../exercicios-dados.js';

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('usuario');
  if (!perfil) return;

  try {
    const [exercicios, resultados] = await Promise.all([
      listarExercicios(),
      listarMeusResultados({ limite: 1000 }),
    ]);

    // Guarda o melhor resultado de cada exercício.
    const melhores = {};

    resultados.forEach((r) => {
      if (r.exercicio_id == null) return;

      const ppm = Number(r.ppm);

      if (
        !(r.exercicio_id in melhores) ||
        ppm > melhores[r.exercicio_id]
      ) {
        melhores[r.exercicio_id] = ppm;
      }
    });

    desenhar(exercicios, melhores);
  } catch (erro) {
    console.error('Falha ao carregar exercícios:', erro);

    const resumo = document.querySelector('[data-resumo]');
    if (resumo) {
      resumo.textContent = `Erro ao carregar: ${erro.message}`;
    }
  }
}

function desenhar(exercicios, melhores) {
  const resumo = document.querySelector('[data-resumo]');
  const container = document.querySelector('[data-niveis]');

  if (!resumo || !container) return;

  const feitosTotal = exercicios.filter(
    (e) => melhores[e.id] != null
  ).length;

  resumo.textContent = exercicios.length
    ? `${feitosTotal} de ${exercicios.length} exercícios concluídos.`
    : 'Ainda não há exercícios cadastrados.';

  container.innerHTML = NIVEIS.map((n) => {
    const doNivel = exercicios
      .filter((e) => Number(e.nivel) === Number(n.nivel))
      .sort((a, b) => Number(a.ordem) - Number(b.ordem));

    const feitos = doNivel.filter(
      (e) => melhores[e.id] != null
    ).length;

    const pct = doNivel.length
      ? Math.round((feitos / doNivel.length) * 100)
      : 0;

    const etapas = n.etapas ?? [
      { inicio: 1, fim: 5, titulo: 'Etapa 1', descricao: 'Pratique as primeiras teclas.' },
      { inicio: 6, fim: 10, titulo: 'Etapa 2', descricao: 'Continue o treinamento.' },
      { inicio: 11, fim: 15, titulo: 'Etapa 3', descricao: 'Pratique novas combinações.' },
      { inicio: 16, fim: 20, titulo: 'Etapa 4', descricao: 'Combine as teclas aprendidas.' },
    ];

    const etapasHTML = etapas.map((etapa, indice) => {
      const exerciciosEtapa = doNivel.filter(
        (e) =>
          Number(e.ordem) >= etapa.inicio &&
          Number(e.ordem) <= etapa.fim
      );

      const feitosEtapa = exerciciosEtapa.filter(
        (e) => melhores[e.id] != null
      ).length;

      const pctEtapa = exerciciosEtapa.length
        ? Math.round(
            (feitosEtapa / exerciciosEtapa.length) * 100
          )
        : 0;

      // Abre o primeiro exercício ainda não concluído.
      const proximo = exerciciosEtapa.find(
        (e) => melhores[e.id] == null
      ) ?? exerciciosEtapa[0];

      const botao = proximo
        ? `<a class="etapa-iniciar"
             href="treinar.html?id=${encodeURIComponent(proximo.id)}">
             Iniciar
           </a>`
        : '<span class="etapa-indisponivel">Sem exercícios</span>';

      return `
        <article class="etapa-linha">
          <div class="etapa-numero">${indice + 1}</div>

          <div class="etapa-conteudo">
            <strong>${escapar(etapa.titulo)}</strong>
            <small>${escapar(etapa.descricao)}</small>

            <div class="etapa-barra">
              <div class="etapa-barra-preenchida"
                   style="width: ${pctEtapa}%"></div>
            </div>

            <span class="etapa-percentual">
              ${feitosEtapa}/${exerciciosEtapa.length} exercícios ·
              ${pctEtapa}%
            </span>
          </div>

          ${botao}
        </article>
      `;
    }).join('');

    return `
      <section class="panel panel-pad nivel-bloco">
        <div class="nivel-cabecalho">
          <div class="nivel-titulo">
            <h2>Nível ${n.nivel}: ${escapar(n.titulo)}</h2>
            <p>${escapar(n.descricao)}</p>
          </div>

          <div class="nivel-percentual">${pct}%</div>
        </div>

        <div class="progress-track">
          <div class="progress-fill"
               style="width: ${pct}%"></div>
        </div>

        <div class="nivel-resumo">
          ${feitos}/${doNivel.length} exercícios concluídos
        </div>

        <div class="etapas-lista">
          ${etapasHTML}
        </div>
      </section>
    `;
  }).join('');
}

function escapar(texto) {
  const elemento = document.createElement('div');
  elemento.textContent = texto ?? '';
  return elemento.innerHTML;
}
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});
