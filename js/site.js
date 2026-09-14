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
});
