// js/pages/aluno-resultados.js
import { exigirPapel } from '../auth.js';
import { listarMeusResultados } from '../api/resultados.js';

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return;

  const resultados = await listarMeusResultados({ limite: 50 });
  preencherMetricas(resultados);
  preencherTabela(resultados);
}

function preencherMetricas(resultados) {
  if (!resultados.length) {
    set('[data-metric="wpm-medio"]', '—');
    set('[data-metric="melhor-wpm"]', '—');
    set('[data-metric="precisao-media"]', '—');
    set('[data-metric="total-sessoes"]', 0);
    return;
  }
  const wpms = resultados.map((r) => Number(r.ppm));
  const precisoes = resultados.map((r) => Number(r.precisao));
  const melhor = resultados.reduce((a, b) => (Number(b.ppm) > Number(a.ppm) ? b : a));

  set('[data-metric="wpm-medio"]', media(wpms));
  set('[data-metric="melhor-wpm"]', formatarNumero(melhor.ppm));
  set('[data-metric="melhor-wpm-data"]', formatarData(melhor.criado_em));
  set('[data-metric="precisao-media"]', `${media(precisoes)}%`);
  set('[data-metric="total-sessoes"]', resultados.length);
}

function preencherTabela(resultados) {
  const corpo = document.querySelector('[data-tabela-historico]');
  if (!resultados.length) {
    corpo.innerHTML = '<tr><td colspan="6">Nenhuma sessão registrada ainda.</td></tr>';
    return;
  }
  corpo.innerHTML = resultados
    .map(
      (r) => `
      <tr>
        <td>${escapar(r.exercicios?.titulo ?? 'Prática livre')}</td>
        <td>${formatarDataCurta(r.criado_em)}</td>
        <td class="mono">${formatarNumero(r.ppm)}</td>
        <td class="mono positive">${formatarNumero(r.precisao)}%</td>
        <td class="mono">${r.acertos} / ${r.erros}</td>
        <td class="mono">${r.tempo_seg}s</td>
      </tr>`
    )
    .join('');
}

function media(numeros) {
  return formatarNumero(numeros.reduce((a, b) => a + b, 0) / numeros.length);
}
function formatarNumero(v) {
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatarDataCurta(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
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
