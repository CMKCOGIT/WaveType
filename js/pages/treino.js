// js/pages/treino.js
// Tela de digitação da área logada (usuário e aluno).
//   treinar.html            -> prática livre
//   treinar.html?id=ID      -> exercício da trilha ou atividade de professor
//   treinar.html?id=ID&turma=TURMA -> atividade, registrada na turma indicada
// O motor do teste é o js/script.js; este módulo carrega o exercício,
// salva o resultado e explica se ele concluiu ou não.
import { exigirPapel } from '../auth.js';
import { registrarResultado } from '../api/resultados.js';
import { buscarExercicio, listarExercicios } from '../api/exercicios.js';
import { modosDeErroDasTurmas } from '../api/turmas.js';
import { NIVEIS } from '../exercicios-dados.js';
import { PRECISAO_MINIMA_TRILHA, resultadoConcluiu, motivoNaoConcluiu, formatarTempo } from '../regras.js';
import { avisarConquistas } from '../ui/toast-conquista.js';
import { sugestaoDuranteTreino } from '../nivelamento/avaliacao.js';
import { licaoRecomendada, registrarDecisaoDeSugestao } from '../api/nivelamento.js';

export function iniciarTreino(papel) {
  const parametros = new URLSearchParams(location.search);
  const idDoExercicio = parametros.get('id');
  const turmaDaUrl = Number(parametros.get('turma')) || null;
  let exercicio = null;

  const pronto = (async () => {
    const perfil = await exigirPapel(papel); // redireciona se não puder estar aqui
    if (!perfil || !idDoExercicio) return perfil;
    exercicio = await carregarExercicio(idDoExercicio, turmaDaUrl);
    return perfil;
  })();

  // Escuta desde já, para não perder nenhum resultado.
  document.addEventListener('wavetype:resultado', async (evento) => {
    const aviso = prepararAviso();
    const perfil = await pronto;
    if (!perfil) return;

    try {
      const { resultado, novasConquistas } = await registrarResultado({
        ...evento.detail,
        exercicio_id: exercicio?.id ?? null,
        turma_id: exercicio?.atividade ? turmaDaUrl : null,
      });
      definirTexto('[data-salvo]', 'Resultado salvo no seu histórico.');
      await explicarResultado(aviso, exercicio, resultado);
      avisarConquistas(novasConquistas);
      sugerirSeDificil(aviso, exercicio, Number(resultado.precisao)).catch((erro) => console.warn('Sugestão indisponível:', erro));
    } catch (erro) {
      console.error('Falha ao salvar o resultado:', erro);
      definirTexto('[data-salvo]', 'Não foi possível salvar este resultado.');
      preencherAviso(aviso, {
        tipo: 'erro',
        texto: erro.message || 'Não foi possível salvar este resultado. Verifique sua conexão e tente novamente.',
        acoes: [{ texto: 'Voltar aos exercícios', href: 'exercicios.html' }],
      });
    }
  });
}

async function carregarExercicio(id, turmaId = null) {
  const info = document.querySelector('[data-exercicio-info]');
  let exercicio = null;
  try {
    exercicio = await buscarExercicio(id);
  } catch (erro) {
    console.error('Falha ao buscar o exercício:', erro);
  }
  if (!exercicio) {
    info.hidden = false;
    info.innerHTML = 'Não encontramos esse exercício. <a href="exercicios.html">Escolher outro</a>.';
    return null;
  }

  if (exercicio.atividade) {
    definirTexto('[data-treino-eyebrow]', 'Atividade da turma');
    definirTexto('[data-treino-titulo]', exercicio.titulo);
    const partes = [];
    if (exercicio.instrucoes) partes.push(exercicio.instrucoes);
    if (exercicio.tempo_limite_seg) partes.push(`Tempo máximo: ${formatarTempo(exercicio.tempo_limite_seg)}.`);
    if (exercicio.meta_precisao != null) partes.push(`Precisão mínima: ${formatar(exercicio.meta_precisao)}%.`);
    if (exercicio.prazo) partes.push(`Prazo: ${new Date(exercicio.prazo).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`);
    definirTexto('[data-treino-descricao]', partes.join(' ') || 'Digite o texto abaixo. Seu resultado vai para o professor.');
  } else {
    const nivel = NIVEIS.find((n) => n.nivel === exercicio.nivel);
    definirTexto('[data-treino-eyebrow]', `Nível ${exercicio.nivel}${nivel ? ` · ${nivel.titulo}` : ''} · exercício ${exercicio.ordem}`);
    definirTexto('[data-treino-titulo]', exercicio.titulo);
    definirTexto(
      '[data-treino-descricao]',
      `Para concluir: termine o texto em até ${formatarTempo(exercicio.tempo_limite_seg)} com precisão acima de ${PRECISAO_MINIMA_TRILHA}%. O tempo começa na primeira tecla.`
    );
  }

  info.hidden = false;
  info.innerHTML = '';
  info.append(Object.assign(document.createElement('a'), { href: 'exercicios.html', textContent: '← Trocar exercício' }));

  // Atividade da turma: o professor pode ter definido o modo de erros.
  if (exercicio.atividade && turmaId) {
    exercicio.modo_erros_turma = (await modosDeErroDasTurmas([turmaId])).get(turmaId) ?? null;
  }

  // Entrega o exercício para o motor do teste (js/script.js).
  window.wavetypeExercicio = exercicio;
  document.dispatchEvent(new CustomEvent('wavetype:exercicio', { detail: exercicio }));
  return exercicio;
}

async function explicarResultado(aviso, exercicio, resultado) {
  const precisao = formatar(resultado.precisao);

  if (!exercicio) {
    return preencherAviso(aviso, { tipo: 'sucesso', texto: 'Prática livre registrada no seu histórico.' });
  }

  if (exercicio.atividade) {
    const concluiu = resultadoConcluiu(resultado);
    return preencherAviso(aviso, {
      tipo: concluiu ? 'sucesso' : 'erro',
      texto: concluiu
        ? `Atividade concluída em ${formatarTempo(resultado.tempo_seg)} com ${precisao}% de precisão e enviada ao professor.`
        : `${motivoNaoConcluiu(resultado, exercicio)} Seu resultado foi enviado, mas a atividade ainda não conta como concluída. Tente novamente.`,
      acoes: [
        ...(concluiu ? [] : [{ texto: 'Tentar novamente', recomecar: true }]),
        { texto: 'Voltar às atividades', href: 'exercicios.html#atividades', secundario: !concluiu },
      ],
    });
  }

  const concluiu = resultadoConcluiu(resultado);
  if (!concluiu) {
    return preencherAviso(aviso, {
      tipo: 'erro',
      texto: `${motivoNaoConcluiu(resultado, exercicio)} Respire e tente novamente.`,
      acoes: [
        { texto: 'Tentar novamente', recomecar: true },
        { texto: 'Voltar aos exercícios', href: 'exercicios.html', secundario: true },
      ],
    });
  }

  const destino = await descobrirProximo(exercicio);
  preencherAviso(aviso, {
    tipo: 'sucesso',
    texto: `Exercício concluído em ${formatarTempo(resultado.tempo_seg)} com ${precisao}% de precisão.`,
    acoes: [destino],
  });
}

// Próximo exercício da mesma etapa (grupos de 5) ou volta para a lista.
async function descobrirProximo(exercicio) {
  const padrao = { texto: 'Continuar exercícios', href: 'exercicios.html' };
  const nivel = NIVEIS.find((n) => n.nivel === exercicio.nivel);
  const etapa = nivel?.etapas?.find((e) => exercicio.ordem >= e.inicio && exercicio.ordem <= e.fim);
  if (!etapa) return padrao;
  if (exercicio.ordem >= etapa.fim) return { texto: 'Concluir etapa', href: 'exercicios.html' };

  try {
    const lista = await listarExercicios();
    const proximo = lista.find((e) => e.nivel === exercicio.nivel && e.ordem === exercicio.ordem + 1);
    if (proximo) {
      const posicao = proximo.ordem - etapa.inicio + 1;
      const total = etapa.fim - etapa.inicio + 1;
      return { texto: `Próximo exercício (${posicao}/${total})`, href: `treinar.html?id=${encodeURIComponent(proximo.id)}` };
    }
  } catch (erro) {
    console.error('Falha ao buscar o próximo exercício:', erro);
  }
  return padrao;
}

function prepararAviso() {
  const painel = document.getElementById('result-panel') ?? document.body;
  let aviso = painel.querySelector('[data-resultado-aviso]');
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.dataset.resultadoAviso = '';
    aviso.setAttribute('role', 'status');
    painel.append(aviso);
  }
  aviso.className = 'resultado-aviso';
  aviso.textContent = 'Salvando resultado…';
  return aviso;
}

function preencherAviso(aviso, { tipo, texto, acoes = [] }) {
  aviso.className = `resultado-aviso is-${tipo}`;
  aviso.innerHTML = '';
  const p = document.createElement('p');
  p.style.margin = '0';
  p.textContent = texto;
  aviso.append(p);
  if (!acoes.length) return;

  const linha = document.createElement('div');
  linha.className = 'resultado-acoes';
  acoes.forEach((acao) => {
    const el = document.createElement(acao.href ? 'a' : 'button');
    el.className = `button small${acao.secundario ? ' secondary' : ''}`;
    el.textContent = acao.texto;
    if (acao.href) el.href = acao.href;
    if (acao.recomecar) {
      el.type = 'button';
      el.addEventListener('click', () => {
        aviso.remove();
        document.getElementById('result-restart')?.click();
      });
    }
    linha.append(el);
  });
  aviso.append(linha);
}

function definirTexto(seletor, texto) {
  const el = document.querySelector(seletor);
  if (el) el.textContent = texto;
}

function formatar(valor) {
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

// ---------- Sugestão quando o exercício está difícil demais (Etapa 4.2) ----------
// Nunca bloqueia: a pessoa escolhe ir para o recomendado ou continuar.

const CHAVE_TENTATIVAS = 'wavetype_tentativas_trilha';

function registrarTentativa(exercicioId, precisao) {
  let mapa = {};
  try {
    mapa = JSON.parse(localStorage.getItem(CHAVE_TENTATIVAS) || '{}');
  } catch {
    mapa = {};
  }
  const lista = [...(mapa[exercicioId] ?? []), precisao].slice(-5);
  mapa[exercicioId] = lista;
  try {
    localStorage.setItem(CHAVE_TENTATIVAS, JSON.stringify(mapa));
  } catch {
    /* sem localStorage */
  }
  return lista;
}

async function sugerirSeDificil(aviso, exercicio, precisao) {
  document.querySelectorAll('.sugestao-nivel').forEach((antiga) => antiga.remove());
  if (!exercicio || exercicio.atividade || !Number.isFinite(precisao)) return;
  const precisoes = registrarTentativa(exercicio.id, precisao);
  const recomendada = await licaoRecomendada();
  const sugestao = sugestaoDuranteTreino({ exercicio, precisoes, recomendada });
  if (!sugestao) return;

  let destino = '../../nivelamento.html';
  let texto = 'Esse exercício parece difícil agora. Quer fazer o teste de nivelamento para achar o melhor ponto de partida?';
  let rotulo = 'Fazer o teste de nivelamento';
  if (sugestao.recomendado) {
    const alvo = (await listarExercicios()).find((e) => e.nivel === sugestao.recomendado.nivel && e.ordem === sugestao.recomendado.ordem);
    if (!alvo) return;
    const nivel = NIVEIS.find((n) => n.nivel === alvo.nivel);
    destino = `treinar.html?id=${alvo.id}`;
    texto = `Esse exercício parece difícil agora. Quer começar pelo “${alvo.titulo}” (nível ${alvo.nivel}${nivel ? `, ${nivel.titulo}` : ''})? Depois você volta para este.`;
    rotulo = 'Ir para o recomendado';
  }

  const caixa = document.createElement('div');
  caixa.className = 'sugestao-nivel';
  caixa.setAttribute('role', 'status');
  caixa.innerHTML = `<p></p><div class="row-actions"><a class="button small" data-sugestao="aceitou"></a><button type="button" class="button secondary small" data-sugestao="ignorou">Continuar mesmo assim</button></div>`;
  caixa.querySelector('p').textContent = texto;
  const link = caixa.querySelector('a');
  link.textContent = rotulo;
  link.href = destino;
  (aviso ?? document.querySelector('#result-panel'))?.after(caixa);

  caixa.addEventListener('click', async (evento) => {
    const alvo = evento.target.closest('[data-sugestao]');
    if (!alvo) return;
    const decisao = alvo.dataset.sugestao;
    if (decisao === 'aceitou') evento.preventDefault();
    await registrarDecisaoDeSugestao({ exercicioId: exercicio.id, recomendado: sugestao.recomendado ?? null, decisao });
    if (decisao === 'aceitou') window.location.href = destino;
    else caixa.remove();
  });
}
