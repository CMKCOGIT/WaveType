// js/pages/professor-perfil-alunos.js
// Perfil do professor: "Cadastrar aluno" e "Meus alunos".
// A conta é criada pela mesma RPC da criação em lote (professor_criar_alunos):
// usuário único gerado a partir do nome, senha gerada no navegador e
// guardada no Supabase Auth só como hash. O aluno entra pela aba
// "Sou aluno com usuário da escola" da tela de login.
import { listarMinhasTurmas, listarAlunosDaTurma } from '../api/turmas.js';
import { criarAlunosNaTurma, loginsDosAlunos } from '../api/contas-escolares.js';
import { loginBase } from '../contas/credenciais.js';
import { htmlDosCartoes, ligarCopiar, imprimirCartoes, exportarPdfDosAlunos } from '../ui/cartoes-acesso.js';

function escapar(texto) {
  const d = document.createElement('div');
  d.textContent = texto ?? '';
  return d.innerHTML;
}

export async function montarCadastroDeAlunos() {
  const grade = document.querySelector('.perfil-grid');
  if (!grade) return;

  const secaoCadastro = document.createElement('section');
  secaoCadastro.className = 'panel panel-pad perfil-largo';
  secaoCadastro.id = 'cadastrar-aluno';
  secaoCadastro.setAttribute('aria-labelledby', 'titulo-cadastrar-aluno');
  secaoCadastro.innerHTML = `
    <div class="panel-title"><div><h2 id="titulo-cadastrar-aluno">Cadastrar aluno</h2>
      <p>Informe o nome do aluno. O WaveType cria a conta dele e gera um usuário e uma senha exclusivos para você entregar. Cada aluno tem seus próprios resultados e progresso.</p></div></div>
    <form class="perfil-form cadastrar-aluno-form" data-form-cadastrar-aluno novalidate>
      <label class="field"><span>Nome completo do aluno</span><input name="nome" autocomplete="off" minlength="2" maxlength="120" placeholder="Ex.: Maria Silva Santos" required></label>
      <label class="field"><span>Turma</span><select name="turma" required><option value="">Carregando turmas…</option></select></label>
      <p class="auth-demo" data-previa-cadastro hidden></p>
      <button class="button" type="submit" data-botao-cadastrar>Cadastrar aluno</button>
      <p class="feedback" data-feedback-cadastro hidden role="status"></p>
    </form>
    <div class="credenciais-geradas" data-credenciais-geradas hidden>
      <h3>Acesso criado</h3>
      <p>Copie ou imprima agora: por segurança, a senha não aparece de novo. Se o aluno perder, gere uma nova senha em Alunos.</p>
      <div class="cartoes-grid" data-cartoes-perfil></div>
      <div class="form-actions"><button class="button secondary" type="button" data-imprimir-perfil>Imprimir cartão</button><button class="button secondary" type="button" data-pdf-perfil>Exportar PDF</button><button class="button ghost" type="button" data-novo-cadastro>Cadastrar outro aluno</button></div>
      <p class="perfil-ajuda" style="margin:0">O PDF lista nome, usuário, código e turma, sem a senha.</p>
    </div>
    <p class="perfil-ajuda">Muitos alunos de uma vez? Use <a href="alunos.html">Alunos → Criar alunos sem e-mail</a>.</p>`;

  const secaoLista = document.createElement('section');
  secaoLista.className = 'panel panel-pad perfil-largo';
  secaoLista.setAttribute('aria-labelledby', 'titulo-meus-alunos');
  secaoLista.innerHTML = `
    <div class="panel-title"><div><h2 id="titulo-meus-alunos">Meus alunos</h2><p data-resumo-meus-alunos>Carregando…</p></div><a class="button secondary small" href="alunos.html">Gerenciar alunos</a></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Acesso</th><th>Sessões</th></tr></thead><tbody data-meus-alunos><tr><td colspan="4">Carregando…</td></tr></tbody></table></div>`;

  grade.append(secaoCadastro, secaoLista);

  const form = secaoCadastro.querySelector('[data-form-cadastrar-aluno]');
  const seletor = form.elements.turma;
  const previa = secaoCadastro.querySelector('[data-previa-cadastro]');
  const feedback = secaoCadastro.querySelector('[data-feedback-cadastro]');
  const caixa = secaoCadastro.querySelector('[data-credenciais-geradas]');
  const areaCartoes = secaoCadastro.querySelector('[data-cartoes-perfil]');
  let contas = [];
  ligarCopiar(areaCartoes, () => contas);

  const avisar = (mensagem, erro = false) => {
    feedback.textContent = mensagem;
    feedback.hidden = false;
    feedback.classList.toggle('is-erro', erro);
  };

  let turmas = [];
  try {
    turmas = (await listarMinhasTurmas()).filter((t) => t.status === 'ativa');
  } catch (erro) {
    console.error('Falha ao carregar turmas:', erro);
  }
  if (!turmas.length) {
    seletor.innerHTML = '<option value="">Nenhuma turma ativa</option>';
    form.querySelector('[data-botao-cadastrar]').disabled = true;
    avisar('Crie uma turma primeiro: o aluno precisa estar em uma turma para você acompanhar o progresso dele.');
    feedback.insertAdjacentHTML('beforeend', ' <a href="turmas.html">Criar turma</a>');
  } else {
    seletor.innerHTML = turmas.map((t) => `<option value="${t.id}">${escapar(t.nome)}</option>`).join('');
  }

  form.elements.nome.addEventListener('input', () => {
    const base = loginBase(form.elements.nome.value);
    previa.hidden = form.elements.nome.value.trim().length < 2 || !base;
    previa.textContent = `Usuário sugerido: ${base} (se já existir, ganha um número no fim).`;
  });

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    feedback.hidden = true;
    const nome = form.elements.nome.value.replace(/\s+/g, ' ').trim();
    if (nome.length < 2) return avisar('Digite o nome completo do aluno.', true);
    if (!seletor.value) return avisar('Escolha a turma do aluno.', true);
    const botao = form.querySelector('[data-botao-cadastrar]');
    botao.disabled = true;
    botao.textContent = 'Cadastrando…';
    try {
      const turma = turmas.find((t) => String(t.id) === seletor.value);
      contas = (await criarAlunosNaTurma(Number(seletor.value), [nome])).map((c) => ({ ...c, turma: turma?.nome ?? '' }));
      areaCartoes.innerHTML = htmlDosCartoes(contas);
      caixa.hidden = false;
      form.hidden = true;
      previa.hidden = true;
      caixa.querySelector('[data-novo-cadastro]').focus();
      carregarLista(turmas, secaoLista);
    } catch (erro) {
      avisar(erro.message, true);
    } finally {
      botao.disabled = false;
      botao.textContent = 'Cadastrar aluno';
    }
  });

  secaoCadastro.querySelector('[data-imprimir-perfil]').addEventListener('click', () => imprimirCartoes(areaCartoes));
  secaoCadastro.querySelector('[data-pdf-perfil]').addEventListener('click', async (evento) => {
    const botao = evento.currentTarget;
    botao.disabled = true;
    try {
      const turma = turmas.find((t) => t.nome === contas[0]?.turma) ?? turmas.find((t) => String(t.id) === seletor.value);
      const alunos = turma ? await listarAlunosDaTurma(turma.id) : [];
      await exportarPdfDosAlunos(contas, { turma: turma?.nome ?? '', codigos: new Map(alunos.map((a) => [a.aluno_id, a.codigo_aluno])) });
    } catch (erro) {
      avisar(`Não foi possível gerar o PDF: ${erro.message}`, true);
    } finally {
      botao.disabled = false;
    }
  });
  secaoCadastro.querySelector('[data-novo-cadastro]').addEventListener('click', () => {
    contas = [];
    areaCartoes.innerHTML = '';
    caixa.hidden = true;
    form.reset();
    if (turmas.length) seletor.value = String(turmas[0].id);
    form.hidden = false;
    form.elements.nome.focus();
  });

  await carregarLista(turmas, secaoLista);
}

// Todos os alunos ativos das turmas ativas do professor.
async function carregarLista(turmas, secao) {
  const corpo = secao.querySelector('[data-meus-alunos]');
  const resumo = secao.querySelector('[data-resumo-meus-alunos]');
  try {
    const porTurma = await Promise.all(turmas.map(async (t) => (await listarAlunosDaTurma(t.id)).map((a) => ({ ...a, turma: t.nome }))));
    const alunos = porTurma.flat().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const logins = await loginsDosAlunos([...new Set(alunos.map((a) => a.aluno_id))]);
    resumo.textContent = alunos.length
      ? `${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'} nas suas turmas ativas.`
      : 'Nenhum aluno ainda. Cadastre o primeiro acima.';
    corpo.innerHTML = alunos.length
      ? alunos
          .map(
            (a) => `<tr>
              <td class="table-name"><strong>${escapar(a.nome)}</strong></td>
              <td>${escapar(a.turma)}</td>
              <td>${logins.has(a.aluno_id) ? `<span class="mono">${escapar(logins.get(a.aluno_id))}</span>` : '<small>Entra com e-mail ou Google</small>'}</td>
              <td class="mono">${a.sessoes ?? 0}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="4">Nenhum aluno cadastrado.</td></tr>';
  } catch (erro) {
    console.error('Falha ao carregar os alunos:', erro);
    resumo.textContent = 'Não foi possível carregar seus alunos.';
    corpo.innerHTML = '<tr><td colspan="4">Tente recarregar a página.</td></tr>';
  }
}
