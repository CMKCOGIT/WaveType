// js/ui/plataforma.js — apresentação da área logada e das telas de acesso.
// - Botão de tema (claro/escuro) no topo da plataforma e nas telas de
//   login/cadastro. Usa a mesma chave do site público (wavetype_theme).
// - No celular/tablet (até 820 px), o menu lateral vira uma gaveta aberta pelo
//   botão ☰ do topo.
// - Rótulos das colunas nas células das tabelas, para que no celular cada linha
//   vire um cartão legível.
// Não toca em dados, sessão nem formulários.

const CHAVE_TEMA = 'wavetype_theme';
const raiz = document.documentElement;

const ICONE_LUA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';
const ICONE_MENU =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
const ICONE_FECHAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ICONE_SOL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

function temaAtual() {
  return raiz.dataset.theme === 'dark' ? 'dark' : 'light';
}

function sincronizar(botao) {
  const escuro = temaAtual() === 'dark';
  botao.setAttribute('aria-pressed', String(escuro));
  botao.setAttribute('aria-label', escuro ? 'Ativar tema claro' : 'Ativar tema escuro');
  botao.title = escuro ? 'Tema claro' : 'Tema escuro';
  botao.innerHTML = escuro ? ICONE_SOL : ICONE_LUA;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0E1730' : '#315FD6');
}

function criarBotaoTema() {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'wt-tema';
  botao.addEventListener('click', () => {
    const proximo = temaAtual() === 'dark' ? 'light' : 'dark';
    // Troca suave de cores (classe removida logo depois para não afetar outras transições)
    raiz.classList.add('wt-trocando-tema');
    raiz.dataset.theme = proximo;
    try {
      localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      /* navegação privada: o tema vale só nesta página */
    }
    sincronizar(botao);
    setTimeout(() => raiz.classList.remove('wt-trocando-tema'), 400);
  });
  sincronizar(botao);
  return botao;
}

// ---------- Menu em gaveta (celular e tablet) ----------
const TELA_PEQUENA = matchMedia('(max-width: 820px)');

function montarMenuMovel() {
  const menu = document.getElementById('app-sidebar');
  const topo = document.querySelector('.app-topbar');
  const area = document.querySelector('.app-workspace');
  if (!menu || !topo || !area || topo.querySelector('.wt-menu-botao')) return;

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'wt-icone-botao wt-menu-botao';
  botao.setAttribute('aria-controls', 'app-sidebar');
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-label', 'Abrir menu');
  botao.innerHTML = ICONE_MENU;
  topo.prepend(botao);

  // Logo no topo (no celular o menu lateral fica recolhido)
  const marca = menu.querySelector('.app-brand')?.cloneNode(true);
  if (marca) {
    marca.classList.remove('app-brand');
    marca.classList.add('wt-topo-marca');
    botao.after(marca);
  }

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'wt-icone-botao wt-menu-fechar';
  fechar.setAttribute('aria-label', 'Fechar menu');
  fechar.innerHTML = ICONE_FECHAR;
  menu.prepend(fechar);

  const fundo = document.createElement('div');
  fundo.className = 'wt-menu-fundo';
  fundo.setAttribute('aria-hidden', 'true');
  document.body.append(fundo);

  const aberto = () => raiz.classList.contains('wt-menu-aberto');

  // Fechada no celular, a gaveta sai da ordem do teclado; aberta, o resto da página sai.
  function sincronizar() {
    const pequena = TELA_PEQUENA.matches;
    menu.inert = pequena && !aberto();
    area.inert = pequena && aberto();
    if (pequena) {
      menu.setAttribute('role', 'dialog');
      menu.setAttribute('aria-modal', 'true');
      menu.setAttribute('aria-label', 'Menu');
    } else {
      menu.removeAttribute('role');
      menu.removeAttribute('aria-modal');
      menu.removeAttribute('aria-label');
    }
  }

  function abrir() {
    raiz.classList.add('wt-menu-aberto');
    botao.setAttribute('aria-expanded', 'true');
    botao.setAttribute('aria-label', 'Fechar menu');
    sincronizar();
    (menu.querySelector('.app-nav a[aria-current="page"]') || menu.querySelector('.app-nav a') || fechar).focus();
  }

  function fecharMenu({ devolverFoco = true } = {}) {
    if (!aberto()) return;
    raiz.classList.remove('wt-menu-aberto');
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-label', 'Abrir menu');
    sincronizar();
    if (devolverFoco) botao.focus();
  }

  botao.addEventListener('click', () => (aberto() ? fecharMenu() : abrir()));
  fechar.addEventListener('click', () => fecharMenu());
  fundo.addEventListener('click', () => fecharMenu());
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && aberto()) fecharMenu();
  });
  // Ao escolher uma página, a gaveta fecha (a navegação segue normalmente)
  menu.addEventListener('click', (evento) => {
    if (evento.target.closest('a[href]')) fecharMenu({ devolverFoco: false });
  });
  TELA_PEQUENA.addEventListener('change', () => {
    fecharMenu({ devolverFoco: false });
    sincronizar();
  });
  sincronizar();
}

// ---------- Rótulos das tabelas (cartões no celular) ----------
function rotularTabelas() {
  document.querySelectorAll('.data-table').forEach((tabela) => {
    const rotular = () => {
      const titulos = [...tabela.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      tabela.querySelectorAll('tbody tr').forEach((linha) => {
        let coluna = 0;
        for (const celula of linha.children) {
          const largura = celula.colSpan || 1;
          if (largura === 1 && titulos[coluna] && celula.dataset.label !== titulos[coluna]) {
            celula.dataset.label = titulos[coluna];
          }
          coluna += largura;
        }
      });
    };
    rotular();
    // As linhas chegam depois, pelo JS de cada página
    new MutationObserver(rotular).observe(tabela, { childList: true, subtree: true });
  });
}

// Dica com o nome de cada item, útil quando o menu mostra só os ícones
function nomearItensDoMenu() {
  document.querySelectorAll('.app-nav a').forEach((link) => {
    const nome = link.textContent.trim();
    if (nome && !link.title) link.title = nome;
  });
}

function montar() {
  montarMenuMovel();
  nomearItensDoMenu();
  rotularTabelas();
  // Área logada: antes do cartão do perfil, no topo
  const topo = document.querySelector('.app-topbar');
  if (topo && !topo.querySelector('.wt-tema')) {
    const perfil = topo.querySelector('.topbar-profile');
    topo.insertBefore(criarBotaoTema(), perfil || null);
  }
  // Telas de acesso: canto do painel do formulário
  const acesso = document.querySelector('.auth-main');
  if (acesso && !acesso.querySelector('.wt-tema')) acesso.prepend(criarBotaoTema());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
else montar();
