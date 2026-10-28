// js/pages/conquistas.js
// Tela de conquistas (usuário e aluno). Os números vêm do banco
// (progresso_conquistas); esta tela só apresenta.
import { exigirPapel } from '../auth.js';
import { listarConquistasComProgresso } from '../api/achievements.js';
import { iconeConquista, iconeBloqueado } from '../ui/icones.js';

const CATEGORIAS = {
  exercicios: 'Exercícios',
  precisao: 'Precisão',
  velocidade: 'Velocidade',
  niveis: 'Níveis e etapas',
  constancia: 'Constância',
  desafios: 'Desafios especiais',
  marcos: 'Marcos',
};

const INCENTIVOS = [
  [0, 'Toda jornada começa com o primeiro exercício. Que tal agora?'],
  [1, 'Bom começo! Cada sessão deixa o próximo marco mais perto.'],
  [25, 'Você está pegando o ritmo. Continue assim.'],
  [50, 'Mais da metade das conquistas! A constância está aparecendo.'],
  [80, 'Quase tudo desbloqueado. Os últimos marcos são para poucos.'],
  [100, 'Todas as conquistas desbloqueadas. Impressionante!'],
];

export async function iniciarConquistas(papel) {
  const perfil = await exigirPapel(papel);
  if (!perfil) return;

  const resumo = document.querySelector('[data-resumo]');
  try {
    const conquistas = await listarConquistasComProgresso();
    const vistas = lerVistas(perfil.id);
    desenharResumo(conquistas);
    desenharFiltros(conquistas);
    desenharGrade(conquistas, vistas);
    salvarVistas(perfil.id, conquistas);
  } catch (erro) {
    console.error('Falha ao carregar conquistas:', erro);
    resumo.textContent = 'Não foi possível carregar suas conquistas. Atualize a página.';
  }
}

function desenharResumo(conquistas) {
  const total = conquistas.length;
  const feitas = conquistas.filter((c) => c.desbloqueada).length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  const incentivo = [...INCENTIVOS].reverse().find(([minimo]) => pct >= minimo)?.[1] ?? '';

  document.querySelector('[data-resumo]').textContent =
    `${feitas} de ${total} conquistas desbloqueadas. Cada uma vem de um resultado real seu.`;

  const anel = document.querySelector('[data-anel]');
  anel.style.setProperty('--pct', pct);
  anel.querySelector('span').textContent = `${pct}%`;
  document.querySelector('[data-incentivo]').textContent = incentivo;

  // A bloqueada mais próxima de sair vira o "próximo objetivo".
  const proxima = conquistas
    .filter((c) => !c.desbloqueada && c.alvo > 0 && c.atual != null)
    .sort((a, b) => b.atual / b.alvo - a.atual / a.alvo)[0];
  const caixa = document.querySelector('[data-proxima]');
  if (!proxima) {
    caixa.hidden = true;
    return;
  }
  const pctProxima = Math.min(100, Math.round((proxima.atual / proxima.alvo) * 100));
  caixa.hidden = false;
  caixa.innerHTML = `<strong>Próximo objetivo:</strong><span>${escapar(proxima.titulo)}</span>
    <div class="progress-track"><div class="progress-fill" style="width:${pctProxima}%"></div></div>
    <span class="mono">${formatar(proxima.atual)}/${formatar(proxima.alvo)}</span>`;
}

function desenharFiltros(conquistas) {
  const filtros = document.querySelector('[data-filtros]');
  const opcoes = [
    ['todas', 'Todas'],
    ['desbloqueadas', 'Desbloqueadas'],
    ['bloqueadas', 'Em andamento'],
  ];
  filtros.innerHTML = opcoes
    .map(([valor, rotulo], i) => `<button type="button" data-filtro="${valor}" aria-pressed="${i === 0}">${rotulo}</button>`)
    .join('');
  filtros.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-filtro]');
    if (!botao) return;
    filtros.querySelectorAll('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
    const filtro = botao.dataset.filtro;
    document.querySelectorAll('.achievement').forEach((card) => {
      const desbloqueada = !card.classList.contains('locked');
      card.hidden = (filtro === 'desbloqueadas' && !desbloqueada) || (filtro === 'bloqueadas' && desbloqueada);
    });
    document.querySelectorAll('[data-categoria]').forEach((secao) => {
      secao.hidden = !secao.querySelector('.achievement:not([hidden])');
    });
  });
  if (!conquistas.length) filtros.hidden = true;
}

function desenharGrade(conquistas, vistas) {
  const container = document.querySelector('[data-grid-conquistas]');
  const grupos = new Map();
  conquistas.forEach((c) => {
    const chave = CATEGORIAS[c.categoria] ? c.categoria : 'marcos';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(c);
  });

  container.innerHTML = [...grupos.entries()]
    .map(([categoria, lista]) => {
      const feitas = lista.filter((c) => c.desbloqueada).length;
      return `
      <section data-categoria="${categoria}">
        <div class="section-head"><div><h2>${CATEGORIAS[categoria]}</h2><p>${feitas} de ${lista.length} desbloqueadas</p></div></div>
        <div class="achievement-grid">${lista.map((c) => cartao(c, vistas)).join('')}</div>
      </section>`;
    })
    .join('');
}

function cartao(c, vistas) {
  const nova = c.desbloqueada && !vistas.has(c.codigo);
  const pct = c.alvo > 0 && c.atual != null ? Math.min(100, Math.round((c.atual / c.alvo) * 100)) : 0;
  const rodape = c.desbloqueada
    ? `<small>Desbloqueada${c.desbloqueada_em ? ` em ${new Date(c.desbloqueada_em).toLocaleDateString('pt-BR')}` : ''}</small>`
    : c.alvo > 0
      ? `<div class="achievement-progress"><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><small>${formatar(c.atual)} de ${formatar(c.alvo)}</small></div>`
      : '<small>Bloqueada</small>';

  return `
    <article class="achievement${c.desbloqueada ? '' : ' locked'}${nova ? ' is-new' : ''}">
      <span class="achievement-icon">${c.desbloqueada ? iconeConquista(c.icone) : iconeBloqueado()}</span>
      <h3>${escapar(c.titulo)}</h3>
      <p>${escapar(c.descricao)}</p>
      ${rodape}
    </article>`;
}

// Quais conquistas a pessoa já viu (só para destacar as novas com animação).
function lerVistas(usuarioId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`wavetype_conquistas_vistas_${usuarioId}`) || '[]'));
  } catch {
    return new Set();
  }
}
function salvarVistas(usuarioId, conquistas) {
  try {
    const codigos = conquistas.filter((c) => c.desbloqueada).map((c) => c.codigo);
    localStorage.setItem(`wavetype_conquistas_vistas_${usuarioId}`, JSON.stringify(codigos));
  } catch {
    // armazenamento indisponível: só não haverá destaque de "nova"
  }
}

function formatar(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
