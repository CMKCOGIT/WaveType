# 07 · Testes e qualidade

A WaveType tem três camadas de teste, uma para cada lugar onde moram as regras.

| Camada | Ferramenta | Onde | O que cobre |
| --- | --- | --- | --- |
| Regras (unidade) | `node:test` (sem dependências) | `tests/*.test.js` | Motor, métricas, sessão, nivelamento, credenciais, geometria da onda |
| Ponta a ponta | Playwright + Supabase simulado | `tests/e2e/*.e2e.cjs` | Fluxos no navegador real |
| Banco | `psql` num Postgres local | `supabase/testes/*.test.sql` | Migrações, RLS e RPCs |

## Testes de regra

```bash
npm test
```

Executa `node --test tests/*.test.js`. São **69 testes**, todos rápidos (menos
de 1 s), sem navegador nem rede.

| Arquivo | Testes | Foco |
| --- | :-: | --- |
| `motor.test.js` | 18 | Modos fluxo e correção, Backspace, espaço antecipado, letras extras, término, teclas mais erradas |
| `sessao.test.js` | 14 | Destinos por papel, `?redirect=` seguro, expiração, acesso cruzado, papel trocado, conta desativada, inatividade |
| `nivelamento.test.js` | 12 | Regiões do teclado, parada por precisão, recomendações, aceitar/ignorar, sugestão por precisão e por teclas |
| `credenciais.test.js` | 11 | Usuário a partir do nome, colisões, senha, lista colada, troca de usuário |
| `metricas.test.js` | 9 | Consistência (amostra, pausas, limites), precisão, ppm |
| `onda.test.js` | 5 | Caminho da onda, curva suave, amplitude pela consistência |

**Regra da casa:** toda função pura nova em `digitacao/`, `sessao/regras.js`,
`nivelamento/`, `contas/` ou `ui/onda-caminho.js` ganha teste aqui.

## Testes ponta a ponta

Requerem Playwright (já instalado no ambiente de nuvem) e o servidor de
desenvolvimento apontando para um Supabase **falso**: as chamadas de rede são
interceptadas e respondidas por um "banco" em memória.

```bash
VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon-teste npx vite --port 5173
```

```bash
npm run test:e2e
```

| Arquivo | Casos |
| --- | --- |
| `sessao.e2e.cjs` | Visitante vê Entrar/Criar conta · logado sem "piscar" · logado em /login e /cadastro vai para a área · acesso cruzado · sessão expirada sem loop · logout numa aba derruba a outra · login com usuário da escola · abas do login pelo teclado · nivelamento do visitante |
| `contas.e2e.cjs` | Cadastro público sem conta de aluno · professor entra · professor cadastra aluno e recebe credenciais · aluno entra com elas · aluno não abre o painel do professor · botão de tema nos dois sentidos |

## Testes de banco

Rodam as migrações num Postgres local que imita o mínimo do Supabase
(`anon`/`authenticated`, schema `auth`, `auth.uid()` a partir de
`request.jwt.claim.sub`, `pgcrypto` em `extensions`).

```bash
psql -1 -f supabase/testes/base-supabase-local.sql
psql -1 -f schema.sql
for f in supabase/migrations/*.sql; do psql -1 -f "$f"; done
```

```bash
psql -v ON_ERROR_STOP=1 -f supabase/testes/contas_escolares.test.sql
psql -v ON_ERROR_STOP=1 -f supabase/testes/nivelamento.test.sql
psql -v ON_ERROR_STOP=1 -f supabase/testes/transferencia.test.sql
psql -v ON_ERROR_STOP=1 -f supabase/testes/aluno_so_pelo_professor.test.sql
```

| Arquivo | Garante |
| --- | --- |
| `contas_escolares.test.sql` | Criação em lote com colisão, login com usuário da escola, bloqueio após 8 falhas, `anon` não cria alunos, nova senha com histórico intacto |
| `nivelamento.test.sql` | Gravação e leitura de nivelamentos e sugestões; visão do professor |
| `transferencia.test.sql` | Professor deixa de ver dados e médias anteriores à transferência, mesmo se o aluno voltar à turma |
| `aluno_so_pelo_professor.test.sql` | Cadastro público e `concluir_cadastro` recusam "aluno"; usuário não vira aluno; professor cria e o aluno entra |

## Conferência do banco em produção

No SQL Editor do Supabase:

- `supabase/diagnostico.sql`: quais migrações estão aplicadas e se há contas
  presas na conclusão do cadastro.
- `supabase/verificacao.sql`: cada nível (1 a 6) deve ter 20 exercícios; as
  demais consultas devem voltar vazias.

## Qualidade visual, acessibilidade e desempenho

Scripts em `docs/redesign/ferramentas/` (Playwright com o Supabase simulado),
usados com o build servido por `npx vite preview`:

```bash
node docs/redesign/ferramentas/<script>.cjs http://localhost:4173
```

| Script | Mede |
| --- | --- |
| `auditoria.cjs` | Capturas e métricas em 375, 768 e 1280 px |
| `checklist.cjs` | Checklist de não-regressão |
| `contraste.cjs` | Contraste das cores (WCAG) |
| `modos.cjs` | Tema escuro, alto contraste, texto maior, menos movimento |
| `inp.cjs`, `lat.cjs` | Responsividade a interações (INP) e latência da digitação |
| `medir.cjs`, `nr.cjs`, `plat.cjs` | Medições do site e da plataforma |
| `lh.sh` | Lighthouse |

Resultados e capturas de referência ficam em `docs/redesign/evidencias/` e
`docs/redesign/capturas/`.

## Antes de abrir um PR

```bash
npm test
```

```bash
npm run build
```

- Rodou uma migração nova? Rode também os testes de banco.
- Mexeu em sessão, login ou contas? Rode `npm run test:e2e`.
- Mexeu em interface? Confira 375, 768 e 1280 px, tema escuro e alto contraste.
