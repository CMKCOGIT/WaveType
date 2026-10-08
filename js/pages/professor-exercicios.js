// js/pages/professor-exercicios.js
import { exigirPapel } from '../auth.js';
import { listarMinhasTurmas } from '../api/turmas.js';
import { listarMeusExercicios, criarExercicio, excluirExercicio } from '../api/exercicios.js';

const botaoAbrir = document.querySelector('[data-abrir-form]');
const form = document.querySelector('[data-form-exercicio]');
const filtroTurma = document.querySelector('[data-filtro-turma]');
const filtroBusca = document.querySelector('[data-filtro-busca]');
let exerciciosCarregados = [];

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;

  const turmas = await listarMinhasTurmas();
  const opcoes = turmas.map((t) => `<option value="${t.id}">${escapar(t.nome)}</option>`).join('');
  document.querySelector('[data-select-turma]').insertAdjacentHTML('beforeend', opcoes);
  filtroTurma.insertAdjacentHTML('beforeend', opcoes);

  await carregarExercicios();
}

botaoAbrir.addEventListener('click', () => (form.hidden = !form.hidden));
filtroTurma.addEventListener('change', renderizar);
filtroBusca.addEventListener('input', renderizar);

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const dados = new FormData(form);
  try {
    await criarExercicio({
      titulo: dados.get('titulo').trim(),
      texto_referencia: dados.get('texto_referencia').trim(),
      tempo_limite_seg: Number(dados.get('tempo_limite_seg')),
      nivel: dados.get('nivel'),
      turma_id: dados.get('turma_id') || null,
      publicado: true,
    });
    form.reset();
    form.hidden = true;
    await carregarExercicios();
  } catch (erro) {
    alert(erro.message);
  }
});

async function carregarExercicios() {
  exerciciosCarregados = await listarMeusExercicios();
  renderizar();
}

function renderizar() {
  const turma = filtroTurma.value;
  const termo = filtroBusca.value.toLowerCase();
  const filtrados = exerciciosCarregados.filter(
    (e) => (!turma || String(e.turma_id) === turma) && e.titulo.toLowerCase().includes(termo)
  );

  const lista = document.querySelector('[data-lista-exercicios]');
  lista.innerHTML = filtrados.length
    ? filtrados
        .map(
          (e, i) => `
        <article class="practice-row">
          <span class="practice-number">${String(i + 1).padStart(2, '0')}</span>
          <div><h3>${escapar(e.titulo)}</h3><p>${e.turmas?.nome ? escapar(e.turmas.nome) : 'Rascunho · sem turma'}</p></div>
          <span class="practice-meta">${e.tempo_limite_seg}s · ${e.resultados?.[0]?.count ?? 0} respostas</span>
          <button class="button secondary small" data-excluir="${e.id}">Excluir</button>
        </article>`
        )
        .join('')
    : '<article class="practice-row"><p>Nenhum exercício encontrado.</p></article>';

  lista.querySelectorAll('[data-excluir]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      if (!confirm('Excluir este exercício? Os resultados associados também serão removidos.')) return;
      await excluirExercicio(Number(botao.dataset.excluir));
      await carregarExercicios();
    });
  });
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
