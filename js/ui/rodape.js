// js/ui/rodape.js
// Direitos autorais em todas as telas: "© CMKCOGIT – Todos os direitos reservados."
// Site público: o texto já vem no HTML (.footer-copy); aqui só garantimos o link.
// Plataforma e telas de acesso: um rodapé discreto é acrescentado ao fim da área.

export const SITE_CMKCOGIT = 'https://cmkcogit.com.br';

export function htmlDireitos() {
  return `© <a class="wt-link-cmkcogit" href="${SITE_CMKCOGIT}" target="_blank" rel="noopener noreferrer" aria-label="CMKCOGIT (abre o site em nova aba)">CMKCOGIT</a> – Todos os direitos reservados.`;
}

export function montarRodape() {
  // Site público: rodapé estático
  document.querySelectorAll('.site-footer .footer-copy').forEach((copia) => {
    if (!copia.querySelector('.wt-link-cmkcogit')) copia.innerHTML = htmlDireitos();
  });
  if (document.querySelector('.site-footer, .wt-rodape')) return;

  // Plataforma (área logada) e telas de acesso
  const area = document.querySelector('.app-workspace') || document.querySelector('.auth-main');
  if (!area) return;
  const rodape = document.createElement('footer');
  rodape.className = 'wt-rodape';
  rodape.innerHTML = `<small>${htmlDireitos()}</small>`;
  area.append(rodape);
}
