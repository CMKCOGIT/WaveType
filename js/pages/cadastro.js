// js/pages/cadastro.js
import {
  cadastrarUsuario,
  entrarComGoogle,
  obterSessao,
  obterPerfil,
  cadastroIncompleto,
  concluirCadastro,
  destinoDoPerfil,
  lerErroDoRetornoOAuth,
  limparUrlDoOAuth,
  sair,
  TIPO_PENDENTE,
  validarSenha,
  criarSenhaDaConta,
} from '../auth.js';

const form = document.querySelector('[data-auth-form="cadastro"]');
const feedback = document.querySelector('[data-form-feedback]');
const botao = form.querySelector('.auth-submit');
const botaoGoogle = form.querySelector('[data-google-auth]');

const formCompletar = document.querySelector('[data-auth-form="completar"]');
const feedbackCompletar = formCompletar.querySelector('[data-form-feedback]');
const botaoCompletar = formCompletar.querySelector('.auth-submit');

const TIPOS = ['usuario', 'aluno', 'professor'];
const MSG_TIPO = 'Escolha como você quer usar o WaveType: usuário, aluno ou professor.';

iniciar();

// Se a pessoa voltou do Google (ou já tem sessão), decide entre seguir
// para a área dela ou concluir o cadastro aqui mesmo.
async function iniciar() {
  const erroOAuth = lerErroDoRetornoOAuth();
  if (erroOAuth) {
    limparUrlDoOAuth();
    pararCarregamento();
    return mostrarFeedback(feedback, erroOAuth, 'erro');
  }

  try {
    if (!(await obterSessao())) return pararCarregamento();
    document.documentElement.dataset.autenticando = '1';

    const perfil = await obterPerfil();
    if (!cadastroIncompleto(perfil)) {
      localStorage.removeItem(TIPO_PENDENTE);
      return window.location.replace(destinoDoPerfil(perfil));
    }

    // O Google dá nome e e-mail; falta o tipo de conta (já marcado se foi
    // escolhido antes de ir ao Google) e a senha, que o Google não fornece.
    mostrarEtapaDeConclusao(perfil, localStorage.getItem(TIPO_PENDENTE));
  } catch (erro) {
    console.error('Falha ao confirmar a sessão:', erro);
    mostrarFeedback(feedback, 'Não foi possível confirmar sua sessão. Tente novamente.', 'erro');
  }
  pararCarregamento();
}

function mostrarEtapaDeConclusao(perfil, tipoPendente) {
  limparUrlDoOAuth();
  document.querySelector('[data-etapa="cadastro"]').hidden = true;
  document.querySelector('[data-etapa="completar"]').hidden = false;
  formCompletar.elements.nome.value = perfil?.nome ?? '';
  const email = document.querySelector('[data-email-conta]');
  if (email) email.textContent = perfil?.email ?? '';
  if (TIPOS.includes(tipoPendente)) {
    const radio = formCompletar.querySelector(`input[name="tipo"][value="${tipoPendente}"]`);
    if (radio) radio.checked = true;
  }
}

formCompletar.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  esconderFeedback(feedbackCompletar);
  const dados = new FormData(formCompletar);
  const tipo = dados.get('tipo');
  const nome = String(dados.get('nome') || '').trim();
  const senha = String(dados.get('senha') || '');
  const confirmacao = String(dados.get('confirmacao') || '');
  if (!tipo) return mostrarFeedback(feedbackCompletar, MSG_TIPO, 'erro');
  if (nome.length < 2) return mostrarFeedback(feedbackCompletar, 'Digite seu nome completo.', 'erro');
  const erroSenha = validarSenha(senha);
  if (erroSenha) return mostrarFeedback(feedbackCompletar, erroSenha, 'erro');
  if (senha !== confirmacao) return mostrarFeedback(feedbackCompletar, 'As senhas não são iguais.', 'erro');

  botaoCompletar.disabled = true;
  botaoCompletar.textContent = 'Salvando...';
  try {
    // Senha primeiro: se ela já tiver sido gravada numa tentativa anterior,
    // a nova tentativa segue normalmente (ver criarSenhaDaConta).
    await criarSenhaDaConta(senha);
    const perfil = await concluirCadastro({ tipo, nome });
    localStorage.removeItem(TIPO_PENDENTE);
    window.location.replace(destinoDoPerfil(perfil));
  } catch (erro) {
    mostrarFeedback(feedbackCompletar, erro.message, 'erro');
    botaoCompletar.disabled = false;
    botaoCompletar.textContent = 'Concluir cadastro';
  }
});

document.querySelector('[data-trocar-conta]')?.addEventListener('click', () => {
  localStorage.removeItem(TIPO_PENDENTE);
  sair();
});

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  esconderFeedback(feedback);

  const dados = new FormData(form);
  const nome = dados.get('nome').trim();
  const email = dados.get('email').trim();
  const senha = dados.get('senha');
  const tipo = dados.get('tipo');

  if (!tipo) return mostrarFeedback(feedback, MSG_TIPO, 'erro');

  const erroValidacao = validar({ nome, email, senha });
  if (erroValidacao) return mostrarFeedback(feedback, erroValidacao, 'erro');

  travarBotao(true);
  try {
    await cadastrarUsuario({ nome, email, senha, tipo });
    mostrarFeedback(feedback, 'Conta criada! Confira seu e-mail para confirmar o acesso.', 'sucesso');
    form.reset();
  } catch (erro) {
    mostrarFeedback(feedback, erro.message, 'erro');
  } finally {
    travarBotao(false);
  }
});

botaoGoogle.addEventListener('click', async () => {
  esconderFeedback(feedback);
  const tipo = form.querySelector('input[name="tipo"]:checked')?.value;

  // O Google tira a página do ar, então guardamos o tipo escolhido.
  // Sem tipo, ele é pedido na etapa de conclusão, ao voltar.
  if (tipo) localStorage.setItem(TIPO_PENDENTE, tipo);
  else localStorage.removeItem(TIPO_PENDENTE);

  travarGoogle(true);
  try {
    await entrarComGoogle({ origem: 'cadastro' }); // o Supabase redireciona a página
  } catch (erro) {
    mostrarFeedback(feedback, erro.message, 'erro');
    travarGoogle(false);
  }
});

// some o aviso assim que a pessoa escolhe um tipo
form.querySelectorAll('input[name="tipo"]').forEach((radio) => {
  radio.addEventListener('change', () => esconderFeedback(feedback));
});

function validar({ nome, email, senha }) {
  if (nome.length < 2) return 'Digite seu nome completo.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Digite um e-mail válido.';
  return validarSenha(senha);
}

function pararCarregamento() {
  delete document.documentElement.dataset.autenticando;
}

function mostrarFeedback(elemento, mensagem, tipo) {
  elemento.textContent = mensagem;
  elemento.hidden = false;
  elemento.classList.toggle('is-erro', tipo === 'erro');
  elemento.classList.toggle('is-sucesso', tipo === 'sucesso');
}

function esconderFeedback(elemento) {
  elemento.hidden = true;
  elemento.classList.remove('is-erro', 'is-sucesso');
}

function travarBotao(travado) {
  botao.disabled = travado;
  botao.textContent = travado ? 'Criando conta...' : 'Criar minha conta';
}

function travarGoogle(travado) {
  botaoGoogle.disabled = travado;
  botaoGoogle.textContent = travado ? 'Abrindo o Google...' : 'Continuar com o Google';
}
