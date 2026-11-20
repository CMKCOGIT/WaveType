// js/ui/convite-nivelamento.js
// Convite do teste de nivelamento no primeiro acesso à área logada.
//
// Regras:
//  - aparece UMA vez por conta, logo ao abrir a tela inicial, e só para quem
//    ainda não fez o teste;
//  - "Agora não" fecha o convite; o cartão "Não sabe por onde começar?"
//    continua na tela inicial até a pessoa fazer o teste;
//  - depois de feito, o teste sai da tela inicial e só pode ser refeito em
//    Perfil (que pergunta antes se quer substituir o nível atual).
//
// "Já viu o convite" fica gravado na conta (user_metadata, vale em qualquer
// aparelho) e também neste navegador (resposta imediata e funciona mesmo se
// a gravação na conta falhar).
import { supabase } from '../supabaseClient.js';

const CAMPO_CONTA = 'convite_nivelamento_visto';
const chaveLocal = (id) => `wavetype_convite_nivelamento_${id}`;

function vistoNesteNavegador(id) {
  try {
    return localStorage.getItem(chaveLocal(id)) === '1';
  } catch {
    return false;
  }
}

async function usuarioAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function conviteJaVisto() {
  const usuario = await usuarioAtual();
  if (!usuario) return true; // sem sessão, não incomoda
  return usuario.user_metadata?.[CAMPO_CONTA] === true || vistoNesteNavegador(usuario.id);
}

async function marcarConviteVisto() {
  const usuario = await usuarioAtual();
  if (!usuario) return;
  try {
    localStorage.setItem(chaveLocal(usuario.id), '1');
  } catch {
    /* sem localStorage */
  }
  const { error } = await supabase.auth.updateUser({ data: { [CAMPO_CONTA]: true } });
  if (error) console.warn('Não foi possível guardar na conta que o convite foi visto:', error.message);
}

/** Abre o convite (uma única vez por conta). `destino` é o link do teste. */
export async function oferecerNivelamento({ destino }) {
  if (await conviteJaVisto()) return;
  await marcarConviteVisto();

  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo convite-nivelamento';
  dialogo.setAttribute('aria-labelledby', 'convite-nivelamento-titulo');
  dialogo.setAttribute('aria-describedby', 'convite-nivelamento-texto');
  dialogo.innerHTML = `
    <span class="eyebrow">Boas-vindas à WaveType</span>
    <h2 id="convite-nivelamento-titulo">Vamos descobrir o seu nível?</h2>
    <p id="convite-nivelamento-texto">Em 2 a 4 minutos, o teste de nivelamento mostra o melhor ponto de partida na trilha, para você não começar nem fácil nem difícil demais.</p>
    <ul class="convite-nivelamento-lista">
      <li>Etapas curtas, que param quando a precisão cai</li>
      <li>Resultado salvo na sua conta</li>
      <li>Você pode refazer depois em <strong>Perfil</strong></li>
    </ul>
    <div class="form-actions">
      <a class="button" href="${destino}" data-convite-fazer>Fazer o teste agora</a>
      <button class="button secondary" type="button" data-convite-cancelar>Agora não</button>
    </div>`;
  document.body.append(dialogo);

  const fechar = () => {
    dialogo.close();
    dialogo.remove();
  };
  dialogo.querySelector('[data-convite-cancelar]').addEventListener('click', fechar);
  // Clique no fundo escurecido também fecha.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) fechar();
  });
  dialogo.addEventListener('cancel', () => requestAnimationFrame(() => dialogo.remove()));
  dialogo.showModal();
  dialogo.querySelector('[data-convite-fazer]').focus();
}

/**
 * Perfil: confirma antes de refazer, pois o novo resultado substitui o nível
 * atual. Devolve uma Promise<boolean>.
 */
export function confirmarRefazerNivelamento({ nivelAtual, dataAtual }) {
  return new Promise((resolver) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo';
    dialogo.setAttribute('aria-labelledby', 'refazer-nivelamento-titulo');
    dialogo.innerHTML = `
      <h2 id="refazer-nivelamento-titulo">Substituir o seu nível atual?</h2>
      <p></p>
      <div class="form-actions">
        <button class="button" type="button" data-sim>Sim, refazer o teste</button>
        <button class="button secondary" type="button" data-nao>Cancelar</button>
      </div>`;
    dialogo.querySelector('p').textContent =
      `Hoje o seu ponto de partida é o nível ${nivelAtual}${dataAtual ? ` (teste de ${dataAtual})` : ''}. ` +
      'Ao refazer o teste, o novo resultado substitui esse nível e a lição recomendada. Ao final, você ainda pode escolher manter o nível anterior.';
    document.body.append(dialogo);
    const responder = (valor) => {
      dialogo.close();
      dialogo.remove();
      resolver(valor);
    };
    dialogo.querySelector('[data-sim]').addEventListener('click', () => responder(true));
    dialogo.querySelector('[data-nao]').addEventListener('click', () => responder(false));
    dialogo.addEventListener('cancel', (evento) => {
      evento.preventDefault();
      responder(false);
    });
    dialogo.showModal();
    dialogo.querySelector('[data-nao]').focus();
  });
}
