# Catálogo de componentes

Cada item mostra onde a regra está e o que mudou. Nenhum componente ganhou ou perdeu elementos, textos ou classes usadas pelo JS.

## Fundação (todas as páginas)

| Componente | Arquivo | Mudança |
| --- | --- | --- |
| Foco | `site.css`, `app.css` | Anel de 3 px em `--wt-focus` (antes aqua `#2ECAB6`, 2:1 sobre branco); preto no alto contraste. |
| Seleção de texto | `site.css`, `app.css` | Fundo Action blue, texto branco. |
| Botão principal (`.button`) | `site.css`, `app.css` | Pílula. Sombra azul suave e brilho interno; *hover* escurece (`--wt-accent-hover`); *active* reduz a 98 %. |
| Botão secundário (`.button-secondary`, `.button.secondary`) | idem | Superfície branca e borda `--wt-line-strong`; *hover* tinge de azul. |
| Botão Google (`.auth-google`) | `app.css` | Passa a ser secundário (branco com borda), para "Entrar/Criar conta" ser a ação principal. |
| Campos (`.field input/select/textarea`) | `app.css` | Raio 10 px; *hover* realça a borda; foco com anel `--wt-ring`. |

## Área de digitação (`typing.css`, index e treino)

| Componente | Mudança |
| --- | --- |
| Cartão (`.typing-shell`) | A borda azul de 4 px vira a **crista da onda** (`::before` em gradiente); raio 20 px; sombra `--wt-shadow-3`. |
| Segmentado (`.segmented-control` / `.segment`) | Trilho em pílula com borda. O segmento ativo fica elevado, com contorno azul e texto Action blue. Foco por teclado com anel. |
| Acessibilidade (`.accessibility-menu`) | Botão em pílula; painel com raio 14 px e sombra 3. Interruptores com bolinha sombreada e trilho mais escuro (contraste do estado desligado). |
| Placar (`.live-row`) | Rótulos com `--wt-text-subtle` (era 4,49:1; agora 5,9:1). |
| Palco (`.typing-stage`) | Fundo `--wt-surface-sunken`. Em foco: superfície branca, borda wave blue e halo de 5 px. |
| Cursor (`.letter.current::before`, `.word.caret-at-end::after`) | 2,5 px na cor de destaque. **Fica sólido enquanto a pessoa digita** e só pisca, suavemente, depois de 0,7 s parado (antes piscava sem parar, em degrau). No alto contraste é preto e tem 3 px. |
| Erros (`.letter.incorrect`, `.missed`) | Mesma marcação (sublinhado + cor), em `--wt-danger`. Não depende só de cor. |
| Aviso "Comece a digitar" (`.focus-prompt`) | Véu translúcido (sem desfoque, por desempenho) e uma pequena onda acima do título (SVG em linha). |

O tamanho da fonte, a altura de linha, os espaçamentos entre palavras e a altura da janela de palavras **não mudaram**, porque o motor calcula a rolagem por eles.

## Site público (`site.css`)

| Componente | Mudança |
| --- | --- |
| Cabeçalho (`.site-header`) | Translúcido com desfoque (`backdrop-filter`). Links do menu em pílula no *hover*; página atual com sublinhado azul → aqua. O botão de tema gira levemente no *hover*. |
| Títulos | `text-wrap: balance`. A segunda linha (`h1 span`) ganha o gradiente da onda, com cor sólida de reserva e cor sólida no alto contraste. |
| Hero do teste (`.typing-section`) | Brilho radial atrás, e a seção termina numa **onda** (máscara SVG) que leva à próxima. Os blocos de ritmo (`.typing-rhythm span`) viram faixas finas em gradiente, estáticas. |
| Cartões de experiência (`.experience-card`, são links) | Sobem 4 px no *hover*. A onda decorativa é uma linha ondulada contínua que desliza no *hover*. |
| Cartões informativos (`.purpose-card`, `.value-card`, `.mode-card`…) | Raio 20 px e sombra 1. No *hover* só a borda realça: eles não são clicáveis, então não sobem. |
| Passos (`.step-line`, `.step-item b`) | Linha ondulada azul → aqua ligando os passos. Números em selo aqua com texto `#0B6B5F` (era aqua sobre branco, 2,05:1). |
| Demonstração (`.product-browser`, `.p-nav-icon`) | Raio 28 px e sombra 3. **Emojis trocados por ícones SVG em linha** (`aria-hidden`), na cor do texto. Textos pequenos corrigidos para AA. |
| Herói das páginas internas (`.page-hero`) | Brilho radial e onda na base, no lugar do bloco violeta solto. |
| Chamadas finais (`.final-cta`, `.plain-cta`) | Fundo azul com brilhos violeta e aqua; azul sólido no alto contraste. |
| Rodapé (`.site-footer`) | Filete superior em gradiente; links com *hover* azul. |

## Plataforma e autenticação (`app.css`)

| Componente | Mudança |
| --- | --- |
| Painel lateral da autenticação (`.auth-aside`) | Azul com brilhos violeta e aqua. Os arcos soltos viram duas **ondas contínuas** na base. Parágrafo com 94 % de branco (era 4,09:1; agora 5,2:1). |
| Tipo de conta (`.role-option`) | **Correção** da rolagem horizontal do cadastro. Foco de teclado visível no cartão; selecionado com anel. |
| Menu lateral (`.app-nav`) | Item atual com barra em gradiente na borda e peso 800. |
| Barra superior (`.app-topbar`) | Fixa no topo, translúcida com desfoque. |
| Métricas (`.metric-card`) | O arco no canto vira uma onda na base do cartão, na cor da métrica. Borda realça no *hover*. |
| Selo de nível (`.level-badge`) | Borda em gradiente da onda. |
| Progresso (`.progress-track/.progress-fill`) | Trilho afundado; preenchimento azul → aqua. |
| Ranking vazio (`.ranking-list li`) | **Correção**: a mensagem ocupa a linha inteira (antes quebrava uma palavra por linha). |
| Tabelas (`.data-table`) | Cabeçalho afundado; linha realça no *hover*. Precisão em `--wt-success-text` (era aqua, 2,05:1). |
