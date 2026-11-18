// js/ui/moderacao.js
// Interface da moderação de conteúdo (regras em js/moderacao/conteudo.js).
// - Enquanto o professor digita, um aviso discreto aparece sob o campo.
// - Ao salvar, se houver ocorrências, um painel de revisão lista cada termo
//   com o trecho e o motivo. O professor pode ir direto ao termo para
//   corrigir ou, depois de revisar, confirmar que o conteúdo é adequado.
// Nada é bloqueado automaticamente: a decisão final é do professor.
import { analisarTexto, moderarCampos } from '../moderacao/conteudo.js';

const ROTULOS = { titulo: 'Título', instrucoes: 'Instruções', texto_referencia: 'Texto do exercício' };

function escapar(texto) {
  const d = document.createElement('div');
  d.textContent = texto ?? '';
  return d.innerHTML;
}

function destacar(trecho, termo) {
  const seguro = escapar(trecho);
  const alvo = escapar(termo);
  const i = seguro.toLowerCase().indexOf(alvo.toLowerCase());
  return i < 0 ? seguro : `${seguro.slice(0, i)}<mark>${seguro.slice(i, i + alvo.length)}</mark>${seguro.slice(i + alvo.length)}`;
}

function assinatura(campos) {
  return JSON.stringify(campos);
}

function irParaOcorrencia(form, ocorrencia) {
  const campo = form.elements[ocorrencia.campo];
  if (!campo) return;
  campo.focus();
  try {
    campo.setSelectionRange(ocorrencia.inicio, ocorrencia.fim);
  } catch {
    /* campo sem seleção */
  }
  campo.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/** Avisos ao vivo sob os campos marcados com data-moderar. */
export function ligarModeracaoAoVivo(form) {
  form.querySelectorAll('[data-moderar]').forEach((campo) => {
    const aviso = document.createElement('p');
    aviso.className = 'moderacao-aviso';
    aviso.id = `moderacao-${campo.name}`;
    aviso.hidden = true;
    aviso.setAttribute('aria-live', 'polite');
    campo.setAttribute('aria-describedby', [campo.getAttribute('aria-describedby'), aviso.id].filter(Boolean).join(' '));
    (campo.closest('.field') || campo).append(aviso);
    let espera = null;
    const verificar = () => {
      const ocorrencias = analisarTexto(campo.value);
      aviso.hidden = !ocorrencias.length;
      if (!ocorrencias.length) return;
      const ofensivo = ocorrencias.some((o) => o.gravidade === 'ofensivo');
      aviso.classList.toggle('grave', ofensivo);
      const termos = [...new Set(ocorrencias.map((o) => `“${o.termo}”`))].slice(0, 4).join(', ');
      aviso.textContent = ofensivo
        ? `Revise: ${termos} pode ser ofensivo ou inadequado para os alunos.`
        : `Atenção ao contexto: ${termos}. Confirme se o sentido é adequado à turma.`;
    };
    campo.addEventListener('input', () => {
      clearTimeout(espera);
      espera = setTimeout(verificar, 450);
    });
    form.addEventListener('reset', () => requestAnimationFrame(verificar));
    campo.wtVerificarModeracao = verificar;
  });
}

/** Reavalia os avisos ao vivo (ex.: depois de preencher o formulário por script). */
export function atualizarAvisos(form) {
  form.querySelectorAll('[data-moderar]').forEach((campo) => campo.wtVerificarModeracao?.());
}

/**
 * Confere o conteúdo antes de salvar. Devolve true se pode salvar (sem
 * ocorrências ou já revisado pelo professor); senão mostra o painel de
 * revisão e devolve false.
 */
export function conteudoRevisado(form, campos, { antesDe }) {
  const painelAntigo = form.querySelector('.moderacao-revisao');
  const resultado = moderarCampos(campos);
  if (!resultado.ocorrencias.length) {
    painelAntigo?.remove();
    return true;
  }
  if (form.dataset.moderacaoConfirmada === assinatura(campos)) return true;

  painelAntigo?.remove();
  const grave = resultado.ofensivas > 0;
  const painel = document.createElement('section');
  painel.className = `moderacao-revisao${grave ? ' grave' : ''}`;
  painel.setAttribute('role', 'alert');
  painel.setAttribute('aria-labelledby', 'moderacao-titulo');
  painel.innerHTML = `
    <div class="moderacao-cabeca">
      <span class="moderacao-icone" aria-hidden="true">!</span>
      <div>
        <h3 id="moderacao-titulo" tabindex="-1">${grave ? 'Revise o conteúdo antes de enviar aos alunos' : 'Confira o contexto antes de enviar'}</h3>
        <p>${grave
          ? 'Encontramos termos que podem ser ofensivos, discriminatórios ou inadequados para estudantes. Corrija o texto ou, se o uso for pedagógico, confirme abaixo.'
          : 'Algumas palavras têm mais de um sentido ou tratam de temas sensíveis. Se o uso for educativo, você pode seguir.'}</p>
      </div>
    </div>
    <ul class="moderacao-lista">
      ${resultado.ocorrencias
        .map(
          (o, i) => `<li class="${o.gravidade}">
            <div><strong>${escapar(ROTULOS[o.campo] ?? o.campo)} · ${escapar(o.categoria)}</strong>
            <q>${destacar(o.trecho, o.termo)}</q><small>${escapar(o.motivo)}</small></div>
            <button type="button" class="button secondary small" data-ir-ocorrencia="${i}">Corrigir</button>
          </li>`
        )
        .join('')}
    </ul>
    ${grave ? '<label class="checkbox-line moderacao-confirmar"><input type="checkbox" data-confirmar-moderacao> Revisei: o conteúdo tem finalidade pedagógica e é adequado à idade da turma.</label>' : ''}
    <div class="form-actions">
      <button type="button" class="button" data-ir-ocorrencia="0">Corrigir o texto</button>
      <button type="button" class="button secondary" data-salvar-mesmo-assim ${grave ? 'disabled' : ''}>Salvar mesmo assim</button>
    </div>`;
  (antesDe || form.querySelector('.form-actions')).before(painel);

  const salvar = painel.querySelector('[data-salvar-mesmo-assim]');
  painel.querySelector('[data-confirmar-moderacao]')?.addEventListener('change', (evento) => {
    salvar.disabled = !evento.target.checked;
  });
  painel.addEventListener('click', (evento) => {
    const ir = evento.target.closest('[data-ir-ocorrencia]');
    if (ir) return irParaOcorrencia(form, resultado.ocorrencias[Number(ir.dataset.irOcorrencia)]);
    if (evento.target.closest('[data-salvar-mesmo-assim]') && !salvar.disabled) {
      form.dataset.moderacaoConfirmada = assinatura(campos);
      painel.remove();
      form.requestSubmit();
    }
  });
  painel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  painel.querySelector('#moderacao-titulo').focus({ preventScroll: true });
  return false;
}

/** Limpa o estado da revisão (ex.: ao abrir o formulário de novo). */
export function limparRevisao(form) {
  delete form.dataset.moderacaoConfirmada;
  form.querySelector('.moderacao-revisao')?.remove();
}
