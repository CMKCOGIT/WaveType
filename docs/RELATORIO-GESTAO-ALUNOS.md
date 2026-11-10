# Melhorias: cadastro, gestão de alunos, ranking e treinos

## Banco de dados — migração `20261110000014_gestao_alunos_e_ranking.sql`

Idempotente, não apaga nem altera dados. **Nenhuma tabela nova e nenhuma coluna nova**: o modelo já
permitia um aluno em várias turmas (`matriculas` tem chave única `(aluno_id, turma_id)`, todas apontando
para o mesmo `usuarios.id`). Só funções e permissões mudaram:

| Função | O que faz |
|---|---|
| `entrar_na_turma` | Agora sempre recusa e perdeu o `EXECUTE` de `authenticated`. Só o professor matricula. |
| `adicionar_aluno_por_id` | Passa a exigir turma ativa. |
| `buscar_aluno_por_codigo(turma, código)` | Professor dono da turma vê nome, código, nº de turmas ativas e se já está na turma (sem e-mail, sem resultados). |
| `adicionar_aluno_existente(turma, código)` | Liga o cadastro existente à turma (`adicionado` / `reativado` / `ja_estava`). Não cria conta. |
| `professor_importar_alunos(turma, jsonb)` | Valida no banco, ignora quem já está na turma (nome sem acento/maiúsculas) e repetidos do arquivo, cria o resto com `professor_criar_alunos`. |
| `alunos_da_turma` | Devolve também `codigo_aluno` (exportação). |
| `ranking_turma(turma)` | Top 5 anônimo (Guepardo, Lebre, Raposa, Cavalo, Gato) + a posição de quem consulta. Nunca devolve nome, e-mail ou ID de colegas. |
| `ranking_exercicio` | Nomes de colegas só para o autor da atividade (antes qualquer aluno via API recebia os nomes). |
| `nome_normalizado`, `aluno_pelo_identificador` | Auxiliares. |

**Pontuação do ranking:** média de WPM × precisão ÷ 100 dos 20 treinos concluídos mais recentes desde que
o aluno entrou na turma (atividades da turma + trilha; prática livre não conta). Respeita a regra de
transferência de conta (dados anteriores à transferência ficam fora).

## Testes

- `supabase/testes/gestao_alunos_e_ranking.test.sql` (Postgres local): permissões, sem conta duplicada,
  aluno em duas turmas, reativação, importação, bloqueio de `entrar_na_turma`, ranking anônimo.
- `tests/planilha.test.js`, `tests/textos.test.js` (Node): leitura de .xlsx/.xls/.csv (UTF-8 e Windows-1252),
  prévia, exportação com proteção contra fórmulas, geração de textos.
- `tests/e2e/gestao.e2e.cjs` (Playwright, Supabase simulado): fluxos completos nas telas.
