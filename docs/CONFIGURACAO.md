# Configuração do WaveType (Supabase, Google e Vercel)

O código não consegue alterar estas configurações sozinho: elas ficam nos painéis do Supabase, do Google Cloud e da Vercel. Siga na ordem.

## 1. Banco de dados (Supabase › SQL Editor)

Rode os arquivos de `supabase/migrations/` **nesta ordem**, um por vez (cada um pode ser rodado de novo sem duplicar nada):

1. `20261027000001_perfis_e_cadastro_google.sql`
2. `20261027000002_turmas_atividades_rls.sql`
3. `20261027000003_trilha_nivel_extremo.sql`
4. `20261027000004_conquistas_gamificacao.sql`
5. `20261028000005_tempo_maximo_e_precisao.sql` (tempo máximo e precisão acima de 85% em toda a trilha; tempo e precisão definidos pelo professor nas atividades)

Depois rode `supabase/verificacao.sql`. Cada nível (1 a 6) deve mostrar 20 exercícios e as demais consultas devem voltar vazias.

> Faça as migrações **antes** de publicar o código novo: as telas novas usam colunas e funções criadas por elas.

## 2. URLs de retorno (Supabase › Authentication › URL Configuration)

É aqui que o login com Google costuma falhar em produção. Se a URL de retorno do site não estiver liberada, o Supabase manda a pessoa para a *Site URL* (normalmente `http://localhost:...`) e o login "não funciona".

- **Site URL**: o domínio de produção, por exemplo `https://wave-type.vercel.app` (ou o seu domínio próprio).
- **Redirect URLs** (adicione todas):
  - `https://SEU-DOMINIO/**`
  - `https://*-cmkcogit.vercel.app/**` (previews da Vercel, que mudam de endereço a cada deploy)
  - `http://localhost:5173/**` (desenvolvimento)

O site agora volta do Google direto para `/login.html` ou `/cadastro.html` (não existe mais a tela intermediária). O endereço antigo `/app/redirecionando.html` continua funcionando e só repassa.

## 3. Provedor Google (Supabase › Authentication › Providers › Google)

- Ative o Google e preencha **Client ID** e **Client Secret** do Google Cloud.
- Copie a **Callback URL** mostrada ali (`https://<projeto>.supabase.co/auth/v1/callback`).

## 4. Google Cloud Console (APIs e serviços › Credenciais › seu ID do cliente OAuth)

- **URIs de redirecionamento autorizados**: cole a Callback URL do Supabase do passo 3. (É o Supabase que recebe a resposta do Google, não o site.)
- **Origens JavaScript autorizadas**: o domínio de produção e `http://localhost:5173`.
- **Tela de consentimento OAuth**: se estiver em modo *Teste*, só os e-mails listados em "Usuários de teste" conseguem entrar. Para liberar para todos, publique o app (*Em produção*).

## 5. Variáveis na Vercel (Project Settings › Environment Variables)

O build lê as variáveis direto da Vercel; não é preciso enviar `.env`.

| Nome | Valor | Ambientes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://<projeto>.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | chave **anon** / publishable | Production, Preview, Development |

Também são aceitos os nomes criados pela integração Supabase ↔ Vercel (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

- Marque **Preview** também: os deploys das branches (`wave`, `FEAT/...`) são Preview e, sem as variáveis, o build falha de propósito com uma mensagem clara.
- **Nunca** cadastre a `service_role` com esses nomes: o build é interrompido se ela aparecer.
- Depois de mudar variáveis, faça **Redeploy**: o Vite grava os valores no momento do build.

Para rodar localmente com as mesmas variáveis: `vercel env pull .env.local` (ou copie `.env.example` para `.env.local`).

## 6. Conferência rápida depois do deploy

1. Abrir o site publicado › Entrar › Continuar com o Google › deve cair na área do perfil.
2. Conta Google nova › deve abrir "Conclua seu cadastro" e só liberar a plataforma depois de escolher o tipo.
3. No console do navegador (F12), nenhuma mensagem em vermelho; na aba Rede, as chamadas a `supabase.co` devem responder 200/201.
