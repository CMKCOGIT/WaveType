// js/motion.js — módulo de movimento do redesenho (só apresentação).
// Faz os blocos abaixo da primeira tela aparecerem ao rolar.
// Não lê nem grava localStorage, não altera texto, eventos ou dados.
// Desligar: <html data-motion="off"> ou remover este <script> e o motion.css.

const ALVOS = [
  '.section-heading',
  '.content-heading',
  '.experience-card',
  '.step-item',
  '.product-browser',
  '.purpose-card',
  '.value-card',
  '.mode-card',
  '.audience-card',
  '.metric-explain-card',
  '.benefit-card',
  '.flow-step',
  '.metric-card',
  '.panel',
  '.entity-card',
  '.achievement',
].join(',');

const raiz = document.documentElement;
const semMovimento = () =>
  raiz.dataset.motion === 'off' ||
  matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.body.classList.contains('reduce-motion');

function iniciar() {
  if (semMovimento() || !('IntersectionObserver' in window)) return;

  // Só o bloco mais externo de cada grupo é animado (sem animação dentro de animação).
  const elementos = [...document.querySelectorAll(ALVOS)].filter((el) => !el.parentElement.closest(ALVOS));
  if (!elementos.length) return;

  const vistos = new WeakSet();
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach(({ target, isIntersecting }) => {
        // Primeira leitura: o que já está na tela fica como está (nada pisca, o LCP não muda);
        // o resto é preparado para aparecer quando chegar à tela.
        if (!vistos.has(target)) {
          vistos.add(target);
          if (isIntersecting) return observador.unobserve(target);
          target.setAttribute('data-wt-reveal', '');
          return;
        }
        if (!isIntersecting) return;
        target.classList.add('wt-revelado');
        observador.unobserve(target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );

  elementos.forEach((el) => {
    // Escalonamento entre irmãos do mesmo grupo (cartões lado a lado)
    const irmaos = [...el.parentElement.children].filter((f) => f.matches(ALVOS));
    el.style.setProperty('--wt-ordem', String(Math.min(irmaos.indexOf(el), 4)));
    observador.observe(el);
  });
  raiz.classList.add('wt-motion');

  const mostrarTudo = () => {
    elementos.forEach((el) => el.classList.add('wt-revelado'));
    observador.disconnect();
  };
  // Se a pessoa ligar "Reduzir movimento", mostra tudo na hora.
  new MutationObserver(() => {
    if (semMovimento()) mostrarTudo();
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  // Na impressão nada pode ficar oculto.
  addEventListener('beforeprint', mostrarTudo);
}

// Fora do caminho crítico: espera o navegador ficar ocioso.
const quandoOcioso = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
quandoOcioso(iniciar, { timeout: 1500 });
