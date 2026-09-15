(function () {
    'use strict';

    const body = document.body;
    const root = body.dataset.root || '';
    const role = body.dataset.role || 'aluno';
    const currentPage = body.dataset.page || 'inicio';

    const icons = {
        menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
        home: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
        keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M7 13h.01M10 13h.01M13 13h.01M16 13h.01M8 16h8"/>',
        chart: '<path d="M4 20V10M9 20V4M14 20v-7M19 20V8M2 20h20"/>',
        medal: '<circle cx="12" cy="13" r="5"/><path d="m9 8-2-5h4l1 3 1-3h4l-2 5M9.5 17l-1 4 3.5-2 3.5 2-1-4"/>',
        trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/>',
        class: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v4c3 2 7 2 10 0v-4M21 9v6"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        file: '<path d="M6 2h8l4 4v16H6V2Z"/><path d="M14 2v5h5M9 13h6M9 17h6M9 9h1"/>',
        bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        upload: '<path d="M12 16V4M7 9l5-5 5 5M4 15v5h16v-5"/>',
        key: '<circle cx="8" cy="15" r="3"/><path d="m10 13 8-8 2 2-2 2 1 1-2 2-1-1-4 4"/>',
        play: '<path d="m8 5 11 7-11 7V5Z"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>'
    };

    function icon(name) {
        return `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.home}</svg>`;
    }

    const navByRole = {
        aluno: [
            ['inicio', 'Visão geral', 'home', 'index.html'],
            ['treinamento', 'Praticar', 'keyboard', 'treinamento.html'],
            ['resultados', 'Resultados', 'chart', 'resultados.html'],
            ['conquistas', 'Conquistas', 'medal', 'conquistas.html'],
            ['ranking', 'Ranking', 'trophy', 'ranking.html']
        ],
        professor: [
            ['inicio', 'Visão geral', 'home', 'index.html'],
            ['turmas', 'Turmas', 'class', 'turmas.html'],
            ['alunos', 'Alunos', 'users', 'alunos.html'],
            ['exercicios', 'Exercícios', 'keyboard', 'exercicios.html'],
            ['relatorios', 'Relatórios', 'file', 'relatorios.html']
        ]
    };

    const profile = role === 'professor'
        ? { name: 'Prof. Carlos Menezes', detail: 'Professor', initials: 'CM' }
        : { name: 'Lucas Ferreira', detail: '3º Ano A · Nível 5', initials: 'LF' };

    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
        const nav = navByRole[role] || navByRole.aluno;
        sidebar.className = 'app-sidebar';
        sidebar.innerHTML = `
            <a class="app-brand" href="${root}index.html" aria-label="WaveType, voltar ao site">
                <img class="logo-light" src="${root}assets/images/brand/wavetype-logo.svg" alt="WaveType">
                <img class="logo-dark" src="${root}assets/images/brand/wavetype-logo-dark.svg" alt="WaveType">
            </a>
            <p class="role-label">Espaço ${role === 'professor' ? 'do professor' : 'do aluno'}</p>
            <nav class="app-nav" aria-label="Navegação do ${role}">
                ${nav.map(([id, label, iconName, href]) => `<a href="${href}" ${id === currentPage ? 'aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></a>`).join('')}
            </nav>
            ${role === 'aluno' ? `
                <div class="sidebar-progress">
                    <div class="sidebar-progress-head"><span>Nível 5</span><span class="mono">420/800 XP</span></div>
                    <div class="progress-track"><div class="progress-fill" style="width:52.5%"></div></div>
                </div>` : ''}
            <div class="sidebar-profile">
                <strong>${profile.name}</strong><small>${profile.detail}</small>
                <button class="sidebar-signout" type="button" data-signout>${icon('close')} Sair da demonstração</button>
            </div>`;
    }

    const topbar = document.getElementById('app-topbar');
    if (topbar) {
        topbar.className = 'app-topbar';
        topbar.innerHTML = `
            <button class="mobile-menu" type="button" aria-label="Abrir menu" aria-expanded="false">${icon('menu')}</button>
            <div class="topbar-spacer"></div>
            <button class="icon-button" type="button" aria-label="Notificações" data-demo-action="As notificações serão conectadas aos avisos das turmas.">${icon('bell')}</button>
            <button class="theme-button" type="button" aria-label="Alternar tema">${icon('sun')}</button>
            <div class="profile-chip" aria-label="Perfil de demonstração"><span>${profile.initials}</span><div><strong>${profile.name}</strong><small>${profile.detail}</small></div></div>`;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = '<i></i><span></span>';
    document.body.appendChild(toast);
    let toastTimer;

    window.WaveTypeUI = {
        showToast(message) {
            toast.querySelector('span').textContent = message;
            toast.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
        },
        openModal(config) {
            openModal(config);
        }
    };

    function setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('wavetype_theme', theme);
    }

    document.querySelector('.theme-button')?.addEventListener('click', () => {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    document.querySelector('.mobile-menu')?.addEventListener('click', (event) => {
        const open = body.classList.toggle('sidebar-open');
        event.currentTarget.setAttribute('aria-expanded', String(open));
    });

    body.addEventListener('click', (event) => {
        if (body.classList.contains('sidebar-open') && event.target === body) body.classList.remove('sidebar-open');
        const demoAction = event.target.closest('[data-demo-action]');
        if (demoAction) window.WaveTypeUI.showToast(demoAction.dataset.demoAction);
        const opener = event.target.closest('[data-modal]');
        if (opener) openNamedModal(opener.dataset.modal);
        if (event.target.closest('[data-signout]')) window.location.href = `${root}login.html`;
    });

    function openNamedModal(name) {
        const modalContent = {
            turma: {
                title: 'Criar nova turma',
                text: 'Defina o nome. O código de convite será gerado pelo serviço de turmas no momento da integração.',
                body: '<div class="form-grid"><label class="field"><span>Nome da turma</span><input name="nome" maxlength="120" placeholder="Ex.: 3º Ano A" required></label><label class="field"><span>Período</span><input name="periodo" placeholder="Ex.: 2026 · 1º semestre"></label></div>',
                action: 'Criar turma'
            },
            exercicio: {
                title: 'Novo exercício',
                text: 'Os nomes dos campos seguem diretamente o contrato do banco de dados.',
                body: '<div class="form-grid"><label class="field"><span>Título</span><input name="titulo" maxlength="150" required></label><label class="field"><span>Turma</span><select name="turmaId"><option value="1">3º Ano A</option><option value="2">3º Ano B</option></select></label><label class="field"><span>Texto de referência</span><textarea name="textoReferencia" minlength="10" required></textarea></label><label class="field"><span>Tempo limite</span><select name="tempoLimiteSeg"><option value="60">1 minuto</option><option value="120">2 minutos</option><option value="300">5 minutos</option></select></label></div>',
                action: 'Salvar exercício'
            },
            aluno: {
                title: 'Adicionar aluno',
                text: 'Na integração definitiva, prefira o código de convite. O cadastro manual pode ser ligado a um fluxo administrativo seguro.',
                body: '<div class="form-grid"><label class="field"><span>Nome</span><input name="nome" maxlength="120" required></label><label class="field"><span>E-mail</span><input name="email" type="email" maxlength="190" required></label><label class="field"><span>Turma</span><select name="turmaId"><option value="1">3º Ano A</option><option value="2">3º Ano B</option></select></label></div>',
                action: 'Adicionar aluno'
            }
        }[name];
        if (modalContent) openModal(modalContent);
    }

    function openModal(config) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><span class="eyebrow">Interface de demonstração</span><h2 id="modal-title">${config.title}</h2></div><button class="modal-close" type="button" aria-label="Fechar">${icon('close')}</button></div><p>${config.text || ''}</p><form>${config.body || ''}<div class="modal-actions"><button class="button secondary" type="button" data-cancel>Cancelar</button><button class="button" type="submit">${config.action || 'Confirmar'}</button></div></form></div>`;
        body.appendChild(backdrop);
        const firstField = backdrop.querySelector('input, select, textarea');
        requestAnimationFrame(() => (firstField || backdrop.querySelector('.modal-close')).focus());

        const close = () => backdrop.remove();
        backdrop.querySelector('.modal-close').addEventListener('click', close);
        backdrop.querySelector('[data-cancel]').addEventListener('click', close);
        backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
        backdrop.querySelector('form').addEventListener('submit', (event) => {
            event.preventDefault();
            close();
            window.WaveTypeUI.showToast('A interface está pronta. Na integração, esta ação chamará o módulo correspondente do Supabase.');
        });
    }
})();
