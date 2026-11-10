import { criarMotor } from './digitacao/motor.js';
import { caminhoSuave } from './ui/onda-caminho.js';
import './ui/onda.js';
import { METRICAS, MODOS_ERRO, MODO_ERROS_POR_NIVEL, modoErrosDoExercicio } from './digitacao/config.js';
import { completarTexto, alvoDeCaracteres, criarPraticaLivre, MIN_CARACTERES } from './digitacao/textos.js';

document.addEventListener('DOMContentLoaded', () => {
    // Palavras e frases da prática livre: banco variado em js/digitacao/textos.js,
    // sorteado sem repetir até esgotar (antes eram 4 frases por nível).
    let praticaLivre = null;
    let praticaLivreChave = '';

    const elements = {
        shell: document.getElementById('typing-shell'),
        stage: document.getElementById('typing-stage'),
        input: document.getElementById('typing-input'),
        wrapper: document.getElementById('words-wrapper'),
        viewport: document.getElementById('words-viewport'),
        prompt: document.getElementById('focus-prompt'),
        liveWpm: document.getElementById('live-wpm'),
        liveAccuracy: document.getElementById('live-accuracy'),
        liveTime: document.getElementById('live-time'),
        restart: document.getElementById('restart-button'),
        status: document.getElementById('test-status'),
        resultPanel: document.getElementById('result-panel'),
        resultTitle: document.getElementById('result-title'),
        resultRestart: document.getElementById('result-restart'),
        resultWpm: document.getElementById('result-wpm'),
        resultRaw: document.getElementById('result-raw'),
        resultAccuracy: document.getElementById('result-accuracy'),
        resultConsistency: document.getElementById('result-consistency'),
        resultSummary: document.getElementById('result-summary'),
        resultComparison: document.getElementById('result-comparison'),
        chartLine: document.getElementById('chart-line'),
        chartArea: document.getElementById('chart-area'),
        chartDuration: document.getElementById('chart-duration'),
        diagnosisTitle: document.getElementById('diagnosis-title'),
        diagnosisText: document.getElementById('diagnosis-text'),
        problemKeys: document.getElementById('problem-keys'),
        problemWords: document.getElementById('problem-words'),
        charsCorrect: document.getElementById('chars-correct'),
        charsWrong: document.getElementById('chars-wrong'),
        charsMissed: document.getElementById('chars-missed'),
        charsExtra: document.getElementById('chars-extra')
    };

    let state;
    let motor; // estado da digitação (js/digitacao/motor.js)
    let wordEls = [];
    let exercicioTexto = null; // texto do exercício vindo do banco (null = prática livre)
    let exercicioLimite = null; // tempo máximo do exercício em segundos (null = sem limite)
    let exercicioRepete = true; // trilha completa textos curtos; atividade de professor não
    let exercicioNivel = null; // nível da trilha (escolhe o estilo do complemento)
    let modoErrosTravado = false; // true quando o professor definiu o modo para a turma

    function freshState(settings = {}) {
        const level = settings.level || state?.level || 'medium';
        return {
            mode: settings.mode || state?.mode || 'words',
            level,
            duration: settings.duration || state?.duration || 30,
            errorMode: settings.errorMode || state?.errorMode || MODO_ERROS_POR_NIVEL[level] || MODOS_ERRO.fluxo,
            timeLeft: settings.duration || state?.duration || 30,
            started: false,
            finished: false,
            startTime: 0,
            timer: null,
            lastSampleSecond: 0,
            lastSampleKeypresses: 0,
            wrapperOffset: 0,
            speedSamples: []
        };
    }

    function createWord(text) {
        const word = document.createElement('span');
        word.className = 'word';
        word.dataset.text = text;
        Array.from(text).forEach((character) => {
            const letter = document.createElement('span');
            letter.className = 'letter';
            letter.textContent = character;
            word.appendChild(letter);
        });
        elements.wrapper.appendChild(word);
        wordEls.push(word);
    }

    function addWords(list) {
        list.forEach(createWord);
        motor.adicionarPalavras(list);
    }

    // Textos curtos da trilha são completados até o mínimo de caracteres com
    // conteúdo NOVO e compatível com a lição (palavras com as mesmas teclas,
    // outras frases do mesmo nível), em vez de repetir o texto. O total nunca
    // passa do tamanho que o banco usa para o tempo máximo
    // (tempo_limite_trilha), então o tempo continua justo.
    function appendExercicio() {
        const palavras = exercicioRepete
            ? completarTexto(exercicioTexto, { nivel: exercicioNivel, alvo: alvoDeCaracteres(exercicioTexto, MIN_CARACTERES) })
            : exercicioTexto.split(/\s+/).filter(Boolean);
        if (palavras.length) addWords(palavras);
    }

    function appendWords(amount) {
        if (exercicioTexto) return; // exercício do banco: texto fixo, sem repetir
        const chave = `${state.mode}:${state.level}`;
        if (!praticaLivre || praticaLivreChave !== chave) {
            praticaLivre = criarPraticaLivre({ modo: state.mode, nivel: state.level });
            praticaLivreChave = chave;
        }
        addWords(praticaLivre(amount));
    }

    function generateWords() {
        elements.wrapper.replaceChildren();
        wordEls = [];
        motor = criarMotor({ modo: state.errorMode });
        if (exercicioTexto) {
            appendExercicio();
            return;
        }
        appendWords(state.mode === 'sentences' ? 22 : 150);
    }

    // ---------- Desenho do texto a partir do motor ----------

    const CLASSE_DO_ESTADO = { correta: 'correct', incorreta: 'incorrect', omitida: 'missed', pendente: '' };

    function renderWord(index) {
        const word = wordEls[index];
        if (!word) return;
        Array.from(word.children).forEach((letter, li) => {
            const classe = CLASSE_DO_ESTADO[motor.estadoLetra(index, li)];
            letter.classList.remove('correct', 'incorrect', 'missed');
            if (classe) letter.classList.add(classe);
        });
        definirExtras(word, motor.extras(index));
    }

    function renderAround(index) {
        renderWord(index - 1);
        renderWord(index);
        renderWord(index + 1);
    }

    function updateTypingPosition() {
        const word = wordEls[motor.palavraAtual];
        if (!word) return;

        elements.wrapper.querySelectorAll('.letter.current').forEach((letter) => letter.classList.remove('current'));
        elements.wrapper.querySelectorAll('.word.active, .word.caret-at-end').forEach((item) => item.classList.remove('active', 'caret-at-end'));

        word.classList.add('active');
        const letters = word.children;
        const letraAtual = motor.letraAtual;
        if (letraAtual < letters.length) letters[letraAtual].classList.add('current');
        else word.classList.add('caret-at-end');

        const singleLine = document.body.classList.contains('single-line');
        const axis = singleLine ? 'x' : 'y';
        let desiredOffset;

        if (singleLine) {
            // A palavra atual fica a 25% da esquerda; o texto corre para o lado
            desiredOffset = Math.max(0, word.offsetLeft - elements.viewport.clientWidth * 0.25);
        } else {
            // Mede pela letra atual: uma palavra longa pode ocupar mais de uma linha.
            const lineHeight = parseFloat(getComputedStyle(elements.wrapper).lineHeight);
            const alvo = letters[Math.min(letraAtual, letters.length - 1)] ?? word;
            const topo = alvo.getBoundingClientRect().top - elements.wrapper.getBoundingClientRect().top;
            desiredOffset = Math.max(0, topo - lineHeight);
        }

        if (elements.wrapper.dataset.axis !== axis || Math.abs(desiredOffset - state.wrapperOffset) > 1) {
            elements.wrapper.dataset.axis = axis;
            state.wrapperOffset = desiredOffset;
            elements.wrapper.style.transform = singleLine
                ? `translateX(-${desiredOffset}px)`
                : `translateY(-${desiredOffset}px)`;
        }
    }

    function elapsedNow() {
        return state.started ? (performance.now() - state.startTime) / 1000 : 0;
    }

    function setLiveMetrics(elapsedSeconds) {
        const stats = motor.estatisticas(elapsedSeconds);
        elements.liveWpm.textContent = String(stats.ppmBruto);
        // Com poucas teclas a precisão ainda não diz nada: mostra "—".
        elements.liveAccuracy.textContent = stats.precisao == null ? '—' : `${stats.precisao}%`;
    }

    function startTest() {
        if (state.started || state.finished) return;
        state.started = true;
        state.startTime = performance.now();
        elements.shell.classList.add('started');
        elements.status.textContent = exercicioTexto
            ? 'Exercício iniciado.'
            : `Teste iniciado. ${state.duration} segundos.`;
        state.timer = window.setInterval(tick, 200);
    }

    function tick() {
        const elapsed = elapsedNow();
        // Exercício do banco: contagem regressiva do tempo máximo (ou cronômetro, se não houver limite).
        const remaining = !exercicioTexto
            ? Math.max(0, Math.ceil(state.duration - elapsed))
            : exercicioLimite
                ? Math.max(0, Math.ceil(exercicioLimite - elapsed))
                : Math.floor(elapsed);
        state.timeLeft = remaining;
        elements.liveTime.textContent = String(remaining);
        setLiveMetrics(elapsed);

        const sampleSecond = Math.floor(elapsed);
        if (sampleSecond > state.lastSampleSecond) {
            const intervalSeconds = sampleSecond - state.lastSampleSecond;
            const intervalKeys = motor.teclas - state.lastSampleKeypresses;
            state.speedSamples.push(Math.round((intervalKeys / 5) / (intervalSeconds / 60)));
            state.lastSampleSecond = sampleSecond;
            state.lastSampleKeypresses = motor.teclas;
        }
        if (!exercicioTexto && elapsed >= state.duration) endTest();
        if (exercicioTexto && exercicioLimite && elapsed >= exercicioLimite) endTest({ tempoEsgotado: true });
    }

    // ---------- Teclas ----------

    function sinalizarBloqueio() {
        const word = wordEls[motor.palavraAtual];
        const alvo = word?.children[motor.letraAtual] ?? word;
        if (!alvo) return;
        alvo.classList.remove('bloqueada');
        void alvo.offsetWidth; // reinicia a animação
        alvo.classList.add('bloqueada');
        window.setTimeout(() => alvo.classList.remove('bloqueada'), 400);
    }

    function afterKey(resultado, indiceAntes) {
        if (resultado.tipo === 'ignorada') return;
        if (resultado.tipo === 'bloqueada') {
            sinalizarBloqueio();
            if (resultado.sugerirSeguir) mostrarAvisoTravou(true);
        } else {
            mostrarAvisoTravou(false);
        }
        renderAround(indiceAntes);
        if (motor.palavraAtual !== indiceAntes) renderAround(motor.palavraAtual);

        if (motor.palavraAtual > wordEls.length - 35) appendWords(state.mode === 'sentences' ? 8 : 70);
        setLiveMetrics(elapsedNow());
        requestAnimationFrame(updateTypingPosition);
        if (exercicioTexto && motor.terminou()) endTest();
    }

    function processCharacter(character) {
        if (state.finished || character === '\n' || character === '\r') return;
        if (character === ' ') {
            submitWord();
            return;
        }
        if (!state.started) startTest();
        const antes = motor.palavraAtual;
        afterKey(motor.digitar(character, performance.now()), antes);
    }

    function submitWord() {
        if (!state.started || state.finished) return;
        const antes = motor.palavraAtual;
        afterKey(motor.espaco(performance.now()), antes);
    }

    function handleBackspace() {
        if (!state.started || state.finished) return;
        const antes = motor.palavraAtual;
        afterKey(motor.apagar(performance.now()), antes);
    }

    function definirExtras(word, quantidade) {
        const total = Math.max(0, quantidade);
        if (total) word.dataset.extras = String(total);
        else delete word.dataset.extras;
        word.classList.toggle('has-extra', total > 0);
    }

    // ---------- Modo de erros (seguir / corrigir antes de avançar) ----------

    function montarSeletorDeErros() {
        const toolbar = elements.shell.querySelector('.typing-toolbar');
        if (!toolbar || toolbar.querySelector('[data-control="errors"]')) return;
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'segmented-control';
        fieldset.dataset.control = 'errors';
        fieldset.innerHTML = '<legend>Erros</legend>'
            + `<button type="button" class="segment" data-value="${MODOS_ERRO.fluxo}" aria-pressed="false" title="O cursor avança mesmo com erro; use Backspace para corrigir">Seguir</button>`
            + `<button type="button" class="segment" data-value="${MODOS_ERRO.correcao}" aria-pressed="false" title="O cursor só avança com a tecla certa">Corrigir antes</button>`
            + '<span class="segmented-note" hidden>definido pelo professor</span>';
        const nivel = toolbar.querySelector('[data-control="level"]');
        if (nivel) nivel.after(fieldset);
        else toolbar.prepend(fieldset);
    }

    function sincronizarSeletorDeErros() {
        const fieldset = elements.shell.querySelector('[data-control="errors"]');
        if (!fieldset) return;
        fieldset.querySelectorAll('.segment').forEach((botao) => {
            const ativo = botao.dataset.value === state.errorMode;
            botao.classList.toggle('active', ativo);
            botao.setAttribute('aria-pressed', String(ativo));
            botao.disabled = modoErrosTravado;
        });
        fieldset.querySelector('.segmented-note').hidden = !modoErrosTravado;
        elements.shell.dataset.modoErros = state.errorMode;
    }

    function montarAvisoTravou() {
        if (document.getElementById('aviso-travou')) return;
        const aviso = document.createElement('div');
        aviso.className = 'aviso-travou';
        aviso.id = 'aviso-travou';
        aviso.setAttribute('role', 'status');
        aviso.hidden = true;
        aviso.innerHTML = '<p>Essa tecla está difícil agora. Quer seguir e voltar a ela depois?</p>'
            + '<div><button type="button" class="button button-small" data-travou="seguir">Seguir mesmo assim</button>'
            + '<button type="button" class="button button-small button-secondary" data-travou="repetir">Tentar de novo</button></div>';
        elements.stage.after(aviso);
        aviso.addEventListener('click', (event) => {
            const acao = event.target.closest('[data-travou]')?.dataset.travou;
            if (!acao) return;
            const antes = motor.palavraAtual;
            if (acao === 'seguir') afterKey(motor.seguirMesmoAssim(), antes);
            else motor.tentarDeNovo();
            mostrarAvisoTravou(false);
            elements.input.focus();
        });
    }

    function mostrarAvisoTravou(visivel) {
        const aviso = document.getElementById('aviso-travou');
        if (aviso && aviso.hidden === visivel) aviso.hidden = !visivel;
    }

    function consistencyLabel(valor) {
        return valor == null ? '—' : `${valor}%`;
    }

    function buildChart(samples) {
        const values = samples.length ? samples : [0, 0];
        const maxValue = Math.max(40, ...values);
        const left = 20;
        const right = 620;
        const top = 20;
        const bottom = 180;
        const points = values.map((value, index) => {
            const x = values.length === 1 ? left : left + ((right - left) * index / (values.length - 1));
            const y = bottom - ((Math.min(value, maxValue) / maxValue) * (bottom - top));
            return [x, y];
        });
        // Traço em onda (curva suave entre as amostras), parte da identidade.
        const line = caminhoSuave(points);
        elements.chartLine.setAttribute('d', line);
        elements.chartArea.setAttribute('d', `${line} L ${right} ${bottom} L ${left} ${bottom} Z`);
    }

    function readHistory() {
        try {
            const stored = JSON.parse(localStorage.getItem('wavetype_results_v2') || '[]');
            return Array.isArray(stored) ? stored : [];
        } catch {
            return [];
        }
    }

    function saveResult(result) {
        const history = readHistory();
        history.push({ wpm: result.netWpm, accuracy: result.accuracy, date: new Date().toISOString() });
        localStorage.setItem('wavetype_results_v2', JSON.stringify(history.slice(-20)));
    }

    function setDiagnosis(result) {
        if (result.accuracy != null && result.accuracy < 90) {
            elements.diagnosisTitle.textContent = 'Priorize precisão antes de acelerar';
            elements.diagnosisText.textContent = 'Reduza um pouco o ritmo e procure terminar cada palavra corretamente. Velocidade virá com a repetição.';
        } else if (result.consistency != null && result.consistency < METRICAS.consistenciaRitmoIrregular) {
            elements.diagnosisTitle.textContent = 'Busque um ritmo mais constante';
            elements.diagnosisText.textContent = 'Você alternou entre trechos rápidos e lentos. Tente manter uma cadência confortável do início ao fim.';
        } else if (result.netWpm < 30) {
            elements.diagnosisTitle.textContent = 'Sua base está ficando mais segura';
            elements.diagnosisText.textContent = 'A precisão está no caminho certo. Pratique sessões curtas e frequentes para ganhar automatização.';
        } else {
            elements.diagnosisTitle.textContent = 'Bom equilíbrio entre ritmo e controle';
            elements.diagnosisText.textContent = 'Mantenha a regularidade e use as letras indicadas abaixo para transformar pequenos erros em progresso.';
        }
    }

    function renderProblemKeys(errosPorTecla) {
        elements.problemKeys.replaceChildren();
        const entries = errosPorTecla.slice(0, 5);
        if (!entries.length) entries.push(['—', 0]);
        entries.forEach(([key, total]) => {
            const badge = document.createElement('kbd');
            badge.textContent = key;
            if (total) badge.title = `${total} ${total === 1 ? 'erro' : 'erros'}`;
            elements.problemKeys.appendChild(badge);
        });
    }

    function renderErrorSummary(stats) {
        const card = elements.charsCorrect?.closest('.detail-card');
        if (!card) return;
        let resumo = card.querySelector('[data-resumo-erros]');
        if (!resumo) {
            resumo = document.createElement('p');
            resumo.className = 'erros-resumo';
            resumo.dataset.resumoErros = '';
            card.append(resumo);
        }
        resumo.textContent = !stats.erros
            ? 'Nenhum erro digitado.'
            : `${stats.erros} ${stats.erros === 1 ? 'erro digitado' : 'erros digitados'}: `
              + `${stats.errosCorrigidos} ${stats.errosCorrigidos === 1 ? 'corrigido' : 'corrigidos'} e `
              + `${stats.errosNaoCorrigidos} ${stats.errosNaoCorrigidos === 1 ? 'não corrigido' : 'não corrigidos'}.`;
    }

    function endTest({ tempoEsgotado = false } = {}) {
        if (state.finished) return;
        window.clearInterval(state.timer);
        state.finished = true;
        state.timeLeft = 0;
        mostrarAvisoTravou(false);
        const elapsedSeconds = exercicioTexto
            ? Math.max(Math.min(elapsedNow(), exercicioLimite || Infinity), 1)
            : state.duration;
        const stats = motor.estatisticas(elapsedSeconds);
        const netWpm = stats.ppmLiquido;
        const rawWpm = stats.ppmBruto;
        const accuracy = stats.precisao; // null com amostra pequena
        const consistency = stats.consistencia; // null com amostra pequena
        const result = { netWpm, rawWpm, accuracy, consistency };
        const history = readHistory();

        elements.liveTime.textContent = exercicioTexto ? String(Math.round(elapsedSeconds)) : '0';
        elements.resultWpm.textContent = String(netWpm);
        elements.resultRaw.textContent = String(rawWpm);
        elements.resultAccuracy.textContent = accuracy == null ? '—' : `${accuracy}%`;
        elements.resultConsistency.textContent = consistencyLabel(consistency);
        // Onda do indicador: calma quando o ritmo é estável, agitada quando oscila.
        const cartaoConsistencia = elements.resultConsistency.closest('.result-metric');
        if (cartaoConsistencia) {
            let medidor = cartaoConsistencia.querySelector('wave-meter');
            if (!medidor) {
                medidor = document.createElement('wave-meter');
                cartaoConsistencia.append(medidor);
            }
            medidor.setAttribute('valor', consistency == null ? '' : String(consistency));
        }
        const notaConsistencia = elements.resultConsistency.nextElementSibling;
        if (notaConsistencia) {
            notaConsistencia.textContent = consistency == null ? 'digite um pouco mais para medir' : 'estabilidade do ritmo';
        }
        elements.charsCorrect.textContent = String(stats.corretasNoTexto);
        elements.charsWrong.textContent = String(stats.incorretas);
        elements.charsMissed.textContent = String(stats.omitidas);
        elements.charsExtra.textContent = String(stats.extras);
        renderErrorSummary(stats);
        elements.chartDuration.textContent = `${Math.round(elapsedSeconds)} segundos`;
        elements.resultSummary.textContent = tempoEsgotado
            ? 'O tempo máximo acabou antes do fim do texto. Respire e tente de novo.'
            : stats.errosCorrigidos
            ? `Você corrigiu ${stats.errosCorrigidos} ${stats.errosCorrigidos === 1 ? 'erro durante' : 'erros durante'} o teste. Os erros corrigidos também contam na precisão.`
            : 'Veja o que manter e o que praticar no próximo teste.';

        if (history.length) {
            const average = Math.round(history.reduce((sum, item) => sum + Number(item.wpm || 0), 0) / history.length);
            const difference = netWpm - average;
            elements.resultComparison.textContent = difference === 0
                ? `Mesmo ritmo da sua média recente: ${average} WPM`
                : `${Math.abs(difference)} WPM ${difference > 0 ? 'acima' : 'abaixo'} da sua média recente`;
        } else {
            elements.resultComparison.textContent = 'Primeiro resultado neste dispositivo';
        }

        const difficultWords = stats.palavrasProblema.slice(0, 6);
        elements.problemWords.textContent = difficultWords.length ? difficultWords.join(' · ') : 'Nenhuma palavra problemática identificada.';
        renderProblemKeys(stats.errosPorTecla);
        setDiagnosis(result);
        buildChart([...state.speedSamples, rawWpm]);
        saveResult({ netWpm, accuracy: stats.precisaoBruta });

        // Avisa a página que o teste terminou. Na área logada, o
        // treino.js escuta este evento e salva no Supabase.
        // Na página pública, o teste-publico.js mostra o convite para entrar.
        document.dispatchEvent(new CustomEvent('wavetype:resultado', {
            detail: {
                ppm: netWpm,
                precisao: stats.precisaoBruta,
                acertos: stats.teclasCorretas,
                erros: stats.erros,
                tempo_seg: Math.round(elapsedSeconds),
                concluiu_texto: !tempoEsgotado,
                desempenho_teclas: stats.desempenhoPorTecla
            }
        }));

        elements.shell.classList.add('finished');
        elements.shell.classList.remove('focused');
        elements.resultPanel.hidden = false;
        elements.input.blur();
        elements.status.textContent = `Teste concluído. ${netWpm} palavras por minuto`
            + (accuracy == null ? '' : `, ${accuracy}% de precisão`)
            + (consistency == null ? '' : ` e ${consistency}% de consistência`) + '.';
        requestAnimationFrame(() => elements.resultTitle.focus());
    }

    function initTest({ focus = false } = {}) {
        if (state?.timer) window.clearInterval(state.timer);
        const settings = state ? { mode: state.mode, level: state.level, duration: state.duration, errorMode: state.errorMode } : {};
        state = freshState(settings);
        mostrarAvisoTravou(false);
        sincronizarSeletorDeErros();
        generateWords();
        renderAround(0);
        elements.wrapper.style.transform = 'translateY(0)';
        elements.liveWpm.textContent = '0';
        elements.liveAccuracy.textContent = '—';
        elements.liveTime.textContent = exercicioTexto ? String(exercicioLimite || 0) : String(state.duration);
        elements.input.value = '';
        elements.resultPanel.hidden = true;
        elements.shell.classList.remove('started', 'finished', 'focused');
        elements.status.textContent = 'Teste pronto.';
        requestAnimationFrame(updateTypingPosition);
        if (focus) requestAnimationFrame(() => elements.input.focus());
    }

    montarSeletorDeErros();
    montarAvisoTravou();

    elements.input.addEventListener('focus', () => elements.shell.classList.add('focused'));
    elements.input.addEventListener('blur', () => elements.shell.classList.remove('focused'));
    elements.stage.addEventListener('click', () => {
        if (!state.finished) elements.input.focus();
    });
    elements.prompt.addEventListener('click', () => elements.input.focus());
    elements.restart.addEventListener('click', () => initTest({ focus: true }));
    elements.resultRestart.addEventListener('click', () => initTest({ focus: true }));

    elements.input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            initTest({ focus: true });
            return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        if (event.key === 'Backspace') {
            event.preventDefault();
            handleBackspace();
            return;
        }
        if (event.key === ' ') {
            event.preventDefault();
            submitWord();
            return;
        }
        if (event.key.length === 1) {
            event.preventDefault();
            processCharacter(event.key);
        }
    });

    elements.input.addEventListener('input', () => {
        const fallbackText = elements.input.value;
        elements.input.value = '';
        Array.from(fallbackText).forEach(processCharacter);
    });

    // Esc recomeça também depois do resultado (o campo de digitação perde o foco).
    // Não interfere em menus abertos: eles tratam o próprio Esc antes.
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || event.defaultPrevented || event.target === elements.input) return;
        if (event.target instanceof Element && event.target.closest('details[open], [role="menu"], dialog')) return;
        const posicao = elements.shell.getBoundingClientRect();
        if (posicao.bottom <= 0 || posicao.top >= window.innerHeight) return;
        event.preventDefault();
        initTest({ focus: true });
    });

    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || state.finished || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        if (event.key.length !== 1 || event.key === ' ') return;
        if (event.target instanceof Element && event.target.closest('a, button, summary, input, textarea, select')) return;

        const stagePosition = elements.stage.getBoundingClientRect();
        const testIsVisible = stagePosition.bottom > 0 && stagePosition.top < window.innerHeight;
        if (!testIsVisible) return;

        event.preventDefault();
        elements.input.focus({ preventScroll: true });
        processCharacter(event.key);
    });

    document.querySelectorAll('.segmented-control').forEach((control) => {
        control.addEventListener('click', (event) => {
            const button = event.target.closest('.segment');
            if (!button || button.disabled) return;
            control.querySelectorAll('.segment').forEach((item) => {
                const active = item === button;
                item.classList.toggle('active', active);
                item.setAttribute('aria-pressed', String(active));
            });
            const type = control.dataset.control;
            if (type === 'mode') state.mode = button.dataset.value;
            if (type === 'level') {
                state.level = button.dataset.value;
                // Cada nível tem seu modo de erros padrão (Fácil: corrigir antes de avançar).
                state.errorMode = MODO_ERROS_POR_NIVEL[state.level] || MODOS_ERRO.fluxo;
            }
            if (type === 'time') state.duration = Number(button.dataset.value);
            if (type === 'errors') state.errorMode = button.dataset.value;
            initTest();
        });
    });

    document.querySelectorAll('.preference-toggle').forEach((toggle) => {
        const preference = toggle.dataset.preference;
        const saved = localStorage.getItem(`wavetype_${preference}`) === 'true';
        toggle.setAttribute('aria-pressed', String(saved));
        document.body.classList.toggle(preference, saved);
        toggle.addEventListener('click', () => {
            const active = toggle.getAttribute('aria-pressed') !== 'true';
            toggle.setAttribute('aria-pressed', String(active));
            document.body.classList.toggle(preference, active);
            localStorage.setItem(`wavetype_${preference}`, String(active));
            requestAnimationFrame(updateTypingPosition);
        });
    });

    window.addEventListener('resize', () => requestAnimationFrame(updateTypingPosition));

    // Aplica o exercício vindo do banco (enviado pelo usuario-treinar.js)
    function aplicarExercicio(exercicio) {
        const conteudo = exercicio?.texto_referencia ?? exercicio?.texto;
        if (!conteudo) return;
        exercicioTexto = String(conteudo).trim();
        exercicioLimite = Number(exercicio.tempo_limite_seg) > 0 ? Number(exercicio.tempo_limite_seg) : null;
        exercicioRepete = !exercicio.atividade;
        exercicioNivel = Number(exercicio.nivel) || null;

        // Exercício do banco: esconde modo, tempo e nível (não se aplicam aqui).
        // O modo de erros continua visível; se o professor definiu um para a
        // turma, ele vale e o seletor fica travado.
        document.querySelectorAll('.segmented-control:not([data-control="errors"])').forEach((control) => {
            control.style.display = 'none';
        });
        const modoDaTurma = exercicio.modo_erros_turma ?? null;
        modoErrosTravado = Boolean(modoDaTurma);
        state.errorMode = modoErrosDoExercicio(exercicio, modoDaTurma);

        initTest();
    }

    initTest();

    // Se o exercício chegou antes do script.js carregar
    if (window.wavetypeExercicio) aplicarExercicio(window.wavetypeExercicio);

    // Se chegar depois (o caso normal, pois a busca é assíncrona)
    document.addEventListener('wavetype:exercicio', (e) => aplicarExercicio(e.detail));
});