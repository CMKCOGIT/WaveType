// js/pages/professor-alunos.js
import { exigirPapel } from '../auth.js';
import { listarMinhasTurmas, listarAlunosDaTurma, adicionarAlunoPorId, removerAlunoDaTurma } from '../api/turmas.js';

const seletorTurma = document.querySelector('[data-select-turma]');
const busca = document.querySelector('[data-table-search]');
const corpo = document.querySelector('[data-tabela-alunos]');
const formAdicionar = document.querySelector('[data-form-adicionar]');
const feedbackAdicionar = document.querySelector('[data-feedback-adicionar]');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let alunosCarregados = [];

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;

  const turmas = await listarMinhasTurmas();
  if (!turmas.length) {
    seletorTurma.innerHTML = '<option value="">Nenhuma turma</option>';
    formAdicionar.hidden = true;
    corpo.innerHTML = '<tr><td colspan="7">Crie uma turma primeiro. <a href="turmas.html">Ir para turmas</a></td></tr>';
    return;
  }

  seletorTurma.innerHTML = turmas
    .map((t) => `<option value="${t.id}">${escapar(t.nome)}${t.status === 'encerrada' ? ' (encerrada)' : ''}</option>`)
    .join('');
  const turmaInicial = new URLSearchParams(location.search).get('turma');
  if (turmaInicial && turmas.some((t) => String(t.id) === turmaInicial)) seletorTurma.value = turmaInicial;

  seletorTurma.addEventListener('change', carregarAlunos);
  busca.addEventListener('input', renderizarTabela);
  await carregarAlunos();
}

async function carregarAlunos() {
  corpo.innerHTML = '<tr><td colspan="7">Carregando…</td></tr>';
  try {
    alunosCarregados = await listarAlunosDaTurma(Number(seletorTurma.value));
    renderizarTabela();
  } catch (erro) {
    corpo.innerHTML = `<tr><td colspan="7">${escapar(erro.message)}</td></tr>`;
  }
}

function renderizarTabela() {
  const termo = busca.value.toLowerCase();
  const filtrados = alunosCarregados.filter((a) => `${a.nome} ${a.email}`.toLowerCase().includes(termo));
  corpo.innerHTML = filtrados.length
    ? filtrados
        .map(
          (a) => `<tr>
            <td class="table-name"><strong>${escapar(a.nome)}</strong><small>${escapar(a.email)}</small></td>
            <td class="mono">${a.sessoes}</td>
            <td class="mono">${a.ppm_medio ?? '—'}</td>
            <td class="mono">${a.precisao_media != null ? `${a.precisao_media}%` : '—'}</td>
            <td class="mono">${a.atividades_concluidas}</td>
            <td>${a.ultima_pratica ? new Date(a.ultima_pratica).toLocaleDateString('pt-BR') : '—'}</td>
            <td><button type="button" class="button ghost small" data-remover="${a.aluno_id}">Remover</button></td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="7">${alunosCarregados.length ? 'Nenhum aluno encontrado.' : 'Nenhum aluno nesta turma ainda. Compartilhe o código ou adicione pelo ID.'}</td></tr>`;
}

corpo.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('[data-remover]');
  if (!botao) return;
  const aluno = alunosCarregados.find((a) => a.aluno_id === botao.dataset.remover);
  if (!confirm(`Remover ${aluno?.nome ?? 'este aluno'} da turma? Os resultados dele continuam guardados.`)) return;
  botao.disabled = true;
  try {
    await removerAlunoDaTurma(Number(seletorTurma.value), botao.dataset.remover);
    await carregarAlunos();
  } catch (erro) {
    alert(erro.message);
    botao.disabled = false;
  }
});

formAdicionar.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = String(new FormData(formAdicionar).get('aluno_id') || '').trim();
  if (!UUID.test(id)) return mostrarFeedback('Esse não parece um ID válido. Peça ao aluno para copiar o ID na página Turmas.', true);

  const botao = formAdicionar.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    await adicionarAlunoPorId(Number(seletorTurma.value), id);
    formAdicionar.reset();
    mostrarFeedback('Aluno adicionado à turma.');
    await carregarAlunos();
  } catch (erro) {
    mostrarFeedback(erro.message, true);
  } finally {
    botao.disabled = false;
  }
});

function mostrarFeedback(mensagem, erro = false) {
  feedbackAdicionar.textContent = mensagem;
  feedbackAdicionar.hidden = false;
  feedbackAdicionar.classList.toggle('is-erro', erro);
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
