// js/sessao/cabecalho.js
// Cabeçalho do site público conforme a sessão:
//   visitante  → "Entrar" e "Criar conta"
//   carregando → espaço reservado (sem piscar "Entrar" para quem está logado)
//   conectado  → menu da conta (nome, "Meu painel", "Sair")
// O estado inicial é marcado por um script no <head> (antes da pintura),
// olhando só se há token salvo. Quem nunca entrou não baixa o Supabase.
import { temSessaoSalva, limparDadosLocais, ultimaAtividade } from './local.js';
import { DESTINOS, NOME_DO_PAPEL, iniciais, cadastroIncompleto, destinoDoPerfil, inatividadeExpirada } from './regras.js';

const raiz = document.documentElement;

function definirEstado(estado) {
  raiz.dataset.sessao = estado;
}

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || 'Minha conta';
}

function montarMenuDaConta(perfil, sair) {
  const painel = cadastroIncompleto(perfil) ? destinoDoPerfil(perfil) : DESTINOS[perfil.tipo];
  const alvo = document.querySelector('[data-header-conta]');
  if (alvo) {
    alvo.innerHTML = `
      <button type="button" class="conta-botao" aria-expanded="false" aria-controls="conta-menu" aria-haspopup="true">
        <span class="conta-avatar" aria-hidden="true">${escapar(iniciais(perfil.nome))}</span>
        <span class="conta-nome">${escapar(primeiroNome(perfil.nome))}</span>
        <span class="sr-only">: abrir menu da conta</span>
      </button>
      <div class="conta-menu" id="conta-menu" hidden>
        <p class="conta-identidade"><strong>${escapar(perfil.nome || 'Sua conta')}</strong><small>${escapar(NOME_DO_PAPEL[perfil.tipo] ?? '')}</small></p>
        <a href="${painel}">Meu painel</a>
        <button type="button" data-sair>Sair</button>
      </div>`;
    alvo.hidden = false;
    ligarMenu(alvo);
  }

  const movel = document.querySelector('[data-mobile-conta]');
  if (movel) {
    movel.innerHTML = `<a href="${painel}">Meu painel</a><button type="button" data-sair>Sair (${escapar(primeiroNome(perfil.nome))})</button>`;
    movel.hidden = false;
  }

  // "Não é você? Sair" na página inicial (computadores compartilhados).
  const aviso = document.querySelector('[data-sessao-aviso]');
  if (aviso) {
    aviso.innerHTML = `Você está conectado como <strong>${escapar(perfil.nome)}</strong>. <a href="${painel}">Ir para o meu painel</a> · Não é você? <button type="button" data-sair>Sair</button>`;
    aviso.hidden = false;
  }

  // Logado: o logo leva ao painel da pessoa (aluno, professor ou usuário),
  // não à página pública.
  document.querySelectorAll('a.brand').forEach((logo) => {
    logo.href = painel;
    logo.setAttribute('aria-label', 'WaveType, ir para o meu painel');
  });

  document.querySelectorAll('[data-sair]').forEach((botao) => botao.addEventListener('click', () => sair()));
}

function ligarMenu(alvo) {
  const botao = alvo.querySelector('.conta-botao');
  const menu = alvo.querySelector('.conta-menu');
  const abrir = (aberto) => {
    botao.setAttribute('aria-expanded', String(aberto));
    menu.hidden = !aberto;
  };
  botao.addEventListener('click', () => {
    const aberto = botao.getAttribute('aria-expanded') !== 'true';
    abrir(aberto);
    if (aberto) menu.querySelector('a, button')?.focus();
  });
  alvo.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || menu.hidden) return;
    evento.preventDefault();
    abrir(false);
    botao.focus();
  });
  document.addEventListener('click', (evento) => {
    if (!alvo.contains(evento.target)) abrir(false);
  });
  alvo.addEventListener('focusout', (evento) => {
    if (evento.relatedTarget && !alvo.contains(evento.relatedTarget)) abrir(false);
  });
}

async function iniciar() {
  if (!temSessaoSalva()) return definirEstado('visitante');
  definirEstado('carregando');
  try {
    const { validarSessao, sair } = await import('./sessao.js');
    const { estado, perfil } = await validarSessao();
    if (estado !== 'valida' || !perfil || perfil.ativo === false) {
      if (estado === 'invalida') limparDadosLocais();
      return definirEstado('visitante');
    }
    // Aluno inativo há muito tempo num computador compartilhado: não
    // mostra a conta de outra pessoa; encerra em silêncio.
    if (inatividadeExpirada(perfil.tipo, ultimaAtividade())) {
      const { encerrarSessao } = await import('./sessao.js');
      await encerrarSessao({ destino: window.location.href, motivo: 'inatividade' });
      return;
    }
    montarMenuDaConta(perfil, sair);
    definirEstado('conectado');
  } catch (erro) {
    console.error('Falha ao confirmar a sessão no cabeçalho:', erro);
    definirEstado('visitante');
  }
}

iniciar();
