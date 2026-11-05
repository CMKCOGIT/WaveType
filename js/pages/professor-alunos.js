// js/pages/professor-alunos.js
import { exigirPapel } from '../auth.js';
import { listarMinhasTurmas, listarAlunosDaTurma, adicionarAluno, removerAlunoDaTurma } from '../api/turmas.js';
import { criarAlunosNaTurma, redefinirSenhaDoAluno, loginsDosAlunos } from '../api/contas-escolares.js';
import { nomesDaLista, sugerirLogins } from '../contas/credenciais.js';
import { nivelamentoDosAlunos } from '../api/nivelamento.js';
import { NIVEIS_RECOMENDADOS } from '../nivelamento/config.js';

const seletorTurma = document.querySelector('[data-select-turma]');
const busca = document.querySelector('[data-table-search]');
const corpo = document.querySelector('[data-tabela-alunos]');
const formAdicionar = document.querySelector('[data-form-adicionar]');
const feedbackAdicionar = document.querySelector('[data-feedback-adicionar]');
// Código curto (6 caracteres) ou o ID longo antigo, que continua aceito.
const IDENTIFICADOR = /^([A-HJ-NP-Z2-9]{6}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
let alunosCarregados = [];
let loginsEscola = new Map();
let nivelamentos = { niveis: new Map(), sugestoes: new Map() };
let turmasCarregadas = [];

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;

  const turmas = await listarMinhasTurmas();
  turmasCarregadas = turmas;
  if (!turmas.length) {
    seletorTurma.innerHTML = '<option value="">Nenhuma turma</option>';
    formAdicionar.hidden = true;
    corpo.innerHTML = '<tr><td colspan="8">Crie uma turma primeiro. <a href="turmas.html">Ir para turmas</a></td></tr>';
    return;
  }

  seletorTurma.innerHTML = turmas
    .map((t) => `<option value="${t.id}">${escapar(t.nome)}${t.status === 'encerrada' ? ' (encerrada)' : ''}</option>`)
    .join('');
  const turmaInicial = new URLSearchParams(location.search).get('turma');
  if (turmaInicial && turmas.some((t) => String(t.id) === turmaInicial)) seletorTurma.value = turmaInicial;

  seletorTurma.addEventListener('change', carregarAlunos);
  busca.addEventListener('input', renderizarTabela);
  await carregarAlunos();
}

async function carregarAlunos() {
  corpo.innerHTML = '<tr><td colspan="8">Carregando…</td></tr>';
  try {
    alunosCarregados = await listarAlunosDaTurma(Number(seletorTurma.value));
    const ids = alunosCarregados.map((a) => a.aluno_id);
    [loginsEscola, nivelamentos] = await Promise.all([loginsDosAlunos(ids), nivelamentoDosAlunos(ids)]);
    renderizarTabela();
  } catch (erro) {
    corpo.innerHTML = `<tr><td colspan="8">${escapar(erro.message)}</td></tr>`;
  }
}

function renderizarTabela() {
  const termo = busca.value.toLowerCase();
  const filtrados = alunosCarregados.filter((a) => `${a.nome} ${a.email} ${loginsEscola.get(a.aluno_id) ?? ''}`.toLowerCase().includes(termo));
  corpo.innerHTML = filtrados.length
    ? filtrados
        .map(
          (a) => `<tr>
            <td class="table-name"><strong>${escapar(a.nome)}</strong><small>${loginsEscola.has(a.aluno_id) ? `Usuário da escola: <span class="mono">${escapar(loginsEscola.get(a.aluno_id))}</span>` : escapar(a.email)}</small></td>
            <td class="mono">${a.sessoes}</td>
            <td class="mono">${a.ppm_medio ?? '—'}</td>
            <td class="mono">${a.precisao_media != null ? `${a.precisao_media}%` : '—'}</td>
            <td class="mono">${a.atividades_concluidas}</td>
            <td>${a.ultima_pratica ? new Date(a.ultima_pratica).toLocaleDateString('pt-BR') : '—'}</td>
            <td>${celulaPontoDePartida(a.aluno_id)}</td>
            <td class="row-actions">${loginsEscola.has(a.aluno_id) ? `<button type="button" class="button secondary small" data-nova-senha="${a.aluno_id}">Nova senha</button>` : ''}<button type="button" class="button ghost small" data-remover="${a.aluno_id}">Remover</button></td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="8">${alunosCarregados.length ? 'Nenhum aluno encontrado.' : 'Nenhum aluno nesta turma ainda. Compartilhe o código ou adicione pelo ID.'}</td></tr>`;
}

corpo.addEventListener('click', async (evento) => {
  const novaSenha = evento.target.closest('[data-nova-senha]');
  if (novaSenha) return gerarNovaSenha(novaSenha);
  const botao = evento.target.closest('[data-remover]');
  if (!botao) return;
  const aluno = alunosCarregados.find((a) => a.aluno_id === botao.dataset.remover);
  if (!confirm(`Remover ${aluno?.nome ?? 'este aluno'} da turma? Os resultados dele continuam guardados.`)) return;
  botao.disabled = true;
  try {
    await removerAlunoDaTurma(Number(seletorTurma.value), botao.dataset.remover);
    await carregarAlunos();
  } catch (erro) {
    alert(erro.message);
    botao.disabled = false;
  }
});

formAdicionar.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = String(new FormData(formAdicionar).get('aluno_id') || '').trim();
  if (!IDENTIFICADOR.test(id)) return mostrarFeedback('Código inválido. Ele tem 6 caracteres e aparece em Turmas ou em Perfil, na área do aluno.', true);

  const botao = formAdicionar.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    await adicionarAluno(Number(seletorTurma.value), id);
    formAdicionar.reset();
    mostrarFeedback('Aluno adicionado à turma.');
    await carregarAlunos();
  } catch (erro) {
    mostrarFeedback(erro.message, true);
  } finally {
    botao.disabled = false;
  }
});

function mostrarFeedback(mensagem, erro = false) {
  feedbackAdicionar.textContent = mensagem;
  feedbackAdicionar.hidden = false;
  feedbackAdicionar.classList.toggle('is-erro', erro);
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}

// ---------- Contas da escola (alunos sem e-mail) ----------

const formCriar = document.querySelector('[data-form-criar-alunos]');
const previa = document.querySelector('[data-previa-logins]');
const feedbackCriar = document.querySelector('[data-feedback-criar]');
const painelCredenciais = document.querySelector('[data-credenciais]');
const areaCartoes = document.querySelector('[data-cartoes]');

formCriar.elements.nomes.addEventListener('input', () => {
  const nomes = nomesDaLista(formCriar.elements.nomes.value);
  previa.hidden = !nomes.length;
  if (!nomes.length) return;
  const exemplos = sugerirLogins(nomes.slice(0, 3)).map((n) => n.login).join(', ');
  previa.textContent = `${nomes.length} ${nomes.length === 1 ? 'aluno' : 'alunos'}. Usuários sugeridos: ${exemplos}${nomes.length > 3 ? '…' : ''} (se já existir, ganha um número no fim).`;
});

formCriar.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  feedbackCriar.hidden = true;
  const nomes = nomesDaLista(formCriar.elements.nomes.value);
  if (!nomes.length) return avisarCriar('Escreva pelo menos um nome completo.', true);
  if (nomes.length > 60) return avisarCriar('Crie no máximo 60 alunos por vez.', true);
  if (nomes.some((n) => n.split(' ').length < 2)) {
    if (!confirm('Alguns nomes têm uma palavra só. O usuário fica mais fácil de identificar com nome e sobrenome. Criar assim mesmo?')) return;
  }
  const botao = formCriar.querySelector('[data-botao-criar]');
  botao.disabled = true;
  botao.textContent = 'Criando…';
  try {
    const criados = await criarAlunosNaTurma(Number(seletorTurma.value), nomes);
    formCriar.reset();
    previa.hidden = true;
    mostrarCredenciais(criados, `${criados.length} ${criados.length === 1 ? 'conta criada' : 'contas criadas'}.`);
    await carregarAlunos();
  } catch (erro) {
    avisarCriar(erro.message, true);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Criar contas';
  }
});

async function gerarNovaSenha(botao) {
  const aluno = alunosCarregados.find((a) => a.aluno_id === botao.dataset.novaSenha);
  if (!confirm(`Gerar uma nova senha para ${aluno?.nome ?? 'este aluno'}? A senha atual deixa de funcionar. O progresso não muda.`)) return;
  botao.disabled = true;
  try {
    const { login, senha } = await redefinirSenhaDoAluno(botao.dataset.novaSenha);
    mostrarCredenciais([{ nome: aluno?.nome ?? '', login, senha }], 'Nova senha gerada.');
  } catch (erro) {
    alert(erro.message);
  } finally {
    botao.disabled = false;
  }
}

function nomeDaTurma() {
  return turmasCarregadas.find((t) => String(t.id) === seletorTurma.value)?.nome ?? '';
}

// Cartões de acesso (tela e impressão). As senhas ficam só nesta página.
function mostrarCredenciais(contas, titulo) {
  const turma = nomeDaTurma();
  const endereco = `${location.host}/login.html?modo=escola`;
  areaCartoes.innerHTML = contas
    .map(
      (c) => `<article class="cartao-acesso">
        <img src="../../assets/images/brand/wavetype-logo.svg" alt="WaveType" width="120" height="24">
        <h3>${escapar(c.nome)}</h3>
        ${turma ? `<p class="cartao-turma">${escapar(turma)}</p>` : ''}
        <dl>
          <div><dt>Usuário</dt><dd class="mono">${escapar(c.login)}</dd></div>
          <div><dt>Senha</dt><dd class="mono">${escapar(c.senha)}</dd></div>
        </dl>
        <p class="cartao-como">Entre em <strong>${escapar(endereco)}</strong> e escolha “Sou aluno com usuário da escola”.</p>
      </article>`
    )
    .join('');
  document.querySelector('#titulo-credenciais').textContent = titulo;
  painelCredenciais.hidden = false;
  painelCredenciais.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelector('[data-imprimir-cartoes]').addEventListener('click', () => {
  document.documentElement.classList.add('imprimindo-cartoes');
  window.print();
});
window.addEventListener('afterprint', () => document.documentElement.classList.remove('imprimindo-cartoes'));
document.querySelector('[data-fechar-credenciais]').addEventListener('click', () => {
  if (!confirm('Fechar? As senhas não aparecem de novo (dá para gerar novas na lista).')) return;
  areaCartoes.innerHTML = '';
  painelCredenciais.hidden = true;
});

function avisarCriar(mensagem, erro = false) {
  feedbackCriar.textContent = mensagem;
  feedbackCriar.hidden = false;
  feedbackCriar.classList.toggle('is-erro', erro);
}

// Nível de partida (teste de nivelamento) e sugestões aceitas/ignoradas.
function celulaPontoDePartida(alunoId) {
  const nivel = nivelamentos.niveis.get(alunoId);
  const sugestoes = nivelamentos.sugestoes.get(alunoId);
  const partes = [];
  partes.push(
    nivel
      ? `<strong>${escapar(NIVEIS_RECOMENDADOS[nivel.nivel]?.rotulo ?? nivel.nivel)}</strong><small>Nível ${nivel.licao_nivel}, lição ${nivel.licao_ordem}</small>`
      : '<small>Sem teste de nivelamento</small>'
  );
  if (sugestoes) {
    partes.push(`<small title="Sugestões de exercício mais fácil durante o treino">Sugestões: ${sugestoes.aceitou} aceita${sugestoes.aceitou === 1 ? '' : 's'}, ${sugestoes.ignorou} ignorada${sugestoes.ignorou === 1 ? '' : 's'}</small>`);
  }
  return `<div class="table-name">${partes.join('')}</div>`;
}
