# WaveType — plataforma front-end

Protótipo navegável da nova WaveType. A entrega une a experiência pública de digitação, a apresentação comercial do produto e as áreas de aluno e professor. Não existe gravação real no Supabase nesta versão; as ações demonstram o fluxo e deixam os pontos de integração explícitos.

## Como visualizar

Sirva esta pasta por HTTP e abra `index.html`. A página inicial mantém o teste de digitação funcional. Para revisar as áreas internas sem autenticação real:

- Área do aluno: `app/aluno/index.html`
- Área do professor: `app/professor/index.html`
- Login: `login.html`
- Cadastro: `cadastro.html`

## Páginas entregues

### Público

- `index.html`: digitação imediata, resultado, apresentação do produto e demonstrações.
- `como-funciona.html`: método e explicação das métricas.
- `escolas.html`: proposta para professores e instituições.
- `sobre.html`: origem, missão, visão, propósito e valores.
- `login.html` e `cadastro.html`: interfaces prontas para receber Supabase Auth.

### Aluno

- Visão geral, prática, resultados, conquistas e ranking.
- Entrada em turma por código.
- Métricas e histórico em estados demonstrativos.

### Professor

- Visão geral, turmas, alunos, exercícios e relatórios.
- Modais de nova turma, novo exercício e novo aluno.
- Busca visual de alunos e estados de acompanhamento.

## Organização

```text
assets/                 fontes, logos, favicons e imagens oficiais
css/
  style.css             experiência pública e teste de digitação
  platform.css          design system e interfaces autenticadas
app/
  aluno/                páginas do aluno
  professor/            páginas do professor
js/
  script.js             lógica original do teste de digitação
  site.js               navegação e tema do site público
  public-gate.js        convite de login em recursos protegidos
  auth-ui.js            validações visuais de login/cadastro
  platform-shell.js     sidebar, topbar, tema, modais e avisos
integracao/supabase/    módulos e schema recebidos do Kauan, preservados
docs/                   contrato de dados e guia de integração
```

## Identidade aplicada

- Tipografia de interface: Manrope.
- Tipografia de digitação e métricas: IBM Plex Mono.
- Paleta: Action Blue, Wave Blue, Flow Violet, Evolution Aqua, Deep Ink e Soft Mist; o modo escuro usa apenas as extensões oficiais do kit.
- Marca oficial em SVG e favicons do brand kit.

Não adicione outra fonte ou cor sem revisar o manual da marca.

## O que está funcional agora

- Teste de digitação completo, com níveis, tempos, frases/palavras, métricas, gráfico e histórico local.
- Tema claro/escuro.
- Navegação responsiva de todas as páginas.
- Busca local na tabela de alunos.
- Modais e estados de retorno para ações do professor.
- Validação visual dos formulários de login e cadastro.

## Antes de ligar o backend

Leia `docs/INTEGRACAO-SUPABASE.md` e `docs/CONTRATO-DE-DADOS.md`. Existem decisões de banco necessárias para recursos que aparecem no protótipo, mas ainda não existem no schema atual, como XP, conquistas, sequência de dias, semestre/status de turma e notificações.
