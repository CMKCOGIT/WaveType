// js/pages/teste-publico.js
// Teste da página inicial: no fim, quem não está logado vê um convite para
// criar conta ou entrar. O botão "Recomeçar teste" continua disponível.
// Não carrega o Supabase: basta saber se há uma sessão salva no navegador
// (o cabeçalho confirma a sessão de verdade; ver js/sessao-cabecalho.js).
import { temSessaoSalva } from '../sessao/local.js';

document.addEventListener('wavetype:resultado', () => {
  if (temSessaoSalva()) return;

  const painel = document.getElementById('result-panel');
  const cabecalho = painel?.querySelector('.result-heading');
  if (!cabecalho || painel.querySelector('[data-convite-login]')) return;

  const convite = document.createElement('div');
  convite.className = 'resultado-convite';
  convite.dataset.conviteLogin = '';
  convite.innerHTML = `
    <p><strong>Gostou?</strong> Crie sua conta para salvar este resultado, seguir a trilha de exercícios e acompanhar sua evolução.</p>
    <div class="resultado-convite-acoes">
      <a class="button" href="cadastro.html">Criar conta grátis</a>
      <a class="button button-secondary" href="login.html">Entrar para continuar treinando</a>
    </div>`;
  cabecalho.after(convite);
});
