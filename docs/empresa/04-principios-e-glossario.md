# 04 · Princípios, privacidade e glossário

## Princípios pedagógicos

1. **Precisão antes de velocidade.** A trilha só conclui com precisão acima de
   85%. Velocidade sem controle não é progresso.
2. **Comparação com o próprio histórico.** A evolução principal é individual
   (ex.: conquistas "Evolução real" e "Outro patamar"). O ranking existe, mas
   não é o centro.
3. **Começar do lugar certo.** O teste de nivelamento indica a lição exata de
   início; ninguém precisa repetir o que já sabe nem pular etapas.
4. **Sugerir, não bloquear.** Quando um exercício está difícil demais, a
   plataforma sugere o recomendado, mas a pessoa decide. Se ignora a sugestão
   três vezes seguidas, a recomendação sobe (ela mostrou que quer avançar).
5. **Erros ensinam.** Teclas e palavras com mais erros viram o "próximo foco".
6. **O professor decide.** O professor define meta de precisão, tempo máximo,
   prazo e modo de erros da turma.

## Princípios da experiência escolar

| Princípio | Significado |
| --- | --- |
| **Simplicidade** | Fluxos curtos e linguagem clara para alunos de diferentes idades. Aluno entra sem e-mail. |
| **Orientação** | O objetivo não é acumular números, mas transformar resultados em decisões de ensino. |
| **Progresso** | A evolução individual fica visível e respeita o ritmo de cada aluno. |

## Compromissos de acessibilidade

- Navegação completa por teclado, com foco sempre visível e link "Pular para o
  conteúdo".
- Texto redimensionável, opção "Texto maior" e "Alto contraste".
- "Reduzir movimentos" e respeito à preferência do sistema.
- Contraste mínimo AA em todo texto.
- Conteúdo decorativo (ondas) escondido de leitores de tela; mensagens de
  status anunciadas.
- Funciona com teclado virtual no celular (para a técnica completa, o teclado
  físico é recomendado).

## Compromissos de privacidade e segurança

Estes compromissos estão implementados no código e no banco, não só escritos:

| Compromisso | Como é garantido |
| --- | --- |
| **Teste sem cadastro e sem dados pessoais.** | O teste público não envia nada ao servidor; o histórico fica no navegador. |
| **Senhas nunca guardadas pela WaveType em texto.** | Senhas ficam só no Supabase Auth, com hash bcrypt. A senha inicial do aluno aparece uma única vez para o professor. |
| **Cada pessoa vê só o que pode ver.** | Regras de acesso no banco (Row Level Security) para todas as tabelas. |
| **Aluno não vira professor sozinho.** | O banco recusa a troca de tipo para professor e a criação pública de contas de aluno. |
| **Login da escola não revela quem existe.** | Usuário inexistente e senha errada têm a mesma resposta e o mesmo tempo; tentativas são limitadas. |
| **Computador compartilhado.** | A sessão do aluno termina após 30 minutos sem atividade; "Sair" limpa os dados locais e avisa as outras abas. |
| **Conta transferida é da pessoa.** | Após a transferência, o professor deixa de ver os resultados individuais **e** tudo o que veio antes sai das médias, entregas, ranking e nivelamento visíveis a ele. |
| **Chave secreta nunca vai para o navegador.** | O build é interrompido se a chave `service_role` for configurada no front-end. |

Detalhes técnicos em [Autenticação, sessão e contas](../codigo/05-autenticacao-e-contas.md).

## Glossário

Use estes termos em toda a comunicação, no produto e no código.

| Termo | Definição |
| --- | --- |
| **Usuário / conta pessoal** | Pessoa que usa a WaveType por conta própria, sem turma. Papel `usuario`. |
| **Aluno** | Pessoa matriculada em turma(s), com conta criada pelo professor. Papel `aluno`. |
| **Professor** | Pessoa que cria turmas, alunos e atividades. Papel `professor`. |
| **Visitante** | Quem usa o site sem entrar na conta. |
| **Usuário da escola** | Login legível do aluno sem e-mail (ex.: `maria.silva.santos`). |
| **Cartão de acesso** | Cartão impresso ou copiado com usuário e senha do aluno. |
| **Transferência** | Passagem da conta escolar para uso pessoal, ao terminar a escola. |
| **Turma** | Grupo de alunos de um professor, com código de convite. |
| **Código de convite** | Código da turma usado para entrar nela. |
| **Código do aluno** | Código curto (6 caracteres, ex.: `K7Q2MX`) que identifica um perfil. |
| **Trilha oficial** | Sequência de 6 níveis × 20 exercícios da WaveType. |
| **Nível / etapa / lição** | A trilha tem 6 níveis; cada nível, 4 etapas de 5 exercícios (lições). |
| **Atividade** | Exercício criado por um professor para uma ou mais turmas. |
| **Prática livre** | Treino sem exercício definido; registra resultado, mas não conclui nada. |
| **Nivelamento** | Teste de 5 etapas que recomenda nível e lição de início. |
| **Ponto de partida** | Resultado do nivelamento mostrado ao aluno e ao professor. |
| **Sugestão de nível** | Aviso, durante o treino, para voltar a uma lição mais adequada. |
| **WPM líquido** | Palavras por minuto contando só caracteres corretos (1 palavra = 5 caracteres). |
| **WPM bruto** | Palavras por minuto contando todas as teclas digitadas. |
| **Precisão** | Teclas corretas ÷ teclas digitadas. |
| **Consistência** | Estabilidade do ritmo entre teclas, de 0 a 100%. |
| **Modo fluxo ("Seguir")** | O cursor avança mesmo com erro. |
| **Modo correção ("Corrigir antes de avançar")** | O cursor só avança com a tecla certa. |
| **Teclas frágeis** | Teclas com taxa de erro alta, indicadas no nivelamento e no treino. |
| **XP** | Pontos de experiência ganhos a cada resultado. |
| **Sequência** | Dias seguidos de prática. |
| **Conquista** | Selo liberado pelo banco quando um critério real é atingido. |

> Na interface, a sigla exibida é **WPM**. No banco e no código, a coluna se
> chama `ppm` (palavras por minuto). São a mesma medida.
