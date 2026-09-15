# WaveType — backend em Supabase + JS

Estrutura pensada só nas funcionalidades (sem HTML/CSS estruturado —
isso fica pra depois). Cada arquivo `.js` é um módulo independente que
você importa nas páginas.

## Estrutura

```
sql/schema.sql     -> rode isso no SQL Editor do Supabase (cria tabelas, RLS, triggers, RPC)
js/supabaseClient.js -> inicializa o client
js/auth.js          -> cadastro, login (e-mail/senha e Google), logout
js/turmas.js        -> professor cria turma / aluno entra com código
js/exercicios.js    -> professor cria exercício / lista exercícios
js/resultados.js    -> aluno salva resultado de treino / histórico / ranking
```

## Configuração

1. Crie um projeto no Supabase e rode `sql/schema.sql` no SQL Editor.
2. Em **Authentication > Providers**, ative Google OAuth se for usar login com Google.
3. Na Vercel, configure as variáveis de ambiente (Project Settings > Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (pegue os dois em Project Settings > API, no painel do Supabase — use sempre a **anon key**, nunca a `service_role`).
4. Instale o SDK: `npm install @supabase/supabase-js`.

## Por que ficou assim (decisões de segurança)

- **Sem coluna de senha própria**: a autenticação usa o Supabase Auth
  (`auth.users`), que já cuida de hashing (bcrypt), tokens e sessão.
  Implementar hash de senha à mão no frontend seria um risco grande
  e desnecessário aqui.
- **RLS (Row Level Security) ligado em todas as tabelas**: sem isso,
  qualquer usuário autenticado com a chave `anon` conseguiria ler ou
  editar a tabela inteira, não só os próprios dados. As policies
  garantem que aluno só vê o que é dele, e professor só gerencia as
  próprias turmas/exercícios.
- **Trigger `handle_new_user`**: cria automaticamente a linha em
  `public.usuarios` (nome, tipo) quando alguém se cadastra, sem
  precisar de um segundo insert manual vindo do cliente.
- **RPC `ranking_exercicio` com `SECURITY DEFINER`**: como a RLS
  normalmente impede ler o nome de outros alunos, o ranking passa por
  uma função no banco que expõe só o necessário (nome + ppm + precisão),
  sem abrir a tabela `usuarios` inteira.
- **Validações client-side em todos os módulos**: tamanho de campos
  batendo com os `VARCHAR` do banco, faixas numéricas (ppm, precisão,
  tempo), mensagens genéricas no login (evita enumeração de e-mails
  cadastrados). Isso é só a primeira camada — a validação que realmente
  vale é a do banco (`CHECK`, `UNIQUE`, RLS), porque o JS do navegador
  sempre pode ser adulterado.
- **Código de convite de turma**: gerado com `crypto.getRandomValues`
  (aleatoriedade forte), não com `Math.random()`, e sem caracteres
  ambíguos (O/0, I/1).
- **Sem `service_role key` no frontend**: em nenhum arquivo aqui essa
  chave é usada — ela só faria sentido em uma função de servidor
  (Vercel Serverless/Edge Function), nunca em código que roda no navegador.

## Pendências pra próxima etapa

- Ligar esses módulos nas páginas (formulários de login/cadastro, tela
  de treino, dashboards de professor e aluno).
- Se quiser reforçar ainda mais, dá pra mover a gravação de
  `resultados` para uma Edge Function que recalcula PPM/precisão no
  servidor a partir do texto e do tempo, em vez de confiar só no que o
  cliente manda.
