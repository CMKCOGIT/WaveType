// js/pages/redefinir-senha.js
// Destino do link de "Esqueci minha senha". O Supabase abre uma sessão de
// recuperação a partir do link; aqui a pessoa define a nova senha.
import { obterSessao, definirNovaSenha, validarSenha, sair } from '../auth.js';

const CHAVE_RECUPERACAO = 'wavetype_recuperacao';
const form = document.querySelector('[data-form-nova-senha]');
const botao = form.querySelector('.auth-submit');
const feedback = document.querySelector('[data-form-feedback]');
const pedirNovo = document.querySelector('[data-pedir-novo]');

iniciar();

async function iniciar() {
  // Link expirado, já usado ou alterado: o Supabase devolve o erro no endereço.
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const busca = new URLSearchParams(location.search);
  const codigoErro = hash.get('error_code') || busca.get('error_code') || hash.get('error') || busca.get('error');
  if (codigoErro) {
    history.replaceState(null, '', location.pathname);
    return linkInvalido(
      codigoErro === 'otp_expired'
        ? 'Este link expirou ou já foi usado. Peça um novo link de recuperação.'
        : 'Este link de recuperação não é válido. Peça um novo.'
    );
  }

  let sessao = null;
  try {
    sessao = await obterSessao();
  } catch (erro) {
    console.error('Falha ao validar o link de recuperação:', erro);
  }
  const veioDoLink = sessionStorage.getItem(CHAVE_RECUPERACAO) === '1';

  if (!sessao || !veioDoLink) {
    return linkInvalido('Abra esta página pelo link enviado ao seu e-mail. Se ele expirou, peça um novo.');
  }

  form.hidden = false;
  pararCarregamento();
  form.elements.senha.focus();
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  esconderFeedback();
  const senha = form.elements.senha.value;
  const confirmacao = form.elements.confirmacao.value;

  const erroSenha = validarSenha(senha);
  if (erroSenha) return mostrarFeedback(erroSenha, 'erro');
  if (senha !== confirmacao) return mostrarFeedback('As senhas não são iguais.', 'erro');

  botao.disabled = true;
  botao.textContent = 'Salvando...';
  try {
    await definirNovaSenha(senha);
    sessionStorage.removeItem(CHAVE_RECUPERACAO);
    form.hidden = true;
    mostrarFeedback('Senha alterada! Levando você ao login…', 'sucesso');
    // Encerra a sessão de recuperação; a pessoa entra de novo com a senha nova.
    setTimeout(() => sair({ destino: '/login.html?senha=redefinida' }), 1200);
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
    if (/expirou|já foi usado/.test(erro.message)) pedirNovo.hidden = false;
    botao.disabled = false;
    botao.textContent = 'Salvar nova senha';
  }
});

function linkInvalido(mensagem) {
  sessionStorage.removeItem(CHAVE_RECUPERACAO);
  document.querySelector('[data-instrucao]').hidden = true;
  form.hidden = true;
  pedirNovo.hidden = false;
  mostrarFeedback(mensagem, 'erro');
  pararCarregamento();
}

function pararCarregamento() {
  delete document.documentElement.dataset.autenticando;
}
function mostrarFeedback(mensagem, tipo) {
  feedback.textContent = mensagem;
  feedback.hidden = false;
  feedback.classList.toggle('is-erro', tipo === 'erro');
  feedback.classList.toggle('is-sucesso', tipo === 'sucesso');
}
function esconderFeedback() {
  feedback.hidden = true;
  feedback.classList.remove('is-erro', 'is-sucesso');
}
