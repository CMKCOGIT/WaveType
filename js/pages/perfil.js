// js/pages/perfil.js
// Página Perfil das três áreas (usuário, aluno, professor). A área vem do
// data-role do <body>.
import { montarVinculos } from './perfil-vinculos.js';
import { exigirPapel, metodosDeLogin, contaTemSenha, atualizarNome, alterarSenha, validarSenha, alterarTipoConta, DESTINOS } from '../auth.js';

const TIPOS = { usuario: 'Usuário', aluno: 'Aluno', professor: 'Professor' };

const formDados = document.querySelector('[data-form-dados]');
const feedbackDados = document.querySelector('[data-feedback-dados]');
const formSenha = document.querySelector('[data-form-senha]');
const feedbackSenha = document.querySelector('[data-feedback-senha]');
const campoAtual = document.querySelector('[data-campo-atual]');
const botaoSenha = document.querySelector('[data-botao-senha]');
let temSenha = true;

iniciar();

async function iniciar() {
  const perfil = await exigirPapel(document.body.dataset.role);
  if (!perfil) return;

  formDados.elements.nome.value = perfil.nome ?? '';
  formDados.elements.email.value = perfil.email ?? '';
  formDados.elements.tipo.value = TIPOS[perfil.tipo] ?? perfil.tipo;

  if (perfil.tipo === 'aluno') {
    document.querySelector('[data-campo-id]').hidden = false;
    const codigo = perfil.codigo_aluno ?? perfil.id;
    document.querySelector('[data-meu-id]').textContent = codigo;
    document.querySelector('[data-copiar-id]').addEventListener('click', async (evento) => {
      try {
        await navigator.clipboard.writeText(codigo);
        evento.target.textContent = 'Copiado!';
        setTimeout(() => (evento.target.textContent = 'Copiar'), 1800);
      } catch {
        evento.target.textContent = 'Selecione e copie';
      }
    });
  }

  prepararTrocaDeTipo(perfil);
  if (perfil.tipo === 'aluno' || perfil.tipo === 'usuario') {
    montarNivelamento().catch((erro) => console.error('Falha ao carregar o nivelamento:', erro));
  }
  montarVinculos(perfil).catch((erro) => console.error('Falha ao carregar as formas de entrar:', erro));
  if (perfil.tipo === 'professor') {
    import('./professor-perfil-alunos.js')
      .then(({ montarCadastroDeAlunos }) => montarCadastroDeAlunos())
      .catch((erro) => console.error('Falha ao montar o cadastro de alunos:', erro));
  }

  const link = document.querySelector('[data-link-recuperar]');
  if (link && perfil.email) link.href = `../../recuperar-senha.html?email=${encodeURIComponent(perfil.email)}`;

  // Conta só com Google: não há senha atual para conferir.
  const metodos = await metodosDeLogin();
  temSenha = await contaTemSenha().catch(() => metodos.includes('email'));
  if (!temSenha && metodos.includes('google')) {
    const ajuda = document.querySelector('[data-ajuda-email]');
    if (ajuda) ajuda.textContent = 'É o e-mail da sua conta Google, usado para entrar. Para trocá-lo, entre com outra conta Google.';
  }
  if (!temSenha) {
    campoAtual.hidden = true;
    document.querySelector('[data-titulo-senha]').textContent = 'Criar uma senha (opcional)';
    document.querySelector('[data-texto-senha]').textContent =
      'Você entra com o Google e não precisa de senha. Se quiser também entrar com e-mail e senha, crie uma aqui.';
    botaoSenha.textContent = 'Criar senha';
    document.querySelector('.perfil-ajuda').hidden = true;
  }
}

formDados.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const nome = formDados.elements.nome.value.trim();
  if (nome.length < 2) return mostrar(feedbackDados, 'Digite seu nome completo.', true);

  const botao = formDados.querySelector('button[type="submit"]');
  botao.disabled = true;
  try {
    await atualizarNome(nome);
    const topo = document.querySelector('.topbar-profile strong');
    if (topo) topo.textContent = nome;
    mostrar(feedbackDados, 'Dados salvos.');
  } catch (erro) {
    mostrar(feedbackDados, erro.message, true);
  } finally {
    botao.disabled = false;
  }
});

formSenha.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const atual = formSenha.elements.atual.value;
  const nova = formSenha.elements.nova.value;
  const confirmacao = formSenha.elements.confirmacao.value;

  if (temSenha && !atual) return mostrar(feedbackSenha, 'Digite sua senha atual.', true);
  const erroSenha = validarSenha(nova);
  if (erroSenha) return mostrar(feedbackSenha, erroSenha, true);
  if (nova !== confirmacao) return mostrar(feedbackSenha, 'As senhas novas não são iguais.', true);

  const textoBotao = botaoSenha.textContent;
  botaoSenha.disabled = true;
  botaoSenha.textContent = 'Salvando...';
  try {
    await alterarSenha({ senhaAtual: temSenha ? atual : null, novaSenha: nova });
    formSenha.reset();
    mostrar(feedbackSenha, temSenha ? 'Senha alterada.' : 'Senha criada. Agora você também pode entrar com e-mail e senha.');
    if (!temSenha) {
      temSenha = true;
      campoAtual.hidden = false;
      document.querySelector('[data-titulo-senha]').textContent = 'Alterar senha';
      document.querySelector('[data-texto-senha]').textContent = 'Use 8 ou mais caracteres, com letras, números e um caractere especial.';
      document.querySelector('.perfil-ajuda').hidden = false;
      botaoSenha.textContent = 'Alterar senha';
      return;
    }
  } catch (erro) {
    mostrar(feedbackSenha, erro.message, true);
  } finally {
    botaoSenha.disabled = false;
    if (botaoSenha.textContent === 'Salvando...') botaoSenha.textContent = textoBotao;
  }
});

// Usuário <-> aluno. Professor não troca de tipo por aqui.
// Aluno (conta antiga, criada pela própria pessoa) → usuário. O caminho
// contrário não existe mais: conta de aluno é criada pelo professor. A conta
// criada pela escola vira pessoal pela transferência (perfil-vinculos.js).
function prepararTrocaDeTipo(perfil) {
  if (perfil.tipo !== 'aluno') return;
  const painel = document.querySelector('[data-painel-tipo]');
  const form = document.querySelector('[data-form-tipo]');
  const feedback = document.querySelector('[data-feedback-tipo]');
  painel.hidden = false;
  document.querySelector('[data-texto-tipo]').textContent =
    'Você está como aluno. Como usuário, você treina por conta própria e seu histórico continua o mesmo. Para voltar a ser aluno depois, o professor precisa criar uma conta de aluno para você.';
  form.querySelector('input[value="aluno"]')?.closest('.role-option')?.setAttribute('hidden', '');
  form.querySelector('.role-picker')?.style.setProperty('grid-template-columns', 'minmax(0, 1fr)');
  form.querySelector('input[value="usuario"]').checked = true;
  form.querySelector('button[type="submit"]').textContent = 'Trocar para conta de usuário';

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const novo = 'usuario';
    if (!confirm('Trocar sua conta para usuário? Seu histórico continua o mesmo, mas as atividades das turmas deixam de aparecer para você.')) return;

    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      await alterarTipoConta(novo);
      mostrar(feedback, 'Tipo de conta alterado. Abrindo sua nova área…');
      setTimeout(() => window.location.replace(DESTINOS[novo].replace('index.html', 'perfil.html')), 900);
    } catch (erro) {
      mostrar(feedback, erro.message, true);
      botao.disabled = false;
    }
  });
}

function mostrar(elemento, mensagem, erro = false) {
  elemento.textContent = mensagem;
  elemento.hidden = false;
  elemento.classList.toggle('is-erro', erro);
}

// Teste de nivelamento: depois de feito, só pode ser refeito por aqui, e a
// pessoa confirma antes que o novo resultado vai substituir o nível atual.
async function montarNivelamento() {
  const painel = document.querySelector('[data-painel-nivelamento]');
  if (!painel) return;
  const texto = painel.querySelector('[data-texto-nivelamento]');
  const botao = painel.querySelector('[data-refazer-nivelamento]');
  const [{ ultimoNivelamento }, { NIVEIS_RECOMENDADOS }, { confirmarRefazerNivelamento }] = await Promise.all([
    import('../api/nivelamento.js'),
    import('../nivelamento/config.js'),
    import('../ui/convite-nivelamento.js'),
  ]);
  const ultimo = await ultimoNivelamento();
  const destino = '../../nivelamento.html';
  botao.hidden = false;
  if (!ultimo) {
    texto.textContent = 'Você ainda não fez o teste. Em 2 a 4 minutos ele mostra o melhor ponto de partida na trilha.';
    botao.textContent = 'Fazer o teste';
    botao.addEventListener('click', () => window.location.assign(destino));
    return;
  }
  const nivel = NIVEIS_RECOMENDADOS[ultimo.nivel]?.rotulo ?? ultimo.nivel;
  const data = new Date(ultimo.criado_em).toLocaleDateString('pt-BR');
  texto.textContent = `Seu ponto de partida atual: nível ${nivel}, começando pelo Nível ${ultimo.licao_nivel} da trilha, lição ${ultimo.licao_ordem} (teste de ${data}).`;
  botao.textContent = 'Refazer o teste';
  botao.addEventListener('click', async () => {
    if (await confirmarRefazerNivelamento({ nivelAtual: nivel, dataAtual: data })) {
      window.location.assign(`${destino}?refazer=1`);
    }
  });
}
