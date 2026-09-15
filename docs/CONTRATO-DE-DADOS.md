# Contrato de dados da interface

Este documento separa o que o schema atual já suporta do que foi desenhado como evolução de produto. Assim, o front-end não induz a equipe a acreditar que um dado demonstrativo já existe no banco.

## Convenção de nomes

O banco usa `snake_case`. A interface e os módulos JavaScript usam `camelCase`.

| Interface | Banco | Tipo esperado |
|---|---|---|
| `usuarioId` | `usuarios.id` | UUID |
| `nome` | `usuarios.nome` | texto, 2–120 |
| `email` | `usuarios.email` | texto, até 190 |
| `tipo` | `usuarios.tipo` | `aluno` ou `professor` |
| `turmaId` | `turmas.id` | inteiro |
| `codigoConvite` | `turmas.codigo_convite` | texto, até 20 |
| `professorId` | `turmas.professor_id` | UUID |
| `exercicioId` | `exercicios.id` | inteiro |
| `titulo` | `exercicios.titulo` | texto, até 150 |
| `textoReferencia` | `exercicios.texto_referencia` | texto |
| `tempoLimiteSeg` | `exercicios.tempo_limite_seg` | 1–3600 |
| `ppm` | `resultados.ppm` | decimal positivo |
| `precisao` | `resultados.precisao` | 0–100 |
| `acertos` | `resultados.acertos` | inteiro positivo |
| `erros` | `resultados.erros` | inteiro positivo |
| `tempoSeg` | `resultados.tempo_seg` | 0–3600 |

## Recursos suportados pelo schema atual

- Cadastro e login por Supabase Auth.
- Perfil de aluno ou professor.
- Criação de turma e matrícula.
- Criação de exercícios vinculados ou não a uma turma.
- Resultado por aluno e exercício.
- Histórico individual.
- Ranking de um exercício.
- Médias de WPM/precisão e número de sessões, calculados a partir de `resultados`.

## Dados derivados, sem nova tabela

Estes números podem ser calculados por consulta, view ou RPC:

- WPM médio e melhor WPM.
- Precisão média.
- Quantidade de sessões.
- Média de uma turma.
- Alunos sem prática recente.
- Posição em ranking.

Para volume real, prefira views/RPCs agregadas a baixar todos os resultados no navegador.

## Recursos visuais que pedem evolução do schema

| Recurso do protótipo | Necessidade provável |
|---|---|
| Nível e XP | tabela/regra de progressão ou view calculada |
| Conquistas | catálogo de conquistas + conquistas por usuário |
| Sequência de dias | cálculo por resultados diários ou tabela agregada |
| Turma ativa/encerrada | coluna `status` ou `ativa` em `turmas` |
| Período/semestre | coluna em `turmas` |
| Exercício concluído/pendente | prazo e relação de atribuição por turma/aluno |
| Notificações | tabela de avisos e leitura por usuário |
| Atrasado/em dia | prazo do exercício + regra de conclusão |
| Exercício em várias turmas | tabela associativa `exercicios_turmas` |

Os valores dessas áreas estão marcados como demonstração no front-end. A equipe deve aprovar as regras pedagógicas antes de criar tabelas.
