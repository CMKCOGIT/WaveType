// js/supabaseClient.js
// Inicializa o cliente Supabase a partir de variáveis de ambiente do Vite.
//
// SEGURANÇA:
// - Use SEMPRE a chave "anon" aqui (é a única segura para o navegador).
// - NUNCA importe/exponha a "service_role key" no frontend: ela ignora
//   TODAS as políticas de RLS e dá acesso total ao banco. Ela só pode
//   viver em uma função de servidor (Vercel Serverless Function / Edge
//   Function), nunca em um arquivo servido ao navegador.
// - No Vite, só variáveis com prefixo VITE_ são embutidas no bundle do
//   navegador. Configure no painel da Vercel (Project Settings >
//   Environment Variables) e também num arquivo .env local (que fica
//   fora do git — veja .gitignore).
//
// Variáveis esperadas (.env):
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase não configuradas (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Crie um arquivo .env na raiz do projeto — veja .env.example.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
