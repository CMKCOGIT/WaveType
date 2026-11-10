// js/pages/perfil-vinculos.js
// Perfil: formas de entrar na conta e conta da escola.
//   - "Vincular meu e-mail ou Google": a MESMA conta (mesmo ID) ganha outro
//     método de acesso; nada é copiado entre contas.
//   - "Transferir ao terminar a escola": a conta criada pelo professor passa a
//     ser pessoal; o professor deixa de ver os dados individuais.
import { vincularGoogle, vincularEmail, identidadesDaConta, lerErroDoRetornoOAuth, limparUrlDoOAuth } from '../auth.js';
import { atualizarPapelDaSessao } from '../sessao/sessao.js';
import { minhaContaEscolar, transferirContaEscolar } from '../api/contas-escolares.js';
import { DESTINOS } from '../sessao/regras.js';

function escapar(texto) {
  const d = document.createElement('div');
  d.textContent = texto ?? '';
  return d.innerHTML;
}

function aviso(elemento, mensagem, erro = false) {
  elemento.textContent = mensagem;
  elemento.hidden = false;
  elemento.classList.toggle('is-erro', erro);
}

export async function montarVinculos(perfil) {
  const grade = document.querySelector('.perfil-grid');
  if (!grade) return;
  const [conta, identidades] = await Promise.all([minhaContaEscolar(), identidadesDaConta().catch(() => [])]);
  const escolar = conta?.status === 'escolar';
  const temGoogle = identidades.includes('google') || conta?.tem_google;
  const temEmailPessoal = conta ? conta.tem_email_pessoal : Boolean(perfil.email);

  if (conta) ajustarDadosDaContaEscolar(conta);

  const secao = document.createElement('section');
  secao.className = 'panel panel-pad perfil-largo';
  secao.setAttribute('aria-labelledby', 'titulo-vinculos');
  secao.innerHTML = `
    <div class="panel-title"><div><h2 id="titulo-vinculos">${conta ? 'Vincular meu e-mail ou Google' : 'Formas de entrar'}</h2>
      <p>${
        conta
          ? 'Ligue um e-mail ou uma conta Google a esta mesma conta. Você continua com o mesmo progresso e pode entrar de qualquer um dos jeitos.'
          : 'Métodos de acesso ligados à sua conta. Todos levam ao mesmo progresso.'
      }</p></div></div>
    <ul class="vinculos-lista">
      ${conta ? `<li><span><strong>Usuário da escola</strong><small class="mono">${escapar(conta.login)}</small></span><span class="status">Ativo</span></li>` : ''}
      <li><span><strong>Google</strong><small>${temGoogle ? 'Vinculado' : 'Entre com um clique, sem senha'}</small></span>
        ${temGoogle ? '<span class="status">Vinculado</span>' : '<button type="button" class="button secondary small" data-vincular-google>Vincular Google</button>'}</li>
      <li><span><strong>${temEmailPessoal ? 'E-mail de acesso' : 'E-mail pessoal'}</strong><small>${
        !temEmailPessoal
          ? 'Para entrar e recuperar a senha sem depender do professor'
          : identidades.includes('email') || conta
            ? 'Entrar com e-mail e senha (o mesmo e-mail de Dados da conta)'
            : 'O e-mail da sua conta Google; crie uma senha acima para entrar também com ele'
      }</small></span>
        ${temEmailPessoal ? '<span class="status">Vinculado</span>' : ''}</li>
    </ul>
    ${
      temEmailPessoal
        ? ''
        : `<form class="perfil-form vinculo-email" data-form-vincular-email novalidate>
            <label class="field"><span>Seu e-mail</span><input type="email" name="email" autocomplete="email" maxlength="190" placeholder="voce@exemplo.com" required></label>
            <button class="button secondary" type="submit">Enviar link de confirmação</button>
          </form>`
    }
    <p class="feedback" data-feedback-vinculos hidden role="status"></p>`;
  grade.append(secao);
  const feedback = secao.querySelector('[data-feedback-vinculos]');
  mostrarRetornoDoVinculo(feedback);

  secao.querySelector('[data-vincular-google]')?.addEventListener('click', async (evento) => {
    evento.currentTarget.disabled = true;
    try {
      await vincularGoogle(); // o Supabase redireciona para o Google
    } catch (erro) {
      aviso(feedback, erro.message, true);
      evento.currentTarget.disabled = false;
    }
  });

  secao.querySelector('[data-form-vincular-email]')?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const email = form.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return aviso(feedback, 'Digite um e-mail válido.', true);
    const botao = form.querySelector('button');
    botao.disabled = true;
    try {
      await vincularEmail(email);
      aviso(feedback, `Enviamos um link para ${email}. Abra o e-mail e confirme para concluir o vínculo.`);
      form.reset();
    } catch (erro) {
      aviso(feedback, erro.message, true);
    } finally {
      botao.disabled = false;
    }
  });

  if (escolar) montarTransferencia(grade, { podeTransferir: temGoogle || temEmailPessoal });
}

function ajustarDadosDaContaEscolar(conta) {
  const form = document.querySelector('[data-form-dados]');
  const campoEmail = form?.elements.email;
  if (campoEmail && !conta.tem_email_pessoal) {
    campoEmail.type = 'text';
    campoEmail.value = conta.login;
    campoEmail.classList.add('mono');
    const rotulo = campoEmail.closest('label')?.querySelector('span');
    if (rotulo) rotulo.textContent = 'Usuário da escola';
    campoEmail.removeAttribute('aria-describedby');
    const ajudaCampo = form.querySelector('[data-ajuda-email]');
    if (ajudaCampo) ajudaCampo.textContent = 'É com este usuário (e a sua senha) que você entra no WaveType. Quem cria e troca o usuário é o professor.';
    const ajudaTitulo = form.closest('section')?.querySelector('.panel-title p');
    if (ajudaTitulo) ajudaTitulo.textContent = 'Você entra com o usuário da escola. Para ter também um e-mail, use “Vincular meu e-mail ou Google”.';
  }
  // A troca usuário ↔ aluno não vale para a conta da escola: ela vira pessoal
  // pela transferência, que explica o que muda.
  if (conta.status === 'escolar') document.querySelector('[data-painel-tipo]')?.setAttribute('hidden', '');
  const ajudaSenha = document.querySelector('.perfil-ajuda');
  if (ajudaSenha && !conta.tem_email_pessoal) {
    ajudaSenha.textContent = 'Esqueceu a senha? Peça ao professor: ele gera uma nova sem apagar seu progresso.';
  }
}

function mostrarRetornoDoVinculo(feedback) {
  const parametros = new URLSearchParams(location.search);
  const tipo = parametros.get('vinculo');
  if (!tipo) return;
  const erro = lerErroDoRetornoOAuth();
  limparUrlDoOAuth();
  const url = new URL(location.href);
  url.searchParams.delete('vinculo');
  history.replaceState(null, '', url.pathname + url.search);
  if (erro) return aviso(feedback, tipo === 'google' ? 'Não foi possível vincular o Google. Tente de novo.' : erro, true);
  aviso(feedback, tipo === 'google' ? 'Conta Google vinculada. Agora você também pode entrar com ela.' : 'E-mail confirmado e vinculado à sua conta.');
}

function montarTransferencia(grade, { podeTransferir }) {
  const secao = document.createElement('section');
  secao.className = 'panel panel-pad perfil-largo transferir-conta';
  secao.setAttribute('aria-labelledby', 'titulo-transferir');
  secao.innerHTML = `
    <div class="panel-title"><div><h2 id="titulo-transferir">Transferir ao terminar a escola</h2>
      <p>Saiu da escola ou da turma? Transforme esta conta em uma conta pessoal e leve seu histórico e seu progresso com você.</p></div></div>
    ${
      podeTransferir
        ? `<form class="perfil-form" data-form-transferir novalidate>
            <div class="transferir-aviso" role="note">
              <strong>O que acontece:</strong>
              <ul>
                <li>Você sai de todas as turmas e a conta passa a ser só sua.</li>
                <li><strong>O professor e a escola deixam de ver seus resultados individuais</strong> a partir de agora.</li>
                <li>Seu histórico, conquistas e progresso continuam aqui, na mesma conta.</li>
                <li>Para voltar a uma turma, peça ao professor para adicionar você de novo.</li>
              </ul>
            </div>
            <label class="checkbox-line"><input type="checkbox" name="ciente" required> Entendi que o professor e a escola deixam de ver meus dados individuais.</label>
            <button class="button" type="submit" disabled>Transferir para conta pessoal</button>
          </form>`
        : '<p class="auth-demo">Antes de transferir, vincule seu e-mail ou sua conta Google acima. Assim você nunca perde o acesso.</p>'
    }
    <p class="feedback" data-feedback-transferir hidden role="status"></p>`;
  grade.append(secao);

  const form = secao.querySelector('[data-form-transferir]');
  if (!form) return;
  const botao = form.querySelector('button');
  const feedback = secao.querySelector('[data-feedback-transferir]');
  form.elements.ciente.addEventListener('change', () => {
    botao.disabled = !form.elements.ciente.checked;
  });
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.elements.ciente.checked) return;
    botao.disabled = true;
    botao.textContent = 'Transferindo…';
    try {
      await transferirContaEscolar();
      atualizarPapelDaSessao('usuario');
      aviso(feedback, 'Pronto! Sua conta agora é pessoal. Abrindo sua nova área…');
      setTimeout(() => window.location.replace(DESTINOS.usuario.replace('index.html', 'perfil.html')), 1200);
    } catch (erro) {
      aviso(feedback, erro.message, true);
      botao.disabled = false;
      botao.textContent = 'Transferir para conta pessoal';
    }
  });
}
