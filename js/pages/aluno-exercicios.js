// js/pages/aluno-exercicios.js
// Duas seções separadas: a trilha oficial (níveis 1 a 5) e as atividades
// dos professores. As atividades não entram na trilha nem no progresso dela.
import { exigirPapel } from '../auth.js';
import { listarMeusResultados } from '../api/resultados.js';
import { listarExercicios, listarMinhasAtividades } from '../api/exercicios.js';
import { desenharTrilha, exerciciosConcluidos } from './trilha.js';
import { formatarTempo } from '../regras.js';

const SITUACOES = {
  pendente: { rotulo: 'Pendente', classe: 'pendente' },
  atrasada: { rotulo: 'Atrasada', classe: 'atrasada' },
  concluida: { rotulo: 'Concluída', classe: '' },
};
const DIFICULDADES = { facil: 'Fácil', medio: 'Médio', avancado: 'Avançado' };

iniciar();

let atividadesCarregadas = [];
let filtroAtividades = 'pendentes';

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return;
  ligarAbas();
  const [, pendentes] = await Promise.all([carregarTrilha(), carregarAtividades()]);
  // Abre direto nas atividades quando há algo para fazer (ou pelo link #atividades).
  const pedida = location.hash.replace('#', '');
  abrirAba(pedida === 'trilha' || pedida === 'atividades' ? pedida : pendentes > 0 ? 'atividades' : 'trilha');
}

// ---------- Abas: exercícios do professor x trilha padrão ----------

function abrirAba(nome, { focar = false } = {}) {
  document.querySelectorAll('[data-aba-exercicios]').forEach((aba) => {
    const ativa = aba.dataset.abaExercicios === nome;
    aba.setAttribute('aria-selected', String(ativa));
    aba.tabIndex = ativa ? 0 : -1;
    document.getElementById(aba.getAttribute('aria-controls')).hidden = !ativa;
    if (ativa && focar) aba.focus();
  });
  history.replaceState(null, '', `#${nome}`);
}

function ligarAbas() {
  const abas = [...document.querySelectorAll('[data-aba-exercicios]')];
  abas.forEach((aba) => aba.addEventListener('click', () => abrirAba(aba.dataset.abaExercicios)));
  document.querySelector('.abas-exercicios').addEventListener('keydown', (evento) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    if (!passo) return;
    const atual = abas.findIndex((a) => a.getAttribute('aria-selected') === 'true');
    abrirAba(abas[(atual + passo + abas.length) % abas.length].dataset.abaExercicios, { focar: true });
  });
  document.querySelector('[data-filtro-atividades]').addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-filtro]');
    if (!botao) return;
    filtroAtividades = botao.dataset.filtro;
    document.querySelectorAll('[data-filtro-atividades] [data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
    desenharAtividades();
  });
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
    const feitos = exerciciosConcluidos(resultados);
    const total = exercicios.length;
    const concluidos = exercicios.filter((e) => feitos.has(e.id)).length;
    document.querySelector('[data-aba-resumo-trilha]').textContent = `Exercícios padrão · ${concluidos} de ${total} concluídos`;
  } catch (erro) {
    console.error('Falha ao carregar a trilha:', erro);
    resumo.textContent = 'Não foi possível carregar os exercícios. Atualize a página.';
  }
}

async function carregarAtividades() {
  const resumo = document.querySelector('[data-resumo-atividades]');
  const resumoAba = document.querySelector('[data-aba-resumo-atividades]');
  const contador = document.querySelector('[data-contador-pendentes]');
  try {
    atividadesCarregadas = await listarMinhasAtividades();
  } catch (erro) {
    console.error('Falha ao carregar atividades:', erro);
    resumo.textContent = 'Não foi possível carregar as atividades.';
    resumoAba.textContent = 'Indisponível no momento';
    document.querySelector('[data-lista-atividades]').innerHTML = '';
    return 0;
  }
  const pendentes = atividadesCarregadas.filter((a) => a.situacao !== 'concluida').length;
  const concluidas = atividadesCarregadas.length - pendentes;
  resumoAba.textContent = atividadesCarregadas.length
    ? `${atividadesCarregadas.length} no total · ${pendentes} pendente${pendentes === 1 ? '' : 's'}`
    : 'Nenhuma atividade ainda';
  contador.hidden = pendentes === 0;
  contador.textContent = String(pendentes);
  contador.setAttribute('aria-label', `${pendentes} pendentes`);
  resumo.textContent = !atividadesCarregadas.length
    ? 'Nenhuma atividade por enquanto.'
    : pendentes
      ? `${pendentes} para fazer · ${concluidas} concluída${concluidas === 1 ? '' : 's'}. Só aparecem as atividades das suas turmas.`
      : 'Tudo em dia! Todas as atividades foram concluídas.';
  document.querySelector('[data-filtro="pendentes"]').textContent = `Pendentes (${pendentes})`;
  document.querySelector('[data-filtro="concluidas"]').textContent = `Concluídas (${concluidas})`;
  document.querySelector('[data-filtro="todas"]').textContent = `Todas (${atividadesCarregadas.length})`;
  if (!pendentes && concluidas) {
    filtroAtividades = 'todas';
    document.querySelectorAll('[data-filtro-atividades] [data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtro === 'todas')));
  }
  desenharAtividades();
  return pendentes;
}

function desenharAtividades() {
  const lista = document.querySelector('[data-lista-atividades]');
  if (!atividadesCarregadas.length) {
    lista.innerHTML =
      '<article class="practice-row"><p>Quando um professor enviar uma atividade para a sua turma, ela aparece aqui. Ainda não está em uma turma? <a href="turmas.html">Veja como o professor adiciona você</a>.</p></article>';
    return;
  }
  const visiveis = atividadesCarregadas.filter((a) =>
    filtroAtividades === 'todas' ? true : filtroAtividades === 'concluidas' ? a.situacao === 'concluida' : a.situacao !== 'concluida'
  );
  lista.innerHTML = visiveis.length
    ? visiveis.map(linhaAtividade).join('')
    : `<article class="practice-row"><p>${filtroAtividades === 'pendentes' ? 'Nenhuma atividade pendente. Muito bem!' : 'Nenhuma atividade concluída ainda.'}</p></article>`;
}

function linhaAtividade(a, indice) {
  const situacao = SITUACOES[a.situacao] ?? SITUACOES.pendente;
  const detalhes = [a.turmas, a.professor_nome ? `Prof. ${a.professor_nome}` : null, DIFICULDADES[a.nivel]]
    .filter(Boolean)
    .map(escapar)
    .join(' · ');
  const extras = [];
  if (a.prazo) extras.push(`Prazo: ${formatarData(a.prazo)}`);
  if (a.tempo_limite_seg) extras.push(`Tempo máximo: ${formatarTempo(a.tempo_limite_seg)}`);
  if (a.meta_precisao != null) extras.push(`Precisão mínima: ${formatarNumero(a.meta_precisao)}%`);
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
