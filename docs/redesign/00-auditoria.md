# Fase 0 — Auditoria visual do WaveType

Data: 30/10/2026 · Branch: `FEAT/redesign-visual` (a partir de `FEAT/perfil-usuario`).

Esta auditoria registra como a plataforma está **antes** do redesenho, o que não pode mudar e os problemas visuais que o redesenho deve resolver. Nenhum arquivo de código foi alterado nesta fase.

## 1. Mapa do projeto

| Camada | Arquivos | Observação |
| --- | --- | --- |
| Build | `vite.config.js` | Multi-página: todo `*.html` da raiz e de `app/**` vira entrada. A pasta `html/` é legada e não entra no build. |
| Site público | `index.html`, `escolas.html`, `como-funciona.html`, `sobre.html` | Usam `css/style.css` (3.379 linhas). |
| Autenticação | `login.html`, `cadastro.html`, `recuperar-senha.html`, `redefinir-senha.html` | Usam `css/platform.css` (1.727 linhas). |
| Área logada | `app/usuario/*`, `app/aluno/*`, `app/professor/*` (21 páginas) | Usam `css/platform.css`; `exercicios.html` soma `css/exercicios.css`. `treinar.html` usa `style.css` e `platform.css` juntos. |
| Motor de digitação | `js/script.js` | Teste do index e do treino. |
| Comportamento do site | `js/site.js` | Tema, menu móvel, abas da demonstração. |
| Páginas | `js/pages/*.js` | Uma por tela; leem `data-*` e IDs. |

Os dois arquivos de CSS foram escritos separadamente e têm **dois conjuntos de tokens** com nomes diferentes para as mesmas cores (`--action-blue` × `--action`, `--ink` × `--text`, e os raios 8/12/16 × 12/18/28). Essa é a maior causa de inconsistência visual entre o site e a área logada.

## 2. Inventário de identidade (preservar)

- **Logo**: `assets/images/brand/wavetype-logo.svg`, `wavetype-logo-white.svg`, `wavetype-logo-dark.svg` e `wavetype-symbol.svg`. Não serão alterados.
- **Fontes**: Manrope Variable (200–800) e IBM Plex Mono 400, servidas localmente de `assets/fonts/` com `font-display: swap`. Nenhuma fonte externa nova.
- **Cores da marca**:

| Token | Claro | Escuro |
| --- | --- | --- |
| Action blue | `#315FD6` | `#7898FF` |
| Wave blue | `#4F7CFF` | `#7898FF` |
| Flow violet | `#6B5CE7` | `#9488FF` |
| Evolution aqua | `#2ECAB6` | `#56DDCA` |
| Deep ink | `#17233F` | `#F1F5FF` (texto) |
| Soft mist / fundo | `#F5F8FF` | `#0E1730` |
| Superfície | `#FFFFFF` | `#16213A` |

- **Ícones**: a demonstração do index usa **emojis** como ícones de menu (📊 ⌨️ 📈 🏅 🏆 👥 🎓 📝 📑). Eles mudam de aparência conforme o sistema operacional e destoam da identidade. A troca por SVG em linha é segura: nenhum JS lê `.p-nav-icon`.

## 3. Tema e modos de acessibilidade (comportamento a manter)

- **Tema**: `data-theme="light|dark"` no `<html>`, definido por script em linha no `<head>` (evita piscar). O valor fica em `localStorage.wavetype_theme` e é trocado por `#theme-toggle` (`js/site.js`). As páginas da plataforma só leem o valor.
- **Modos de acessibilidade** (apenas index e `treinar.html`, onde roda `js/script.js`):
  - `body.large-text` aumenta o texto e a área de digitação.
  - `body.high-contrast` troca a paleta por tinta escura sobre branco.
  - `body.reduce-motion` zera transições e animações.
  - Os modos são ligados por `.preference-toggle[data-preference]` e guardados em `localStorage.wavetype_<pref>`.
- O redesenho precisa responder aos três modos e também a `prefers-reduced-motion`.

## 4. Contrato com o JavaScript (não pode mudar)

Nenhum destes nomes pode ser renomeado ou removido, e a estrutura de aninhamento usada pelos seletores deve continuar igual.

- **IDs do teste**:
  - Estrutura: `typing-shell`, `typing-stage`, `typing-input`, `words-viewport`, `words-wrapper`, `focus-prompt`, `test-status`.
  - Placar ao vivo: `live-wpm`, `live-accuracy`, `live-time`, `restart-button`.
  - Resultado: `result-panel`, `result-restart`, `result-wpm`, `result-raw`, `result-accuracy`, `result-consistency`, `result-summary`, `result-title`, `result-comparison`.
  - Gráfico: `chart-area`, `chart-line`, `chart-duration`.
  - Diagnóstico: `diagnosis-title`, `diagnosis-text`, `problem-keys`, `problem-words`.
  - Contagem de caracteres: `chars-correct`, `chars-wrong`, `chars-missed`, `chars-extra`.
- **Classes do motor**:
  - Texto: `.word`, `.letter`.
  - Estados das letras e palavras: `.current`, `.incorrect`, `.missed`, `.active`, `.caret-at-end`, `.has-extra` (com `data-extras`).
  - Estados do teste: `.started`, `.finished`, `.focused`, `.single-line`.
  - Controles: `.segment`, `.segmented-control`, `[data-control]`, `[data-value]`, `.preference-toggle`, `[data-preference]`.
- **Site**:
  - Tema e menu: `#theme-toggle`, `#menu-button`, `#mobile-nav`, `meta[name=theme-color]`.
  - Demonstração: `.preview-tab-btn`, `.preview-tabpanel` (o JS altera `style.display`), `[data-tab]`, `[data-tab-panel]`, `[data-target-tab]`, `.product-browser`, `#preview-title`, `#browser-address-url`, `[data-integration-target]`.
  - Convite do teste: `[data-convite-login]`.
- **Plataforma**:
  - Formulários e feedback: `data-auth-form`, `data-form-*`, `data-feedback-*`, `data-form-feedback`, `data-etapa`, `data-google-auth`.
  - Dados exibidos: `data-metric`, `data-resumo`, `data-ranking-list`, `data-tabela-*`, `data-select-turma`, `data-remover`.
  - Atributos de formulário (`name`, `type`, `autocomplete`, `required`) e o atributo `hidden`, que é forçado por `[hidden]{display:none!important}`.
- **localStorage**: `wavetype_theme`, `wavetype_large-text`, `wavetype_high-contrast`, `wavetype_reduce-motion`, `wavetype_results_v2`, `wavetype_tipo_pendente`, `wavetype_recuperacao`, `wavetype_conquistas_vistas_<id>`. O redesenho não lê nem grava nenhuma chave.

**Estratégia para respeitar o contrato:** o redesenho entra como **camadas novas** aplicadas depois do CSS atual (`css/redesign/tokens.css`, `typing.css`, `site.css`, `app.css`, `motion.css`) e um script só de apresentação (`js/motion.js`). O CSS e o JS existentes não são reescritos. Cada página carrega um único arquivo de entrada (`css/redesign/teste.css`, `publico.css`, `plataforma.css`, `treino.css` ou `trilha.css`) que importa o CSS antigo primeiro e as camadas novas depois. Isso foi necessário porque o Vite reagrupa folhas separadas em pedaços compartilhados e muda a ordem delas no build. Reverter é apontar cada página de volta para o CSS antigo.

## 5. Medições de base (antes)

Ferramentas:
- `medir.cjs` (Playwright): capturas de página inteira, CLS, LCP e latência de digitação.
- Lighthouse 12, perfil mobile.

As medições rodaram sobre o build de produção servido localmente com o Supabase simulado.

| Métrica | Valor |
| --- | --- |
| CLS (index, 1280) | 0,0066 |
| LCP local (index, 1280) | 136 ms |
| Latência de digitação: handler de `keydown` | mediana 1,7 ms · p95 2,5 ms |
| Latência de digitação: tecla até o quadro pintado (2 rAF) | mediana 33,3 ms · p95 35,4 ms |
| CSS + JS transferidos (index) | 20.561 bytes |

| Lighthouse (mobile) | Desempenho | Acessibilidade | Boas práticas | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| index | 90 | 96 | 100 | 2,9 s | 0,004 | 0 ms |
| cadastro | 96 | 95 | 100 | — | — | 0 ms |
| login | 96 | 95 | 100 | — | — | 0 ms |

Capturas de base (375, 768 e 1280 px; index, escolas, como-funciona, sobre, login, cadastro, recuperar-senha, início/exercícios/perfil do aluno e turmas do professor) em `docs/redesign/capturas/antes/`.

## 6. Problemas encontrados

### 6.1 Contraste abaixo de WCAG 2.2 AA (4,5:1 para texto normal)

| Elemento | Cores | Razão |
| --- | --- | --- |
| `.live-row span` (rótulos "precisão", "segundos") | `#6F7788` / branco | 4,49:1 |
| `.preview-exit-demo` | cinza / branco | 4,49:1 |
| `.preview-side-tag` | `#7E8594` / branco | 3,7:1 |
| `.preview-kpi-badge.positive` | aqua `#2ECAB6` / branco | 2,05:1 |
| `.preview-action-tag` | aqua / `#EEFBF9` | 1,93:1 |
| `.step-item b` (números 01, 02, 03) | aqua / branco | 2,05:1 |
| `.auth-copy p` (login e cadastro) | `#D2DCF6` / `#315FD6` | 4,09:1 |
| Precisão em aqua nas tabelas da área logada | aqua / branco | 2,05:1 |

Regra adotada: o aqua continua como **cor de destaque** (barras, traços, ícones, fundos), e o texto que precisa de leitura usa a variação escura do aqua, `#0E7F71` (4,9:1 sobre branco).

### 6.2 Bugs visuais existentes

1. **`cadastro.html` com rolagem horizontal em todas as larguras** (398 px em 375, 1.162 em 768, 2.205 em 1280). O `<input type="radio">` de `.role-option` é `position:absolute` sem ancestral posicionado e herda `width:100%` de `.field input`. Correção só de CSS: `.role-option{position:relative}` e tamanho de 1 px no rádio.
2. **Sem indicação de foco nos cartões de tipo de conta.** O rádio é invisível e o cartão não reage a `:focus-visible`, então quem navega por teclado não vê onde está.
3. **Ranking vazio quebrado.** "Ainda sem resultados neste exercício." cai na coluna de 32 px do grid de `.ranking-list li` e quebra uma palavra por linha.
4. **Ícones em emoji** na demonstração, com aparência diferente em cada sistema.
5. **Duas linguagens de raio e sombra**: 8/12/16 px no site e 12/18/28 px na plataforma.

### 6.3 Oportunidades (sem mudar função)

- A metáfora da onda aparece pouco: só o símbolo do logo e alguns arcos nos cartões. Faltam um ritmo visual e uma transição entre as seções.
- O cursor de digitação pisca, mas não acompanha o movimento. Uma transição curta de posição dá sensação de fluidez sem afetar a latência (só `transform`/`opacity`).
- Não existe sistema de movimento. As animações estão espalhadas, sem duração nem curva comuns.

## 7. Critérios de saída da Fase 0

- [x] Mapa do projeto, identidade, tema e modos documentados.
- [x] Contrato JS (IDs, classes, `data-*`, `localStorage`) listado.
- [x] Medições e capturas de base registradas.
- [x] Problemas de contraste e bugs visuais levantados.

Próxima fase: **Fase 1 — tokens e fundação** (`css/redesign/tokens.css`).
