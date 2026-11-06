# Etapas 2, 3 e 4

## Para colocar no ar (Supabase)

1. Rode no SQL Editor, nesta ordem (todas idempotentes, nenhuma apaga dados):
   - `supabase/migrations/20261105000008_modo_erros_turma.sql` (Etapa 1.6)
   - `supabase/migrations/20261105000009_contas_escolares.sql` (Etapa 3)
   - `supabase/migrations/20261105000010_nivelamento.sql` (Etapa 4)
   - `supabase/migrations/20261105000011_transferencia_nos_relatorios.sql` (privacidade da transferência)
   - `supabase/migrations/20261105000012_trocar_usuario_aluno.sql` (trocar usuário do aluno)
   - `supabase/migrations/20261106000013_aluno_so_pelo_professor.sql` (conta de aluno só pelo professor)
2. Authentication → Sign In / Providers:
   - **Allow manual linking: ligado.** Sem isso, "Vincular Google" mostra
     um aviso e não vincula.
   - **Secure email change: desligado.** O e-mail interno da conta da escola
     (`<id>@aluno.wavetype.com.br`) não recebe mensagens. Com a opção ligada,
     o aluno não consegue confirmar o e-mail novo.
3. Authentication → Rate Limits: o limite de "sign-ins" do Supabase também
   vale para o login com usuário da escola (além do bloqueio da própria RPC).

As contas existentes continuam funcionando: não houve migração destrutiva.

## Etapa 2: identidade "Wave"

- Raios em `css/redesign/tokens.css`: `--radius-sm` 4px (botões, campos,
  seletores), `--radius-md` 8px, `--radius-lg` 12px (cartões), `--radius-pill`
  só em tags/selos. Os nomes antigos viraram apelidos.
- Componentes em `js/ui/onda.js`:

  | Componente | Uso |
  | --- | --- |
  | `<wave-divider>` | Divisor de seção (no topo da seção, com a cor dela) |
  | `<wave-divider tipo="linha">` | Traço ondulado (rodapé) |
  | `<wave-background variante="suave\|clara">` | Hero e painel do login |
  | `<wave-loader>` | Carregamento |
  | `<wave-meter valor="81">` | Indicador de consistência (onda calma = ritmo estável) |

  Geometria em `js/ui/onda-caminho.js`. A seção que recebe o divisor leva
  `data-onda-secao`.
- Gráfico de ritmo com curva suave; linha de progresso em onda.
- Animações desligadas com `prefers-reduced-motion` e com "Reduzir
  movimentos"; o alto contraste esconde as ondas de fundo.

## Etapa 3: contas e acesso

Modelo:

| Tabela | O que guarda |
| --- | --- |
| `usuarios` (existente) | Perfil. `id` = ID estável de todo o progresso |
| `auth.users` / `auth.identities` | Credenciais (senha em bcrypt, Google, e-mail) |
| `contas_escolares` | Usuário da escola (`login`), quem criou, turma de origem, status `escolar` / `pessoal` |
| `tentativas_login_escolar` | Limite de tentativas (8 falhas / 15 min → 10 min de bloqueio) |

Fluxos:

- **Google** nunca pede senha. Criar senha é opcional em Perfil. Se o e-mail
  do Google já tiver conta, o Supabase liga as duas identidades na mesma conta
  (vinculação automática por e-mail verificado).
- **Professor cria alunos** em Alunos → "Criar alunos sem e-mail" (um nome por
  linha, até 60). O usuário sai do nome (`maria.silva.santos`, `+2` em
  colisão) e a senha é palavra + 3 algarismos (`tucano472`). A senha aparece
  uma vez, nos cartões de acesso para imprimir.
- **Login** tem duas abas: "E-mail ou Google" e "Sou aluno com usuário da
  escola". Usuário inexistente e senha errada recebem a mesma mensagem.
- **Nova senha**: botão na lista de alunos. Encerra as sessões abertas e não
  mexe no histórico.
- **Trocar usuário**: botão na lista de alunos (ex.: nome digitado errado).
  Ganha um número no fim se o usuário já existir. A senha e o progresso não
  mudam, porque o login interno usa o ID.
- **Vincular** (Perfil): e-mail (com confirmação) ou Google. É a mesma conta.
- **Transferir ao terminar a escola** (Perfil): exige e-mail ou Google
  vinculado. O aluno sai das turmas, a conta vira pessoal e o professor deixa
  de ver os resultados individuais. Tudo o que veio antes da transferência
  também sai das médias da turma, das entregas das atividades, do ranking da
  atividade e do nível de partida (migração 11). Se o aluno voltar a uma turma
  pelo código, o professor vê só o que vier depois.

## Etapa 4: nivelamento e sugestões

- `nivelamento.html`: 5 etapas de até 35 s. O teste para quando a precisão
  fica abaixo de 80%. Limiares e mapeamento para a trilha ficam em
  `js/nivelamento/config.js`.
- Saída: nível, lição exata, teclas frágeis, região do teclado e explicação.
  Com sessão, salva. Visitante guarda no navegador e envia ao entrar.
- Treino: aparece uma sugestão não bloqueante num exercício acima do
  recomendado quando (a) a precisão fica abaixo de 70% em 2 tentativas
  seguidas, ou (b) numa tentativa, 3 ou mais teclas erram em 40% ou mais das
  vezes, cada uma com pelo menos 3 aparições. A mensagem cita essas teclas. A decisão fica
  em `sugestoes_nivel`. Três "Continuar mesmo assim" seguidos sobem a
  recomendação uma etapa; aceitar fixa a lição sugerida.
- O professor vê o ponto de partida e as sugestões aceitas/ignoradas na lista de alunos.

## Testes

```bash
npm test                 # 69 testes de regras (node:test)
npm run test:e2e         # 10 fluxos no navegador (Supabase simulado; ver ETAPA-1.md)
# Banco: Postgres local com o Supabase simulado
psql -1 -f supabase/testes/base-supabase-local.sql   # depois schema.sql e migrations/*.sql
psql -f supabase/testes/contas_escolares.test.sql
psql -f supabase/testes/nivelamento.test.sql
psql -f supabase/testes/transferencia.test.sql
```

## Contas de aluno só pelo professor

- **Cadastro público:** oferece só Usuário e Professor, no formulário e na
  conclusão do cadastro com o Google. Um aviso leva o aluno para "Entrar com
  usuário da escola".
- **Garantia no banco (migração 13), não só na tela:**
  - um cadastro que peça "aluno" fica incompleto;
  - `concluir_cadastro` recusa "aluno";
  - `alterar_tipo_conta` não troca mais usuário → aluno, e a conta da escola
    só vira pessoal pela transferência.
- **Contas antigas:** as contas de aluno que já existem continuam iguais.
- **Perfil do professor → "Cadastrar aluno":**
  - nome + turma geram usuário e senha exclusivos (mesma RPC do lote);
  - cartão com "Copiar usuário", "Copiar senha", "Copiar tudo" e "Imprimir cartão";
  - "Meus alunos" lista os alunos das turmas ativas e como cada um entra.
- **Login e cadastro:** um único bloco de layout em `responsivo.css`.
  - O painel azul e o formulário têm o mesmo topo e a mesma altura, e o
    formulário fica centralizado nos dois eixos.
  - Corrigido o deslocamento de 18 px do painel, causado por `onda.css`.
  - No celular, as ondas não cobrem mais o texto do painel.
- **Tema em onda (`js/ui/tema-onda.js`, o mesmo no site e na plataforma):**
  - no claro, a onda do ícone se move;
  - ao ativar o escuro, uma onda desce e cobre a tela; ao voltar, ela sobe;
  - com movimento reduzido, a troca é imediata.
- **Testes:** `supabase/testes/aluno_so_pelo_professor.test.sql` e
  `tests/e2e/contas.e2e.cjs` (o professor cria, o aluno entra com as mesmas
  credenciais, o aluno não abre o painel do professor, o professor entra
  normalmente, o tema troca nos dois sentidos).
