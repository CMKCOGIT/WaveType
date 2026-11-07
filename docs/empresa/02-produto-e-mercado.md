# 02 · Produto e mercado

## O problema

Ensinar digitação ainda depende, em muitas escolas e cursos, de apostilas
impressas, cronômetros e anotações soltas. Isso traz três dificuldades:

1. **Para o aluno:** pouco retorno imediato. Ele não sabe quais teclas erra
   mais, se está mais rápido do que na semana anterior ou o que treinar depois.
2. **Para o professor:** muito trabalho operacional (corrigir, anotar, montar
   médias) e pouca visão de quem precisa de apoio.
3. **Para a escola:** nenhum dado objetivo para avaliar a evolução das turmas.

Os sites de teste de digitação existentes resolvem só o primeiro ponto, e
costumam medir apenas velocidade, o que premia a pressa em vez da técnica.

## A proposta de valor

> A WaveType não é apenas um cronômetro de digitação. Ela conecta prática
> imediata, acompanhamento individual e gestão de turmas em uma experiência
> leve, sem transformar o aprendizado num painel complicado.

| Para quem | Valor entregue |
| --- | --- |
| Aluno | Retorno imediato e explicado; trilha com começo, meio e fim; sugestão do próximo passo. |
| Professor | Turmas, atividades com meta e prazo, relatórios e ranking sem planilhas; contas de alunos criadas em segundos. |
| Escola | Indicadores objetivos (precisão média, evolução desde o diagnóstico) e privacidade dos dados dos alunos. |
| Pessoa avulsa | Teste gratuito, sem cadastro, com diagnóstico das teclas e palavras a revisar. |

## Públicos e contextos de uso

| Contexto | Necessidade principal | O que a WaveType oferece |
| --- | --- | --- |
| **Professores autônomos** | Organizar vários alunos sem perder o ritmo de cada um. | Várias turmas, código de convite, visão por aluno. |
| **Escolas de informática** | Uma experiência atual para ensinar digitação. | Trilha oficial de 120 exercícios, atividades próprias, ranking. |
| **Instituições (formação e inclusão digital)** | Informação clara para decisões pedagógicas. | Relatórios, nivelamento inicial, contas sem e-mail para quem não tem. |
| **Pessoas em geral** | Praticar quando precisar (concurso, trabalho, estudo). | Conta pessoal, trilha, conquistas, histórico. |

## Jornadas

### Visitante → conta pessoal

1. Abre a página inicial e digita (sem cadastro). Escolhe palavras ou frases,
   15/30/60 s e nível fácil/médio/avançado.
2. Recebe o resultado explicado: WPM líquido e bruto, precisão, consistência,
   gráfico do ritmo, teclas e palavras para revisar.
3. Opcionalmente faz o **teste de nivelamento** e descobre a lição exata para
   começar.
4. Cria uma conta (e-mail ou Google) para salvar o progresso. O nivelamento
   feito como visitante é enviado para a conta ao entrar.

### Aluno (conta criada pelo professor)

1. Recebe do professor um cartão com **usuário e senha** (sem e-mail).
2. Entra pela aba "Sou aluno com usuário da escola".
3. Segue a trilha oficial e as atividades das turmas; vê resultados, conquistas
   e ranking.
4. Ao terminar a escola, pode **vincular um e-mail ou Google** e **transferir**
   a conta para uso pessoal. O progresso continua; o professor deixa de ver os
   dados individuais.

### Professor

1. Cria a conta (e-mail ou Google) escolhendo o tipo "Professor".
2. Cria turmas (com código de convite) e define o modo de erros da turma.
3. Cadastra alunos (um a um no Perfil, ou em lote, até 60 nomes por vez) e
   imprime os cartões de acesso.
4. Publica atividades com texto, tempo máximo, precisão mínima e prazo.
5. Acompanha resumo das turmas, entregas, relatórios, ponto de partida
   (nivelamento) de cada aluno e ranking.

## Funcionalidades

### Prática e aprendizagem

- **Teste público** com configurações de conteúdo, duração e nível.
- **Trilha oficial**: 6 níveis × 4 etapas × 5 exercícios = 120 exercícios.

  | Nível | Tema |
  | --- | --- |
  | 1 | Posição base (A S D F G H J K L Ç) |
  | 2 | Fileira superior (Q a P) |
  | 3 | Fileira inferior (Z a M) |
  | 4 | Palavras e frases |
  | 5 | Palavras complexas |
  | 6 | Extremo |

- **Regras de conclusão justas**: precisão acima de 85% e o texto terminado
  dentro do tempo máximo (o tempo é calculado pelo ritmo esperado em cada nível).
- **Dois modos de erro**: "Seguir (fluxo)" para quem já digita e "Corrigir
  antes de avançar" para iniciantes.
- **Teste de nivelamento** em 5 etapas, com recomendação de nível, lição,
  teclas frágeis e região do teclado.
- **Sugestões durante o treino**: quando o exercício está difícil demais, a
  plataforma sugere (sem bloquear) voltar para a lição recomendada.

### Engajamento

- **XP, nível e sequência de dias** atualizados a cada resultado.
- **Mais de 25 conquistas** em seis categorias (exercícios, precisão,
  velocidade, níveis, constância e desafios), calculadas no servidor.
- **Ranking** por exercício.

### Gestão escolar

- Turmas com código de convite, ano letivo, situação (ativa/encerrada) e modo
  de erros.
- Contas de aluno sem e-mail, usuário legível (`maria.silva.santos`) e senha
  fácil (`tucano472`), com cartões para imprimir.
- Nova senha e troca de usuário pelo professor, sem perder histórico.
- Atividades com meta de precisão, tempo máximo, prazo e situação por aluno
  (pendente, concluída, atrasada).
- Relatórios e ponto de partida de cada aluno.

### Acessibilidade e conforto

- Tema claro e escuro (troca animada em "onda").
- Texto maior, alto contraste e reduzir movimentos.
- Navegação completa por teclado e leitores de tela.
- Layout para celular, tablet e computador.

## Diferenciais

1. **Métricas honestas.** A WaveType mede velocidade líquida e bruta, precisão
   e **consistência do ritmo**, e corrige distorções comuns (por exemplo, um
   erro corrigido não some das estatísticas). Ver
   [Motor e métricas](../codigo/03-motor-e-metricas.md).
2. **Explica, não só mede.** Todo resultado vem com o motivo e o próximo foco.
3. **Feita para escolas brasileiras.** Português, cedilha e acentos na trilha;
   alunos sem e-mail; computadores compartilhados (saída automática por
   inatividade para alunos).
4. **Regras no servidor.** Conclusão, XP e conquistas são decididos pelo banco,
   não pelo navegador: ninguém "libera" conquista editando a página.
5. **Privacidade da transferência.** Quando o aluno leva a conta para a vida
   pessoal, o professor deixa de ver inclusive os dados antigos dele.

## Roteiro (próximos passos)

Itens já mapeados nos documentos de etapa e no estado atual do produto:

| Tema | Próximo passo |
| --- | --- |
| Infraestrutura | Domínio próprio `wavetype.com.br` e SMTP próprio (SPF, DKIM, DMARC) para os e-mails de cadastro e senha. |
| Área escolar | Painel da escola (visão entre turmas) a partir do painel ilustrativo da página "Para as escolas". |
| Comercial | Definição de planos para instituições. |
| Produto | "Lembrar de mim" opcional; modo de erros da turma também na trilha. |
| Conteúdo | Mais textos de prática e atividades-modelo para professores. |

## Métricas de sucesso sugeridas

| Indicador | Por que importa |
| --- | --- |
| Testes públicos concluídos → contas criadas | Mede se a experiência gratuita convence. |
| Alunos ativos por semana, por turma | Mede uso real nas escolas. |
| Evolução média de precisão desde o nivelamento | Mede aprendizagem, não só uso. |
| Sequência média de dias | Mede formação de hábito. |
| Atividades entregues no prazo | Mede valor para o professor. |
