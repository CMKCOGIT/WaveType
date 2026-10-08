document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeMeta = document.querySelector('meta[name="theme-color"]');

    function syncThemeControl() {
        const dark = document.documentElement.dataset.theme === 'dark';
        themeToggle?.setAttribute('aria-pressed', String(dark));
        themeToggle?.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
        themeMeta?.setAttribute('content', dark ? '#0E1730' : '#315FD6');
    }

    themeToggle?.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem('wavetype_theme', nextTheme);
        syncThemeControl();
    });
    syncThemeControl();

    const menuButton = document.getElementById('menu-button');
    const mobileNav = document.getElementById('mobile-nav');

    menuButton?.addEventListener('click', () => {
        const open = menuButton.getAttribute('aria-expanded') === 'true';
        menuButton.setAttribute('aria-expanded', String(!open));
        menuButton.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
        mobileNav.hidden = open;
    });

    mobileNav?.addEventListener('click', (event) => {
        if (!event.target.closest('a')) return;
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Abrir menu');
        mobileNav.hidden = true;
    });

    // Pontos de integração visual. O projeto que receber esta pasta define as rotas reais.
    document.querySelectorAll('[data-integration-target]').forEach((link) => {
        link.addEventListener('click', (event) => event.preventDefault());
    });

    // Alternar abas da demonstração da plataforma (Visão do Aluno / Visão do Professor)
    const previewTabButtons = document.querySelectorAll('.preview-tab-btn');
    const previewPanels = document.querySelectorAll('.preview-tabpanel');
    const browserAddress = document.getElementById('browser-address-url');

    function switchPreviewTab(targetTab) {
        if (!targetTab) return;
        previewTabButtons.forEach((btn) => {
            const isTarget = btn.getAttribute('data-tab') === targetTab;
            btn.setAttribute('aria-selected', String(isTarget));
            btn.classList.toggle('active', isTarget);
        });
        previewPanels.forEach((panel) => {
            const isTarget = panel.getAttribute('data-tab-panel') === targetTab;
            panel.hidden = !isTarget;
            panel.classList.toggle('active', isTarget);
            panel.style.display = isTarget ? '' : 'none';
        });
        if (browserAddress) {
            browserAddress.textContent = targetTab === 'professor' 
                ? 'wavetype.com.br/app/professor' 
                : 'wavetype.com.br/app/aluno';
        }
    }

    if (previewTabButtons.length > 0) {
        switchPreviewTab('aluno');
    }

    previewTabButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchPreviewTab(tab);
        });
    });

    // Links dos cards de experiência (Aluno / Professor)
    document.querySelectorAll('[data-target-tab]').forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            const tab = trigger.getAttribute('data-target-tab');
            if (tab) {
                e.preventDefault();
                switchPreviewTab(tab);
                const targetEl = document.getElementById('preview-title') || document.querySelector('.product-browser');
                targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
