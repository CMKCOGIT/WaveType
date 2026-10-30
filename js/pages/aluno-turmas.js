// js/pages/aluno-turmas.js
import { exigirPapel } from '../auth.js';
import { entrarNaTurma, listarMinhasMatriculas } from '../api/turmas.js';

const form = document.querySelector('[data-form-entrar-turma]');
const feedback = document.querySelector('[data-feedback-turma]');

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return;

  const codigo = perfil.codigo_aluno ?? perfil.id;
  document.querySelector('[data-meu-id]').textContent = codigo;
  document.querySelector('[data-copiar-id]').addEventListener('click', async (evento) => {
    try {
      await navigator.clipboard.writeText(codigo);
      evento.target.textContent = 'Copiado!';
      setTimeout(() => (evento.target.textContent = 'Copiar'), 1800);
    } catch {
      evento.target.textContent = 'Selecione e copie';
    }
  });

  await carregarTurmas();
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const botao = form.querySelector('button[type="submit"]');
  const codigo = String(new FormData(form).get('codigoConvite') || '').trim();
  if (!codigo) return mostrarFeedback('Digite o código da turma.', 'erro');

  botao.disabled = true;
  try {
    await entrarNaTurma(codigo);
    mostrarFeedback('Você entrou na turma! As atividades dela já aparecem em Exercícios.', 'sucesso');
    form.reset();
    await carregarTurmas();
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
  } finally {
    botao.disabled = false;
  }
});

async function carregarTurmas() {
  const grid = document.querySelector('[data-lista-turmas]');
  const resumo = document.querySelector('[data-resumo-turmas]');
  try {
    const matriculas = (await listarMinhasMatriculas()).filter((m) => m.turmas);
    resumo.textContent = matriculas.length
      ? `Você participa de ${matriculas.length} turma${matriculas.length === 1 ? '' : 's'}.`
      : 'Você ainda não participa de nenhuma turma.';
    grid.innerHTML = matriculas
      .map(({ turmas: t, entrou_em }) => `
        <article class="entity-card">
          <div class="entity-head">
            <div><h2>${escapar(t.nome)}</h2><p>${escapar([t.ano_letivo, t.descricao].filter(Boolean).join(' · '))}</p></div>
            <span class="status${t.status === 'encerrada' ? ' closed' : ''}">${t.status === 'encerrada' ? 'Encerrada' : 'Ativa'}</span>
          </div>
          <div class="entity-stats"><div><span>Entrou em</span><strong>${new Date(entrou_em).toLocaleDateString('pt-BR')}</strong></div></div>
        </article>`)
      .join('');
  } catch (erro) {
    console.error('Falha ao carregar turmas:', erro);
    resumo.textContent = 'Não foi possível carregar suas turmas.';
  }
}

function mostrarFeedback(mensagem, tipo) {
  feedback.textContent = mensagem;
  feedback.hidden = false;
  feedback.classList.toggle('is-erro', tipo === 'erro');
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
