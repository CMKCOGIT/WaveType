# Relatório final do redesenho visual

Branch: `FEAT/redesign-visual` (criada a partir de `FEAT/perfil-usuario`). Data: 30/10/2026.

## 1. O que mudou, em uma frase

A plataforma ganhou uma linguagem visual única, guiada pela onda:
- tokens comuns ao site e à área logada;
- a crista em gradiente no cartão do teste;
- as seções terminam em ondas;
- cursor, segmentos e cartões mais refinados;
- ícones SVG no lugar dos emojis;
- um módulo de movimento discreto e desligável.

Ao mesmo tempo, os problemas de contraste e três bugs visuais foram corrigidos. **Nenhuma funcionalidade, texto, rota, formulário, chamada à API ou chave de `localStorage` foi alterada.**

## 2. Fases

| Fase | Entrega | Documento |
| --- | --- | --- |
| 0. Auditoria | Mapa, identidade, contrato JS, linha de base e problemas | `00-auditoria.md` |
| 1. Fundação | `tokens.css`: cores semânticas, raios, sombras, movimento; botões, campos e foco | `01-tokens.md` |
| 2. Hero e digitação | `typing.css`: crista da onda, segmentado em pílula, palco, cursor, aviso | `02-componentes.md` |
| 3. Home, cabeçalho e rodapé | `site.css`: cabeçalho translúcido, ondas entre seções, cartões, passos, rodapé | `02-componentes.md` |
| 4. Páginas internas | Heróis com brilho e onda; login e cadastro com ondas e correções | `02-componentes.md` |
| 5. Área logada e demonstração | `app.css`: menu, métricas, nível, progresso, tabelas, ranking; emojis → SVG | `02-componentes.md` |
| 6. Movimento | `motion.css` + `js/motion.js` (só apresentação) | `03-animacoes.md` |
| 7. A11y, desempenho e QA | Medições, correções de desempenho e checklist | este documento |

## 3. Decisões de design

- **Identidade intacta.** Logo, Manrope, IBM Plex Mono e a paleta `#315FD6` continuam iguais. O que muda é como as cores se combinam (gradiente onda e maré) e a escala de raio e sombra, agora uma só.
- **A onda com intenção, não como enfeite.** Ela aparece onde há transição ou progresso:
  - na crista do cartão do teste (o começo);
  - entre as seções (passagem);
  - ligando os passos (jornada);
  - na base das métricas (evolução);
  - no painel de autenticação.
  - Nunca fica atrás de texto.
- **A digitação vem primeiro.** Tamanho, altura de linha e espaçamento do texto não mudaram. Todo efeito que pesava na tecla foi medido e retirado (ver `03-animacoes.md`): pausa com `:has`, desfoque do aviso, ondulação contínua, cursor com gradiente.
- **Contraste por regra, não por exceção.** O aqua continua como cor de destaque. Todo texto usa tokens que passam AA nos três modos (claro, escuro e alto contraste).
- **Sem novas funcionalidades.** Nenhum controle, contador, som ou mensagem novo. O único script novo só adiciona classes e atributos de apresentação.
- **Reversível.** O CSS e o JS antigos não foram reescritos. Para voltar, basta apontar cada página para o CSS antigo e remover a tag do `motion.js`.

## 4. Métricas antes × depois

Mesmo build de produção, servido localmente com o Supabase simulado. Lighthouse 12, perfil mobile.

| Lighthouse | Antes | Depois |
| --- | --- | --- |
| index: desempenho / acessibilidade / boas práticas | 90 / 96 / 100 | **94 / 100 / 100** |
| cadastro | 96 / 95 / 100 | **98 / 100 / 100** |
| login | 96 / 95 / 100 | **98 / 100 / 100** |
| FCP (index · cadastro · login) | 2,9 · 2,3 · 2,3 s | **1,2 · 1,5 · 1,4 s** |
| LCP (index · cadastro · login) | 2,9 · 2,3 · 2,3 s | 2,9 · 2,3 · 2,3 s (igual) |
| CLS (Lighthouse) | 0,004 · 0,001 · 0,001 | **0 · 0 · 0** |
| TBT | 0 · 0 · 0 ms | 70 · 70 · 20 ms (ver nota) |

| Medição própria (index, 1280 px) | Antes | Depois |
| --- | --- | --- |
| CLS no carregamento, 8 execuções | 0,006 a 0,229 (troca de fonte) | **0 em todas** |
| *Handler* de `keydown` (mediana) | 1,5–1,8 ms | 1,6–2,0 ms (+0,1 a 0,3 ms, dentro do ruído) |
| Tecla → quadro pintado (mediana) | 33,3 ms | 33,3–33,4 ms (igual) |
| INP aproximado (pior tecla por sessão, 8 sessões) | mediana 32 ms · máx. 40 ms | mediana 36 ms · máx. 56 ms |
| Teclas com 16 ms ou mais (por sessão de ~60) | 48–62 | **29–40** |
| CSS + JS transferidos (index) | 20.561 B | 24.579 B (+4 KB) |

Notas:
- **FCP caiu pela metade** porque as fontes passaram a ser pré-carregadas (`<link rel="preload">`). Isso também zerou o salto de layout da troca de fonte, que já existia.
- **TBT**: o trabalho na thread principal não aumentou (estilo e layout caíram de 206 para 126 ms no login). Como a primeira pintura agora acontece mais cedo, a avaliação do pacote do Supabase, que já existia, passa a cair dentro da janela que o TBT mede. Os valores continuam bem abaixo do limite de "bom" (200 ms).
- **INP e latência**: depois das correções da Fase 7, a tecla típica ficou mais rápida (menos teclas lentas). A pior tecla por sessão ficou igual ou um passo de 8 ms acima, dentro da variação entre execuções. A diferença no *handler* é de décimos de milissegundo. Nenhuma tecla é segurada ou atrasada por animação.
- Os números e as ferramentas estão em `evidencias/` e `ferramentas/`.

## 5. Acessibilidade (WCAG 2.2 AA)

- Lighthouse: acessibilidade **100** nas três páginas medidas. Antes falhava em `color-contrast`.
- Os 8 casos de contraste da auditoria foram corrigidos. As razões dos tokens estão em `01-tokens.md`.
- Foco visível em todos os controles, incluindo os cartões de tipo de conta, que antes não tinham.
- A **ordem de foco** é idêntica antes e depois (45 tabulações em index, cadastro, login e escolas).
- Os modos **Texto maior, Alto contraste e Reduzir movimento** funcionam e persistem. O alto contraste remove gradientes, sombras e brilhos. O movimento reduzido zera durações e não esconde nada.
- Tema escuro conferido nas capturas `*-escuro.webp`.

## 6. Correções visuais

1. Rolagem horizontal do cadastro em todas as larguras (o rádio de tipo de conta herdava `width:100%`).
2. Foco invisível nos cartões de tipo de conta.
3. Ranking vazio quebrando uma palavra por linha.
4. Emojis da demonstração trocados por ícones SVG coerentes com a identidade.
5. Ordem do CSS no build: o Vite reagrupava as folhas e o `style.css` antigo acabava carregando por último. Agora cada página carrega um arquivo de entrada com ordem garantida.

## 7. Checklist de não-regressão funcional (seção 11)

Executado sobre o build anterior (`antes`) e o novo (`depois`) com aleatoriedade semeada e relógio falso. As saídas foram **idênticas** (`evidencias/checklist-antes.json` × `checklist-depois.json`). A suíte de ponta a ponta tem **156 de 156** verificações passando (`evidencias/e2e-depois.txt`).

| Item | Antes | Depois | Como foi verificado |
| --- | --- | --- | --- |
| Teste inicia na 1ª tecla; tempo e encerramento em 15, 30 e 60 s | ✅ | ✅ | `checklist.cjs`: cronômetro parado antes da tecla e encerramento em cada tempo |
| WPM e precisão iguais para o mesmo input | ✅ | ✅ | Mesmos `result-wpm/raw/accuracy/consistency` e contagem de caracteres nos três tempos |
| Palavras/Frases, tempo e nível geram o conteúdo esperado | ✅ | ✅ | Conteúdo idêntico para palavras, frases, fácil e avançado |
| `Esc` e Reiniciar reiniciam o teste | ✅ | ✅ | Estado zerado após cada um |
| Backspace, acentos, maiúsculas, espaço; teclado mobile | ✅ | ✅ | Mesma marcação de letras; digitação por toque a 390 px; casos de Backspace da suíte e2e (1366 e 390 px) |
| Texto maior, alto contraste e reduzir movimento persistem após recarregar | ✅ | ✅ | Classes no `<body>` e chaves `wavetype_*` iguais |
| Cadastro e login: campos, validações, mensagens, redirecionamentos e sessão | ✅ | ✅ | Suíte e2e (cadastro, Google, conclusão, recuperação de senha, erros) |
| Abas e botões da demonstração | ✅ | ✅ | Mesmo título, endereço, painel visível e ações por aba |
| Links do menu e rodapé, âncoras, "Pular para o conteúdo" | ✅ | ✅ | Lista de links idêntica em 6 páginas; `#conteudo`, `#teste`, `#demonstracao` e `#plataforma` existem; o link de pular leva a `#conteudo` |
| XP, ranking e dados de aluno e professor | ✅ | ✅ | Suíte e2e (áreas de usuário, aluno e professor) |
| Nenhum erro novo no console; nenhuma requisição nova ou removida | ✅ | ✅ | Zero erros em todas as páginas da suíte. Requisições ao Supabase idênticas em index, login, aluno e professor. Arquivos estáticos: CSS consolidado (1 por página), fontes pré-carregadas (mesmos arquivos) e o novo `motion.js` |
| Navegação por teclado e leitor de tela | ✅ | ✅ | Ordem de foco idêntica; ícones novos com `aria-hidden`; nenhum texto ou rótulo alterado |
| Funciona com o movimento desligado | — | ✅ | Com `data-motion="off"` e com o script ausente nada fica oculto e não há erros |

## 8. Arquivos

**Novos**
- `css/redesign/tokens.css`, `typing.css`, `site.css`, `app.css`, `motion.css` (camadas).
- `css/redesign/teste.css`, `publico.css`, `plataforma.css`, `treino.css`, `trilha.css` (entradas, uma por tipo de página).
- `js/motion.js`.
- `docs/redesign/*` (auditoria, guias, relatório, capturas, evidências, ferramentas).

**Alterados (só o `<head>` e a tag do script, mais os ícones da demonstração)**
- `index.html`: 10 emojis → SVG em linha com `aria-hidden`; entrada de CSS; pré-carga de fontes; `motion.js`.
- `escolas.html`, `como-funciona.html`, `sobre.html`, `login.html`, `cadastro.html`, `recuperar-senha.html`, `redefinir-senha.html`.
- `app/usuario/*.html`, `app/aluno/*.html`, `app/professor/*.html` (21 páginas).

**Não alterados**
- `css/style.css`, `css/platform.css`, `css/exercicios.css`.
- Todo o JS existente (`js/script.js`, `js/site.js`, `js/auth.js`, `js/pages/*`, `js/api/*`).
- `vite.config.js`, `package.json`, migrações e configurações.

## 9. Itens que exigiriam mudança funcional (não executados)

1. **Modos de acessibilidade em todas as páginas.** "Texto maior", "Alto contraste" e "Reduzir movimento" só existem onde roda o motor de digitação (index e treino). Levá-los ao site e à área logada exige um controle novo e JS para ler e gravar as preferências. As camadas novas já respondem às classes `large-text`, `high-contrast` e `reduce-motion` em qualquer página.
2. **Botão de tema na área logada e na autenticação.** Essas páginas só leem `wavetype_theme`; trocar o tema exige um controle novo.
3. **Cursor que desliza entre letras.** Hoje o cursor é um pseudo-elemento de cada letra e pula de uma para outra. Um cursor contínuo precisa de um elemento único posicionado pelo motor (`js/script.js`).
4. **Logo oficial do Google no botão.** Exige marcação nova e seguir as diretrizes de marca do Google.
5. **Fontes em WOFF2.** Reduziria cerca de 150 KB, mas troca os arquivos de fonte do projeto.
6. **Mensagem de ranking vazio como elemento próprio.** O texto é gerado em `aluno-inicio.js` e `aluno-ranking.js`; a correção visual foi feita só em CSS.
7. **Pasta `html/` legada.** Ela duplica páginas e não entra no build; removê-la é uma mudança de estrutura.
8. **Scripts fora do pacote único do Vite.** No build, uma falha de rede em qualquer pedaço de JS da página impede os demais de rodar. Isolar `motion.js` exige mudar a configuração do build.

## 10. Como ver e como reverter

- **Ver**: capturas em `docs/redesign/capturas/antes/` e `depois/`, em 375, 768 e 1280 px, mais os modos escuro, alto contraste, texto grande e menos movimento. O vídeo do hero e do teste está em `capturas/depois/hero-e-teste.webm`.
- **Reverter uma página**: trocar `css/redesign/<entrada>.css` pelo(s) CSS antigo(s) e remover a tag do `motion.js`.
- **Desligar só o movimento**: `data-motion="off"` no `<html>`.
