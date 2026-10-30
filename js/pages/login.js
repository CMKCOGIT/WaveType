// js/pages/login.js
import {
  entrarComEmailSenha,
  entrarComGoogle,
  obterSessao,
  obterPerfil,
  irParaArea,
  lerErroDoRetornoOAuth,
  limparUrlDoOAuth,
  TIPO_PENDENTE,
} from '../auth.js';

const form = document.querySelector('[data-auth-form="login"]');
const botaoGoogle = document.querySelector('[data-google-auth]');
const feedback = document.querySelector('[data-form-feedback]');

iniciar();

// Leva o e-mail já digitado para a tela de "Esqueci minha senha".
document.querySelector('[data-link-recuperar]')?.addEventListener('click', (evento) => {
  const email = form.elements.email.value.trim();
  if (email) evento.currentTarget.href = `recuperar-senha.html?email=${encodeURIComponent(email)}`;
});

// Ao voltar do Google (ou se já houver sessão), segue direto para a área certa.
async function iniciar() {
  if (new URLSearchParams(location.search).get('senha') === 'redefinida') {
    mostrarFeedback('Senha alterada. Entre com a nova senha.', 'sucesso');
  }
  const erroOAuth = lerErroDoRetornoOAuth();
  if (erroOAuth) {
    limparUrlDoOAuth();
    pararCarregamento();
    return mostrarFeedback(erroOAuth, 'erro');
  }
  try {
    if (await obterSessao()) {
      mostrarCarregamento();
      await redirecionarConformePapel();
      return;
    }
  } catch (erro) {
    console.error('Falha ao confirmar a sessão:', erro);
    mostrarFeedback('Não foi possível confirmar sua sessão. Tente entrar novamente.', 'erro');
  }
  pararCarregamento();
}

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
  localStorage.removeItem(TIPO_PENDENTE); // evita sobra de um cadastro abandonado
  travarBotao(botaoGoogle, true, 'Abrindo o Google...');
  try {
    await entrarComGoogle({ origem: 'login' }); // o Supabase redireciona a página
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
    travarBotao(botaoGoogle, false, 'Continuar com o Google');
  }
});

async function redirecionarConformePapel() {
  const perfil = await obterPerfil();
  irParaArea(perfil);
}

function mostrarCarregamento() {
  document.documentElement.dataset.autenticando = '1';
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

function travarBotao(botao, travado, texto) {
  botao.disabled = travado;
  botao.textContent = texto;
}
