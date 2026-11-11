// js/pages/professor-relatorios.js
import { exigirPapel } from '../auth.js';
import { carregarDashboardProfessor } from '../api/dashboard.js';
import { baixarPdfTabela } from '../ui/pdf.js';

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

  ligarExportacao(turmas, [
    `Turmas: ${turmas.length} (${turmas.filter((t) => t.status === 'ativa').length} ativas) · Alunos: ${totalAlunos}`,
    `WPM médio geral: ${wpms.length ? String(media(wpms)).replace('.', ',') : '—'} · Precisão média geral: ${precisoes.length ? `${String(media(precisoes)).replace('.', ',')}%` : '—'}`,
  ]);

  document.querySelector('[data-tabela-turmas]').innerHTML = turmas.length
    ? turmas
        .map(
          (t) => `<tr><td>${escapar(t.nome)}</td><td><span class="status${t.status === 'encerrada' ? ' closed' : ''}">${t.status === 'ativa' ? 'Ativa' : 'Encerrada'}</span></td><td class="mono">${t.alunos}</td><td class="mono">${t.ppmMedio || '—'}</td><td class="mono">${t.precisaoMedia ? `${t.precisaoMedia}%` : '—'}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="5">Nenhuma turma cadastrada ainda.</td></tr>';
}

// Exportação do consolidado (PDF ou planilha), gerada no navegador com os
// mesmos números da tela.
function ligarExportacao(turmas, resumo) {
  const colunas = ['Turma', 'Status', 'Alunos', 'WPM médio', 'Precisão média (%)'];
  const linhas = turmas.map((t) => [t.nome, t.status === 'ativa' ? 'Ativa' : 'Encerrada', t.alunos, t.ppmMedio || '', t.precisaoMedia || '']);
  const dia = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('[data-exportar-relatorio]').forEach((botao) => {
    botao.disabled = !turmas.length;
    botao.addEventListener('click', async () => {
      botao.disabled = true;
      try {
        if (botao.dataset.exportarRelatorio === 'pdf') {
          await baixarPdfTabela({
            titulo: 'Relatório das turmas',
            subtitulo: 'Progresso consolidado',
            resumo,
            colunas,
            linhas: linhas.map((l) => l.map((v, i) => (v === '' ? '—' : i >= 3 ? String(v).replace('.', ',') : v))),
            arquivo: `relatorio-turmas-${dia}`,
          });
        } else {
          const X = await import('xlsx');
          const planilha = X.utils.book_new();
          X.utils.book_append_sheet(planilha, X.utils.aoa_to_sheet([colunas, ...linhas]), 'Turmas');
          X.writeFile(planilha, `relatorio-turmas-${dia}.xlsx`);
        }
      } catch (erro) {
        alert(`Não foi possível exportar: ${erro.message}`);
      } finally {
        botao.disabled = false;
      }
    });
  });
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
