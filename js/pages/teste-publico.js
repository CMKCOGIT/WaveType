// js/pages/teste-publico.js
// Teste da página inicial: quem não está logado faz um teste e, no fim,
// é convidado a entrar ou criar conta (em vez de repetir o teste).
// Não carrega o Supabase: basta saber se há uma sessão salva no navegador.

function temSessaoSalva() {
  try {
    return Object.keys(localStorage).some((chave) => {
      if (!/^sb-.+-auth-token$/.test(chave)) return false;
      const sessao = JSON.parse(localStorage.getItem(chave) || 'null');
      return Boolean(sessao?.access_token || sessao?.currentSession?.access_token);
    });
  } catch {
    return false;
  }
}

document.addEventListener('wavetype:resultado', () => {
  if (temSessaoSalva()) return;

  document.getElementById('result-restart')?.setAttribute('hidden', '');
  document.getElementById('restart-button')?.setAttribute('hidden', '');

  const cabecalho = document.querySelector('#result-panel .result-heading');
  if (!cabecalho || cabecalho.querySelector('[data-convite-login]')) return;
  const convite = document.createElement('div');
  convite.className = 'resultado-convite';
  convite.dataset.conviteLogin = '';
  convite.innerHTML = `
    <a class="button" href="login.html">Entrar para continuar treinando</a>
    <a class="button button-secondary" href="cadastro.html">Criar conta grátis</a>`;
  cabecalho.append(convite);

  const resumo = document.getElementById('result-summary');
  if (resumo) resumo.textContent = 'Gostou? Entre na sua conta para salvar este resultado, seguir a trilha de exercícios e acompanhar sua evolução.';
});
