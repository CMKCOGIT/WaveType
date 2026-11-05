// js/pages/cadastro.js
import {
  cadastrarUsuario,
  entrarComGoogle,
  obterSessao,
  obterPerfil,
  cadastroIncompleto,
  concluirCadastro,
  irParaArea,
  lerErroDoRetornoOAuth,
  limparUrlDoOAuth,
  sair,
  TIPO_PENDENTE,
  validarSenha,
} from '../auth.js';
import { protegerPaginaDeAcesso, guardarRedirect } from '../sessao/sessao.js';

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

  document.documentElement.dataset.autenticando = '1';
  // Com sessão válida e cadastro completo, vai para a área (nunca fica aqui).
  // Cadastro incompleto (primeira entrada com Google) fica para concluir.
  const resultado = await protegerPaginaDeAcesso({ naConclusaoDoCadastro: true });
  if (resultado.acao === 'redirecionando') return;
  if (resultado.acao === 'erro') {
    mostrarFeedback(feedback, 'Não foi possível confirmar sua sessão. Tente novamente.', 'erro');
  } else if (resultado.estado === 'valida' && cadastroIncompleto(resultado.perfil)) {
    // O Google dá nome e e-mail; falta só o tipo de conta (já marcado se
    // foi escolhido antes de ir ao Google).
    mostrarEtapaDeConclusao(resultado.perfil, localStorage.getItem(TIPO_PENDENTE));
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
  if (!tipo) return mostrarFeedback(feedbackCompletar, MSG_TIPO, 'erro');
  if (nome.length < 2) return mostrarFeedback(feedbackCompletar, 'Digite seu nome completo.', 'erro');

  botaoCompletar.disabled = true;
  botaoCompletar.textContent = 'Salvando...';
  try {
    // Entrou com o Google: nunca pedimos senha. Criar uma é opcional, em Perfil.
    const perfil = await concluirCadastro({ tipo, nome });
    localStorage.removeItem(TIPO_PENDENTE);
    irParaArea(perfil);
  } catch (erro) {
    mostrarFeedback(feedbackCompletar, erro.message, 'erro');
    botaoCompletar.disabled = false;
    botaoCompletar.textContent = 'Concluir cadastro';
  }
});

document.querySelector('[data-trocar-conta]')?.addEventListener('click', () => {
  localStorage.removeItem(TIPO_PENDENTE);
  sair({ destino: '/cadastro.html' });
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
    const dados = await cadastrarUsuario({ nome, email, senha, tipo });
    // Sem confirmação de e-mail no Supabase, o cadastro já abre a sessão:
    // segue direto para a área certa.
    if (dados?.session) return irParaArea(await obterPerfil());
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
  guardarRedirect(new URLSearchParams(location.search).get('redirect'));

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
