# WaveType

**Aprenda no seu ritmo. Evolua a cada tecla.**

A WaveType é uma plataforma educacional de digitação, produto da **CMK Cogit**.
Ela une prática imediata, acompanhamento individual e gestão de turmas: o
visitante faz um teste gratuito sem cadastro, o aluno segue uma trilha com
começo, meio e fim, e o professor acompanha as turmas com dados claros.

## O que a plataforma oferece

- Teste de digitação público, sem cadastro, com WPM líquido e bruto, precisão,
  consistência do ritmo e diagnóstico das teclas e palavras.
- Teste de nivelamento que indica a lição exata para começar.
- Trilha oficial de 6 níveis × 20 exercícios, com tempo máximo e precisão mínima.
- Contas pessoais, de professor e de aluno (aluno sem e-mail, criado pelo professor).
- Turmas, atividades com meta e prazo, relatórios e ranking.
- XP, sequência de dias e conquistas calculadas no servidor.
- Tema claro e escuro, alto contraste, texto maior e movimento reduzido.

## Stack

HTML, CSS e JavaScript (módulos ES, sem framework) · Vite 5 · Supabase
(Postgres, Auth, RLS) · Vercel.

## Começar

```bash
npm install
```

```bash
vercel env pull .env.local
```

```bash
npm run dev
```

```bash
npm test
```

Sem a Vercel CLI, copie `.env.example` para `.env.local` e preencha
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (só a chave **anon**).

## Documentação

Toda a documentação está em [`docs/`](docs/README.md):

| Parte | Documentos |
| --- | --- |
| **Empresa** | [Visão geral](docs/empresa/01-visao-geral.md) · [Produto e mercado](docs/empresa/02-produto-e-mercado.md) · [Marca e comunicação](docs/empresa/03-marca-e-comunicacao.md) · [Princípios e glossário](docs/empresa/04-principios-e-glossario.md) |
| **Código** | [Arquitetura](docs/codigo/01-arquitetura.md) · [Front-end](docs/codigo/02-frontend.md) · [Motor e métricas](docs/codigo/03-motor-e-metricas.md) · [Banco de dados](docs/codigo/04-banco-de-dados.md) · [Autenticação e contas](docs/codigo/05-autenticacao-e-contas.md) · [Nivelamento e gamificação](docs/codigo/06-nivelamento-e-gamificacao.md) · [Testes](docs/codigo/07-testes-e-qualidade.md) · [Guia de desenvolvimento](docs/codigo/08-guia-de-desenvolvimento.md) |
| **Configuração** | [Supabase, Google e Vercel](docs/CONFIGURACAO.md) |

## Estrutura resumida

```text
*.html            site público e telas de acesso
app/              áreas logadas: usuario/, aluno/, professor/
js/               módulos (api, sessao, digitacao, nivelamento, contas, ui, pages)
css/              estilos (redesign/ = tokens e camadas atuais)
assets/           fontes, logos e ícones
supabase/         migrações, testes SQL e modelos de e-mail
tests/            testes de regra e ponta a ponta
docs/             documentação
```

© 2026 WaveType · CMK Cogit
