// js/ui/cartoes-acesso.js
// Cartões de acesso dos alunos (usuário + senha), com botões de copiar e
// impressão. Usado em Alunos (criação em lote) e em Perfil do professor
// (Cadastrar aluno). As senhas só existem nesta página: o banco guarda hash.

function escapar(texto) {
  const d = document.createElement('div');
  d.textContent = texto ?? '';
  return d.innerHTML;
}

export function textoDoAcesso(conta) {
  return `WaveType — ${conta.nome}\nUsuário: ${conta.login}\nSenha: ${conta.senha}\nEntre em ${location.host}/login.html?modo=escola e escolha "Sou aluno com usuário da escola".`;
}

/** HTML dos cartões. `turma` é opcional (nome mostrado no cartão). */
export function htmlDosCartoes(contas, { turma = '', logo = '../../assets/images/brand/wavetype-logo.svg' } = {}) {
  const endereco = `${location.host}/login.html?modo=escola`;
  return contas
    .map(
      (c, i) => `<article class="cartao-acesso" data-cartao="${i}">
        <img src="${logo}" alt="WaveType" width="120" height="24">
        <h3>${escapar(c.nome)}</h3>
        ${c.turma || turma ? `<p class="cartao-turma">${escapar(c.turma || turma)}</p>` : ''}
        <dl>
          <div><dt>Usuário</dt><dd class="mono">${escapar(c.login)}</dd></div>
          <div><dt>Senha</dt><dd class="mono">${escapar(c.senha)}</dd></div>
        </dl>
        <p class="cartao-como">Entre em <strong>${escapar(endereco)}</strong> e escolha “Sou aluno com usuário da escola”.</p>
        <div class="cartao-copiar" data-nao-imprimir>
          <button type="button" class="copiar" data-copiar="login">Copiar usuário</button>
          <button type="button" class="copiar" data-copiar="senha">Copiar senha</button>
          <button type="button" class="copiar" data-copiar="tudo">Copiar tudo</button>
        </div>
      </article>`
    )
    .join('');
}

/** Liga os botões de copiar de uma área de cartões (chame uma vez por área). */
export function ligarCopiar(area, obterContas) {
  area.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('[data-copiar]');
    if (!botao) return;
    const conta = obterContas()[Number(botao.closest('[data-cartao]')?.dataset.cartao)];
    if (!conta) return;
    const texto = { login: conta.login, senha: conta.senha, tudo: textoDoAcesso(conta) }[botao.dataset.copiar];
    const original = botao.textContent;
    try {
      await navigator.clipboard.writeText(texto);
      botao.textContent = 'Copiado!';
    } catch {
      botao.textContent = 'Selecione e copie';
    }
    setTimeout(() => (botao.textContent = original), 1600);
  });
}

/** Imprime só os cartões da área indicada. */
export function imprimirCartoes(area) {
  document.querySelectorAll('.cartoes-grid.imprimir').forEach((g) => g.classList.remove('imprimir'));
  area.classList.add('imprimir');
  document.documentElement.classList.add('imprimindo-cartoes');
  window.print();
}
window.addEventListener('afterprint', () => document.documentElement.classList.remove('imprimindo-cartoes'));
