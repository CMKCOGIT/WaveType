// js/pages/aluno-conquistas.js
import { exigirPapel } from '../auth.js';
import { listarConquistasComProgresso } from '../api/achievements.js';

iniciar();

async function iniciar() {
  const perfil = await exigirPapel('aluno');
  if (!perfil) return;

  const conquistas = await listarConquistasComProgresso();
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
}

function escapar(t) {
  const d = document.createElement('div');
  d.textContent = t ?? '';
  return d.innerHTML;
}
