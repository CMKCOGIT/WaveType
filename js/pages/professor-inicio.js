// js/pages/professor-inicio.js
import { exigirPapel } from '../auth.js';
import { carregarDashboardProfessor } from '../api/dashboard.js';

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;
  document.getElementById('saudacao').textContent = `Olá, ${(perfil.nome || '').split(' ')[0]}.`;

  const turmas = await carregarDashboardProfessor();
  preencherMetricas(turmas);
  preencherTabela(turmas);
}

function preencherMetricas(turmas) {
  const ativas = turmas.filter((t) => t.status === 'ativa');
  const totalAlunos = turmas.reduce((soma, t) => soma + t.alunos, 0);
  const wpms = turmas.filter((t) => t.ppmMedio > 0).map((t) => t.ppmMedio);
  const precisoes = turmas.filter((t) => t.precisaoMedia > 0).map((t) => t.precisaoMedia);

  set('[data-metric="turmas-ativas"]', ativas.length);
  set('[data-metric="total-alunos"]', `${totalAlunos} aluno${totalAlunos === 1 ? '' : 's'} matriculados`);
  set('[data-metric="wpm-geral"]', wpms.length ? media(wpms) : '—');
  set('[data-metric="precisao-geral"]', precisoes.length ? `${media(precisoes)}%` : '—');
  set('[data-metric="turmas-encerradas"]', turmas.filter((t) => t.status === 'encerrada').length);
}

function preencherTabela(turmas) {
  const corpo = document.querySelector('[data-tabela-turmas]');
  if (!turmas.length) {
    corpo.innerHTML = '<tr><td colspan="5">Nenhuma turma criada ainda. <a href="turmas.html">Crie a primeira</a>.</td></tr>';
    return;
  }
  corpo.innerHTML = turmas
    .map(
      (t) => `
      <tr>
        <td class="table-name"><strong>${escapar(t.nome)}</strong></td>
        <td><span class="status${t.status === 'encerrada' ? ' closed' : ''}">${t.status === 'ativa' ? 'Ativa' : 'Encerrada'}</span></td>
        <td class="mono">${t.alunos}</td>
        <td class="mono">${t.ppmMedio || '—'}</td>
        <td class="mono">${t.precisaoMedia ? `${t.precisaoMedia}%` : '—'}</td>
      </tr>`
    )
    .join('');
}

function media(numeros) {
  return Math.round((numeros.reduce((a, b) => a + b, 0) / numeros.length) * 10) / 10;
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
function set(seletor, valor) {
  const el = document.querySelector(seletor);
  if (el) el.textContent = valor;
}
