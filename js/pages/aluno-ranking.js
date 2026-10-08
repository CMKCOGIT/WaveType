// js/pages/aluno-ranking.js
import { exigirPapel, obterPerfil } from '../auth.js';
import { listarExerciciosDisponiveis } from '../api/exercicios.js';
import { buscarRankingExercicio } from '../api/ranking.js';

const select = document.querySelector('[data-select-exercicio]');
const lista = document.querySelector('[data-ranking-list]');

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return;

  const exercicios = await listarExerciciosDisponiveis();
  if (!exercicios.length) {
    select.innerHTML = '<option>Nenhum exercício disponível</option>';
    lista.innerHTML = '<li>Entre em uma turma para ver rankings.</li>';
    return;
  }

  select.innerHTML = exercicios.map((e) => `<option value="${e.id}">${escapar(e.titulo)}</option>`).join('');
  select.addEventListener('change', () => carregarRanking(exercicios, Number(select.value)));
  await carregarRanking(exercicios, Number(select.value));
}

async function carregarRanking(exercicios, exercicioId) {
  const exercicio = exercicios.find((e) => e.id === exercicioId);
  document.querySelector('[data-exercicio-titulo]').textContent = exercicio?.titulo ?? '';
  document.querySelector('[data-exercicio-info]').textContent = exercicio?.turmas?.nome ?? 'Prática geral';

  lista.innerHTML = '<li>Carregando…</li>';
  const ranking = await buscarRankingExercicio(exercicioId);
  if (!ranking.length) {
    lista.innerHTML = '<li>Ainda sem resultados neste exercício.</li>';
    return;
  }
  const perfil = await obterPerfil();
  lista.innerHTML = ranking
    .map((r, i) => {
      const voceEh = perfil && r.aluno_nome === perfil.nome;
      return `<li${voceEh ? ' class="is-you"' : ''}><b>${i + 1}</b><span>${escapar(r.aluno_nome)}${voceEh ? ' · você' : ''}</span><small>${formatarNumero(r.ppm)} WPM · ${formatarNumero(r.precisao)}%</small></li>`;
    })
    .join('');

  const posicao = ranking.findIndex((r) => perfil && r.aluno_nome === perfil.nome);
  document.querySelector('[data-minha-posicao]').textContent = posicao >= 0 ? `${posicao + 1}º` : '–';
  document.querySelector('[data-minha-mensagem]').textContent =
    posicao >= 0 ? 'Continue praticando para subir no ranking.' : 'Pratique este exercício para aparecer no ranking.';
}

function formatarNumero(v) {
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
