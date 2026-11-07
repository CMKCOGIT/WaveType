# Documentação da WaveType

Esta pasta reúne toda a documentação da WaveType: a **empresa** (quem somos, o
que oferecemos, como falamos) e o **código** (como a plataforma é construída,
como rodar, testar e evoluir).

> Última revisão: novembro de 2026 · versão do produto `0.1.0`.

## Como ler

| Se você é… | Comece por |
| --- | --- |
| Alguém conhecendo a WaveType | [Empresa › Visão geral](empresa/01-visao-geral.md) |
| Parceiro, escola ou investidor | [Empresa › Produto e mercado](empresa/02-produto-e-mercado.md) |
| Designer ou responsável por comunicação | [Empresa › Marca e comunicação](empresa/03-marca-e-comunicacao.md) |
| Pessoa desenvolvedora chegando agora | [Código › Arquitetura](codigo/01-arquitetura.md) e depois o [Guia de desenvolvimento](codigo/08-guia-de-desenvolvimento.md) |
| Quem vai mexer no banco | [Código › Banco de dados](codigo/04-banco-de-dados.md) |

## Parte 1 · Empresa

| Documento | Conteúdo |
| --- | --- |
| [01 · Visão geral da empresa](empresa/01-visao-geral.md) | Origem, missão, visão, propósito, valores e estágio atual |
| [02 · Produto e mercado](empresa/02-produto-e-mercado.md) | Problema, proposta de valor, públicos, jornadas, funcionalidades, diferenciais e roteiro |
| [03 · Marca e comunicação](empresa/03-marca-e-comunicacao.md) | Identidade visual, cores, tipografia, ativos da marca, tom de voz e regras de escrita |
| [04 · Princípios, privacidade e glossário](empresa/04-principios-e-glossario.md) | Compromissos pedagógicos, de acessibilidade e de privacidade; vocabulário oficial |

## Parte 2 · Código

| Documento | Conteúdo |
| --- | --- |
| [01 · Arquitetura](codigo/01-arquitetura.md) | Stack, visão de componentes, estrutura de pastas, build e fluxo de dados |
| [02 · Front-end](codigo/02-frontend.md) | Páginas, módulos JavaScript, eventos, CSS e componentes de interface |
| [03 · Motor de digitação e métricas](codigo/03-motor-e-metricas.md) | Motor sem DOM, modos de erro, fórmulas, trilha oficial e regras de conclusão |
| [04 · Banco de dados (Supabase)](codigo/04-banco-de-dados.md) | Tabelas, relacionamentos, funções (RPC), gatilhos, RLS e migrações |
| [05 · Autenticação, sessão e contas](codigo/05-autenticacao-e-contas.md) | Papéis, formas de entrar, sessão, contas escolares, transferência e segurança |
| [06 · Nivelamento e gamificação](codigo/06-nivelamento-e-gamificacao.md) | Teste de nivelamento, sugestões no treino, XP, sequência e conquistas |
| [07 · Testes e qualidade](codigo/07-testes-e-qualidade.md) | Testes de regra, ponta a ponta e de banco; ferramentas de medição |
| [08 · Guia de desenvolvimento](codigo/08-guia-de-desenvolvimento.md) | Ambiente local, deploy, convenções, receitas e solução de problemas |

## Documentos históricos e de apoio

Estes documentos registram decisões de cada etapa do projeto. Continuam válidos
e são citados nos documentos acima.

| Documento | Conteúdo |
| --- | --- |
| [CONFIGURACAO.md](CONFIGURACAO.md) | Passo a passo dos painéis Supabase, Google Cloud e Vercel |
| [ETAPA-1.md](ETAPA-1.md) | Correção das métricas, modos de erro e camada de sessão |
| [ETAPAS-2-3-4.md](ETAPAS-2-3-4.md) | Identidade "Wave", contas escolares e nivelamento |
| [MAPA-DE-INTEGRACAO.md](MAPA-DE-INTEGRACAO.md) | Contrato original entre o HTML e o banco (atributos `data-*`) |
| [redesign/](redesign/README.md) | Redesenho visual: auditoria, tokens, componentes, animações, responsividade e evidências |
