// js/pages/login.js
import { entrarComEmailSenha, entrarComGoogle, obterPerfil } from '../auth.js';

const form = document.querySelector('[data-auth-form="login"]');
const botaoGoogle = document.querySelector('[data-google-auth]');
const feedback = document.querySelector('[data-form-feedback]');

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  esconderFeedback();

  const dados = new FormData(form);
  const email = dados.get('email').trim();
  const senha = dados.get('senha');

  travarBotao(form.querySelector('.auth-submit'), true, 'Entrando...');
  try {
    await entrarComEmailSenha({ email, senha });
    await redirecionarConformePapel();
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
    travarBotao(form.querySelector('.auth-submit'), false, 'Entrar na WaveType');
  }
});

botaoGoogle.addEventListener('click', async () => {
  esconderFeedback();
  localStorage.removeItem('wavetype_tipo_pendente'); // evita sobra de um cadastro abandonado
  travarBotao(botaoGoogle, true, 'Redirecionando...');
  try {
    await entrarComGoogle(); // o próprio Supabase redireciona a página
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
    travarBotao(botaoGoogle, false, 'Continuar com o Google');
  }
});

const DESTINOS = {
  usuario: '/app/usuario/index.html',
  aluno: '/app/aluno/index.html',
  professor: '/app/professor/index.html',
};

async function redirecionarConformePapel() {
  const perfil = await obterPerfil();
  window.location.href = DESTINOS[perfil?.tipo] ?? DESTINOS.aluno;
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

function travarBotao(botao, travado, texto) {
  botao.disabled = travado;
  botao.textContent = texto;
}