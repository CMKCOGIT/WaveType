// js/pages/aluno-exercicios.js
// Duas seções separadas: a trilha oficial (níveis 1 a 6) e as atividades
// dos professores. As atividades não entram na trilha nem no progresso dela.
import { exigirPapel } from '../auth.js';
import { listarMeusResultados } from '../api/resultados.js';
import { listarExercicios, listarMinhasAtividades } from '../api/exercicios.js';
import { desenharTrilha, exerciciosConcluidos } from './trilha.js';

const SITUACOES = {
  pendente: { rotulo: 'Pendente', classe: 'pendente' },
  atrasada: { rotulo: 'Atrasada', classe: 'atrasada' },
  concluida: { rotulo: 'Concluída', classe: '' },
};
const DIFICULDADES = { facil: 'Fácil', medio: 'Médio', avancado: 'Avançado' };

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return;
  await Promise.all([carregarTrilha(), carregarAtividades()]);
  if (location.hash === '#atividades') document.getElementById('atividades')?.scrollIntoView();
}

async function carregarTrilha() {
  const resumo = document.querySelector('[data-resumo]');
  try {
    const [exercicios, resultados] = await Promise.all([listarExercicios(), listarMeusResultados({ limite: 2000 })]);
    desenharTrilha({
      container: document.querySelector('[data-niveis]'),
      resumo,
      exercicios,
      concluidos: exerciciosConcluidos(resultados),
      tentados: new Set(resultados.map((r) => r.exercicio_id)),
    });
  } catch (erro) {
    console.error('Falha ao carregar a trilha:', erro);
    resumo.textContent = 'Não foi possível carregar os exercícios. Atualize a página.';
  }
}

async function carregarAtividades() {
  const lista = document.querySelector('[data-lista-atividades]');
  const resumo = document.querySelector('[data-resumo-atividades]');
  try {
    const atividades = await listarMinhasAtividades();
    if (!atividades.length) {
      resumo.textContent = 'Nenhuma atividade por enquanto.';
      lista.innerHTML =
        '<article class="practice-row"><p>Quando um professor enviar uma atividade para a sua turma, ela aparece aqui. Ainda não está em uma turma? <a href="turmas.html">Entre com o código</a>.</p></article>';
      return;
    }

    const pendentes = atividades.filter((a) => a.situacao !== 'concluida').length;
    resumo.textContent = pendentes
      ? `${pendentes} atividade${pendentes === 1 ? '' : 's'} para fazer · ${atividades.length - pendentes} concluída${atividades.length - pendentes === 1 ? '' : 's'}.`
      : 'Tudo em dia! Todas as atividades foram concluídas.';

    lista.innerHTML = atividades.map(linhaAtividade).join('');
  } catch (erro) {
    console.error('Falha ao carregar atividades:', erro);
    resumo.textContent = 'Não foi possível carregar as atividades.';
    lista.innerHTML = '';
  }
}

function linhaAtividade(a, indice) {
  const situacao = SITUACOES[a.situacao] ?? SITUACOES.pendente;
  const detalhes = [a.turmas, a.professor_nome ? `Prof. ${a.professor_nome}` : null, DIFICULDADES[a.nivel]]
    .filter(Boolean)
    .map(escapar)
    .join(' · ');
  const extras = [];
  if (a.prazo) extras.push(`Prazo: ${formatarData(a.prazo)}`);
  if (a.meta_precisao != null) extras.push(`Meta: ${formatarNumero(a.meta_precisao)}% de precisão`);
  if (Number(a.tentativas) > 0) extras.push(`Melhor: ${formatarNumero(a.melhor_ppm)} WPM · ${formatarNumero(a.melhor_precisao)}%`);

  const href = `treinar.html?id=${encodeURIComponent(a.id)}${a.turma_id ? `&turma=${encodeURIComponent(a.turma_id)}` : ''}`;
  const textoBotao = a.situacao === 'concluida' ? 'Refazer' : Number(a.tentativas) > 0 ? 'Tentar de novo' : 'Iniciar';

  return `
    <article class="practice-row${a.situacao === 'concluida' ? ' is-concluida' : ''}">
      <span class="practice-number">${a.situacao === 'concluida' ? '✓' : String(indice + 1).padStart(2, '0')}</span>
      <div class="practice-info">
        <h3>${escapar(a.titulo)}</h3>
        <p>${detalhes}</p>
        ${extras.length ? `<small>${escapar(extras.join(' · '))}</small>` : ''}
      </div>
      <span class="status ${situacao.classe}">${situacao.rotulo}</span>
      <a class="button small${a.situacao === 'concluida' ? ' secondary' : ''}" href="${href}">${textoBotao}</a>
    </article>`;
}

function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatarNumero(v) {
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}

window.addEventListener('pageshow', (e) => {
  if (e.persisted) location.reload();
});
