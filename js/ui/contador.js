// js/ui/contador.js
// Contador de caracteres para campos com limite (atributo data-contador +
// maxlength). Mostra "12/60" e avisa quando o limite é atingido.

function ligar(campo) {
  if (campo.dataset.contadorLigado) return;
  const limite = Number(campo.getAttribute('maxlength'));
  if (!limite) return;
  campo.dataset.contadorLigado = '1';
  const saida = document.createElement('small');
  saida.className = 'wt-contador';
  saida.id = `${campo.name || 'campo'}-contador-${Math.random().toString(36).slice(2, 7)}`;
  saida.setAttribute('aria-live', 'polite');
  campo.setAttribute('aria-describedby', [campo.getAttribute('aria-describedby'), saida.id].filter(Boolean).join(' '));
  (campo.closest('.field') || campo).append(saida);
  let avisado = false;
  const atualizar = () => {
    const tamanho = campo.value.length;
    const cheio = tamanho >= limite;
    saida.classList.toggle('no-limite', cheio);
    saida.classList.toggle('perto', !cheio && tamanho >= limite * 0.85);
    saida.textContent = cheio ? `Limite de ${limite} caracteres atingido` : `${tamanho}/${limite}`;
    // O leitor de tela só anuncia ao atingir o limite (não a cada tecla).
    saida.setAttribute('aria-live', cheio && !avisado ? 'assertive' : 'off');
    avisado = cheio;
  };
  campo.addEventListener('input', atualizar);
  campo.form?.addEventListener('reset', () => requestAnimationFrame(atualizar));
  // Valores preenchidos por script (ex.: editar) também atualizam
  const descritor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo), 'value');
  if (descritor?.set) {
    Object.defineProperty(campo, 'value', {
      configurable: true,
      get() {
        return descritor.get.call(this);
      },
      set(valor) {
        descritor.set.call(this, valor);
        atualizar();
      },
    });
  }
  atualizar();
}

export function ligarContadores(raiz = document) {
  raiz.querySelectorAll('[data-contador][maxlength]').forEach(ligar);
}
