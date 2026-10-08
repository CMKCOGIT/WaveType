// js/pages/usuario-conquistas.js
import { exigirPapel } from '../auth.js';
import { listarConquistasComProgresso } from '../api/achievements.js';

const SO_DE_TURMA = ['turma_nota_10']; // conquistas que dependem de turma/ranking

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('usuario');
  if (!perfil) return;

  try {
    const todas = await listarConquistasComProgresso();
    const conquistas = todas.filter((c) => !SO_DE_TURMA.includes(c.codigo));
    const desbloqueadas = conquistas.filter((c) => c.desbloqueada).length;

    document.querySelector('[data-resumo]').textContent =
      `${desbloqueadas} de ${conquistas.length} marcos desbloqueados. A gamificação reconhece constância sem tirar o foco do aprendizado.`;

    document.querySelector('[data-grid-conquistas]').innerHTML = conquistas
      .map(
        (c) => `
        <article class="achievement${c.desbloqueada ? '' : ' locked'}">
          <span class="achievement-icon">${c.desbloqueada ? '' : '◌'}</span>
          <h3>${escapar(c.titulo)}</h3>
          <p>${escapar(c.descricao)}</p>
          <small>${c.desbloqueada ? 'Desbloqueada' : 'Bloqueada'}</small>
        </article>`
      )
      .join('');
  } catch (erro) {
    console.error('Falha ao carregar conquistas:', erro);
  }
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}