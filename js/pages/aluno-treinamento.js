// js/pages/aluno-treinamento.js
import { exigirPapel } from '../auth.js';
import { entrarNaTurma } from '../api/turmas.js';
import { listarExerciciosDisponiveis } from '../api/exercicios.js';

const form = document.querySelector('[data-form-entrar-turma]');
const feedback = document.querySelector('[data-feedback-turma]');

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return;
  await carregarExercicios();
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const codigo = new FormData(form).get('codigoConvite').trim();
  try {
    await entrarNaTurma(codigo);
    mostrarFeedback('Você entrou na turma! Atualizando exercícios…', 'sucesso');
    form.reset();
    await carregarExercicios();
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
  }
});

async function carregarExercicios() {
  const lista = document.querySelector('[data-lista-exercicios]');
  const exercicios = await listarExerciciosDisponiveis();
  if (!exercicios.length) {
    lista.innerHTML = '<article class="practice-row"><p>Você ainda não tem exercícios de turma. Entre em uma turma pelo código acima ou use a prática livre.</p></article>';
    return;
  }
  lista.innerHTML = exercicios
    .map(
      (e, i) => `
      <article class="practice-row">
        <span class="practice-number">${String(i + 1).padStart(2, '0')}</span>
        <div><h3>${escapar(e.titulo)}</h3><p>${escapar(e.turmas?.nome ?? 'Prática geral')} · ${escapar(e.nivel)}</p></div>
        <span class="practice-meta">${e.tempo_limite_seg}s · ${escapar(e.nivel)}</span>
        <a class="button small" href="../../index.html?exercicio=${e.id}#teste">Praticar</a>
      </article>`
    )
    .join('');
}

function mostrarFeedback(mensagem, tipo) {
  feedback.textContent = mensagem;
  feedback.hidden = false;
  feedback.classList.toggle('is-erro', tipo === 'erro');
  feedback.classList.toggle('is-sucesso', tipo === 'sucesso');
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
