// js/pages/professor-turmas.js
import { exigirPapel } from '../auth.js';
import { listarMinhasTurmas, criarTurma } from '../api/turmas.js';

const botaoAbrir = document.querySelector('[data-abrir-form-turma]');
const form = document.querySelector('[data-form-turma]');

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;
  await carregarTurmas();
}

botaoAbrir.addEventListener('click', () => {
  form.hidden = !form.hidden;
});

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const dados = new FormData(form);
  try {
    await criarTurma({ nome: dados.get('nome').trim(), ano_letivo: dados.get('ano_letivo').trim() });
    form.reset();
    form.hidden = true;
    await carregarTurmas();
  } catch (erro) {
    alert(erro.message);
  }
});

async function carregarTurmas() {
  const grid = document.querySelector('[data-grid-turmas]');
  const turmas = await listarMinhasTurmas();

  document.querySelector('[data-resumo]').textContent =
    `${turmas.length} turma${turmas.length === 1 ? '' : 's'} cadastrada${turmas.length === 1 ? '' : 's'}. Abra uma turma para acompanhar alunos e exercícios.`;

  if (!turmas.length) {
    grid.innerHTML = '<article class="entity-card"><p>Nenhuma turma ainda. Crie a primeira acima.</p></article>';
    return;
  }

  grid.innerHTML = turmas
    .map(
      (t) => `
      <article class="entity-card">
        <div class="entity-head"><div><h2>${escapar(t.nome)}</h2><p>${escapar(t.ano_letivo || '')}</p></div><span class="status${t.status === 'encerrada' ? ' closed' : ''}">${t.status === 'ativa' ? 'Ativa' : 'Encerrada'}</span></div>
        <div class="entity-stats"><div><span>Alunos</span><strong>${t.matriculas?.[0]?.count ?? 0}</strong></div><div><span>Código de convite</span><strong class="mono">${escapar(t.codigo_convite)}</strong></div></div>
        <a class="button ghost small" href="alunos.html?turma=${t.id}">Abrir turma →</a>
      </article>`
    )
    .join('');
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
