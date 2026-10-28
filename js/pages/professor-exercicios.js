// js/pages/professor-exercicios.js
import { exigirPapel } from '../auth.js';
import { listarMinhasTurmas } from '../api/turmas.js';
import { listarAtividadesDoProfessor, salvarAtividade, excluirAtividade } from '../api/exercicios.js';
import { formatarTempo } from '../regras.js';

const botaoAbrir = document.querySelector('[data-abrir-form]');
const form = document.querySelector('[data-form-exercicio]');
const feedback = document.querySelector('[data-feedback]');
const feedbackForm = document.querySelector('[data-feedback-form]');
const filtroTurma = document.querySelector('[data-filtro-turma]');
const filtroBusca = document.querySelector('[data-filtro-busca]');
const lista = document.querySelector('[data-lista-exercicios]');
const DIFICULDADES = { facil: 'Fácil', medio: 'Médio', avancado: 'Avançado' };
let turmas = [];
let atividades = [];

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;

  turmas = await listarMinhasTurmas();
  filtroTurma.insertAdjacentHTML('beforeend', turmas.map((t) => `<option value="${t.id}">${escapar(t.nome)}</option>`).join(''));
  document.querySelector('[data-turmas-opcoes]').innerHTML = turmas.length
    ? turmas
        .map(
          (t) =>
            `<label><input type="checkbox" name="turmas" value="${t.id}"><span>${escapar(t.nome)}${t.status === 'encerrada' ? ' (encerrada)' : ''}</span></label>`
        )
        .join('')
    : '<span class="vazio">Você ainda não tem turmas. A atividade fica como rascunho até ser atribuída. <a href="turmas.html">Criar turma</a></span>';

  await carregarAtividades();
}

botaoAbrir.addEventListener('click', () => abrirFormulario());
document.querySelector('[data-cancelar]').addEventListener('click', () => (form.hidden = true));
filtroTurma.addEventListener('change', renderizar);
filtroBusca.addEventListener('input', renderizar);

function abrirFormulario(atividade = null) {
  form.reset();
  feedbackForm.hidden = true;
  const campos = form.elements;
  campos.id.value = atividade?.id ?? '';
  campos.titulo.value = atividade?.titulo ?? '';
  campos.instrucoes.value = atividade?.instrucoes ?? '';
  campos.texto_referencia.value = atividade?.texto_referencia ?? '';
  campos.nivel.value = atividade?.nivel ?? 'medio';
  campos.tempo_limite_seg.value = atividade?.tempo_limite_seg ?? 120;
  campos.prazo.value = atividade?.prazo ? paraDatetimeLocal(atividade.prazo) : '';
  campos.meta_precisao.value = atividade?.meta_precisao ?? 85;
  campos.publicado.value = String(atividade?.publicado ?? true);
  const selecionadas = new Set((atividade?.turmas ?? []).map((t) => String(t.id)));
  form.querySelectorAll('input[name="turmas"]').forEach((c) => (c.checked = selecionadas.has(c.value)));
  document.querySelector('[data-form-titulo]').textContent = atividade ? 'Editar atividade' : 'Nova atividade';
  form.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  campos.titulo.focus();
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  feedbackForm.hidden = true;
  const dados = new FormData(form);
  const meta = String(dados.get('meta_precisao') || '').trim();
  const prazo = String(dados.get('prazo') || '');
  const atividade = {
    id: dados.get('id') ? Number(dados.get('id')) : null,
    titulo: String(dados.get('titulo') || '').trim(),
    instrucoes: String(dados.get('instrucoes') || '').trim(),
    texto_referencia: String(dados.get('texto_referencia') || '').trim(),
    nivel: dados.get('nivel'),
    tempo_limite_seg: Number(dados.get('tempo_limite_seg')),
    prazo: prazo ? new Date(prazo).toISOString() : null,
    meta_precisao: meta === '' ? null : Number(meta),
    turmas: dados.getAll('turmas').map(Number),
    publicado: dados.get('publicado') === 'true',
  };

  if (atividade.titulo.length < 3) return erroFormulario('Informe um título com pelo menos 3 caracteres.');
  if (atividade.texto_referencia.length < 5) return erroFormulario('Informe o texto que o aluno deverá digitar.');
  if (!Number.isFinite(atividade.tempo_limite_seg) || atividade.tempo_limite_seg < 10 || atividade.tempo_limite_seg > 3600) {
    return erroFormulario('Defina o tempo máximo entre 10 e 3600 segundos.');
  }
  if (atividade.meta_precisao == null || atividade.meta_precisao < 0 || atividade.meta_precisao > 100) {
    return erroFormulario('Defina a precisão mínima entre 0 e 100%.');
  }
  if (atividade.publicado && !atividade.turmas.length) {
    return erroFormulario('Marque pelo menos uma turma ou salve como rascunho.');
  }

  const botao = form.querySelector('[data-salvar]');
  botao.disabled = true;
  try {
    await salvarAtividade(atividade);
    form.hidden = true;
    avisar(atividade.id ? 'Atividade atualizada.' : 'Atividade criada e enviada às turmas.');
    await carregarAtividades();
  } catch (erro) {
    erroFormulario(erro.message);
  } finally {
    botao.disabled = false;
  }
});

async function carregarAtividades() {
  try {
    atividades = await listarAtividadesDoProfessor();
    renderizar();
  } catch (erro) {
    console.error('Falha ao carregar atividades:', erro);
    lista.innerHTML = '<article class="practice-row"><p>Não foi possível carregar as atividades.</p></article>';
  }
}

function renderizar() {
  const turma = filtroTurma.value;
  const termo = filtroBusca.value.toLowerCase();
  const filtradas = atividades.filter(
    (a) => (!turma || a.turmas.some((t) => String(t.id) === turma)) && a.titulo.toLowerCase().includes(termo)
  );

  lista.innerHTML = filtradas.length
    ? filtradas
        .map((a, i) => {
          const turmasTexto = a.turmas.length ? a.turmas.map((t) => t.nome).join(', ') : 'Sem turma';
          const detalhes = [
            DIFICULDADES[a.nivel],
            a.tempo_limite_seg ? `Tempo máximo: ${formatarTempo(a.tempo_limite_seg)}` : null,
            a.meta_precisao != null ? `Precisão mínima: ${Number(a.meta_precisao)}%` : null,
            a.prazo ? `Prazo: ${formatarData(a.prazo)}` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return `
        <article class="practice-row${a.publicado ? '' : ' is-arquivada'}" data-atividade="${a.id}">
          <span class="practice-number">${String(i + 1).padStart(2, '0')}</span>
          <div class="practice-info"><h3>${escapar(a.titulo)}</h3><p>${escapar(turmasTexto)}</p><small>${escapar(detalhes)}</small></div>
          <span class="practice-meta">${a.alunos_concluiram} concluíram · ${a.entregas} tentativas${a.publicado ? '' : ' · arquivada'}</span>
          <div class="row-actions">
            <button type="button" class="button secondary small" data-acao="editar">Editar</button>
            <button type="button" class="button ghost small" data-acao="excluir">Excluir</button>
          </div>
        </article>`;
        })
        .join('')
    : `<article class="practice-row"><p>${atividades.length ? 'Nenhuma atividade encontrada com esse filtro.' : 'Nenhuma atividade ainda. Clique em “+ Nova atividade”.'}</p></article>`;
}

lista.addEventListener('click', async (evento) => {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const atividade = atividades.find((a) => String(a.id) === botao.closest('[data-atividade]')?.dataset.atividade);
  if (!atividade) return;

  if (botao.dataset.acao === 'editar') return abrirFormulario(atividade);

  const aviso = atividade.entregas > 0
    ? `“${atividade.titulo}” já tem resultados de alunos. Ela será arquivada (some para os alunos, mas os resultados ficam guardados). Continuar?`
    : `Excluir “${atividade.titulo}”? Esta ação não pode ser desfeita.`;
  if (!confirm(aviso)) return;
  try {
    const situacao = await excluirAtividade(atividade.id);
    avisar(situacao === 'arquivada' ? 'Atividade arquivada. Os resultados foram mantidos.' : 'Atividade excluída.');
    await carregarAtividades();
  } catch (erro) {
    avisar(erro.message, true);
  }
});

function erroFormulario(mensagem) {
  feedbackForm.textContent = mensagem;
  feedbackForm.hidden = false;
}

function avisar(mensagem, erro = false) {
  feedback.textContent = mensagem;
  feedback.hidden = false;
  feedback.classList.toggle('is-erro', erro);
}

function paraDatetimeLocal(iso) {
  const data = new Date(iso);
  const local = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
