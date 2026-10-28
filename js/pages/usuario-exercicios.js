// js/pages/usuario-exercicios.js
import { exigirPapel } from '../auth.js';
import { listarMeusResultados } from '../api/resultados.js';
import { listarExercicios } from '../api/exercicios.js';
import { desenharTrilha, exerciciosConcluidos } from './trilha.js';

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('usuario');
  if (!perfil) return;

  const resumo = document.querySelector('[data-resumo]');
  try {
    const [exercicios, resultados] = await Promise.all([
      listarExercicios(),
      listarMeusResultados({ limite: 2000 }),
    ]);
    desenharTrilha({
      container: document.querySelector('[data-niveis]'),
      resumo,
      exercicios,
      concluidos: exerciciosConcluidos(resultados),
      tentados: new Set(resultados.map((r) => r.exercicio_id)),
    });
  } catch (erro) {
    console.error('Falha ao carregar exercícios:', erro);
    if (resumo) resumo.textContent = 'Não foi possível carregar os exercícios. Atualize a página.';
  }
}

// Ao voltar do treino pelo botão "voltar", recarrega o progresso.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});
