// js/supabaseClient.js
// Inicializa o cliente Supabase.
//
// De onde vêm as variáveis:
// - Na Vercel: Project Settings > Environment Variables. O vite.config.js lê
//   essas variáveis no momento do build e as embute aqui (só URL e chave anon).
// - Localmente: `vercel env pull .env.local` traz as mesmas variáveis da
//   Vercel; um .env manual também funciona (veja .env.example).
//
// SEGURANÇA:
// - Use SEMPRE a chave "anon"/"publishable" (é a única segura para o navegador).
// - NUNCA exponha a "service_role key" no frontend: ela ignora TODAS as
//   políticas de RLS. O build falha de propósito se ela for configurada aqui.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis do Supabase não configuradas. Cadastre VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas Environment Variables da Vercel e faça um novo deploy (localmente: rode "vercel env pull .env.local").'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
