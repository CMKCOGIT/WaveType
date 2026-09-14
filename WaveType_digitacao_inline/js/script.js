document.addEventListener('DOMContentLoaded', () => {
    const dictionaries = {
        easy: ['casa', 'mesa', 'livro', 'gato', 'água', 'sol', 'luz', 'paz', 'bom', 'dia', 'noite', 'bolo', 'café', 'pão', 'suco', 'tela', 'vida', 'amor', 'dedo', 'linha', 'som', 'mapa', 'bola', 'rede'],
        medium: ['aprendizado', 'acontece', 'quando', 'prática', 'evolução', 'caminham', 'juntas', 'tempo', 'foco', 'velocidade', 'precisão', 'escola', 'professor', 'aluno', 'desafio', 'teclado', 'sistema', 'tecnologia', 'resultados', 'acompanhar', 'melhor', 'futuro', 'simples', 'rápido', 'texto', 'palavras', 'estudo', 'atenção', 'ritmo', 'conquista'],
        advanced: ['desenvolvimento', 'responsabilidade', 'infraestrutura', 'complexidade', 'procrastinação', 'perspectiva', 'circunstância', 'extraordinário', 'simultaneamente', 'característica', 'psicologia', 'interdisciplinar', 'acessibilidade', 'aprendizagem', 'aperfeiçoamento'],
        sentences: {
            easy: ['A prática cria confiança.', 'Digite com calma e atenção.', 'Cada tecla é um pequeno avanço.', 'Olhe para a tela e mantenha o ritmo.'],
            medium: ['A precisão constrói uma velocidade mais consistente.', 'Praticar alguns minutos ajuda a formar bons hábitos.', 'Um resultado claro mostra qual deve ser o próximo foco.', 'A evolução acontece quando o treino tem intenção.'],
            advanced: ['A fluência no teclado reduz o esforço durante atividades digitais.', 'Consistência e precisão revelam mais do que um recorde isolado.', 'Uma prática deliberada transforma dificuldade em automatização.', 'A análise dos erros orienta exercícios progressivamente mais eficientes.']
        }
    };

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

    function freshState(settings = {}) {
        return {
            mode: settings.mode || state?.mode || 'words',
            level: settings.level || state?.level || 'medium',
            duration: settings.duration || state?.duration || 30,
            timeLeft: settings.duration || state?.duration || 30,
            started: false,
            finished: false,
            startTime: 0,
            timer: null,
            lastSampleSecond: 0,
            lastSampleKeypresses: 0,
            currentWordIndex: 0,
            currentLetterIndex: 0,
            wrapperOffset: 0,
            keypresses: 0,
            correct: 0,
            wrong: 0,
            missed: 0,
            extra: 0,
            corrected: 0,
            errorKeys: new Map(),
            problemWords: new Set(),
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
    }

    function appendWords(amount) {
        const source = state.mode === 'sentences' ? dictionaries.sentences[state.level] : dictionaries[state.level];
        for (let index = 0; index < amount; index += 1) {
            const item = source[Math.floor(Math.random() * source.length)];
            if (state.mode === 'sentences') item.split(' ').forEach(createWord);
            else createWord(item);
        }
    }

    function generateWords() {
        elements.wrapper.replaceChildren();
        appendWords(state.mode === 'sentences' ? 22 : 150);
    }

    function currentWord() {
        return elements.wrapper.querySelectorAll('.word')[state.currentWordIndex];
    }

    function updateTypingPosition() {
        const words = elements.wrapper.querySelectorAll('.word');
        const word = words[state.currentWordIndex];
        if (!word) return;

        elements.wrapper.querySelectorAll('.letter.current').forEach((letter) => letter.classList.remove('current'));
        elements.wrapper.querySelectorAll('.word.active, .word.caret-at-end').forEach((item) => item.classList.remove('active', 'caret-at-end'));

        word.classList.add('active');
        const letters = word.querySelectorAll('.letter');
        if (state.currentLetterIndex < letters.length) letters[state.currentLetterIndex].classList.add('current');
        else word.classList.add('caret-at-end');

        const lineHeight = parseFloat(getComputedStyle(elements.wrapper).lineHeight);
        const desiredOffset = Math.max(0, word.offsetTop - lineHeight);
        if (Math.abs(desiredOffset - state.wrapperOffset) > 1) {
            state.wrapperOffset = desiredOffset;
            elements.wrapper.style.transform = `translateY(-${desiredOffset}px)`;
        }
    }

    function setLiveMetrics(elapsedSeconds) {
        const safeElapsed = Math.max(elapsedSeconds, 1);
        const raw = Math.round((state.keypresses / 5) / (safeElapsed / 60));
        const accuracyBase = state.keypresses + state.missed;
        const accuracy = accuracyBase ? Math.round((state.correct / accuracyBase) * 100) : 100;
        elements.liveWpm.textContent = String(Math.max(0, raw));
        elements.liveAccuracy.textContent = `${Math.max(0, Math.min(100, accuracy))}%`;
    }

    function startTest() {
        if (state.started || state.finished) return;
        state.started = true;
        state.startTime = performance.now();
        elements.shell.classList.add('started');
        elements.status.textContent = `Teste iniciado. ${state.duration} segundos.`;
        state.timer = window.setInterval(tick, 200);
    }

    function tick() {
        const elapsed = (performance.now() - state.startTime) / 1000;
        const remaining = Math.max(0, Math.ceil(state.duration - elapsed));
        state.timeLeft = remaining;
        elements.liveTime.textContent = String(remaining);
        setLiveMetrics(elapsed);

        const sampleSecond = Math.floor(elapsed);
        if (sampleSecond > state.lastSampleSecond) {
            const intervalSeconds = sampleSecond - state.lastSampleSecond;
            const intervalKeys = state.keypresses - state.lastSampleKeypresses;
            state.speedSamples.push(Math.round((intervalKeys / 5) / (intervalSeconds / 60)));
            state.lastSampleSecond = sampleSecond;
            state.lastSampleKeypresses = state.keypresses;
        }
        if (elapsed >= state.duration) endTest();
    }

    function addErrorKey(key) {
        const normalized = key === ' ' ? 'espaço' : key.toLocaleLowerCase('pt-BR');
        state.errorKeys.set(normalized, (state.errorKeys.get(normalized) || 0) + 1);
    }

    function markCurrentWordProblem() {
        const word = currentWord();
        if (word?.dataset.text) state.problemWords.add(word.dataset.text);
    }

    function processCharacter(character) {
        if (state.finished || character === '\n' || character === '\r') return;
        if (character === ' ') {
            submitWord();
            return;
        }
        if (!state.started) startTest();

        const word = currentWord();
        if (!word) return;
        const originalLetters = Array.from(word.querySelectorAll('.letter:not(.extra-letter)'));
        state.keypresses += 1;

        if (state.currentLetterIndex < originalLetters.length) {
            const letter = originalLetters[state.currentLetterIndex];
            if (character === letter.textContent) {
                letter.classList.add('correct');
                state.correct += 1;
            } else {
                letter.classList.add('incorrect');
                letter.dataset.typed = character;
                state.wrong += 1;
                addErrorKey(letter.textContent);
                markCurrentWordProblem();
            }
        } else {
            const extra = document.createElement('span');
            extra.className = 'letter incorrect extra-letter';
            extra.textContent = character;
            word.appendChild(extra);
            state.extra += 1;
            addErrorKey('extra');
            markCurrentWordProblem();
        }
        state.currentLetterIndex += 1;
        setLiveMetrics((performance.now() - state.startTime) / 1000);
        updateTypingPosition();
    }

    function submitWord() {
        if (!state.started || state.currentLetterIndex === 0 || state.finished) return;
        const word = currentWord();
        if (!word) return;
        const originalLetters = Array.from(word.querySelectorAll('.letter:not(.extra-letter)'));
        if (state.currentLetterIndex < originalLetters.length) {
            markCurrentWordProblem();
            for (let index = state.currentLetterIndex; index < originalLetters.length; index += 1) {
                originalLetters[index].classList.add('missed');
                state.missed += 1;
                addErrorKey(originalLetters[index].textContent);
            }
        }

        state.currentWordIndex += 1;
        state.currentLetterIndex = 0;
        const words = elements.wrapper.querySelectorAll('.word');
        if (state.currentWordIndex > words.length - 35) appendWords(state.mode === 'sentences' ? 8 : 70);
        setLiveMetrics((performance.now() - state.startTime) / 1000);
        requestAnimationFrame(updateTypingPosition);
    }

    function handleBackspace() {
        if (!state.started || state.currentLetterIndex <= 0 || state.finished) return;
        const word = currentWord();
        if (!word) return;
        const letters = Array.from(word.querySelectorAll('.letter'));
        const target = letters[state.currentLetterIndex - 1];
        if (!target) return;
        if (target.classList.contains('incorrect') || target.classList.contains('extra-letter')) state.corrected += 1;
        if (target.classList.contains('extra-letter')) target.remove();
        else {
            target.classList.remove('correct', 'incorrect');
            delete target.dataset.typed;
        }
        state.currentLetterIndex -= 1;
        updateTypingPosition();
    }

    function consistencyScore(samples) {
        const usable = samples.filter((value) => Number.isFinite(value));
        if (usable.length < 2) return usable.length ? 100 : 0;
        const mean = usable.reduce((sum, value) => sum + value, 0) / usable.length;
        if (mean === 0) return 0;
        const variance = usable.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / usable.length;
        const deviation = Math.sqrt(variance);
        return Math.max(0, Math.min(100, Math.round(100 - ((deviation / mean) * 100))));
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
        const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
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
        if (result.accuracy < 90) {
            elements.diagnosisTitle.textContent = 'Priorize precisão antes de acelerar';
            elements.diagnosisText.textContent = 'Reduza um pouco o ritmo e procure terminar cada palavra corretamente. Velocidade virá com a repetição.';
        } else if (result.consistency < 72) {
            elements.diagnosisTitle.textContent = 'Busque um ritmo mais constante';
            elements.diagnosisText.textContent = 'Você alternou entre trechos rápidos e pausas. Tente manter uma cadência confortável do início ao fim.';
        } else if (result.netWpm < 30) {
            elements.diagnosisTitle.textContent = 'Sua base está ficando mais segura';
            elements.diagnosisText.textContent = 'A precisão está no caminho certo. Pratique sessões curtas e frequentes para ganhar automatização.';
        } else {
            elements.diagnosisTitle.textContent = 'Bom equilíbrio entre ritmo e controle';
            elements.diagnosisText.textContent = 'Mantenha a regularidade e use as letras indicadas abaixo para transformar pequenos erros em progresso.';
        }
    }

    function renderProblemKeys() {
        elements.problemKeys.replaceChildren();
        const entries = [...state.errorKeys.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (!entries.length) entries.push(['—', 0]);
        entries.forEach(([key]) => {
            const badge = document.createElement('kbd');
            badge.textContent = key;
            elements.problemKeys.appendChild(badge);
        });
    }

    function endTest() {
        if (state.finished) return;
        window.clearInterval(state.timer);
        state.finished = true;
        state.timeLeft = 0;
        const elapsedMinutes = state.duration / 60;
        const netWpm = Math.max(0, Math.round((state.correct / 5) / elapsedMinutes));
        const rawWpm = Math.max(0, Math.round((state.keypresses / 5) / elapsedMinutes));
        const accuracyBase = state.keypresses + state.missed;
        const accuracy = accuracyBase ? Math.max(0, Math.min(100, Math.round((state.correct / accuracyBase) * 100))) : 0;
        const consistency = consistencyScore(state.speedSamples);
        const result = { netWpm, rawWpm, accuracy, consistency };
        const history = readHistory();

        elements.liveTime.textContent = '0';
        elements.resultWpm.textContent = String(netWpm);
        elements.resultRaw.textContent = String(rawWpm);
        elements.resultAccuracy.textContent = `${accuracy}%`;
        elements.resultConsistency.textContent = `${consistency}%`;
        elements.charsCorrect.textContent = String(state.correct);
        elements.charsWrong.textContent = String(state.wrong);
        elements.charsMissed.textContent = String(state.missed);
        elements.charsExtra.textContent = String(state.extra);
        elements.chartDuration.textContent = `${state.duration} segundos`;
        elements.resultSummary.textContent = state.corrected
            ? `Você corrigiu ${state.corrected} ${state.corrected === 1 ? 'erro durante' : 'erros durante'} o teste. Isso também faz parte da precisão.`
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

        const difficultWords = [...state.problemWords].slice(0, 6);
        elements.problemWords.textContent = difficultWords.length ? difficultWords.join(' · ') : 'Nenhuma palavra problemática identificada.';
        renderProblemKeys();
        setDiagnosis(result);
        buildChart([...state.speedSamples, rawWpm]);
        saveResult(result);

        elements.shell.classList.add('finished');
        elements.shell.classList.remove('focused');
        elements.resultPanel.hidden = false;
        elements.input.blur();
        elements.status.textContent = `Teste concluído. ${netWpm} palavras por minuto, ${accuracy}% de precisão e ${consistency}% de consistência.`;
        requestAnimationFrame(() => elements.resultTitle.focus());
    }

    function initTest({ focus = false } = {}) {
        if (state?.timer) window.clearInterval(state.timer);
        const settings = state ? { mode: state.mode, level: state.level, duration: state.duration } : {};
        state = freshState(settings);
        generateWords();
        elements.wrapper.style.transform = 'translateY(0)';
        elements.liveWpm.textContent = '0';
        elements.liveAccuracy.textContent = '100%';
        elements.liveTime.textContent = String(state.duration);
        elements.input.value = '';
        elements.resultPanel.hidden = true;
        elements.shell.classList.remove('started', 'finished', 'focused');
        elements.status.textContent = 'Teste pronto.';
        requestAnimationFrame(updateTypingPosition);
        if (focus) requestAnimationFrame(() => elements.input.focus());
    }

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
            if (!button) return;
            control.querySelectorAll('.segment').forEach((item) => {
                const active = item === button;
                item.classList.toggle('active', active);
                item.setAttribute('aria-pressed', String(active));
            });
            const type = control.dataset.control;
            if (type === 'mode') state.mode = button.dataset.value;
            if (type === 'level') state.level = button.dataset.value;
            if (type === 'time') state.duration = Number(button.dataset.value);
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
    initTest();
});
