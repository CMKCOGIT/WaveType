// js/ui/plataforma.js — apresentação da área logada e das telas de acesso.
// Coloca o botão de tema (claro/escuro) no topo da plataforma e nas telas de
// login/cadastro. Usa a mesma chave do site público (wavetype_theme), então a
// escolha vale em todas as páginas. Não toca em dados, sessão nem formulários.

const CHAVE_TEMA = 'wavetype_theme';
const raiz = document.documentElement;

const ICONE_LUA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';
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

function montar() {
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
