// js/ui/campos-senha.js
// Comportamento comum dos campos de senha (login, cadastro, conclusão do
// cadastro com Google, perfil e redefinição):
//  - botão "olho-onda" para mostrar/ocultar a senha (identidade WaveType:
//    a pálpebra de baixo do olho é uma onda; ao ocultar, uma onda risca o olho);
//  - data-sem-colar: impede colar/arrastar texto no campo;
//  - data-requisitos: lista das regras da senha marcadas enquanto se digita;
//  - data-confirma="nome-do-outro-campo": diz, enquanto se digita, se as
//    duas senhas são iguais (e marca o campo como inválido se não forem).

const OLHO = `<svg class="wt-olho-onda" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path class="palpebra" d="M2.5 12.2C5 7.9 8.3 5.8 12 5.8s7 2.1 9.5 6.4"/>
  <path class="onda" d="M2.5 12.2c1.6 1.5 3.2 1.5 4.75 0s3.15-1.5 4.75 0 3.2 1.5 4.75 0 3.15-1.5 4.75 0"/>
  <circle class="pupila" cx="12" cy="10.6" r="2.6"/>
  <path class="risco" d="M4.2 4.4c1.1.4 1.5 1.5 2.4 2.4s2 1.3 2.4 2.4.9 2 2.4 2.4 1.5 1.3 2.4 2.4 1.3 2 2.4 2.4 1.3 1.5 2.4 2.4 1.3 1.6 2.2 2.2"/>
</svg>`;

const REGRAS = [
  { id: 'tamanho', texto: '8 ou mais caracteres', ok: (s) => s.length >= 8 },
  { id: 'letra', texto: 'pelo menos uma letra', ok: (s) => /[a-zA-Z]/.test(s) },
  { id: 'numero', texto: 'pelo menos um número', ok: (s) => /[0-9]/.test(s) },
];

let sequencia = 0;
const novoId = (prefixo) => `${prefixo}-${(sequencia += 1)}`;

function ligarOlho(campo) {
  if (campo.closest('.wt-campo-senha')) return;
  campo.dataset.senha = '';
  const caixa = document.createElement('span');
  caixa.className = 'wt-campo-senha';
  campo.replaceWith(caixa);
  caixa.append(campo);

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'wt-botao-olho';
  botao.innerHTML = OLHO;
  botao.setAttribute('aria-controls', campo.id || (campo.id = novoId('wt-senha')));
  const sincronizar = () => {
    const visivel = campo.type === 'text';
    botao.setAttribute('aria-pressed', String(visivel));
    botao.setAttribute('aria-label', visivel ? 'Ocultar senha' : 'Mostrar senha');
    botao.title = visivel ? 'Ocultar senha' : 'Mostrar senha';
    caixa.classList.toggle('visivel', visivel);
  };
  botao.addEventListener('click', () => {
    const inicio = campo.selectionStart;
    const fim = campo.selectionEnd;
    campo.type = campo.type === 'password' ? 'text' : 'password';
    sincronizar();
    campo.focus({ preventScroll: true });
    try {
      campo.setSelectionRange(inicio, fim);
    } catch {
      /* alguns tipos não aceitam seleção */
    }
  });
  // Ao enviar o formulário, a senha volta a ficar oculta.
  campo.form?.addEventListener('submit', () => {
    campo.type = 'password';
    sincronizar();
  });
  campo.form?.addEventListener('reset', () => {
    campo.type = 'password';
    sincronizar();
  });
  sincronizar();
  caixa.append(botao);
}

function aviso(campo, classe) {
  const id = novoId(classe);
  const p = document.createElement('p');
  p.className = classe;
  p.id = id;
  p.setAttribute('aria-live', 'polite');
  campo.setAttribute('aria-describedby', [campo.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
  (campo.closest('.field') || campo.closest('.wt-campo-senha') || campo).after(p);
  return p;
}

function bloquearColar(campo) {
  let dica = null;
  const recusar = (evento) => {
    evento.preventDefault();
    dica ??= aviso(campo, 'wt-dica-colar');
    dica.textContent = 'Por segurança, digite a senha: colar não é permitido neste campo.';
    clearTimeout(dica.timer);
    dica.timer = setTimeout(() => (dica.textContent = ''), 4000);
  };
  campo.addEventListener('paste', recusar);
  campo.addEventListener('drop', recusar);
  campo.setAttribute('autocomplete', 'new-password');
}

function ligarRequisitos(campo) {
  const lista = document.createElement('ul');
  lista.className = 'wt-requisitos-senha';
  lista.id = novoId('wt-requisitos');
  lista.innerHTML = REGRAS.map((r) => `<li data-regra="${r.id}"><span aria-hidden="true"></span>${r.texto}<span class="sr-only" data-estado> (pendente)</span></li>`).join('');
  (campo.closest('.field') || campo.closest('.wt-campo-senha')).after(lista);
  campo.setAttribute('aria-describedby', [campo.getAttribute('aria-describedby'), lista.id].filter(Boolean).join(' '));
  const atualizar = () => {
    for (const regra of REGRAS) {
      const item = lista.querySelector(`[data-regra="${regra.id}"]`);
      const ok = regra.ok(campo.value);
      item.classList.toggle('ok', ok);
      item.querySelector('[data-estado]').textContent = ok ? ' (atendido)' : ' (pendente)';
    }
  };
  campo.addEventListener('input', atualizar);
  campo.form?.addEventListener('reset', () => requestAnimationFrame(atualizar));
  atualizar();
}

function ligarConfirmacao(campo) {
  const original = campo.form?.elements[campo.dataset.confirma];
  if (!original) return;
  const mensagem = aviso(campo, 'wt-senhas-iguais');
  const atualizar = () => {
    const confirma = campo.value;
    if (!confirma) {
      mensagem.textContent = '';
      mensagem.className = 'wt-senhas-iguais';
      campo.removeAttribute('aria-invalid');
      campo.setCustomValidity('');
      return;
    }
    const iguais = confirma === original.value;
    mensagem.textContent = iguais ? 'As senhas são iguais.' : 'As senhas são diferentes.';
    mensagem.className = `wt-senhas-iguais ${iguais ? 'iguais' : 'diferentes'}`;
    campo.setAttribute('aria-invalid', String(!iguais));
    campo.setCustomValidity(iguais ? '' : 'As senhas são diferentes.');
  };
  campo.addEventListener('input', atualizar);
  original.addEventListener('input', atualizar);
  campo.form?.addEventListener('reset', () => requestAnimationFrame(atualizar));
}

/** Liga os campos de senha da página (ou de uma área nova). */
export function ligarCamposDeSenha(raiz = document) {
  raiz.querySelectorAll('input[type="password"]').forEach((campo) => {
    if (campo.dataset.camposSenha) return;
    campo.dataset.camposSenha = '1';
    ligarOlho(campo);
    if (campo.hasAttribute('data-sem-colar')) bloquearColar(campo);
    if (campo.hasAttribute('data-requisitos')) ligarRequisitos(campo);
    if (campo.dataset.confirma) ligarConfirmacao(campo);
  });
}
