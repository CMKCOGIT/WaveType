// js/pages/professor-turmas.js
import { exigirPapel } from '../auth.js';
import { listarMinhasTurmas, criarTurma, atualizarTurma, excluirTurma, regenerarCodigoTurma } from '../api/turmas.js';

const botaoAbrir = document.querySelector('[data-abrir-form-turma]');
const form = document.querySelector('[data-form-turma]');
const grid = document.querySelector('[data-grid-turmas]');
const feedback = document.querySelector('[data-feedback]');
const feedbackForm = document.querySelector('[data-feedback-form]');
let turmasCarregadas = [];

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;
  await carregarTurmas();
}

botaoAbrir.addEventListener('click', () => abrirFormulario());
document.querySelector('[data-cancelar-turma]').addEventListener('click', fecharFormulario);

function abrirFormulario(turma = null) {
  form.reset();
  feedbackForm.hidden = true;
  form.elements.id.value = turma?.id ?? '';
  form.elements.nome.value = turma?.nome ?? '';
  form.elements.ano_letivo.value = turma?.ano_letivo ?? '';
  form.elements.descricao.value = turma?.descricao ?? '';
  document.querySelector('[data-form-titulo]').textContent = turma ? 'Editar turma' : 'Nova turma';
  document.querySelector('[data-salvar-turma]').textContent = turma ? 'Salvar alterações' : 'Criar turma';
  form.hidden = false;
  form.elements.nome.focus();
}

function fecharFormulario() {
  form.hidden = true;
  form.reset();
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const dados = new FormData(form);
  const campos = {
    nome: String(dados.get('nome') || '').trim(),
    ano_letivo: String(dados.get('ano_letivo') || '').trim(),
    descricao: String(dados.get('descricao') || '').trim(),
  };
  if (campos.nome.length < 2) {
    feedbackForm.textContent = 'Informe o nome da turma.';
    feedbackForm.hidden = false;
    return;
  }

  const botao = form.querySelector('[data-salvar-turma]');
  botao.disabled = true;
  try {
    const id = dados.get('id');
    if (id) await atualizarTurma(Number(id), campos);
    else await criarTurma(campos);
    fecharFormulario();
    avisar(id ? 'Turma atualizada.' : 'Turma criada! Compartilhe o código com seus alunos.');
    await carregarTurmas();
  } catch (erro) {
    feedbackForm.textContent = erro.message;
    feedbackForm.hidden = false;
  } finally {
    botao.disabled = false;
  }
});

async function carregarTurmas() {
  try {
    turmasCarregadas = await listarMinhasTurmas();
  } catch (erro) {
    console.error('Falha ao carregar turmas:', erro);
    grid.innerHTML = '<article class="entity-card"><p>Não foi possível carregar as turmas.</p></article>';
    return;
  }
  const ativas = turmasCarregadas.filter((t) => t.status === 'ativa').length;

  document.querySelector('[data-resumo]').textContent = turmasCarregadas.length
    ? `${turmasCarregadas.length} turma${turmasCarregadas.length === 1 ? '' : 's'} (${ativas} ativa${ativas === 1 ? '' : 's'}). Compartilhe o código para os alunos entrarem.`
    : 'Crie sua primeira turma para começar.';

  if (!turmasCarregadas.length) {
    grid.innerHTML = '<article class="entity-card"><p>Nenhuma turma ainda. Clique em “+ Nova turma”.</p></article>';
    return;
  }

  grid.innerHTML = turmasCarregadas
    .map(
      (t) => `
      <article class="entity-card" data-turma="${t.id}">
        <div class="entity-head">
          <div><h2>${escapar(t.nome)}</h2><p>${escapar([t.ano_letivo, t.descricao].filter(Boolean).join(' · ') || 'Sem descrição')}</p></div>
          <span class="status${t.status === 'encerrada' ? ' closed' : ''}">${t.status === 'ativa' ? 'Ativa' : 'Encerrada'}</span>
        </div>
        <div class="entity-stats">
          <div><span>Alunos</span><strong>${t.alunos ?? 0}</strong></div>
          <div><span>Atividades</span><strong>${t.atividades ?? 0}</strong></div>
          <div style="grid-column:1/-1"><span>Código de acesso</span>
            <strong class="codigo-convite">${escapar(t.codigo_convite)}
              <button type="button" class="copiar" data-acao="copiar">Copiar</button>
              <button type="button" class="copiar" data-acao="novo-codigo" title="Gera um novo código; o antigo deixa de funcionar">Gerar novo</button>
            </strong>
          </div>
        </div>
        <div class="row-actions">
          <a class="button small" href="alunos.html?turma=${t.id}">Alunos</a>
          <button type="button" class="button secondary small" data-acao="editar">Editar</button>
          <button type="button" class="button secondary small" data-acao="status">${t.status === 'ativa' ? 'Encerrar' : 'Reabrir'}</button>
          <button type="button" class="button ghost small" data-acao="excluir">Excluir</button>
        </div>
      </article>`
    )
    .join('');
}

grid.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const turma = turmasCarregadas.find((t) => String(t.id) === botao.closest('[data-turma]')?.dataset.turma);
  if (!turma) return;

  try {
    switch (botao.dataset.acao) {
      case 'copiar':
        await navigator.clipboard.writeText(turma.codigo_convite);
        botao.textContent = 'Copiado!';
        setTimeout(() => (botao.textContent = 'Copiar'), 1800);
        return;
      case 'novo-codigo':
        if (!confirm('Gerar um novo código? O código atual deixará de funcionar para novos alunos.')) return;
        await regenerarCodigoTurma(turma.id);
        avisar('Novo código gerado.');
        break;
      case 'editar':
        abrirFormulario(turma);
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      case 'status': {
        const encerrar = turma.status === 'ativa';
        if (encerrar && !confirm('Encerrar a turma? Novos alunos não poderão entrar pelo código. Os dados são mantidos.')) return;
        await atualizarTurma(turma.id, { status: encerrar ? 'encerrada' : 'ativa' });
        avisar(encerrar ? 'Turma encerrada.' : 'Turma reaberta.');
        break;
      }
      case 'excluir':
        if (!confirm(`Excluir a turma “${turma.nome}”? Esta ação não pode ser desfeita.`)) return;
        await excluirTurma(turma.id);
        avisar('Turma excluída.');
        break;
      default:
        return;
    }
    await carregarTurmas();
  } catch (erro) {
    avisar(erro.message, true);
  }
});

function avisar(mensagem, erro = false) {
  feedback.textContent = mensagem;
  feedback.hidden = false;
  feedback.classList.toggle('is-erro', erro);
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
