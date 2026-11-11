# Acompanhamento do professor, PDFs e navegação

## Banco de dados: migração `20261111000015_detalhe_das_tentativas.sql`

Idempotente, não altera nem apaga dados.

| Item | O que é |
|---|---|
| `resultados_detalhes` (tabela nova) | Uma linha por tentativa: o que o aluno digitou palavra por palavra (`[esperado, digitado, erros cometidos]`), erros por tecla, WPM bruto, consistência, erros corrigidos, letras omitidas/extras e modo de erros. `resultado_id` → `resultados(id)` com `on delete cascade`. |
| Política `resultados_detalhes_select` | Quem enxerga o resultado (política de `resultados`) enxerga o detalhe: o próprio aluno e o professor autor da atividade/dono da turma, respeitando a transferência de conta. Nenhum colega vê. |
| `registrar_detalhes_resultado(resultado, jsonb)` | Só o dono do resultado, até 15 min depois, uma vez, com validação de formato e tamanho. Sem escrita direta na tabela. |
| `entregas_da_atividade(atividade)` | Visão da turma: todos os alunos das turmas que receberam a atividade (com ou sem tentativa). Só o autor. |
| `tentativas_do_aluno(atividade, aluno)` | Tentativas do aluno com o detalhe. Só o autor. |

Resultados antigos continuam iguais; aparecem só com os números (a tela avisa que o texto digitado não era guardado).

## PDFs

Gerados no navegador com jsPDF 4.2.1 + jspdf-autotable 5.0.9 (carregados só ao exportar). Não precisa de função de
servidor: os dados já chegam filtrados pelo banco. Os PDFs de alunos **não incluem senhas**.

- Alunos → acessos criados → **Exportar PDF** (nome, usuário da escola, código, turma).
- Alunos → Exportar alunos → **PDF** (turma selecionada).
- Perfil do professor → cadastro de aluno → **Exportar PDF**.
- Exercícios → atividade → **Exportar PDF / planilha** (resultados da turma).
- Relatórios → **Exportar PDF / planilha**.

## Testes

- `supabase/testes/detalhe_das_tentativas.test.sql`
- `tests/analise.test.js`
- `tests/e2e/acompanhamento.e2e.cjs`
