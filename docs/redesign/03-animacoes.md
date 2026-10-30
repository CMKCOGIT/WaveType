# Catálogo de animações

Todas as animações usam só `opacity` e `transform`, que rodam no compositor e não recalculam layout. Nenhuma passa de 500 ms quando é resposta a uma ação. Nenhuma segura ou atrasa a tecla.

## Como desligar

| Escopo | Como |
| --- | --- |
| Quem usa o site | Modo **Reduzir movimento** (menu Acessibilidade) ou `prefers-reduced-motion` no sistema. Durações viram 0 e nada fica oculto. |
| Uma página | Colocar `data-motion="off"` no `<html>`. |
| O site inteiro | Remover a linha `@import "./motion.css";` dos arquivos de entrada em `css/redesign/` e as tags `<script type="module" src="…/js/motion.js">`. |

O site funciona com o movimento desligado. O conteúdo só fica oculto quando o próprio `motion.js` marca o elemento (`data-wt-reveal`) e coloca `wt-motion` no `<html>`; sem o script, nada é escondido. Foi testado com `data-motion="off"` e com o script bloqueado: nenhum elemento oculto e nenhum erro.

> Atenção: no build, o Vite junta todos os `<script type="module">` da página numa entrada só. Se **um** pedaço falhar ao carregar na rede, os outros scripts da página também não rodam. Isso já valia para `site.js` e `script.js`. Para desligar o movimento, use `data-motion="off"` ou remova a tag; não dependa de bloquear o arquivo.

## Módulo `motion.css` / `motion.js`

| # | Animação | Onde | Duração / curva | Detalhe |
| --- | --- | --- | --- | --- |
| M1 | Revelação ao rolar | Cabeçalhos de seção, cartões, passos, demonstração e painéis | 480 ms, `ease-out`, +70 ms por irmão (até 4) | Sobe 16 px e aparece. Só vale para o que está **fora da primeira tela** no carregamento, então LCP e CLS não mudam. O script roda quando o navegador fica ocioso e mostra tudo antes de imprimir ou ao ligar "Reduzir movimento". |
| M3 | Entrada do resultado | `.typing-shell.finished .result-panel` | 480 ms | Sobe 12 px e aparece quando o teste termina. |
| M4 | Troca de abas da demonstração | `.preview-tabpanel` | 240 ms | O JS existente alterna `display`; a animação reinicia sozinha. |
| M5 | Onda da métrica | `.metric-card::after` | 480 ms, `ease-wave` | Desliza 30 px no *hover*. |

## Microinterações (nas camadas de componentes)

| Interação | Duração | Arquivo |
| --- | --- | --- |
| Cursor sólido enquanto digita; pisca suave só depois de 0,7 s parado | piscar de 1,1 s | `typing.css` |
| Foco do palco (borda e halo) | 240 ms | `typing.css` |
| Segmento ativo / *hover* | 160 ms | `typing.css` |
| Interruptor de acessibilidade | 240 ms | `typing.css` |
| Botões (*hover* e *active*) | 160–240 ms | `site.css`, `app.css` |
| Cartão de experiência sobe e a onda desliza | 240 / 480 ms | `site.css` |
| Botão de tema gira 18° | 240 ms | `site.css` |
| Barra de progresso (largura) | 480 ms | `app.css` |

Todas usam os tokens `--wt-dur-*`, que viram 0 no movimento reduzido. A regra antiga `body.reduce-motion *` continua valendo para tudo.

## Desempenho: o que foi tirado e por quê

A digitação tem prioridade sobre qualquer efeito. Quatro efeitos foram medidos e desfeitos:

| Removido | Efeito medido | Decisão |
| --- | --- | --- |
| Pausa da ondulação com `:has(.typing-shell.started)` | *Handler* de `keydown` de 1,7 → 3,9 ms (o navegador reavaliava o estilo a cada tecla) | Regra removida |
| `backdrop-filter: blur(3px)` no aviso "Comece a digitar" | O aviso fica invisível sobre o texto durante o teste e o desfoque era recalculado a cada tecla: INP de ~32 → ~85 ms | Véu translúcido sem desfoque |
| Ondulação contínua do hero (era M2, 9 s em laço) | Com uma animação infinita na tela, cada tecla esperava mais pelo próximo quadro (pior tecla ~40 ms × ~32 ms sem ela) | Removida; os blocos de ritmo ficam estáticos |
| Cursor com gradiente, brilho e duas animações | O cursor é recriado a cada tecla; cada efeito somava ~0,1 ms ao *handler* | Cor sólida e uma única animação de piscar |

O ID `M2` ficou vago de propósito, para os outros números baterem com os comentários de `motion.css`.
