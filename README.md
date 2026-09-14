# WaveType — site institucional e experiência de digitação

Esta entrega aplica a identidade visual oficial ao protótipo público e organiza o conteúdo em páginas independentes. A página inicial é dedicada à digitação e pode ser usada imediatamente. Cadastro, login e backend não fazem parte deste pacote.

## Estrutura de páginas

- `index.html`: experiência principal de digitação.
- `como-funciona.html`: método, métricas, configurações, acessibilidade e dúvidas.
- `escolas.html`: proposta em desenvolvimento para professores e instituições.
- `sobre.html`: origem, missão, visão, propósito, valores e públicos da WaveType.

## Principais melhorias

- Logotipo, símbolo, favicon e ícones de aplicativo oficiais.
- Imagens organizadas em `assets/images`, separadas entre `brand` e `icons`.
- Paleta WaveType aplicada por tokens, com temas claro e escuro.
- Manrope para interface e IBM Plex Mono para digitação e métricas; ambas carregadas localmente.
- Nova direção visual clara, leve, responsiva e coerente com o território “Fluxo que evolui”.
- Teste posicionado na primeira tela, antes de qualquer apresentação comercial.
- Início imediato pelo teclado no computador, sem clique obrigatório.
- Mensagem principal e chamadas para ação voltadas a usuários e escolas.
- Conteúdo comercial sem alegações de recursos que ainda não existem.
- Teste de digitação diretamente sobre as palavras, com cursor e rolagem fluidos.
- Modos de palavras e frases, três tempos e três níveis de dificuldade.
- Resultado com velocidade líquida, velocidade bruta, precisão e consistência.
- Gráfico do ritmo, caracteres corretos/incorretos/omitidos/extras, letras difíceis e palavras para revisar.
- Recomendação automática para o próximo treino e comparação com o histórico do dispositivo.
- Navegação multipágina consistente, com estado ativo, menu móvel e tema compartilhado.
- Sem dependências externas de fontes ou ícones em tempo de execução.

## Identidade aplicada

- Action Blue: `#315FD6`
- Wave Blue: `#4F7CFF`
- Flow Violet: `#6B5CE7`
- Evolution Aqua: `#2ECAB6`
- Deep Ink: `#17233F`
- Soft Mist: `#F5F8FF`
- Tema escuro: `#0E1730`, `#16213A`, `#F1F5FF`, `#7898FF`, `#56DDCA` e `#9488FF`

Não introduza novas cores ou famílias tipográficas sem atualizar previamente o manual de identidade.

## Acessibilidade

- HTML semântico e link para pular ao conteúdo.
- Navegação por teclado e indicador de foco visível.
- Controles com áreas de toque amplas.
- Contraste revisado e conteúdo que não depende apenas de cor.
- Preferências de texto maior, alto contraste e redução de movimentos.
- Respeito automático a `prefers-reduced-motion` do sistema.
- Mensagens de início e conclusão compatíveis com tecnologias assistivas.
- Layout testado de 320 px a 1440 px, sem rolagem horizontal.

## Como testar

Sirva esta pasta com qualquer servidor HTTP local e abra `index.html`. No computador, comece a digitar imediatamente; no celular, toque na área de palavras para abrir o teclado. Pressione `Esc` para reiniciar.

O histórico utilizado para comparação é salvo somente no `localStorage` do navegador.
