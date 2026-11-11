// js/pages/professor-atividade.js
// Resultados de uma atividade: visão da turma (todos os alunos, com ou sem
// tentativa) e análise individual (o que o aluno digitou, onde errou,
// tempo, precisão e métricas). Só o autor da atividade acessa
// (entregas_da_atividade / tentativas_do_aluno conferem no banco).
import { exigirPapel } from '../auth.js';
import { listarAtividadesDoProfessor, entregasDaAtividade, tentativasDoAluno } from '../api/exercicios.js';
import { analisarTentativa, teclasMaisErradas } from '../analise/tentativa.js';
import { formatarTempo } from '../regras.js';
import { baixarPdfTabela } from '../ui/pdf.js';
import { nomeDoArquivo } from '../contas/planilha.js';

const $ = (s) => document.querySelector(s);
const parametros = new URLSearchParams(location.search);
const atividadeId = Number(parametros.get('id'));
const DIFICULDADES = { facil: 'Fácil', medio: 'Médio', avancado: 'Avançado' };
const SITUACAO_PALAVRA = {
  certa: 'Certa',
  corrigida: 'Corrigida (errou e apagou)',
  errada: 'Com erro',
  nao_digitada: 'Não digitada',
};

let atividade = null;
let entregas = [];
let filtro = 'todos';
let alunoAberto = null;

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('professor');
  if (!perfil) return;
  if (!atividadeId) return falhar('Atividade não informada.');
  try {
    const [todas, lista] = await Promise.all([listarAtividadesDoProfessor(), entregasDaAtividade(atividadeId)]);
    atividade = todas.find((a) => a.id === atividadeId);
    if (!atividade) return falhar('Atividade não encontrada.');
    entregas = lista;
  } catch (erro) {
    return falhar(erro.message);
  }
  mostrarCabecalho();
  renderizarLista();
  document.querySelectorAll('[data-exportar-entregas]').forEach((b) => (b.disabled = !entregas.length));
  const pedido = parametros.get('aluno');
  if (pedido && entregas.some((e) => e.aluno_id === pedido)) abrirAluno(pedido);
}

function falhar(mensagem) {
  $('[data-atividade-titulo]').textContent = 'Atividade indisponível';
  $('[data-atividade-info]').textContent = mensagem;
  $('[data-lista-entregas]').innerHTML = `<li class="entrega-vazia">${escapar(mensagem)} <a href="exercicios.html">Voltar às atividades</a></li>`;
}

function mostrarCabecalho() {
  document.title = `${atividade.titulo} | Resultados | WaveType`;
  $('[data-atividade-titulo]').textContent = atividade.titulo;
  const turmas = atividade.turmas.map((t) => t.nome).join(', ') || 'Sem turma';
  $('[data-atividade-info]').textContent = [
    turmas,
    DIFICULDADES[atividade.nivel],
    atividade.tempo_limite_seg ? `tempo máximo ${formatarTempo(atividade.tempo_limite_seg)}` : null,
    atividade.meta_precisao != null ? `precisão mínima ${numero(atividade.meta_precisao)}%` : null,
    atividade.prazo ? `prazo ${data(atividade.prazo)}` : null,
  ].filter(Boolean).join(' · ');
  $('[data-texto-atividade]').textContent = atividade.texto_referencia ?? '';

  const tentaram = entregas.filter((e) => Number(e.tentativas) > 0);
  const concluiram = entregas.filter((e) => e.concluida);
  $('[data-m="alunos"]').textContent = entregas.length;
  $('[data-m="turmas"]').textContent = turmas;
  $('[data-m="concluiram"]').textContent = concluiram.length;
  $('[data-m="tentaram"]').textContent = `${tentaram.length} tentaram · ${entregas.length - tentaram.length} sem tentativa`;
  $('[data-m="precisao"]').textContent = tentaram.length ? `${numero(media(tentaram.map((e) => e.melhor_precisao)))}%` : '—';
  $('[data-m="ppm"]').textContent = tentaram.length ? numero(media(tentaram.map((e) => e.melhor_ppm))) : '—';
}

// ---------- Lista de alunos ----------

function situacaoDaEntrega(e) {
  if (e.concluida) return { chave: 'concluiram', rotulo: 'Concluiu', classe: '' };
  if (Number(e.tentativas) > 0) return { chave: 'nao_concluiram', rotulo: 'Não concluiu', classe: 'atrasada' };
  return { chave: 'pendentes', rotulo: 'Sem tentativa', classe: 'closed' };
}

function renderizarLista() {
  const termo = normalizar($('[data-busca-entregas]').value);
  const visiveis = entregas.filter((e) => (filtro === 'todos' || situacaoDaEntrega(e).chave === filtro) && normalizar(e.nome).includes(termo));
  $('[data-lista-entregas]').innerHTML = visiveis.length
    ? visiveis
        .map((e) => {
          const s = situacaoDaEntrega(e);
          const numeros = Number(e.tentativas) > 0
            ? `${numero(e.melhor_ppm)} WPM · ${numero(e.melhor_precisao)}% · ${e.tentativas} tentativa${Number(e.tentativas) === 1 ? '' : 's'}`
            : 'Ainda não fez';
          return `<li><button type="button" class="entrega" data-aluno="${e.aluno_id}" aria-pressed="${e.aluno_id === alunoAberto}" ${Number(e.tentativas) ? '' : 'data-sem-tentativa'}>
              <span class="entrega-nome"><strong>${escapar(e.nome)}</strong><small>${escapar(numeros)}</small></span>
              <span class="status ${s.classe}">${s.rotulo}</span>
            </button></li>`;
        })
        .join('')
    : `<li class="entrega-vazia">${entregas.length ? 'Nenhum aluno neste filtro.' : 'Nenhum aluno nas turmas desta atividade ainda.'}</li>`;
}

$('[data-filtro-entregas]').addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-filtro]');
  if (!botao) return;
  filtro = botao.dataset.filtro;
  document.querySelectorAll('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
  renderizarLista();
});
$('[data-busca-entregas]').addEventListener('input', renderizarLista);
$('[data-lista-entregas]').addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-aluno]');
  if (botao) abrirAluno(botao.dataset.aluno, { rolar: true });
});

// ---------- Análise individual ----------

const painel = $('[data-detalhe-aluno]');
let tentativasAbertas = [];

async function abrirAluno(alunoId, { rolar = false } = {}) {
  alunoAberto = alunoId;
  renderizarLista();
  const entrega = entregas.find((e) => e.aluno_id === alunoId);
  const url = new URL(location.href);
  url.searchParams.set('aluno', alunoId);
  history.replaceState(null, '', url);
  if (!Number(entrega?.tentativas)) {
    painel.innerHTML = `<div class="analise-vazio"><strong>${escapar(entrega?.nome)}</strong><p>Ainda não fez esta atividade. Quando fizer, você verá aqui o que foi digitado e cada erro.</p></div>`;
    return;
  }
  painel.innerHTML = '<div class="analise-vazio"><p>Carregando tentativas…</p></div>';
  try {
    tentativasAbertas = await tentativasDoAluno(atividadeId, alunoId);
  } catch (erro) {
    painel.innerHTML = `<div class="analise-vazio"><p>${escapar(erro.message)}</p></div>`;
    return;
  }
  if (alunoAberto !== alunoId) return;
  mostrarTentativa(entrega, 0);
  if (rolar && matchMedia('(max-width: 980px)').matches) painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function mostrarTentativa(entrega, indice) {
  const t = tentativasAbertas[indice];
  if (!t) return;
  const seletor = tentativasAbertas.length > 1
    ? `<div class="tentativas-chips" role="group" aria-label="Tentativas">${tentativasAbertas
        .map((x, i) => `<button type="button" data-tentativa="${i}" aria-pressed="${i === indice}">${i === 0 ? 'Mais recente' : `${tentativasAbertas.length - i}ª`} · ${data(x.criado_em)}${x.concluido ? ' ✓' : ''}</button>`)
        .join('')}</div>`
    : '';

  const d = t.detalhes;
  const metricas = [
    ['WPM', numero(t.ppm)],
    ['Precisão', `${numero(t.precisao)}%`],
    ['Tempo', `${formatarTempo(t.tempo_seg)}${t.tempo_limite_seg ? ` de ${formatarTempo(t.tempo_limite_seg)}` : ''}`],
    ['Erros', t.erros],
    ['Teclas certas', t.acertos],
    d ? ['Erros apagados', d.erros_corrigidos ?? 0] : null,
    d?.ppm_bruto != null ? ['WPM bruto', numero(d.ppm_bruto)] : null,
    d?.consistencia != null ? ['Consistência', `${numero(d.consistencia)}%`] : null,
  ].filter(Boolean);

  const situacao = t.concluido
    ? '<span class="status">Concluiu</span>'
    : `<span class="status atrasada">Não concluiu</span><small>${t.concluiu_texto === false ? 'O tempo acabou antes do fim do texto.' : atividade.meta_precisao != null && Number(t.precisao) < Number(atividade.meta_precisao) ? `Precisão abaixo de ${numero(atividade.meta_precisao)}%.` : ''}</small>`;

  let corpo;
  if (!d) {
    corpo = `<p class="analise-aviso">Esta tentativa foi feita antes de o WaveType guardar o texto digitado. Aparecem só os números acima; as próximas tentativas virão com cada erro detalhado.</p>`;
  } else {
    const analise = analisarTentativa(atividade.texto_referencia, d.palavras);
    const r = analise.resumo;
    const teclas = teclasMaisErradas(d.erros_por_tecla);
    corpo = `
      <h3>Texto com os erros marcados</h3>
      <p class="legenda-analise"><span class="pl certa">certa</span><span class="pl corrigida">errou e corrigiu</span><span class="pl errada">com erro</span><span class="pl nao_digitada">não digitou</span></p>
      <div class="texto-analisado mono" data-texto-analisado>${analise.palavras.map(htmlDaPalavra).join(' ')}</div>
      <p class="analise-resumo">${r.certas} de ${r.totalPalavras} palavras certas · ${r.erradas} com erro · ${r.corrigidas} corrigidas · ${r.naoDigitadas} não digitadas · ${r.letrasTrocadas} letras trocadas, ${r.letrasFaltando} faltando, ${r.letrasSobrando} a mais</p>
      <h3>Erros encontrados (${analise.erros.length})</h3>
      ${analise.erros.length
        ? `<div class="table-wrap"><table class="data-table tabela-erros"><thead><tr><th>Palavra nº</th><th>Esperado</th><th>Digitado</th><th>Tipo</th><th>Onde</th></tr></thead><tbody>${analise.erros
            .map((e) => `<tr><td class="mono" data-label="Palavra nº">${e.posicao}</td><td class="mono" data-label="Esperado">${escapar(e.esperado)}</td><td class="mono erro-digitado" data-label="Digitado">${escapar(e.digitado) || '—'}</td><td data-label="Tipo">${escapar(e.tipo)}</td><td data-label="Onde"><small>${escapar(e.letras.join('; '))}</small></td></tr>`)
            .join('')}</tbody></table></div>`
        : '<p class="analise-aviso">Nenhum erro no texto final.</p>'}
      ${teclas.length ? `<h3>Teclas que mais erraram</h3><ul class="teclas-erradas">${teclas.map(([k, n]) => `<li><kbd>${escapar(k)}</kbd><span>${n} erro${n === 1 ? '' : 's'}</span></li>`).join('')}</ul>` : ''}
      ${d.modo_erros ? `<p class="analise-nota">Modo de erros: ${d.modo_erros === 'correcao' ? 'corrigir antes de avançar' : 'seguir mesmo com erro'}.</p>` : ''}`;
  }

  painel.innerHTML = `
    <div class="analise-cabecalho"><div><span class="eyebrow">Análise individual</span><h2>${escapar(entrega.nome)}</h2><p>${escapar([entrega.turma_nome, entrega.codigo_aluno ? `código ${entrega.codigo_aluno}` : null].filter(Boolean).join(' · '))}</p></div><div class="analise-situacao">${situacao}</div></div>
    ${seletor}
    <dl class="analise-metricas">${metricas.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapar(String(v))}</dd></div>`).join('')}</dl>
    ${corpo}`;
}

function htmlDaPalavra(p) {
  const titulo = p.situacao === 'errada'
    ? `Esperado “${p.esperado}”, digitou “${p.digitado}”`
    : p.situacao === 'corrigida'
      ? `Errou ${p.errosCometidos} vez${p.errosCometidos === 1 ? '' : 'es'} e corrigiu`
      : SITUACAO_PALAVRA[p.situacao];
  if (p.situacao !== 'errada') {
    return `<span class="pl ${p.situacao}" title="${escapar(titulo)}">${escapar(p.esperado)}</span>`;
  }
  const letras = p.letras
    .map((l) => {
      if (l.estado === 'ok') return escapar(l.esperado);
      if (l.estado === 'trocada') return `<span class="lt trocada" title="Esperado “${escapar(l.esperado)}”">${escapar(l.digitado)}</span>`;
      if (l.estado === 'faltou') return `<span class="lt faltou" title="Faltou">${escapar(l.esperado)}</span>`;
      return `<span class="lt sobrou" title="A mais">${escapar(l.digitado)}</span>`;
    })
    .join('');
  return `<span class="pl errada" title="${escapar(titulo)}">${letras}</span>`;
}

painel.addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-tentativa]');
  if (!botao) return;
  mostrarTentativa(entregas.find((e) => e.aluno_id === alunoAberto), Number(botao.dataset.tentativa));
});

// ---------- Exportação da visão da turma ----------

document.querySelectorAll('[data-exportar-entregas]').forEach((botao) =>
  botao.addEventListener('click', async () => {
    const cabecalho = ['Aluno', 'Código', 'Turma', 'Situação', 'Tentativas', 'Melhor WPM', 'Melhor precisão (%)', 'Menor tempo', 'Erros (média)', 'Última tentativa'];
    const linhas = entregas.map((e) => [
      e.nome, e.codigo_aluno ?? '', e.turma_nome ?? '', situacaoDaEntrega(e).rotulo, Number(e.tentativas),
      e.melhor_ppm == null ? '' : Number(e.melhor_ppm), e.melhor_precisao == null ? '' : Number(e.melhor_precisao),
      e.menor_tempo == null ? '' : formatarTempo(e.menor_tempo), e.media_erros == null ? '' : Number(e.media_erros),
      e.ultima_tentativa ? data(e.ultima_tentativa) : '',
    ]);
    const arquivo = nomeDoArquivo(`resultados ${atividade.titulo}`).replace(/^alunos-/, '');
    botao.disabled = true;
    try {
      if (botao.dataset.exportarEntregas === 'pdf') {
        await baixarPdfTabela({
          titulo: `Resultados: ${atividade.titulo}`,
          subtitulo: $('[data-atividade-info]').textContent,
          resumo: [`${entregas.filter((e) => e.concluida).length} de ${entregas.length} alunos concluíram.`],
          colunas: cabecalho,
          linhas: linhas.map((l) => l.map((v) => (typeof v === 'number' ? numero(v) : v))),
          arquivo,
          paisagem: true,
        });
      } else {
        const X = await import('xlsx');
        const planilha = X.utils.book_new();
        X.utils.book_append_sheet(planilha, X.utils.aoa_to_sheet([cabecalho, ...linhas]), 'Resultados');
        X.writeFile(planilha, `${arquivo}.xlsx`);
      }
    } catch (erro) {
      alert(`Não foi possível exportar: ${erro.message}`);
    } finally {
      botao.disabled = false;
    }
  })
);

// ---------- Utilitários ----------

function media(valores) {
  const numeros = valores.map(Number).filter((v) => Number.isFinite(v));
  return numeros.length ? numeros.reduce((a, b) => a + b, 0) / numeros.length : 0;
}
function numero(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
function data(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function normalizar(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML.replace(/"/g, '&quot;');
}
