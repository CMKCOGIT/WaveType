import './ui/onda.js';
import './ui/preferencias.js';
import './ui/caps-lock.js';
import { montarRodape } from './ui/rodape.js';
import { ligarBotaoTema } from './ui/tema-onda.js';

document.addEventListener('DOMContentLoaded', () => {
    montarRodape();
    // Botão de tema em onda (mesmo componente da plataforma: js/ui/tema-onda.js)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) ligarBotaoTema(themeToggle);

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

    // Carrossel com as telas reais da plataforma (aluno, professor, usuário)
    const vitrine = document.querySelector('[data-vitrine]');
    const slides = vitrine ? [...vitrine.querySelectorAll('[data-vitrine-slide]')] : [];
    const abas = vitrine ? [...vitrine.querySelectorAll('[data-vitrine-ir]')] : [];
    let atual = 0;

    function irPara(indice, { focar = false } = {}) {
        if (!slides.length) return;
        atual = (indice + slides.length) % slides.length;
        slides.forEach((slide, i) => {
            slide.hidden = i !== atual;
            slide.classList.toggle('is-ativo', i === atual);
        });
        abas.forEach((aba, i) => {
            aba.setAttribute('aria-selected', String(i === atual));
            aba.tabIndex = i === atual ? 0 : -1;
        });
        if (focar) abas[atual]?.focus();
    }
    const indiceDe = (chave) => slides.findIndex((s) => s.dataset.vitrineSlide === chave);

    vitrine?.querySelector('[data-vitrine-anterior]')?.addEventListener('click', () => irPara(atual - 1));
    vitrine?.querySelector('[data-vitrine-proxima]')?.addEventListener('click', () => irPara(atual + 1));
    abas.forEach((aba) => aba.addEventListener('click', () => irPara(indiceDe(aba.dataset.vitrineIr))));
    // Setas do teclado nas abas (padrão de tablist)
    vitrine?.querySelector('[role="tablist"]')?.addEventListener('keydown', (evento) => {
        const mapa = { ArrowLeft: atual - 1, ArrowRight: atual + 1, Home: 0, End: slides.length - 1 };
        if (!(evento.key in mapa)) return;
        evento.preventDefault();
        irPara(mapa[evento.key], { focar: true });
    });
    // Toque: arrastar para o lado troca de tela
    let inicioX = null;
    const trilho = vitrine?.querySelector('[data-vitrine-trilho]');
    trilho?.addEventListener('pointerdown', (e) => { inicioX = e.clientX; });
    trilho?.addEventListener('pointerup', (e) => {
        if (inicioX == null) return;
        const delta = e.clientX - inicioX;
        inicioX = null;
        if (Math.abs(delta) > 50) irPara(atual + (delta < 0 ? 1 : -1));
    });
    const switchPreviewTab = (chave) => { const i = indiceDe(chave); if (i >= 0) irPara(i); };

    // Links dos cards de experiência (Aluno / Professor)
    document.querySelectorAll('[data-target-tab]').forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            const tab = trigger.getAttribute('data-target-tab');
            if (tab) {
                e.preventDefault();
                switchPreviewTab(tab);
                const targetEl = document.getElementById('preview-title') || vitrine;
                targetEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});
