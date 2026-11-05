// js/pages/login.js
import {
  entrarComEmailSenha,
  entrarComGoogle,
  entrarComUsuarioDaEscola,
  obterPerfil,
  irParaArea,
  lerErroDoRetornoOAuth,
  limparUrlDoOAuth,
  TIPO_PENDENTE,
} from '../auth.js';
import { protegerPaginaDeAcesso, mensagemDoMotivo, guardarRedirect } from '../sessao/sessao.js';
import { MENSAGENS_MOTIVO } from '../sessao/regras.js';
import { normalizarLoginDigitado } from '../contas/credenciais.js';

const form = document.querySelector('[data-auth-form="login"]');
const botaoGoogle = document.querySelector('[data-google-auth]');
const feedback = document.querySelector('[data-form-feedback]');

iniciar();

// Leva o e-mail já digitado para a tela de "Esqueci minha senha".
document.querySelector('[data-link-recuperar]')?.addEventListener('click', (evento) => {
  const email = form.elements.email.value.trim();
  if (email) evento.currentTarget.href = `recuperar-senha.html?email=${encodeURIComponent(email)}`;
});

// Ao voltar do Google (ou se já houver sessão válida), segue direto para a
// área certa: a tela de login nunca fica "parada" com alguém conectado.
async function iniciar() {
  if (new URLSearchParams(location.search).get('senha') === 'redefinida') {
    mostrarFeedback('Senha alterada. Entre com a nova senha.', 'sucesso');
  }
  const motivo = mensagemDoMotivo();
  if (motivo) mostrarFeedback(motivo, 'erro');

  const erroOAuth = lerErroDoRetornoOAuth();
  if (erroOAuth) {
    limparUrlDoOAuth();
    pararCarregamento();
    return mostrarFeedback(erroOAuth, 'erro');
  }

  mostrarCarregamento();
  const resultado = await protegerPaginaDeAcesso();
  if (resultado.acao === 'redirecionando') return;
  if (resultado.acao === 'erro') {
    mostrarFeedback('Não foi possível confirmar sua sessão. Verifique a conexão e tente novamente.', 'erro');
  } else if (resultado.acao === 'limpar' && !motivo) {
    mostrarFeedback(MENSAGENS_MOTIVO[resultado.motivo] ?? MENSAGENS_MOTIVO.expirada, 'erro');
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
  guardarRedirect(new URLSearchParams(location.search).get('redirect')); // volta do Google sem perder o destino
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

// ---------- Duas formas de entrar: e-mail/Google ou usuário da escola ----------

const abas = [...document.querySelectorAll('.auth-modos [role="tab"]')];
const formEscola = document.querySelector('[data-auth-form="escola"]');
const feedbackEscola = document.querySelector('[data-feedback-escola]');
const CHAVE_MODO = 'wavetype_login_modo';

function escolherModo(modo, { focar = false } = {}) {
  abas.forEach((aba) => {
    const ativa = aba.dataset.modo === modo;
    aba.setAttribute('aria-selected', String(ativa));
    aba.tabIndex = ativa ? 0 : -1;
    document.getElementById(aba.getAttribute('aria-controls')).hidden = !ativa;
    if (ativa && focar) aba.focus();
  });
  try {
    localStorage.setItem(CHAVE_MODO, modo);
  } catch {
    /* sem localStorage */
  }
}

abas.forEach((aba, indice) => {
  aba.addEventListener('click', () => escolherModo(aba.dataset.modo));
  aba.addEventListener('keydown', (evento) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const proximo =
      evento.key === 'Home' ? 0 : evento.key === 'End' ? abas.length - 1 : (indice + (evento.key === 'ArrowRight' ? 1 : -1) + abas.length) % abas.length;
    escolherModo(abas[proximo].dataset.modo, { focar: true });
  });
});

(() => {
  const daUrl = new URLSearchParams(location.search).get('modo');
  let salvo = null;
  try {
    salvo = localStorage.getItem(CHAVE_MODO);
  } catch {
    /* sem localStorage */
  }
  const modo = daUrl === 'escola' || daUrl === 'email' ? daUrl : salvo === 'escola' ? 'escola' : 'email';
  escolherModo(modo);
})();

formEscola.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  feedbackEscola.hidden = true;
  const login = normalizarLoginDigitado(formEscola.elements.login.value);
  const senha = formEscola.elements.senha.value;
  if (!login || !senha) {
    feedbackEscola.textContent = 'Digite o usuário e a senha do seu cartão de acesso.';
    feedbackEscola.classList.add('is-erro');
    feedbackEscola.hidden = false;
    return;
  }
  const botao = formEscola.querySelector('.auth-submit');
  travarBotao(botao, true, 'Entrando...');
  try {
    await entrarComUsuarioDaEscola({ login, senha });
    await redirecionarConformePapel();
  } catch (erro) {
    feedbackEscola.textContent = erro.message;
    feedbackEscola.classList.add('is-erro');
    feedbackEscola.hidden = false;
    formEscola.elements.senha.value = '';
    formEscola.elements.senha.focus();
    travarBotao(botao, false, 'Entrar');
  }
});
