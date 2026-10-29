// js/pages/recuperar-senha.js
import { solicitarRecuperacaoSenha } from '../auth.js';

const form = document.querySelector('[data-form-recuperar]');
const botao = form.querySelector('.auth-submit');
const feedback = form.querySelector('[data-form-feedback]');

const emailDaUrl = new URLSearchParams(location.search).get('email');
if (emailDaUrl) form.elements.email.value = emailDaUrl;

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const email = String(form.elements.email.value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mostrarFeedback('Digite um e-mail válido.', 'erro');

  botao.disabled = true;
  botao.textContent = 'Enviando...';
  try {
    await solicitarRecuperacaoSenha(email);
    // Mesma mensagem com ou sem conta: não revela quais e-mails estão cadastrados.
    mostrarFeedback(
      `Se existir uma conta com ${email}, enviamos um link para criar uma nova senha. Confira a caixa de entrada e o spam. O link vale por tempo limitado.`,
      'sucesso'
    );
    form.reset();
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Enviar link de recuperação';
  }
});

function mostrarFeedback(mensagem, tipo) {
  feedback.textContent = mensagem;
  feedback.hidden = false;
  feedback.classList.toggle('is-erro', tipo === 'erro');
  feedback.classList.toggle('is-sucesso', tipo === 'sucesso');
}
