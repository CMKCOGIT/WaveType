// js/ui/toast-conquista.js
// Aviso discreto, no canto da tela, quando o banco libera uma conquista.
import { iconeConquista } from './icones.js';

export function avisarConquistas(conquistas) {
  if (!conquistas?.length) return;

  let area = document.querySelector('.wt-toast-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'wt-toast-area';
    area.setAttribute('role', 'status');
    area.setAttribute('aria-live', 'polite');
    document.body.append(area);
  }

  conquistas.slice(0, 3).forEach((c, indice) => {
    setTimeout(() => {
      const toast = document.createElement('div');
      toast.className = 'wt-toast';
      toast.innerHTML = `<span class="achievement-icon">${iconeConquista(c.icone)}</span>
        <span><small>Conquista desbloqueada</small><strong></strong></span>`;
      toast.querySelector('strong').textContent = c.titulo;
      area.append(toast);
      setTimeout(() => {
        toast.classList.add('saindo');
        setTimeout(() => toast.remove(), 320);
      }, 5200);
    }, indice * 450);
  });
}
