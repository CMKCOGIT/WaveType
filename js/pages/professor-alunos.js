// js/pages/professor-alunos.js
import { exigirPapel } from '../auth.js';
import { listarMinhasTurmas, listarAlunosDaTurma } from '../api/turmas.js';

const seletorTurma = document.querySelector('[data-select-turma]');
const busca = document.querySelector('[data-table-search]');
let alunosCarregados = [];

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;

  const turmas = await listarMinhasTurmas();
  seletorTurma.insertAdjacentHTML('beforeend', turmas.map((t) => `<option value="${t.id}">${escapar(t.nome)}</option>`).join(''));

  const params = new URLSearchParams(location.search);
  const turmaInicial = params.get('turma');
  if (turmaInicial) seletorTurma.value = turmaInicial;

  seletorTurma.addEventListener('change', carregarAlunos);
  busca.addEventListener('input', renderizarTabela);

  if (turmas.length) await carregarAlunos();
  else document.querySelector('[data-tabela-alunos]').innerHTML = '<tr><td colspan="2">Crie uma turma primeiro.</td></tr>';
}

async function carregarAlunos() {
  if (!seletorTurma.value) {
    alunosCarregados = [];
    document.querySelector('[data-tabela-alunos]').innerHTML = '<tr><td colspan="2">Selecione uma turma.</td></tr>';
    return;
  }
  const matriculas = await listarAlunosDaTurma(Number(seletorTurma.value));
  alunosCarregados = matriculas.map((m) => m.usuarios);
  renderizarTabela();
}

function renderizarTabela() {
  const termo = busca.value.toLowerCase();
  const filtrados = alunosCarregados.filter((a) => `${a.nome} ${a.email}`.toLowerCase().includes(termo));
  const corpo = document.querySelector('[data-tabela-alunos]');
  corpo.innerHTML = filtrados.length
    ? filtrados
        .map(
          (a) => `<tr><td class="table-name"><strong>${escapar(a.nome)}</strong><small>${escapar(a.email)}</small></td><td>${seletorTurma.options[seletorTurma.selectedIndex]?.text ?? ''}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="2">Nenhum aluno encontrado.</td></tr>';
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
