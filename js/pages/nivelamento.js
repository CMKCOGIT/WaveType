// js/pages/nivelamento.js
// Teste de nivelamento ("testar conhecimento"): etapas progressivas que
// param quando a precisão fica abaixo do limiar. Usa o mesmo motor de
// digitação do teste (js/digitacao/motor.js), em modo fluxo.
// Com sessão: salva o resultado. Visitante: guarda e oferece criar conta.
import { criarMotor } from '../digitacao/motor.js';
import { ETAPAS, TEMPO_MAXIMO_ETAPA_SEG, PRECISAO_PARA_AVANCAR } from '../nivelamento/config.js';
import { resumirEtapa, deveAvancar, recomendar, NOME_DA_REGIAO } from '../nivelamento/avaliacao.js';
import { temSessaoSalva } from '../sessao/local.js';
import { NIVEIS } from '../exercicios-dados.js';

const $ = (seletor) => document.querySelector(seletor);
const telas = [...document.querySelectorAll('[data-tela]')];
const entrada = $('[data-entrada]');
const areaPalavras = $('[data-palavras]');
const statusLeitor = $('[data-status]');

let indiceEtapa = 0;
let resumos = [];
let motor = null;
let palavrasEl = [];
let inicio = 0;
let relogio = null;
let ativa = false;

function mostrarTela(nome) {
  telas.forEach((tela) => {
    tela.hidden = tela.dataset.tela !== nome;
  });
}

function escapar(texto) {
  const d = document.createElement('div');
  d.textContent = texto ?? '';
  return d.innerHTML;
}

// Lista das etapas na tela inicial
$('[data-lista-etapas]').innerHTML = ETAPAS.map((e) => `<li>${escapar(e.titulo)}<small>${escapar(e.instrucao)}</small></li>`).join('');

// ---------- Etapa ----------

function iniciarEtapa() {
  const etapa = ETAPAS[indiceEtapa];
  const palavras = etapa.texto.split(/\s+/);
  motor = criarMotor({ palavras });
  areaPalavras.replaceChildren();
  palavrasEl = palavras.map((texto) => {
    const palavra = document.createElement('span');
    palavra.className = 'word';
    for (const c of texto) {
      const letra = document.createElement('span');
      letra.className = 'letter';
      letra.textContent = c;
      palavra.append(letra);
    }
    areaPalavras.append(palavra);
    return palavra;
  });
  $('[data-etapa-contador]').textContent = `Etapa ${indiceEtapa + 1} de ${ETAPAS.length}`;
  $('[data-etapa-titulo]').textContent = etapa.titulo;
  $('[data-etapa-instrucao]').textContent = `${etapa.instrucao} O tempo começa na primeira tecla.`;
  $('[data-tempo]').textContent = String(TEMPO_MAXIMO_ETAPA_SEG);
  $('[data-progresso]').style.width = `${(indiceEtapa / ETAPAS.length) * 100}%`;
  inicio = 0;
  ativa = true;
  mostrarTela('etapa');
  desenhar();
  entrada.value = '';
  requestAnimationFrame(() => entrada.focus());
  statusLeitor.textContent = `Etapa ${indiceEtapa + 1}: ${etapa.titulo}. Pode começar a digitar.`;
}

const CLASSES = { correta: 'correct', incorreta: 'incorrect', omitida: 'missed', pendente: '' };
function desenhar() {
  palavrasEl.forEach((palavra, i) => {
    palavra.classList.toggle('active', i === motor.palavraAtual);
    palavra.classList.remove('caret-at-end');
    [...palavra.children].forEach((letra, j) => {
      letra.classList.remove('correct', 'incorrect', 'missed', 'current');
      const classe = CLASSES[motor.estadoLetra(i, j)];
      if (classe) letra.classList.add(classe);
    });
    const extras = motor.extras(i);
    palavra.classList.toggle('has-extra', extras > 0);
    if (extras) palavra.dataset.extras = String(extras);
    else delete palavra.dataset.extras;
  });
  const atual = palavrasEl[motor.palavraAtual];
  if (!atual) return;
  const letra = atual.children[motor.letraAtual];
  if (letra) letra.classList.add('current');
  else atual.classList.add('caret-at-end');
}

function comecarRelogio() {
  inicio = performance.now();
  relogio = setInterval(() => {
    const restante = Math.max(0, Math.ceil(TEMPO_MAXIMO_ETAPA_SEG - (performance.now() - inicio) / 1000));
    $('[data-tempo]').textContent = String(restante);
    if (restante <= 0) terminarEtapa();
  }, 200);
}

function aoDigitar(acao) {
  if (!ativa) return;
  if (!inicio) comecarRelogio();
  acao(performance.now());
  desenhar();
  if (motor.terminou()) terminarEtapa();
}

entrada.addEventListener('keydown', (evento) => {
  if (!ativa || evento.ctrlKey || evento.metaKey || evento.altKey || evento.isComposing) return;
  if (evento.key === 'Backspace') {
    evento.preventDefault();
    if (inicio) aoDigitar((t) => motor.apagar(t));
  } else if (evento.key === ' ') {
    evento.preventDefault();
    if (inicio) aoDigitar((t) => motor.espaco(t));
  } else if (evento.key.length === 1) {
    evento.preventDefault();
    aoDigitar((t) => motor.digitar(evento.key, t));
  }
});
// Teclados virtuais (celular) mandam o texto pelo evento input.
entrada.addEventListener('input', () => {
  const texto = entrada.value;
  entrada.value = '';
  for (const c of texto) aoDigitar((t) => (c === ' ' ? motor.espaco(t) : motor.digitar(c, t)));
});
$('[data-palco]').addEventListener('click', () => entrada.focus());

function terminarEtapa() {
  if (!ativa) return;
  ativa = false;
  clearInterval(relogio);
  const segundos = inicio ? (performance.now() - inicio) / 1000 : TEMPO_MAXIMO_ETAPA_SEG;
  const resumo = resumirEtapa(ETAPAS[indiceEtapa].id, motor.estatisticas(Math.min(segundos, TEMPO_MAXIMO_ETAPA_SEG)), segundos);
  resumos.push(resumo);
  $('[data-progresso]').style.width = `${((indiceEtapa + 1) / ETAPAS.length) * 100}%`;

  const ultima = indiceEtapa === ETAPAS.length - 1;
  if (!deveAvancar(resumo) || ultima) return mostrarResultado();

  $('[data-pausa-titulo]').textContent = `Etapa ${indiceEtapa + 1} concluída`;
  $('[data-pausa-texto]').textContent = `Precisão de ${resumo.precisao}% e ${resumo.ppm} palavras por minuto. Respire um pouco: a próxima etapa é “${ETAPAS[indiceEtapa + 1].titulo}”.`;
  mostrarTela('pausa');
  $('[data-proxima]').focus();
}

$('[data-comecar]').addEventListener('click', () => {
  indiceEtapa = 0;
  resumos = [];
  iniciarEtapa();
});
$('[data-proxima]').addEventListener('click', () => {
  indiceEtapa += 1;
  iniciarEtapa();
});

// ---------- Resultado ----------

function tituloDaLicao(licao) {
  const nivel = NIVEIS.find((n) => n.nivel === licao.nivel);
  const etapa = nivel?.etapas.find((e) => licao.ordem >= e.inicio && licao.ordem <= e.fim);
  return `Nível ${licao.nivel}${nivel ? ` · ${nivel.titulo}` : ''}, lição ${licao.ordem}${etapa ? ` (${etapa.titulo})` : ''}`;
}

async function mostrarResultado() {
  const r = recomendar(resumos);
  mostrarTela('resultado');
  $('[data-resultado-titulo]').textContent = `Nível ${r.rotulo}`;
  $('[data-resultado-licao]').textContent = `Comece por: ${tituloDaLicao(r.licao)}`;
  $('[data-resultado-explicacao]').textContent = r.explicacao;
  $('[data-resultado-teclas]').innerHTML = r.teclasFrageis.length
    ? r.teclasFrageis.map((t) => `<kbd>${escapar(t)}</kbd>`).join('')
    : '<kbd>—</kbd>';
  $('[data-resultado-etapas]').innerHTML = resumos
    .map((e) => {
      const etapa = ETAPAS.find((x) => x.id === e.id);
      const passou = e.precisao >= PRECISAO_PARA_AVANCAR;
      return `<tr><td>${escapar(etapa.titulo)}${passou ? '' : ' <small>(parou aqui)</small>'}</td><td>${e.precisao}%</td><td>${e.ppm}</td><td>${e.consistencia == null ? '—' : `${e.consistencia}%`}</td></tr>`;
    })
    .join('');
  if (r.regiaoMaisFragil) statusLeitor.textContent = `Resultado: nível ${r.rotulo}. Região que mais pede atenção: ${NOME_DA_REGIAO[r.regiaoMaisFragil]}.`;
  requestAnimationFrame(() => $('[data-resultado-titulo]').focus());
  await salvarOuConvidar(r);
}

async function salvarOuConvidar(r) {
  const acoes = $('[data-resultado-acoes]');
  const salvo = $('[data-resultado-salvo]');
  const refazer = '<button class="button button-secondary" type="button" data-refazer>Refazer o teste</button>';

  if (!temSessaoSalva()) {
    const { guardarNivelamentoPendente } = await import('../api/nivelamento.js').catch(() => ({}));
    guardarNivelamentoPendente?.(r, resumos);
    salvo.textContent = 'Crie uma conta grátis para salvar este resultado e começar a trilha pelo ponto certo. Ele fica guardado neste navegador por 7 dias.';
    acoes.innerHTML = `<a class="button" href="cadastro.html">Criar conta grátis</a><a class="button button-secondary" href="login.html">Já tenho conta</a>${refazer}`;
  } else {
    salvo.textContent = 'Salvando seu resultado…';
    try {
      const [{ validarSessao }, api, { listarExercicios }] = await Promise.all([
        import('../sessao/sessao.js'),
        import('../api/nivelamento.js'),
        import('../api/exercicios.js'),
      ]);
      const { estado, perfil } = await validarSessao();
      if (estado !== 'valida' || !perfil) throw new Error('sessao');
      await api.salvarNivelamento(r, resumos);
      salvo.textContent = 'Resultado salvo na sua conta.';
      const area = ['aluno', 'usuario'].includes(perfil.tipo) ? perfil.tipo : null;
      const exercicio = area ? (await listarExercicios()).find((e) => e.nivel === r.licao.nivel && e.ordem === r.licao.ordem) : null;
      acoes.innerHTML = exercicio
        ? `<a class="button" href="app/${area}/treinar.html?id=${exercicio.id}">Começar pela lição recomendada</a>${refazer}`
        : `<a class="button" href="${area ? `app/${area}/exercicios.html` : 'index.html'}">Ir para os exercícios</a>${refazer}`;
    } catch (erro) {
      if (erro.message !== 'sessao') console.error('Falha ao salvar o nivelamento:', erro);
      salvo.textContent = erro.message === 'sessao' ? 'Entre na sua conta para salvar este resultado.' : 'Não foi possível salvar agora. Tente refazer o teste mais tarde.';
      acoes.innerHTML = `<a class="button" href="login.html">Entrar</a>${refazer}`;
    }
  }
  acoes.querySelector('[data-refazer]')?.addEventListener('click', () => {
    indiceEtapa = 0;
    resumos = [];
    mostrarTela('inicio');
  });
}
