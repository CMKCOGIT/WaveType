// js/ui/preferencias.js
// Preferências de acessibilidade do aparelho (valem em todas as páginas,
// no site público e na plataforma):
//   high-contrast   alto contraste
//   reduce-motion   reduzir movimentos (o sistema também é respeitado:
//                   prefers-reduced-motion: reduce)
//   single-line     texto dos blocos de escrita em uma única linha
//   font-scale      tamanho do texto dos blocos de escrita (0,8× a 1,8×)
//
// As classes ficam no <html> (aplicadas já no <head>, sem piscar) e no
// <body> (regras e scripts antigos leem body.high-contrast etc.).
// Mudanças disparam o evento "wavetype:preferencias" no document.
//
// montarFerramentasEscrita(bloco) padroniza as ferramentas de acessibilidade
// de qualquer bloco de escrita (teste público, treino, exercícios, nivelamento).

export const PREFERENCIAS = ['high-contrast', 'reduce-motion', 'single-line'];
export const ESCALA = { minima: 0.8, maxima: 1.8, passo: 0.1, padrao: 1 };

const NAVEGADOR = typeof document !== 'undefined';
const raiz = NAVEGADOR ? document.documentElement : null;
const SISTEMA_SEM_MOVIMENTO = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

function ler(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* navegação privada: vale só nesta página */
  }
}

export function preferenciaAtiva(nome) {
  return ler(`wavetype_${nome}`) === 'true';
}

/** Movimento reduzido pela pessoa, pelo sistema ou pela página. */
export function movimentoReduzido() {
  return preferenciaAtiva('reduce-motion') || Boolean(SISTEMA_SEM_MOVIMENTO?.matches) || raiz?.dataset.motion === 'off';
}

const arredondar = (n) => Math.round(n * 10) / 10;
export function limitarEscala(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return ESCALA.padrao;
  return arredondar(Math.min(ESCALA.maxima, Math.max(ESCALA.minima, n)));
}

export function escalaTexto() {
  const salva = ler('wavetype_font-scale');
  if (salva != null) return limitarEscala(salva);
  // Preferência antiga "Texto maior" vira 120%.
  return ler('wavetype_large-text') === 'true' ? 1.2 : ESCALA.padrao;
}

function avisar() {
  document.dispatchEvent(new CustomEvent('wavetype:preferencias', {
    detail: {
      escala: escalaTexto(),
      ...Object.fromEntries(PREFERENCIAS.map((p) => [p, preferenciaAtiva(p)])),
    },
  }));
}

/** Aplica as preferências salvas no <html> e no <body>. */
export function aplicarPreferencias() {
  for (const nome of PREFERENCIAS) {
    const ativa = preferenciaAtiva(nome);
    raiz.classList.toggle(nome, ativa);
    document.body?.classList.toggle(nome, ativa);
  }
  // "Texto maior" antigo aumentava a página inteira; agora o tamanho é por escala.
  document.body?.classList.remove('large-text');
  raiz.style.setProperty('--wt-escala-texto', String(escalaTexto()));
  raiz.classList.toggle('sistema-sem-movimento', Boolean(SISTEMA_SEM_MOVIMENTO?.matches));
}

export function definirPreferencia(nome, ativa) {
  gravar(`wavetype_${nome}`, String(Boolean(ativa)));
  aplicarPreferencias();
  avisar();
}

export function definirEscala(valor) {
  gravar('wavetype_font-scale', String(limitarEscala(valor)));
  try {
    localStorage.removeItem('wavetype_large-text');
  } catch {
    /* sem armazenamento */
  }
  aplicarPreferencias();
  avisar();
}

export function mudarEscala(direcao) {
  definirEscala(escalaTexto() + direcao * ESCALA.passo);
}

// ---------- Ferramentas dos blocos de escrita ----------

const ROTULOS = {
  'high-contrast': 'Alto contraste',
  'reduce-motion': 'Reduzir movimentos',
  'single-line': 'Texto em uma linha',
};
const DICAS = {
  'high-contrast': 'Cores fortes, bordas e textos bem marcados',
  'reduce-motion': 'Remove animações e transições',
  'single-line': 'O texto corre para o lado, em uma só linha',
};

let sequencia = 0;

function htmlDoAjusteDeTamanho(compacto) {
  return `<div class="wt-tamanho-texto${compacto ? ' compacto' : ''}" role="group" aria-label="Tamanho do texto">
    ${compacto ? '' : '<span class="wt-tamanho-rotulo">Tamanho do texto</span>'}
    <button type="button" class="wt-tamanho-botao" data-escala="-1" aria-label="Diminuir o tamanho do texto" title="Diminuir texto"><span aria-hidden="true">A</span><b aria-hidden="true">−</b></button>
    <output class="wt-tamanho-valor" aria-live="polite" title="Voltar ao tamanho padrão" data-escala-valor>100%</output>
    <button type="button" class="wt-tamanho-botao maior" data-escala="1" aria-label="Aumentar o tamanho do texto" title="Aumentar texto"><span aria-hidden="true">A</span><b aria-hidden="true">+</b></button>
  </div>`;
}

function htmlDoPainel() {
  return `${htmlDoAjusteDeTamanho(false)}
    ${PREFERENCIAS.map((p) => `<button type="button" class="preference-toggle" data-preference="${p}" aria-pressed="false">
      <span><span class="preference-nome">${ROTULOS[p]}</span><small>${DICAS[p]}</small></span><i aria-hidden="true"></i>
    </button>`).join('')}
    <p class="wt-pref-nota" data-nota-sistema hidden>O sistema do seu aparelho já pede menos movimento; a WaveType segue essa configuração.</p>`;
}

function sincronizar(area) {
  const escala = escalaTexto();
  area.querySelectorAll('[data-escala-valor]').forEach((saida) => {
    saida.textContent = `${Math.round(escala * 100)}%`;
  });
  area.querySelectorAll('[data-escala="-1"]').forEach((b) => (b.disabled = escala <= ESCALA.minima));
  area.querySelectorAll('[data-escala="1"]').forEach((b) => (b.disabled = escala >= ESCALA.maxima));
  area.querySelectorAll('.preference-toggle[data-preference]').forEach((botao) => {
    botao.setAttribute('aria-pressed', String(preferenciaAtiva(botao.dataset.preference)));
  });
  area.querySelectorAll('[data-nota-sistema]').forEach((nota) => (nota.hidden = !SISTEMA_SEM_MOVIMENTO?.matches));
}

function ligarControles(area) {
  area.addEventListener('click', (evento) => {
    const passo = evento.target.closest('[data-escala]');
    if (passo && !passo.disabled) return mudarEscala(Number(passo.dataset.escala));
    if (evento.target.closest('[data-escala-valor]')) return definirEscala(ESCALA.padrao);
    const alternar = evento.target.closest('.preference-toggle[data-preference]');
    if (alternar) definirPreferencia(alternar.dataset.preference, !preferenciaAtiva(alternar.dataset.preference));
  });
  document.addEventListener('wavetype:preferencias', () => sincronizar(area));
  sincronizar(area);
}

/**
 * Padroniza as ferramentas de um bloco de escrita:
 *  - menu "Acessibilidade" (tamanho do texto, alto contraste, reduzir
 *    movimentos, texto em uma linha) — o mesmo em todos os blocos;
 *  - ajuste rápido do tamanho (A− / A+) visível ao lado do texto.
 * `menuEm`: onde criar o menu se o bloco ainda não tiver um.
 * `ajusteEm`: onde pôr o ajuste rápido (antes deste elemento).
 */
export function montarFerramentasEscrita(bloco, { menuEm = null, ajusteEm = null } = {}) {
  if (!bloco || bloco.dataset.ferramentasEscrita) return;
  bloco.dataset.ferramentasEscrita = '';
  bloco.classList.add('wt-bloco-escrita');

  let menu = bloco.querySelector('.accessibility-menu');
  if (!menu && menuEm) {
    menu = document.createElement('details');
    menu.className = 'accessibility-menu';
    menu.innerHTML = '<summary>Acessibilidade</summary><div class="accessibility-panel"></div>';
    menuEm.append(menu);
  }
  const painel = menu?.querySelector('.accessibility-panel');
  if (painel) {
    sequencia += 1;
    painel.id ||= `wt-painel-acessibilidade-${sequencia}`;
    painel.setAttribute('role', 'group');
    painel.setAttribute('aria-label', 'Opções de acessibilidade do texto');
    painel.innerHTML = htmlDoPainel();
    ligarControles(painel);
    // Esc fecha o menu e devolve o foco ao botão.
    menu.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Escape' || !menu.open) return;
      evento.preventDefault();
      evento.stopPropagation();
      menu.open = false;
      menu.querySelector('summary')?.focus();
    });
    // Clique fora fecha o menu.
    document.addEventListener('click', (evento) => {
      if (menu.open && !menu.contains(evento.target)) menu.open = false;
    });
  }

  if (ajusteEm) {
    const rapido = document.createElement('div');
    rapido.className = 'wt-ajuste-rapido';
    rapido.innerHTML = htmlDoAjusteDeTamanho(true);
    ajusteEm.before(rapido);
    ligarControles(rapido);
  }
}

// Aplica já ao carregar (o <head> aplica no <html>; aqui chega ao <body>).
if (NAVEGADOR && document.body) aplicarPreferencias();
else if (NAVEGADOR) document.addEventListener('DOMContentLoaded', aplicarPreferencias, { once: true });
SISTEMA_SEM_MOVIMENTO?.addEventListener?.('change', () => {
  aplicarPreferencias();
  avisar();
});
// Outra aba mudou uma preferência: acompanha.
if (NAVEGADOR) window.addEventListener('storage', (evento) => {
  if (!evento.key || /^wavetype_(high-contrast|reduce-motion|single-line|font-scale|large-text)$/.test(evento.key)) {
    aplicarPreferencias();
    avisar();
  }
});

// Rolagens suaves pedidas pelos scripts viram instantâneas com movimento reduzido.
function semSuavidade(opcoes) {
  return opcoes && typeof opcoes === 'object' && opcoes.behavior === 'smooth' && movimentoReduzido()
    ? { ...opcoes, behavior: 'auto' }
    : opcoes;
}
if (NAVEGADOR && typeof Element !== 'undefined' && !Element.prototype.scrollIntoView.wtPreferencias) {
  const rolarAte = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function scrollIntoView(opcoes) {
    return rolarAte.call(this, semSuavidade(opcoes));
  };
  Element.prototype.scrollIntoView.wtPreferencias = true;
  for (const nome of ['scrollTo', 'scrollBy']) {
    const original = window[nome];
    if (typeof original === 'function') {
      window[nome] = function rolar(...args) {
        return original.apply(this, args.length === 1 ? [semSuavidade(args[0])] : args);
      };
    }
  }
}
