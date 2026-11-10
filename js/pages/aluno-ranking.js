// js/pages/aluno-ranking.js
// Ranking anônimo da turma: top 5 em animais (ranking_turma, migração 14).
import { exigirPapel } from '../auth.js';
import { listarMinhasMatriculas, rankingDaTurma } from '../api/turmas.js';
import { htmlDoRanking, organizarRanking, ANIMAIS } from '../ui/ranking-animais.js';

const select = document.querySelector('[data-select-turma]');
const area = document.querySelector('[data-ranking-area]');
const CHAVE_TURMA = 'wavetype_ranking_turma';

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return;

  let turmas = [];
  try {
    turmas = (await listarMinhasMatriculas()).filter((m) => m.turmas).map((m) => m.turmas);
  } catch (erro) {
    console.error(erro);
  }
  if (!turmas.length) {
    document.querySelector('[data-ranking-info]').textContent = 'Você ainda não está em uma turma.';
    area.innerHTML = '<p class="ranking-vazio">Quando o professor adicionar você a uma turma, o ranking dela aparece aqui. <a href="turmas.html">Ver o meu código de aluno</a></p>';
    return;
  }

  select.innerHTML = turmas.map((t) => `<option value="${t.id}">${escapar(t.nome)}</option>`).join('');
  let salva = null;
  try { salva = localStorage.getItem(CHAVE_TURMA); } catch { /* sem armazenamento */ }
  if (salva && turmas.some((t) => String(t.id) === salva)) select.value = salva;
  document.querySelector('[data-escolha-turma]').hidden = turmas.length < 2;
  select.addEventListener('change', () => {
    try { localStorage.setItem(CHAVE_TURMA, select.value); } catch { /* sem armazenamento */ }
    carregar(turmas);
  });
  await carregar(turmas);
}

async function carregar(turmas) {
  const turma = turmas.find((t) => String(t.id) === select.value) ?? turmas[0];
  document.querySelector('[data-turma-nome]').textContent = turma.nome;
  area.innerHTML = '<p class="ranking-vazio">Carregando…</p>';
  let linhas = [];
  try {
    linhas = await rankingDaTurma(turma.id);
  } catch (erro) {
    area.innerHTML = `<p class="ranking-vazio">${escapar(erro.message)}</p>`;
    return;
  }
  const { top, eu, participantes } = organizarRanking(linhas);
  document.querySelector('[data-ranking-info]').textContent = participantes
    ? `${participantes} ${participantes === 1 ? 'aluno pontuou' : 'alunos pontuaram'} nesta turma.`
    : 'Ninguém pontuou ainda nesta turma.';
  area.innerHTML = top.length
    ? htmlDoRanking(linhas)
    : '<p class="ranking-vazio">Ainda sem treinos concluídos nesta turma. Faça uma atividade ou uma lição da trilha para abrir o ranking!</p>';
  mostrarMeuMomento(eu, participantes);
}

function mostrarMeuMomento(eu, participantes) {
  const numeros = document.querySelector('[data-meus-numeros]');
  const emoji = document.querySelector('[data-meu-emoji]');
  if (!eu) {
    document.querySelector('[data-minha-posicao]').textContent = '–';
    emoji.textContent = '🎯';
    document.querySelector('[data-minha-mensagem]').textContent = 'Conclua um treino desta turma (atividade ou trilha) para aparecer no ranking.';
    numeros.hidden = true;
    return;
  }
  const animal = ANIMAIS[eu.posicao - 1];
  document.querySelector('[data-minha-posicao]').textContent = `${eu.posicao}º`;
  emoji.textContent = animal?.emoji ?? '🎯';
  document.querySelector('[data-minha-mensagem]').textContent = animal
    ? `Você é ${animal.artigo} ${animal.animal} da turma! ${eu.posicao === 1 ? 'Mantenha o ritmo.' : 'Continue treinando para subir.'}`
    : `De ${participantes} alunos. Faltam ${eu.posicao - 5} ${eu.posicao - 5 === 1 ? 'posição' : 'posições'} para entrar no top 5.`;
  document.querySelector('[data-meus-pontos]').textContent = formatar(eu.pontuacao);
  document.querySelector('[data-meu-ppm]').textContent = formatar(eu.ppm);
  document.querySelector('[data-minha-precisao]').textContent = `${formatar(eu.precisao)}%`;
  numeros.hidden = false;
}

function formatar(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
