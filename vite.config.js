import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { globSync } from 'glob';

// Site multi-página "cru": cada .html vira uma entrada de build.
const paginas = globSync('{*.html,app/**/*.html}').reduce((entradas, arquivo) => {
  const nome = arquivo.replace(/\.html$/, '').replace(/\//g, '_');
  entradas[nome] = resolve(__dirname, arquivo);
  return entradas;
}, {});

// Variáveis do Supabase.
// Na Vercel, as variáveis do projeto (Project Settings > Environment Variables)
// chegam ao build em process.env, que tem prioridade sobre qualquer .env.
// Aceitamos os nomes VITE_* e também os criados pela integração
// Supabase ↔ Vercel (SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, ...).
const NOMES_URL = ['VITE_SUPABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'];
const NOMES_CHAVE = [
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
];

function primeiraDefinida(env, nomes) {
  const nome = nomes.find((n) => env[n]?.trim());
  return nome ? env[nome].trim() : '';
}

// A chave que vai para o navegador tem de ser a pública (anon/publishable).
// A service_role ignora o RLS: se ela for parar aqui, o build é interrompido.
function garantirChavePublica(chave) {
  if (!chave) return;
  if (chave.startsWith('sb_secret_')) {
    throw new Error('A chave do Supabase configurada é secreta (sb_secret_). Use a chave anon/publishable.');
  }
  const partes = chave.split('.');
  if (partes.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') {
        throw new Error('A chave do Supabase configurada é a service_role. Use a chave anon.');
      }
    } catch (erro) {
      if (erro.message.includes('service_role')) throw erro;
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const url = primeiraDefinida(env, NOMES_URL);
  const chave = primeiraDefinida(env, NOMES_CHAVE);
  garantirChavePublica(chave);

  if (!url || !chave) {
    // Só os NOMES encontrados (nunca os valores), para facilitar o diagnóstico no log do build.
    const encontradas = Object.keys(env).filter((n) => /SUPABASE/i.test(n)).sort();
    const faltando = [!url && 'URL', !chave && 'chave anon'].filter(Boolean).join(' e ');
    const aviso =
      `Variáveis do Supabase ausentes (${faltando}). Defina ${NOMES_URL[0]} e ${NOMES_CHAVE[0]} nas Environment Variables da Vercel ` +
      `(ambientes Production e Preview) e faça um novo deploy. Nomes com "SUPABASE" encontrados neste build: ${encontradas.join(', ') || 'nenhum'}.`;
    if (process.env.VERCEL) throw new Error(aviso);
    console.warn(`\n⚠  ${aviso}\n`);
  }

  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(chave),
    },
    build: {
      rollupOptions: { input: paginas },
    },
  };
});
