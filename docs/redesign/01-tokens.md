# Guia de tokens

Arquivo: `css/redesign/tokens.css`. Todos os tokens novos têm o prefixo `--wt-`, para não colidir com os nomes antigos (`--brand`, `--action`, `--ink`…), que continuam funcionando.

## Cores da marca (inalteradas)

| Token | Valor | Uso |
| --- | --- | --- |
| `--wt-blue-600` | `#315FD6` | Action blue: botões, links, destaque principal |
| `--wt-blue-500` | `#4F7CFF` | Wave blue: foco, gradientes, bordas ativas |
| `--wt-blue-300` | `#7898FF` | Azul no tema escuro |
| `--wt-violet-500` / `-300` | `#6B5CE7` / `#9488FF` | Flow violet: fim do gradiente da onda |
| `--wt-aqua-500` / `-300` | `#2ECAB6` / `#56DDCA` | Evolution aqua: barras, traços e fundos (**não** para texto pequeno no claro) |
| `--wt-aqua-700` | `#0E7F71` | Aqua legível: texto de sucesso ou precisão no claro (4,9:1) |
| `--wt-ink-900` | `#17233F` | Deep ink: texto |
| `--wt-mist-50` | `#F5F8FF` | Soft mist: fundo |
| `--wt-night-900` / `-800` | `#0E1730` / `#16213A` | Fundo e superfície do tema escuro |

## Cores semânticas

Use estes tokens nos componentes. Eles mudam sozinhos com o tema e o alto contraste.

| Token | Claro | Escuro | Alto contraste | Contraste |
| --- | --- | --- | --- | --- |
| `--wt-bg` | mist | night-900 | branco | — |
| `--wt-surface` | branco | night-800 | branco | — |
| `--wt-surface-sunken` | `#EEF2FC` | `#121B33` | branco | — |
| `--wt-text` | ink-900 | `#F1F5FF` | `#000814` | ≥ 15:1 |
| `--wt-text-muted` | `#4A5571` | 78 % do texto | ink-900 | 7,4:1 · 9,4:1 |
| `--wt-text-subtle` | `#5A6480` | 66 % do texto | ink-900 | 5,9:1 · 7,1:1 |
| `--wt-accent` | blue-600 | blue-300 | `#1F46B0` | 5,6:1 · 5,9:1 · 8,2:1 |
| `--wt-on-accent` | branco | ink-900 | branco | 5,6:1 · 5,7:1 |
| `--wt-success-text` | aqua-700 | aqua-300 | `#075E54` | 4,9:1 · 9,6:1 |
| `--wt-line` / `--wt-line-strong` | linhas divisórias / bordas em destaque | | | — |
| `--wt-focus` | blue-500 | blue-300 | `#000814` | anel de foco |

## Gradientes (a metáfora da onda)

- `--wt-gradient-wave`: azul → wave → violeta. É a crista do cartão do teste, o cursor, a segunda linha dos títulos, o indicador do menu ativo e a borda do selo de nível.
- `--wt-gradient-tide`: azul → aqua. Usado no sublinhado do menu, na linha dos passos e na barra de progresso.
- `--wt-glow`: brilho radial suave atrás dos heróis.
- No alto contraste, os três viram cor sólida ou somem.

## Espaço, raio e tipografia

- **Espaço** (base 4 px): `--wt-space-1` (4) até `--wt-space-16` (64); `--wt-section` = `clamp(64px, 9vw, 120px)`.
- **Raio** (uma escala para site e plataforma): `xs` 6 · `sm` 10 · `md` 14 · `lg` 20 · `xl` 28 · `pill` 999.
  - Na plataforma, `--radius-sm`, `--radius` e `--radius-lg` passam a apontar para `sm`, `lg` e `xl`.
- **Fontes**: `--wt-font-sans` (Manrope) e `--wt-font-mono` (IBM Plex Mono). As duas são servidas pelo próprio site.
- **Escala de texto**: `--wt-text-xs` até `--wt-text-display`.
- **Espaçamento de letras**: `--wt-tracking-tight` (−0,045 em) para títulos e `--wt-tracking-caps` (0,14 em) para rótulos em caixa alta.
- A área de digitação **não** usa a escala nova. O tamanho do texto (`--typing-size`), a altura de linha e os espaçamentos continuam os do motor.

## Elevação

`--wt-shadow-1` (cartões), `--wt-shadow-2` (hover e menus) e `--wt-shadow-3` (cartão do teste e demonstração). No alto contraste são `none`.

## Movimento

| Token | Valor | Uso |
| --- | --- | --- |
| `--wt-dur-instant` | 90 ms | Reservado para respostas imediatas |
| `--wt-dur-fast` | 160 ms | Hover, troca de segmento |
| `--wt-dur-base` | 240 ms | Foco do palco, abas, alternância |
| `--wt-dur-slow` | 480 ms | Revelação ao rolar, resultado |
| `--wt-ease-out` | `cubic-bezier(.22,1,.36,1)` | Entradas |
| `--wt-ease-wave` | `cubic-bezier(.45,.05,.25,1)` | Movimentos de onda |
| `--wt-ease-standard` | `cubic-bezier(.2,0,0,1)` | Cor e borda |

Com `prefers-reduced-motion: reduce` ou `body.reduce-motion`, todas as durações viram `0ms`.

## Tokens antigos ajustados

- `--subtle` (site, tema claro): 62 % → 72 % de opacidade. Era 4,49:1 e passa a 6,2:1.
- `--muted`, `--line`, `--shadow` e `--shadow-soft` (plataforma) passam a vir dos tokens novos.
