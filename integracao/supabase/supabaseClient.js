// supabaseClient.js
// Inicializa o cliente Supabase a partir de variáveis de ambiente.
//
// SEGURANÇA:
// - Use SEMPRE a chave "anon" aqui (é a única segura para o navegador).
// - NUNCA importe/exponha a "service_role key" no frontend: ela ignora
//   todas as políticas de RLS e dá acesso total ao banco.
// - Configure as variáveis abaixo no painel da Vercel (Project Settings
//   > Environment Variables), não deixe valores fixos no código.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase não configuradas (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
