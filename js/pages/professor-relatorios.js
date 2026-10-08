// js/pages/professor-relatorios.js
import { exigirPapel } from '../auth.js';
import { carregarDashboardProfessor } from '../api/dashboard.js';

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;

  const turmas = await carregarDashboardProfessor();
  const totalAlunos = turmas.reduce((s, t) => s + t.alunos, 0);
  const wpms = turmas.filter((t) => t.ppmMedio > 0).map((t) => t.ppmMedio);
  const precisoes = turmas.filter((t) => t.precisaoMedia > 0).map((t) => t.precisaoMedia);

  set('[data-metric="total-turmas"]', turmas.length);
  set('[data-metric="turmas-ativas"]', `${turmas.filter((t) => t.status === 'ativa').length} ativas`);
  set('[data-metric="total-alunos"]', totalAlunos);
  set('[data-metric="wpm-geral"]', wpms.length ? media(wpms) : '—');
  set('[data-metric="precisao-geral"]', precisoes.length ? `${media(precisoes)}%` : '—');

  document.querySelector('[data-tabela-turmas]').innerHTML = turmas.length
    ? turmas
        .map(
          (t) => `<tr><td>${escapar(t.nome)}</td><td><span class="status${t.status === 'encerrada' ? ' closed' : ''}">${t.status === 'ativa' ? 'Ativa' : 'Encerrada'}</span></td><td class="mono">${t.alunos}</td><td class="mono">${t.ppmMedio || '—'}</td><td class="mono">${t.precisaoMedia ? `${t.precisaoMedia}%` : '—'}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="5">Nenhuma turma cadastrada ainda.</td></tr>';
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
