// js/pages/professor-alunos.js
// Gestão de alunos do professor: seleção da turma, adicionar aluno existente
// (código individual), criar contas, importar planilha, exportar a lista e a
// tabela de acompanhamento.
import { exigirPapel } from '../auth.js';
import { listarMinhasTurmas, listarAlunosDaTurma, removerAlunoDaTurma, buscarAlunoPorCodigo, adicionarAlunoExistente } from '../api/turmas.js';
import { criarAlunosNaTurma, importarAlunosNaTurma, redefinirSenhaDoAluno, loginsDosAlunos, alterarLoginDoAluno } from '../api/contas-escolares.js';
import { nomesDaLista, sugerirLogins, normalizarLoginEscolhido } from '../contas/credenciais.js';
import {
  prepararImportacao, decodificarCsv, lerCsv, linhasDaExportacao, gerarCsv, nomeDoArquivo, normalizarNome,
  MAX_ALUNOS_IMPORTACAO,
} from '../contas/planilha.js';
import { nivelamentoDosAlunos } from '../api/nivelamento.js';
import { htmlDosCartoes, ligarCopiar, imprimirCartoes, exportarPdfDosAlunos } from '../ui/cartoes-acesso.js';
import { baixarPdfTabela } from '../ui/pdf.js';
import { NIVEIS_RECOMENDADOS } from '../nivelamento/config.js';

const $ = (seletor) => document.querySelector(seletor);

const seletorTurma = $('[data-select-turma]');
const listaTurmas = $('[data-lista-turmas]');
const busca = $('[data-table-search]');
const corpo = $('[data-tabela-alunos]');
const painelAdicionar = $('[data-painel-adicionar]');
const formAdicionar = $('[data-form-adicionar]');
const feedbackAdicionar = $('[data-feedback-adicionar]');
const caixaConfirmar = $('[data-confirmar-aluno]');
const botaoImportarTopo = $('[data-ir-importar]');
const menuExportar = $('[data-menu-exportar]');
const filtroEncerradas = $('[data-mostrar-encerradas]');

// Código curto (6 caracteres) ou o ID longo antigo, que continua aceito.
const IDENTIFICADOR = /^([A-HJ-NP-Z2-9]{6}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

let turmasCarregadas = [];
let turmaId = null;
let alunosCarregados = [];
let loginsEscola = new Map();
let nivelamentos = { niveis: new Map(), sugestoes: new Map() };
let alunoEncontrado = null;

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;

  try {
    turmasCarregadas = await listarMinhasTurmas();
  } catch (erro) {
    $('[data-contagem-turmas]').textContent = 'Não foi possível carregar suas turmas.';
    corpo.innerHTML = `<tr><td colspan="8">${escapar(erro.message)}</td></tr>`;
    return;
  }
  if (!turmasCarregadas.length) {
    $('[data-contagem-turmas]').textContent = 'Você ainda não tem turmas.';
    listaTurmas.innerHTML = '<a class="turma-vazia" href="turmas.html"><strong>Crie a primeira turma</strong><small>Depois volte aqui para adicionar os alunos.</small></a>';
    seletorTurma.closest('.field').hidden = true;
    painelAdicionar.hidden = true;
    menuExportar.hidden = true;
    $('[data-resumo-lista]').textContent = 'Sem turmas ainda.';
    corpo.innerHTML = '<tr><td colspan="8">Crie uma turma primeiro. <a href="turmas.html">Ir para turmas</a></td></tr>';
    return;
  }

  const pedida = new URLSearchParams(location.search).get('turma');
  const inicial = turmasCarregadas.find((t) => String(t.id) === pedida)
    ?? turmasCarregadas.find((t) => t.status === 'ativa')
    ?? turmasCarregadas[0];
  if (inicial.status === 'encerrada') filtroEncerradas.checked = true;
  turmaId = inicial.id;

  botaoImportarTopo.disabled = false;
  busca.addEventListener('input', renderizarTabela);
  seletorTurma.addEventListener('change', () => selecionarTurma(Number(seletorTurma.value)));
  filtroEncerradas.addEventListener('change', renderizarTurmas);
  renderizarTurmas();
  await selecionarTurma(turmaId, { atualizarUrl: false });
}

// ---------- Seleção da turma ----------

function turmaAtual() {
  return turmasCarregadas.find((t) => t.id === turmaId) ?? null;
}

function siglaDe(nome) {
  const palavras = String(nome ?? '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return (palavras.length > 1 ? palavras[0][0] + palavras[1][0] : (palavras[0] ?? '?').slice(0, 2)).toUpperCase();
}

function renderizarTurmas() {
  const encerradas = turmasCarregadas.filter((t) => t.status === 'encerrada').length;
  const ativas = turmasCarregadas.length - encerradas;
  $('[data-filtro-encerradas]').hidden = encerradas === 0;
  $('[data-contagem-turmas]').textContent =
    `${ativas} ${ativas === 1 ? 'turma ativa' : 'turmas ativas'}${encerradas ? ` · ${encerradas} encerrada${encerradas === 1 ? '' : 's'}` : ''}`;

  const visiveis = turmasCarregadas.filter((t) => t.status === 'ativa' || filtroEncerradas.checked || t.id === turmaId);
  listaTurmas.innerHTML = visiveis
    .map((t) => {
      const ativa = t.id === turmaId;
      const detalhes = [t.ano_letivo, `${t.alunos ?? 0} ${Number(t.alunos) === 1 ? 'aluno' : 'alunos'}`].filter(Boolean).join(' · ');
      return `<button type="button" role="radio" class="turma-opcao${t.status === 'encerrada' ? ' is-encerrada' : ''}" aria-checked="${ativa}" tabindex="${ativa ? 0 : -1}" data-turma="${t.id}">
          <span class="turma-opcao-sigla" aria-hidden="true">${escapar(siglaDe(t.nome))}</span>
          <span class="turma-opcao-texto"><strong>${escapar(t.nome)}</strong><small>${escapar(detalhes)}</small></span>
          ${t.status === 'encerrada' ? '<span class="status closed">Encerrada</span>' : ''}
          <span class="turma-opcao-marca" aria-hidden="true"></span>
        </button>`;
    })
    .join('');

  seletorTurma.innerHTML = visiveis
    .map((t) => `<option value="${t.id}">${escapar(t.nome)}${t.status === 'encerrada' ? ' (encerrada)' : ''} · ${t.alunos ?? 0} alunos</option>`)
    .join('');
  seletorTurma.value = String(turmaId);
  preencherTurmaDaImportacao();
}

listaTurmas.addEventListener('click', (evento) => {
  const opcao = evento.target.closest('[data-turma]');
  if (opcao) selecionarTurma(Number(opcao.dataset.turma));
});

// Setas do teclado entre as turmas (padrão de grupo de opções)
listaTurmas.addEventListener('keydown', (evento) => {
  const teclas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  if (!(evento.key in teclas)) return;
  const opcoes = [...listaTurmas.querySelectorAll('[data-turma]')];
  const atual = opcoes.findIndex((o) => o.getAttribute('aria-checked') === 'true');
  const proxima = opcoes[(atual + teclas[evento.key] + opcoes.length) % opcoes.length];
  if (!proxima) return;
  evento.preventDefault();
  selecionarTurma(Number(proxima.dataset.turma)).then(() => listaTurmas.querySelector(`[data-turma="${proxima.dataset.turma}"]`)?.focus());
});

async function selecionarTurma(id, { atualizarUrl = true } = {}) {
  turmaId = id;
  renderizarTurmas();
  renderizarTurmaAtiva();
  cancelarConfirmacao();
  feedbackAdicionar.hidden = true;
  if (atualizarUrl) {
    const url = new URL(location.href);
    url.searchParams.set('turma', id);
    history.replaceState(null, '', url);
  }
  await carregarAlunos();
}

function renderizarTurmaAtiva() {
  const t = turmaAtual();
  const caixa = $('[data-turma-ativa]');
  if (!t) {
    caixa.hidden = true;
    return;
  }
  caixa.hidden = false;
  const encerrada = t.status === 'encerrada';
  $('[data-turma-sigla]').textContent = siglaDe(t.nome);
  $('[data-turma-nome]').textContent = t.nome;
  $('[data-turma-detalhe]').textContent = [t.ano_letivo, t.descricao].filter(Boolean).join(' · ') || 'Sem descrição';
  const status = $('[data-turma-status]');
  status.textContent = encerrada ? 'Encerrada' : 'Ativa';
  status.classList.toggle('closed', encerrada);
  $('[data-num="alunos"]').textContent = t.alunos ?? 0;
  $('[data-num="ppm"]').textContent = t.ppm_medio ?? '—';
  $('[data-num="precisao"]').textContent = t.precisao_media != null ? `${t.precisao_media}%` : '—';
  $('[data-num="atividades"]').textContent = t.atividades ?? 0;
  $('[data-aviso-encerrada]').hidden = !encerrada;
  painelAdicionar.classList.toggle('is-bloqueado', encerrada);
  painelAdicionar.querySelectorAll('[data-form-adicionar] button, [data-form-adicionar] input, [data-form-criar-alunos] button, [data-form-criar-alunos] textarea')
    .forEach((el) => (el.disabled = encerrada));
}

async function carregarAlunos() {
  const pedido = turmaId;
  corpo.innerHTML = '<tr><td colspan="8">Carregando…</td></tr>';
  $('[data-resumo-lista]').textContent = 'Carregando…';
  try {
    const alunos = await listarAlunosDaTurma(pedido);
    const ids = alunos.map((a) => a.aluno_id);
    const [logins, niveis] = await Promise.all([loginsDosAlunos(ids), nivelamentoDosAlunos(ids)]);
    if (pedido !== turmaId) return; // o professor trocou de turma no meio do carregamento
    alunosCarregados = alunos;
    loginsEscola = logins;
    nivelamentos = niveis;
    // Mantém o número de alunos do seletor em dia
    const turma = turmaAtual();
    if (turma && Number(turma.alunos) !== alunos.length) {
      turma.alunos = alunos.length;
      renderizarTurmas();
      renderizarTurmaAtiva();
    }
    renderizarTabela();
  } catch (erro) {
    corpo.innerHTML = `<tr><td colspan="8">${escapar(erro.message)}</td></tr>`;
  }
}

// ---------- Tabela ----------

function renderizarTabela() {
  const termo = normalizarNome(busca.value);
  const filtrados = alunosCarregados.filter((a) =>
    normalizarNome(`${a.nome} ${a.email} ${a.codigo_aluno ?? ''} ${loginsEscola.get(a.aluno_id) ?? ''}`).includes(termo)
  );
  const total = alunosCarregados.length;
  $('[data-resumo-lista]').textContent = total
    ? `${total} ${total === 1 ? 'aluno' : 'alunos'} em ${turmaAtual()?.nome ?? 'nesta turma'}${termo ? ` · ${filtrados.length} na busca` : ''}`
    : 'Nenhum aluno nesta turma ainda.';
  corpo.innerHTML = filtrados.length
    ? filtrados
        .map(
          (a) => `<tr>
            <td class="table-name aluno-identidade"><strong>${escapar(a.nome)}</strong><small>${identificacao(a)}</small></td>
            <td class="mono">${a.sessoes}</td>
            <td class="mono">${a.ppm_medio ?? '—'}</td>
            <td class="mono">${a.precisao_media != null ? `${a.precisao_media}%` : '—'}</td>
            <td class="mono">${a.atividades_concluidas}</td>
            <td>${a.ultima_pratica ? new Date(a.ultima_pratica).toLocaleDateString('pt-BR') : '—'}</td>
            <td>${celulaPontoDePartida(a.aluno_id)}</td>
            <td class="row-actions">${loginsEscola.has(a.aluno_id) ? `<button type="button" class="button secondary small" data-nova-senha="${a.aluno_id}">Nova senha</button><button type="button" class="button ghost small" data-trocar-login="${a.aluno_id}">Trocar usuário</button>` : ''}<button type="button" class="button ghost small" data-remover="${a.aluno_id}">Remover</button></td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="8">${total ? 'Nenhum aluno encontrado nessa busca.' : 'Nenhum aluno nesta turma ainda. Use “Adicionar alunos à turma” acima.'}</td></tr>`;
}

function identificacao(aluno) {
  const linhas = [];
  if (loginsEscola.has(aluno.aluno_id)) linhas.push(`<span class="id-linha">Usuário <b class="mono">${escapar(loginsEscola.get(aluno.aluno_id))}</b></span>`);
  else if (aluno.email && !/@aluno\.wavetype\.com\.br$/i.test(aluno.email)) linhas.push(`<span class="id-linha">${escapar(aluno.email)}</span>`);
  if (aluno.codigo_aluno) linhas.push(`<span class="id-linha">Código <b class="mono">${escapar(aluno.codigo_aluno)}</b></span>`);
  return linhas.join('');
}

corpo.addEventListener('click', async (evento) => {
  const novaSenha = evento.target.closest('[data-nova-senha]');
  if (novaSenha) return gerarNovaSenha(novaSenha);
  const trocarLogin = evento.target.closest('[data-trocar-login]');
  if (trocarLogin) return abrirTrocaDeLogin(trocarLogin.dataset.trocarLogin);
  const botao = evento.target.closest('[data-remover]');
  if (!botao) return;
  const aluno = alunosCarregados.find((a) => a.aluno_id === botao.dataset.remover);
  if (!confirm(`Remover ${aluno?.nome ?? 'este aluno'} da turma ${turmaAtual()?.nome ?? ''}?\n\nA conta do aluno NÃO é excluída: ele só sai desta turma. Os resultados anteriores continuam salvos e você pode adicioná-lo de novo pelo código.`)) return;
  botao.disabled = true;
  try {
    await removerAlunoDaTurma(turmaId, botao.dataset.remover);
    await carregarAlunos();
  } catch (erro) {
    alert(erro.message);
    botao.disabled = false;
  }
});

// ---------- Abas de "Adicionar alunos" ----------

const abas = [...document.querySelectorAll('[role="tab"][data-aba]')];

function abrirAba(nome, { focar = false } = {}) {
  for (const aba of abas) {
    const ativa = aba.dataset.aba === nome;
    aba.setAttribute('aria-selected', String(ativa));
    aba.tabIndex = ativa ? 0 : -1;
    document.getElementById(aba.getAttribute('aria-controls')).hidden = !ativa;
    if (ativa && focar) aba.focus();
  }
}
abas.forEach((aba) => aba.addEventListener('click', () => abrirAba(aba.dataset.aba)));
$('[role="tablist"]').addEventListener('keydown', (evento) => {
  const passo = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
  if (!passo) return;
  const atual = abas.findIndex((a) => a.getAttribute('aria-selected') === 'true');
  abrirAba(abas[(atual + passo + abas.length) % abas.length].dataset.aba, { focar: true });
});

botaoImportarTopo.addEventListener('click', () => {
  abrirAba('importar');
  painelAdicionar.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------- Aluno existente (código individual) ----------

formAdicionar.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  cancelarConfirmacao();
  const codigo = String(formAdicionar.elements.aluno_id.value || '').trim().replace(/\s|-/g, '');
  if (!IDENTIFICADOR.test(codigo)) {
    return avisar(feedbackAdicionar, 'Código inválido. Ele tem 6 letras e números (ex.: K7Q2MX) e aparece em Turmas ou em Perfil, na área do aluno.', true);
  }
  const botao = formAdicionar.querySelector('button[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'Buscando…';
  try {
    const aluno = await buscarAlunoPorCodigo(turmaId, codigo);
    if (!aluno) throw new Error('Nenhum aluno encontrado com este código.');
    feedbackAdicionar.hidden = true;
    if (aluno.ja_na_turma) return avisar(feedbackAdicionar, `${aluno.nome} já está nesta turma.`);
    alunoEncontrado = { ...aluno, codigo };
    $('[data-confirmar-sigla]').textContent = siglaDe(aluno.nome);
    $('[data-confirmar-nome]').textContent = aluno.nome;
    const outras = Number(aluno.turmas_ativas);
    $('[data-confirmar-detalhe]').textContent = [
      `Código ${aluno.codigo_aluno}`,
      outras ? `participa de ${outras} ${outras === 1 ? 'outra turma' : 'outras turmas'}` : 'sem outras turmas ativas',
      aluno.matricula_inativa ? 'já esteve nesta turma (o histórico volta junto)' : null,
    ].filter(Boolean).join(' · ');
    caixaConfirmar.hidden = false;
    $('[data-confirmar-adicionar]').focus();
  } catch (erro) {
    avisar(feedbackAdicionar, erro.message, true);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Buscar aluno';
  }
});

$('[data-confirmar-adicionar]').addEventListener('click', async (evento) => {
  if (!alunoEncontrado) return;
  const botao = evento.currentTarget;
  botao.disabled = true;
  try {
    const resultado = await adicionarAlunoExistente(turmaId, alunoEncontrado.codigo);
    const mensagens = {
      adicionado: `${alunoEncontrado.nome} foi adicionado(a) à turma. O histórico e as outras turmas continuam iguais.`,
      reativado: `${alunoEncontrado.nome} voltou para a turma, com os resultados anteriores.`,
      ja_estava: `${alunoEncontrado.nome} já estava nesta turma.`,
    };
    avisar(feedbackAdicionar, mensagens[resultado] ?? 'Aluno adicionado.');
    formAdicionar.reset();
    cancelarConfirmacao();
    await carregarAlunos();
  } catch (erro) {
    avisar(feedbackAdicionar, erro.message, true);
  } finally {
    botao.disabled = false;
  }
});
$('[data-cancelar-adicionar]').addEventListener('click', cancelarConfirmacao);

function cancelarConfirmacao() {
  alunoEncontrado = null;
  caixaConfirmar.hidden = true;
}

// ---------- Criar contas (nomes digitados) ----------

const formCriar = $('[data-form-criar-alunos]');
const previa = $('[data-previa-logins]');
const feedbackCriar = $('[data-feedback-criar]');

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
  if (!nomes.length) return avisar(feedbackCriar, 'Escreva pelo menos um nome completo.', true);
  if (nomes.length > 60) return avisar(feedbackCriar, 'Crie no máximo 60 alunos por vez. Para listas maiores, use “Importar planilha”.', true);
  const jaNaTurma = new Set(alunosCarregados.map((a) => normalizarNome(a.nome)));
  const repetidos = nomes.filter((n) => jaNaTurma.has(normalizarNome(n)));
  if (repetidos.length && !confirm(`${repetidos.join(', ')} já ${repetidos.length === 1 ? 'está' : 'estão'} nesta turma. Criar outra conta mesmo assim? (Se for a mesma pessoa, cancele.)`)) return;
  if (nomes.some((n) => n.split(' ').length < 2)) {
    if (!confirm('Alguns nomes têm uma palavra só. O usuário fica mais fácil de identificar com nome e sobrenome. Criar assim mesmo?')) return;
  }
  const botao = formCriar.querySelector('[data-botao-criar]');
  botao.disabled = true;
  botao.textContent = 'Criando…';
  try {
    const criados = await criarAlunosNaTurma(turmaId, nomes);
    formCriar.reset();
    previa.hidden = true;
    mostrarCredenciais(criados, `${criados.length} ${criados.length === 1 ? 'conta criada' : 'contas criadas'}.`);
    await carregarAlunos();
  } catch (erro) {
    avisar(feedbackCriar, erro.message, true);
  } finally {
    botao.disabled = false;
    botao.textContent = 'Criar contas';
  }
});

// ---------- Importar planilha ----------

const entradaArquivo = $('[data-arquivo-planilha]');
const alvoArquivo = $('[data-arquivo-alvo]');
const turmaImportacao = $('[data-turma-importacao]');
const feedbackImportar = $('[data-feedback-importar]');
const caixaPrevia = $('[data-previa-importacao]');
let importacao = null; // { turmaId, linhas, resumo, arquivo }
let matrizDoArquivo = null;

let XLSX_CACHE = null;
async function xlsx() {
  XLSX_CACHE ??= await import('xlsx');
  return XLSX_CACHE;
}

function preencherTurmaDaImportacao() {
  const atual = turmaImportacao.value || String(turmaId);
  const ativas = turmasCarregadas.filter((t) => t.status === 'ativa');
  turmaImportacao.innerHTML = ativas.length
    ? ativas.map((t) => `<option value="${t.id}">${escapar(t.nome)}</option>`).join('')
    : '<option value="">Nenhuma turma ativa</option>';
  turmaImportacao.value = ativas.some((t) => String(t.id) === String(turmaId)) ? String(turmaId) : atual;
  if (!turmaImportacao.value && ativas[0]) turmaImportacao.value = String(ativas[0].id);
}

turmaImportacao.addEventListener('change', async () => {
  if (matrizDoArquivo) await montarPrevia();
});

$('[data-baixar-modelo]').addEventListener('click', async (evento) => {
  const botao = evento.currentTarget;
  botao.disabled = true;
  try {
    const X = await xlsx();
    const planilha = X.utils.book_new();
    const alunos = X.utils.aoa_to_sheet([['Nome completo'], ['Maria Silva Santos'], ['João Pedro Souza']]);
    alunos['!cols'] = [{ wch: 42 }];
    X.utils.book_append_sheet(planilha, alunos, 'Alunos');
    const instrucoes = X.utils.aoa_to_sheet([
      ['Como preencher'],
      ['1. Na aba "Alunos", escreva um nome completo por linha, na coluna "Nome completo".'],
      ['2. Apague os dois exemplos (Maria e João) antes de importar.'],
      ['3. Não escreva e-mail, número ou turma na coluna do nome.'],
      ['4. Salve e envie em Gestão de alunos > Importar planilha. Você confere a prévia antes de confirmar.'],
      ['5. Cada nome novo ganha um usuário da escola e uma senha, mostrados uma única vez nos cartões de acesso.'],
    ]);
    instrucoes['!cols'] = [{ wch: 100 }];
    X.utils.book_append_sheet(planilha, instrucoes, 'Instruções');
    X.writeFile(planilha, 'modelo-importar-alunos-wavetype.xlsx');
  } catch (erro) {
    avisar(feedbackImportar, `Não foi possível gerar o modelo: ${erro.message}`, true);
  } finally {
    botao.disabled = false;
  }
});

entradaArquivo.addEventListener('change', () => {
  const arquivo = entradaArquivo.files?.[0];
  if (arquivo) lerArquivo(arquivo);
});
['dragenter', 'dragover'].forEach((tipo) =>
  alvoArquivo.addEventListener(tipo, (evento) => {
    evento.preventDefault();
    alvoArquivo.classList.add('is-arrastando');
  })
);
['dragleave', 'drop'].forEach((tipo) => alvoArquivo.addEventListener(tipo, () => alvoArquivo.classList.remove('is-arrastando')));
alvoArquivo.addEventListener('drop', (evento) => {
  evento.preventDefault();
  const arquivo = evento.dataTransfer?.files?.[0];
  if (arquivo) lerArquivo(arquivo);
});

async function lerArquivo(arquivo) {
  feedbackImportar.hidden = true;
  caixaPrevia.hidden = true;
  importacao = null;
  matrizDoArquivo = null;
  const extensao = (arquivo.name.split('.').pop() || '').toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(extensao)) {
    entradaArquivo.value = '';
    return avisar(feedbackImportar, 'Formato não aceito. Envie uma planilha .xlsx, .xls ou .csv.', true);
  }
  if (arquivo.size > 5 * 1024 * 1024) {
    entradaArquivo.value = '';
    return avisar(feedbackImportar, 'Arquivo muito grande (máximo de 5 MB). Deixe só a lista de nomes e tente de novo.', true);
  }
  $('[data-arquivo-nome]').textContent = `Lendo ${arquivo.name}…`;
  try {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    if (extensao === 'csv') {
      matrizDoArquivo = lerCsv(decodificarCsv(bytes));
    } else {
      const X = await xlsx();
      const planilha = X.read(bytes, { type: 'array', cellDates: true });
      const aba = planilha.Sheets[planilha.SheetNames[0]];
      matrizDoArquivo = X.utils.sheet_to_json(aba, { header: 1, blankrows: false, defval: '', raw: false });
    }
    $('[data-arquivo-nome]').textContent = arquivo.name;
    await montarPrevia();
  } catch (erro) {
    console.error(erro);
    $('[data-arquivo-nome]').textContent = 'Clique para escolher ou arraste a planilha aqui';
    entradaArquivo.value = '';
    avisar(feedbackImportar, 'Não foi possível ler este arquivo. Confira se ele abre no Excel e se não tem senha.', true);
  }
}

async function montarPrevia() {
  const destino = Number(turmaImportacao.value);
  if (!destino) return avisar(feedbackImportar, 'Não há turma ativa para receber os alunos. Reabra ou crie uma turma.', true);
  // Nomes que já estão na turma de destino (pode não ser a turma da lista)
  const existentes = destino === turmaId ? alunosCarregados : await listarAlunosDaTurma(destino);
  const { linhas, resumo } = prepararImportacao(matrizDoArquivo, existentes.map((a) => a.nome));
  if (!linhas.length) {
    caixaPrevia.hidden = true;
    return avisar(feedbackImportar, 'Não encontramos nomes nesta planilha. Use a coluna “Nome completo” do modelo.', true);
  }
  importacao = { turmaId: destino, linhas, resumo };
  feedbackImportar.hidden = true;
  const turmaNome = turmasCarregadas.find((t) => t.id === destino)?.nome ?? '';
  const excedente = resumo.acimaDoLimite;
  $('[data-resumo-importacao]').innerHTML = `
    <div><strong>${resumo.novos - excedente}</strong><span>${resumo.novos - excedente === 1 ? 'aluno novo' : 'alunos novos'}</span></div>
    <div class="is-neutro"><strong>${resumo.jaNaTurma}</strong><span>já na turma</span></div>
    <div class="is-neutro"><strong>${resumo.repetidos}</strong><span>repetidos</span></div>
    <div class="${resumo.invalidos ? 'is-erro' : 'is-neutro'}"><strong>${resumo.invalidos}</strong><span>com erro</span></div>
    <p>Destino: <strong>${escapar(turmaNome)}</strong>. Só os alunos novos são importados; os demais aparecem para conferência.${
      excedente ? ` <strong>Limite de ${MAX_ALUNOS_IMPORTACAO} por importação:</strong> ${excedente} ficam para um próximo envio.` : ''
    }</p>`;
  const rotulos = { novo: 'Novo', ja_na_turma: 'Já na turma', repetido: 'Repetido', invalido: 'Erro' };
  $('[data-linhas-importacao]').innerHTML = linhas
    .map((l) => `<tr class="importar-${l.situacao}"><td class="mono">${l.linha}</td><td>${escapar(l.nome)}</td>
      <td><span class="situacao situacao-${l.situacao}">${rotulos[l.situacao]}</span>${l.motivo ? `<small>${escapar(l.motivo)}</small>` : ''}</td></tr>`)
    .join('');
  const botao = $('[data-confirmar-importacao]');
  const quantos = resumo.novos - excedente;
  botao.disabled = quantos === 0;
  botao.textContent = quantos ? `Importar ${quantos} ${quantos === 1 ? 'aluno' : 'alunos'}` : 'Nada novo para importar';
  caixaPrevia.hidden = false;
}

$('[data-cancelar-importacao]').addEventListener('click', limparImportacao);

function limparImportacao() {
  importacao = null;
  matrizDoArquivo = null;
  entradaArquivo.value = '';
  caixaPrevia.hidden = true;
  $('[data-arquivo-nome]').textContent = 'Clique para escolher ou arraste a planilha aqui';
}

$('[data-confirmar-importacao]').addEventListener('click', async (evento) => {
  if (!importacao) return;
  const nomes = importacao.linhas.filter((l) => l.situacao === 'novo').map((l) => l.nome).slice(0, MAX_ALUNOS_IMPORTACAO);
  const destino = importacao.turmaId;
  const turmaNome = turmasCarregadas.find((t) => t.id === destino)?.nome ?? '';
  if (!confirm(`Criar ${nomes.length} ${nomes.length === 1 ? 'conta de aluno' : 'contas de aluno'} na turma “${turmaNome}”?`)) return;
  const botao = evento.currentTarget;
  botao.disabled = true;
  const resumoAntes = importacao.resumo;
  try {
    const { criados, ignorados } = await importarAlunosNaTurma(destino, nomes, {
      aoProgredir: (feitos, total) => (botao.textContent = `Importando… ${feitos}/${total}`),
    });
    limparImportacao();
    const partes = [`${criados.length} ${criados.length === 1 ? 'aluno importado' : 'alunos importados'} para ${turmaNome}`];
    const fora = resumoAntes.jaNaTurma + resumoAntes.repetidos + ignorados.length;
    if (fora) partes.push(`${fora} já estava${fora === 1 ? '' : 'm'} na turma ou repetido${fora === 1 ? '' : 's'}`);
    if (resumoAntes.invalidos) partes.push(`${resumoAntes.invalidos} com erro (não importado${resumoAntes.invalidos === 1 ? '' : 's'})`);
    avisar(feedbackImportar, `${partes.join(' · ')}.`, false);
    if (criados.length) mostrarCredenciais(criados, `${criados.length} ${criados.length === 1 ? 'conta criada' : 'contas criadas'} pela planilha.`, turmaNome);
    turmasCarregadas = await listarMinhasTurmas();
    if (destino !== turmaId) await selecionarTurma(destino);
    else {
      renderizarTurmas();
      renderizarTurmaAtiva();
      await carregarAlunos();
    }
  } catch (erro) {
    const ja = erro.criadosAntes?.length ?? 0;
    avisar(feedbackImportar, `${erro.message}${ja ? ` (${ja} contas foram criadas antes do erro; elas já estão na turma.)` : ''}`, true);
    if (ja) {
      mostrarCredenciais(erro.criadosAntes, `${ja} contas criadas antes do erro.`, turmaNome);
      await carregarAlunos();
    }
  } finally {
    botao.disabled = false;
    if (importacao) await montarPrevia();
  }
});

// ---------- Exportar ----------

const opcoesExportar = menuExportar.querySelector('.menu-exportar-opcoes');
opcoesExportar.addEventListener('click', async (evento) => {
  const opcao = evento.target.closest('[data-exportar]');
  if (!opcao) return;
  menuExportar.open = false;
  const turma = turmaAtual();
  if (!alunosCarregados.length) return alert('Esta turma ainda não tem alunos para exportar.');
  const linhas = linhasDaExportacao(alunosCarregados, { logins: loginsEscola, pontoDePartida: textoPontoDePartida });
  const arquivo = nomeDoArquivo(turma?.nome);
  try {
    if (opcao.dataset.exportar === 'pdf') {
      await baixarPdfTabela({
        titulo: `Alunos da turma ${turma?.nome ?? ''}`.trim(),
        subtitulo: [turma?.ano_letivo, `${alunosCarregados.length} ${alunosCarregados.length === 1 ? 'aluno' : 'alunos'}`].filter(Boolean).join(' · '),
        colunas: ['Nome', 'Código', 'Usuário da escola', 'Sessões', 'WPM médio', 'Precisão média', 'Atividades', 'Última prática'],
        linhas: linhas.slice(1).map((l) => [l[0], l[1], l[2], l[5], l[6] === '' ? '—' : String(l[6]).replace('.', ','), l[7] === '' ? '—' : `${String(l[7]).replace('.', ',')}%`, l[8], l[9] || '—']),
        arquivo,
        paisagem: true,
      });
    } else if (opcao.dataset.exportar === 'csv') {
      baixar(new Blob([gerarCsv(linhas)], { type: 'text/csv;charset=utf-8' }), `${arquivo}.csv`);
    } else {
      const X = await xlsx();
      const planilha = X.utils.book_new();
      // Células de texto ficam como texto (tipo "s"): nada vira fórmula no Excel.
      const aba = X.utils.aoa_to_sheet(linhas);
      aba['!cols'] = [{ wch: 34 }, { wch: 14 }, { wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 9 }, { wch: 11 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 22 }];
      aba['!autofilter'] = { ref: `A1:K${linhas.length}` };
      X.utils.book_append_sheet(planilha, aba, 'Alunos');
      X.writeFile(planilha, `${arquivo}.xlsx`);
    }
  } catch (erro) {
    alert(`Não foi possível exportar: ${erro.message}`);
  }
});
// O cabeçalho recorta o que passa da borda (overflow: hidden e animação com
// transform): enquanto aberto, o menu vai para o <body>, em posição fixa logo
// abaixo do botão, e volta para o lugar ao fechar.
function posicionarMenuExportar() {
  const botao = menuExportar.querySelector('summary').getBoundingClientRect();
  const largura = opcoesExportar.offsetWidth || 270;
  opcoesExportar.style.top = `${Math.round(botao.bottom + 6)}px`;
  opcoesExportar.style.left = `${Math.round(Math.max(8, Math.min(botao.right - largura, innerWidth - largura - 8)))}px`;
}
menuExportar.addEventListener('toggle', () => {
  if (menuExportar.open) {
    opcoesExportar.classList.add('is-flutuante');
    document.body.append(opcoesExportar);
    posicionarMenuExportar();
    opcoesExportar.querySelector('button')?.focus();
  } else {
    opcoesExportar.classList.remove('is-flutuante');
    menuExportar.append(opcoesExportar);
  }
});
addEventListener('resize', () => menuExportar.open && posicionarMenuExportar());
addEventListener('scroll', () => menuExportar.open && posicionarMenuExportar(), { passive: true });
document.addEventListener('click', (evento) => {
  if (menuExportar.open && !menuExportar.contains(evento.target) && !opcoesExportar.contains(evento.target)) menuExportar.open = false;
});
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && menuExportar.open) {
    menuExportar.open = false;
    $('[data-botao-exportar]').focus();
  }
});

function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Senhas e cartões de acesso ----------

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

const painelCredenciais = $('[data-credenciais]');
const areaCartoes = $('[data-cartoes]');
let contasNaTela = [];
ligarCopiar(areaCartoes, () => contasNaTela);

let turmaDasContas = { id: null, nome: '' };

function mostrarCredenciais(contas, titulo, turma = turmaAtual()?.nome ?? '') {
  contasNaTela = contas;
  turmaDasContas = { id: turmasCarregadas.find((t) => t.nome === turma)?.id ?? turmaId, nome: turma };
  areaCartoes.innerHTML = htmlDosCartoes(contas, { turma });
  $('#titulo-credenciais').textContent = titulo;
  painelCredenciais.hidden = false;
  painelCredenciais.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('[data-imprimir-cartoes]').addEventListener('click', () => imprimirCartoes(areaCartoes));
$('[data-pdf-criados]').addEventListener('click', async (evento) => {
  const botao = evento.currentTarget;
  botao.disabled = true;
  try {
    // Códigos individuais vêm do banco (alunos_da_turma, só para o professor da turma).
    const alunos = turmaDasContas.id ? await listarAlunosDaTurma(turmaDasContas.id) : alunosCarregados;
    const codigos = new Map(alunos.map((a) => [a.aluno_id, a.codigo_aluno]));
    await exportarPdfDosAlunos(contasNaTela, { turma: turmaDasContas.nome, codigos });
  } catch (erro) {
    alert(`Não foi possível gerar o PDF: ${erro.message}`);
  } finally {
    botao.disabled = false;
  }
});
$('[data-fechar-credenciais]').addEventListener('click', () => {
  if (!confirm('Fechar? As senhas não aparecem de novo (dá para gerar novas na lista).')) return;
  areaCartoes.innerHTML = '';
  contasNaTela = [];
  painelCredenciais.hidden = true;
});

// ---------- Ponto de partida (teste de nivelamento) ----------

function textoPontoDePartida(alunoId) {
  const nivel = nivelamentos.niveis.get(alunoId);
  if (!nivel) return '';
  return `${NIVEIS_RECOMENDADOS[nivel.nivel]?.rotulo ?? nivel.nivel} (nível ${nivel.licao_nivel}, lição ${nivel.licao_ordem})`;
}

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

// ---------- Trocar o usuário da escola ----------

const dialogo = $('[data-dialogo-login]');
const formLogin = $('[data-form-trocar-login]');
const previaLogin = $('[data-previa-trocar-login]');
const feedbackLogin = $('[data-feedback-trocar-login]');
let alunoDaTroca = null;

function abrirTrocaDeLogin(alunoId) {
  alunoDaTroca = alunosCarregados.find((a) => a.aluno_id === alunoId) ?? null;
  if (!alunoDaTroca) return;
  const atual = loginsEscola.get(alunoId) ?? '';
  $('[data-texto-trocar-login]').textContent =
    `${alunoDaTroca.nome} entra hoje como “${atual}”. O progresso e a senha continuam os mesmos; só muda o que é digitado para entrar.`;
  formLogin.elements.login.value = atual;
  previaLogin.textContent = '';
  feedbackLogin.hidden = true;
  dialogo.showModal();
  formLogin.elements.login.select();
}

formLogin.elements.login.addEventListener('input', () => {
  const login = normalizarLoginEscolhido(formLogin.elements.login.value);
  previaLogin.textContent = login ? `Vai ficar: ${login} (se já existir, ganha um número no fim).` : 'Use pelo menos 3 letras ou números.';
});
$('[data-cancelar-login]').addEventListener('click', () => dialogo.close());

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const login = normalizarLoginEscolhido(formLogin.elements.login.value);
  if (!login) {
    feedbackLogin.textContent = 'Usuário inválido. Use letras, números e pontos (ex.: maria.silva).';
    feedbackLogin.hidden = false;
    return;
  }
  const botao = formLogin.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    const final = await alterarLoginDoAluno(alunoDaTroca.aluno_id, login);
    dialogo.close();
    await carregarAlunos();
    alert(`Pronto! ${alunoDaTroca.nome} agora entra como “${final}”, com a mesma senha.`);
  } catch (erro) {
    feedbackLogin.textContent = erro.message;
    feedbackLogin.hidden = false;
  } finally {
    botao.disabled = false;
  }
});

// ---------- Utilitários ----------

function avisar(elemento, mensagem, erro = false) {
  elemento.textContent = mensagem;
  elemento.hidden = false;
  elemento.classList.toggle('is-erro', erro);
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
