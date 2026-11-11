# Cadastros do professor e nova trilha

## Migrações

| Arquivo | O que faz |
|---|---|
| `20261111000016_validar_ano_letivo_e_prazo.sql` | Gatilhos `turmas_validar_ano_letivo` e `exercicios_validar_prazo`. Turma: ano do atual até 5 à frente, formato `2026` ou `2026 · 2º semestre` (semestre 1–2, bimestre 1–4, trimestre 1–3). Atividade: prazo no futuro. As duas regras valem ao criar e quando o campo muda, então registros antigos continuam editáveis. "Ano atual" usa o horário de Brasília. |
| `20261111000017_nova_trilha_progressiva.sql` | Trilha refeita: 5 níveis × 4 etapas × 5 exercícios = 100. Atualiza os exercícios existentes **no mesmo registro** (mesmo id, nível e ordem), então resultados, conclusões e conquistas continuam ligados. O Nível 6 fica fora da trilha (não publicado), mas não é apagado. As conquistas que dependiam dele ganham critérios alcançáveis. |

Nenhuma tabela ou coluna nova: o período continua em `turmas.ano_letivo`.

## Trilha

| Nível | Etapas (5 exercícios cada) |
|---|---|
| 1 Posição base | F e J · A S D F G · H J K L Ç · fileira do meio completa |
| 2 Fileira superior | Q W E R T · Y U I O P · fileira completa · frases |
| 3 Fileira inferior | Z X C V · B N M · fileira completa · frases |
| 4 Combinação | palavras curtas · médias · longas · frases |
| 5 Digitação avançada | maiúsculas, ponto e vírgula · acentos · pontuação completa · textos |

- Cada texto usa só teclas já ensinadas.
- Até o Nível 5 não há acentos, maiúsculas nem pontuação; também não há palavras que precisariam de acento.
- Todos os textos têm 150+ caracteres, então o treino não completa nada.

As teclas de cada etapa ficam em `js/exercicios-dados.js` e são conferidas por `tests/trilha.test.js`.

## Testes

- `supabase/testes/cadastros_professor.test.sql`
- `supabase/testes/nova_trilha.test.sql`
- `tests/periodo.test.js`
- `tests/trilha.test.js`
- `tests/e2e/cadastros.e2e.cjs`
