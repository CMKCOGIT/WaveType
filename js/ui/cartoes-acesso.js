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

function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?';
}

/**
 * HTML dos cartões. `turma` é opcional (nome mostrado no cartão).
 * O cartão segue o tema da tela (claro/escuro); na impressão sai em branco.
 * As instruções de como entrar vão no "Copiar tudo" e no PDF, não no cartão.
 */
export function htmlDosCartoes(contas, { turma = '' } = {}) {
  return contas
    .map(
      (c, i) => `<article class="cartao-acesso" data-cartao="${i}">
        <header class="cartao-topo">
          <span class="cartao-avatar" aria-hidden="true">${escapar(iniciais(c.nome))}</span>
          <div><h3>${escapar(c.nome)}</h3>${c.turma || turma ? `<p class="cartao-turma">${escapar(c.turma || turma)}</p>` : ''}</div>
        </header>
        <dl>
          <div><dt>Usuário</dt><dd class="mono">${escapar(c.login)}</dd></div>
          <div><dt>Senha</dt><dd class="mono">${escapar(c.senha)}</dd></div>
        </dl>
        <div class="cartao-copiar" data-nao-imprimir>
          <button type="button" class="copiar" data-copiar="login">Copiar usuário</button>
          <button type="button" class="copiar" data-copiar="senha">Copiar senha</button>
          <button type="button" class="copiar" data-copiar="tudo">Copiar tudo</button>
        </div>
      </article>`
    )
    .join('');
}

/**
 * PDF com os acessos recém-criados: nome, usuário da escola, senha, código
 * individual e turma. A senha só existe nesta tela (o banco guarda hash),
 * então este PDF é a forma de entregá-la; a lista da turma não tem senhas.
 * `codigos` = Map(aluno_id → código do aluno).
 */
export async function exportarPdfDosAlunos(contas, { turma = '', codigos = new Map(), titulo = 'Alunos cadastrados' } = {}) {
  const { baixarPdfTabela } = await import('./pdf.js');
  const { nomeDoArquivo } = await import('../contas/planilha.js');
  const linhas = contas.map((c, i) => [i + 1, c.nome, c.login ?? '', c.senha ?? '', codigos.get(c.id) ?? c.codigo_aluno ?? '', c.turma || turma || '']);
  return baixarPdfTabela({
    titulo,
    subtitulo: [turma && `Turma: ${turma}`, `${contas.length} ${contas.length === 1 ? 'aluno' : 'alunos'}`].filter(Boolean).join(' · '),
    resumo: [
      `Para entrar: ${location.host}/login.html?modo=escola, opção "Sou aluno com usuário da escola".`,
      'Guarde este documento com cuidado: ele tem as senhas. Se um aluno perder a dele, gere uma nova em Alunos.',
    ],
    colunas: ['#', 'Nome', 'Usuário da escola', 'Senha', 'Código do aluno', 'Turma'],
    linhas,
    arquivo: nomeDoArquivo(turma || 'alunos').replace(/^alunos-/, 'alunos-cadastrados-'),
    larguras: { 0: { cellWidth: 10 }, 3: { fontStyle: 'bold' } },
  });
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
