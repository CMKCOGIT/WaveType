const CLIENT_ID = '103520261255-65gnafmta70llbqo058blam5lruki028.apps.googleusercontent.com';
const USERS_KEY = 'wavetype_users';
const SESSION_KEY = 'wavetype_session';

// ajuste para as páginas que existem no seu projeto
const DESTINOS = { usuario: 'app/usuario/index.html', aluno: 'app/aluno/index.html', professor: 'app/professor/index.html' };

const lerUsuarios = () => JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
const salvarUsuarios = (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u));

function pedirPerfilGoogle() {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'openid email profile',
      callback: async (resp) => {
        if (resp.error) return reject(new Error('Login com Google cancelado.'));
        try {
          const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` },
          });
          if (!r.ok) throw new Error();
          resolve(await r.json());
        } catch {
          reject(new Error('Não foi possível ler o perfil do Google.'));
        }
      },
      error_callback: () => reject(new Error('O pop-up do Google foi fechado ou bloqueado.')),
    });
    client.requestAccessToken();
  });
}

export function iniciarGoogle({ onErro }) {
  console.log('iniciarGoogle rodou');
  const btn = document.querySelector('[data-google-auth]');
  if (!btn) return;
  const modo = btn.dataset.googleAuth; // "cadastro" | "login"

  btn.addEventListener('click', async () => {
    if (!window.google?.accounts?.oauth2) {
      return onErro('O Google ainda está carregando. Tente de novo.');
    }
    btn.disabled = true;
    try {
      const p = await pedirPerfilGoogle();
      if (!p.email_verified) throw new Error('E-mail do Google não verificado.');

      const usuarios = lerUsuarios();
      let u = usuarios[p.sub];

      if (modo === 'cadastro') {
        if (!u) {
          const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
          if (!DESTINOS[tipo]) throw new Error('Escolha o tipo de conta antes de continuar.');
          u = { id: p.sub, nome: p.name, email: p.email, foto: p.picture, tipo };
          usuarios[p.sub] = u;
          salvarUsuarios(usuarios);
        }
      } else if (!u) {
        throw new Error('Nenhuma conta encontrada. Crie sua conta primeiro.');
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id, nome: u.nome, tipo: u.tipo }));
      window.location.href = DESTINOS[u.tipo];
    } catch (e) {
      onErro(e.message);
    } finally {
      btn.disabled = false;
    }
  });
}