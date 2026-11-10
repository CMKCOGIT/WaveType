// js/pages/aluno-inicio.js
import { exigirPapel } from '../auth.js';
import { carregarDashboardAluno } from '../api/dashboard.js';
import { mostrarPontoDePartida } from '../ui/ponto-de-partida.js';
import { listarMinhasMatriculas, rankingDaTurma } from '../api/turmas.js';
import { htmlDoRanking } from '../ui/ranking-animais.js';

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return; // exigirPapel já redirecionou

  document.getElementById('saudacao').textContent = `Olá, ${primeiroNome(perfil.nome)}.`;
  mostrarPontoDePartida().catch((erro) => console.error('Falha ao carregar o ponto de partida:', erro));

  // O ranking não depende do resumo: os dois carregam ao mesmo tempo.
  const ranking = preencherAmostraRanking().catch((erro) => console.error('Falha ao carregar o ranking:', erro));
  try {
    const dashboard = await carregarDashboardAluno();
    preencherMetricas(dashboard);
    preencherTabelaRecentes(dashboard.sessoesRecentes);
  } catch (erro) {
    console.error('Falha ao carregar dashboard do aluno:', erro);
  }
  await ranking;
}

function preencherMetricas(d) {
  const ultima = d.sessoesRecentes[0];
  set('[data-metric="wpm-atual"]', ultima ? formatarNumero(ultima.ppm) : '—');
  set('[data-metric="precisao-media"]', ultima ? `${formatarNumero(ultima.precisao)}%` : '—');
  set('[data-metric="sessoes-total"]', d.totalSessoes);
  set('[data-metric="sequencia"]', `${d.sequencia_dias} dia${d.sequencia_dias === 1 ? '' : 's'}`);
  set('[data-metric="nivel"]', d.nivel);
  set('[data-metric="nivel-label"]', `Nível ${d.nivel}`);
  set('[data-metric="xp-fracao"]', `${d.xp}/${d.xpParaProximoNivel} XP`);
  set('[data-metric="xp-faltam"]', `Faltam ${Math.max(0, d.xpParaProximoNivel - d.xp)} XP`);
  const barra = document.querySelector('[data-metric="progresso-nivel"]');
  if (barra) barra.style.width = `${d.progressoNivel}%`;
}

function preencherTabelaRecentes(sessoes) {
  const corpo = document.querySelector('[data-tabela-recentes]');
  if (!sessoes.length) {
    corpo.innerHTML = '<tr><td colspan="5">Você ainda não praticou. <a href="exercicios.html">Comece agora</a>.</td></tr>';
    return;
  }
  corpo.innerHTML = sessoes
    .map(
      (s) => `
      <tr>
        <td class="table-name"><strong>${escapar(s.exercicios?.titulo ?? 'Prática livre')}</strong></td>
        <td>${formatarData(s.criado_em)}</td>
        <td class="mono">${formatarNumero(s.ppm)}</td>
        <td class="mono positive">${formatarNumero(s.precisao)}%</td>
        <td class="mono">${s.tempo_seg}s</td>
      </tr>`
    )
    .join('');
}

// Ranking anônimo da primeira turma (top 5 em animais, sem nomes).
async function preencherAmostraRanking() {
  const area = document.querySelector('[data-ranking-list]');
  const turma = (await listarMinhasMatriculas()).find((m) => m.turmas)?.turmas;
  if (!turma) {
    area.innerHTML = '<p class="ranking-vazio">Quando o professor adicionar você a uma turma, o ranking aparece aqui.</p>';
    return;
  }
  set('[data-ranking-turma]', `${turma.nome} · top 5 anônimo`);
  const linhas = await rankingDaTurma(turma.id);
  area.innerHTML = htmlDoRanking(linhas, { compacto: true }) || '<p class="ranking-vazio">Ainda sem treinos concluídos nesta turma.</p>';
}

function primeiroNome(nomeCompleto) {
  return (nomeCompleto || '').split(' ')[0];
}
function formatarNumero(valor) {
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}
function set(seletor, valor) {
  const el = document.querySelector(seletor);
  if (el) el.textContent = valor;
}
