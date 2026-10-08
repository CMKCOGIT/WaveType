// js/pages/cadastro.js
import { cadastrarUsuario, entrarComGoogle } from '../auth.js';

const form = document.querySelector('[data-auth-form="cadastro"]');
const feedback = document.querySelector('[data-form-feedback]');
const botao = form.querySelector('.auth-submit');
const botaoGoogle = form.querySelector('[data-google-auth]');

const MSG_TIPO = 'Escolha como você quer usar o WaveType: usuário, aluno ou professor.';

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  esconderFeedback();

  const dados = new FormData(form);
  const nome = dados.get('nome').trim();
  const email = dados.get('email').trim();
  const senha = dados.get('senha');
  const tipo = dados.get('tipo');

  if (!tipo) return mostrarFeedback(MSG_TIPO, 'erro');

  const erroValidacao = validar({ nome, email, senha });
  if (erroValidacao) return mostrarFeedback(erroValidacao, 'erro');

  travarBotao(true);
  try {
    await cadastrarUsuario({ nome, email, senha, tipo });
    mostrarFeedback('Conta criada! Confira seu e-mail para confirmar o acesso.', 'sucesso');
    form.reset();
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
  } finally {
    travarBotao(false);
  }
});

botaoGoogle.addEventListener('click', async () => {
  esconderFeedback();
  const tipo = form.querySelector('input[name="tipo"]:checked')?.value;

  if (!tipo) {
    return mostrarFeedback('Escolha como você quer usar o WaveType antes de continuar com o Google.', 'erro');
  }

  // o Google tira a página do ar, então guardamos o tipo escolhido
  localStorage.setItem('wavetype_tipo_pendente', tipo);

  travarGoogle(true);
  try {
    await entrarComGoogle(); // o próprio Supabase redireciona a página
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
    travarGoogle(false);
  }
});

// some o aviso assim que a pessoa escolhe um tipo
form.querySelectorAll('input[name="tipo"]').forEach((radio) => {
  radio.addEventListener('change', esconderFeedback);
});

function validar({ nome, email, senha }) {
  if (nome.length < 2) return 'Digite seu nome completo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Digite um e-mail válido.';
  if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha precisa ter 8+ caracteres, com letra e número.';
  }
  return null;
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

function travarBotao(travado) {
  botao.disabled = travado;
  botao.textContent = travado ? 'Criando conta...' : 'Criar minha conta';
}

function travarGoogle(travado) {
  botaoGoogle.disabled = travado;
  botaoGoogle.textContent = travado ? 'Redirecionando...' : 'Continuar com o Google';
}