# 08 · Guia de desenvolvimento

## Pré-requisitos

- Node.js 20 ou mais recente e npm.
- Acesso ao projeto Supabase (ou use o Supabase simulado dos testes e2e).
- Opcional: Vercel CLI (`vercel env pull`), `psql` para os testes de banco,
  Playwright para os testes e2e.

## Primeiros passos

```bash
npm install
```

Traga as variáveis da Vercel (ou copie `.env.example` para `.env.local` e preencha):

```bash
vercel env pull .env.local
```

```bash
npm run dev
```

O site abre em `http://localhost:5173`. Sem variáveis, o Vite avisa no terminal
e as páginas que usam o Supabase mostram um erro claro.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o `dist/` (porta 4173) |
| `npm test` | Testes de regra |
| `npm run test:e2e` | Testes no navegador (precisa do dev server com Supabase simulado) |

### Variáveis de ambiente

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<projeto>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave **anon / publishable** |

Também são aceitos `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e as variantes
`*_PUBLISHABLE_KEY`. **Nunca** use a `service_role`: o build é interrompido.

## Deploy

| Etapa | Onde |
| --- | --- |
| 1. Rodar migrações novas | Supabase › SQL Editor (antes do deploy) |
| 2. Conferir variáveis em Production **e** Preview | Vercel › Project Settings › Environment Variables |
| 3. Push na branch | Vercel gera um Preview (`*-cmkcogit.vercel.app`) |
| 4. Merge na branch principal | Vercel publica em produção |
| 5. Conferência rápida | Entrar com Google, conta nova conclui cadastro, console sem erros |

Mudou variáveis? Faça **Redeploy**: o Vite grava os valores no momento do build.
Passo a passo completo dos painéis em [CONFIGURACAO.md](../CONFIGURACAO.md).

## Convenções

### Idioma e nomes

- **Código, comentários, commits e documentação em português.** Funções e
  variáveis em `camelCase` português (`registrarResultado`, `exigirPapel`).
- Exceções herdadas em inglês existem (`script.js`, `achievements.js`) e podem
  continuar como estão.
- Tabelas e colunas do banco em `snake_case` português (`tempo_limite_seg`).
- Parâmetros de RPC com prefixo `p_` (`p_turma_id`).

### Estilo de código

- Módulos ES (`import`/`export`), sem bundler específico além do Vite.
- 2 espaços, aspas simples, ponto e vírgula, vírgula final em objetos de várias
  linhas (o `script.js` antigo usa 4 espaços; mantenha o estilo de cada arquivo).
- Cada arquivo começa com um comentário: caminho e para que serve.
- Regras de negócio **sem DOM** e com teste; a página só orquestra.
- Mensagens para a pessoa em português claro (ver [Marca e comunicação](../empresa/03-marca-e-comunicacao.md#tom-de-voz)).

### Commits

Padrão observado no histórico (Conventional Commits em português):

```text
feat(nivelamento): sugestão também quando várias teclas ficam muito abaixo do esperado
fix(privacidade): conta transferida fora das médias e relatórios do professor
docs: Etapas 2 a 4 (configuração do Supabase, modelo de contas, nivelamento e testes)
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `style`. Escopo = área
(`sessao`, `contas`, `digitacao`, `ui`, `professor`, `escolas`...).

### Branches

- Funcionalidades em `FEAT/<assunto>` ou na branch combinada para a tarefa.
- Toda branch gera Preview na Vercel; confira antes do merge.

## Receitas

### Adicionar uma página na área logada

1. Crie `app/<papel>/<nome>.html` copiando uma página irmã (mantém cabeçalho,
   menu, `data-role`, `data-page` e o CSS `redesign/plataforma.css`).
2. Crie `js/pages/<papel>-<nome>.js`:

   ```js
   // js/pages/aluno-exemplo.js
   import { exigirPapel } from '../auth.js';

   iniciar();

   async function iniciar() {
     const perfil = await exigirPapel('aluno'); // redireciona se não puder estar aqui
     if (!perfil) return;
     // carregar dados via js/api/* e preencher a tela
   }
   ```

3. Inclua no HTML: `<script type="module" src="../../js/pages/aluno-exemplo.js">`,
   `motion.js` e `ui/plataforma.js`.
4. Adicione o item no menu lateral das páginas do papel.
5. O Vite pega o HTML novo automaticamente (glob `app/**/*.html`).

### Adicionar uma chamada ao banco

1. Se precisar de regra ou permissão nova, crie uma **migração** (ver
   [regras](04-banco-de-dados.md#regras-para-escrever-uma-migração-nova)).
2. Adicione a função no arquivo certo de `js/api/` (um assunto por arquivo).
3. Lance erros; a página mostra `traduzErro(erro)`.
4. Nunca confie no navegador para decidir permissão ou pontuação.

### Mudar um limite de métrica ou de nivelamento

1. Edite `js/digitacao/config.js` ou `js/nivelamento/config.js`.
2. Rode `npm test` e ajuste os testes que mudarem de propósito.
3. Se o limite também existe no banco (ex.: 85% da trilha), mude os dois
   (`precisao_minima_trilha` e `PRECISAO_MINIMA_TRILHA` em `js/regras.js`).

### Mudar um exercício da trilha

Os textos estão no banco (`exercicios` com `nivel_trilha` e `ordem`). Faça por
migração (`update ... where nivel_trilha = X and ordem = Y`). O tempo máximo é
recalculado sozinho pelo gatilho. Títulos de níveis e etapas ficam em
`js/exercicios-dados.js`.

### Adicionar um componente visual

- Use os tokens `--wt-*` de `css/redesign/tokens.css`, nunca cores soltas.
- Respeite tema escuro, alto contraste e movimento reduzido.
- Decorações com `aria-hidden="true"`.
- Documente em [redesign/02-componentes.md](../redesign/02-componentes.md).

## Solução de problemas

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| "Variáveis do Supabase não configuradas" | Falta URL/chave no build | Cadastre na Vercel (Production e Preview) e faça Redeploy; localmente, `.env.local` |
| Build falha com "service_role" | Chave secreta configurada | Troque pela chave anon/publishable |
| Login com Google volta para `localhost` | Redirect URL não liberada | Supabase › URL Configuration › Redirect URLs |
| Google só funciona para alguns e-mails | Tela de consentimento em modo Teste | Publique o app no Google Cloud |
| Pessoa presa em "Conclua seu cadastro" | Migração 06 não aplicada | Rode as migrações e `diagnostico.sql` |
| "Could not find ... in the schema cache" | Cache da API desatualizado | `notify pgrst, 'reload schema';` |
| "Vincular Google" só mostra aviso | Manual linking desligado | Ligue em Authentication › Sign In / Providers |
| Aluno não confirma e-mail novo | Secure email change ligado | Desligue (o e-mail interno não recebe mensagens) |
| E-mails não chegam | SMTP padrão do Supabase | Configure SMTP próprio |
| Professor não consegue fixar o modo de erros | Migração 08 ausente | Rode a migração 08 (o resto funciona sem ela) |
| Exercício não conclui com 85% | Regra: precisa ser **acima** de 85% | Comportamento esperado |
