# Redesenho da plataforma (v2)

Escopo: login, cadastro, recuperar e redefinir senha, e todas as telas de `app/usuario`, `app/aluno` e `app/professor`. A landing page (index, escolas, como funciona, sobre) **não foi alterada**.

As referências usadas foram:
- uma tela de acesso em moldura: painel em gradiente com passos em vidro, ao lado de um formulário limpo;
- um painel administrativo com menu de ícones, hero de boas-vindas e métricas tingidas com selo de ícone.

A identidade foi mantida: logo, Manrope, IBM Plex Mono e a paleta `#315FD6`.

## O que mudou

### Telas de acesso
- **Moldura:** o painel lateral e o formulário viraram dois cartões arredondados lado a lado, sobre um fundo suave. No celular, eles ficam empilhados.
- **Painel em gradiente:** azul → violeta, com luzes desfocadas. O rótulo vira uma "pílula de vidro".
- **Pontos do painel:** os itens que já existiam viraram cartões de vidro numerados, como os passos da referência. O primeiro fica em destaque e, com 4 itens, a grade é 2×2.
- **Formulário:**
  - campos preenchidos (fundo suave, borda azul e halo no foco);
  - botão principal maior;
  - separador "ou";
  - botão do Google com a marca do Google;
  - cartões de tipo de conta com marcador de rádio.
- **Botão de tema** no canto do formulário.

### Área logada
- **Estrutura flutuante:** o menu lateral e a barra superior viraram cartões arredondados com sombra suave.
- **Menu com ícones:** cada item ganhou um ícone (SVG em máscara, na cor do texto) e o item atual fica destacado. Entre 821 e 1180 px, o menu mostra só os ícones. No celular, ele vira uma faixa de pílulas no topo.
- **Hero da página:** o cabeçalho de cada tela virou um cartão de boas-vindas com brilho suave e a onda da marca.
- **Métricas tingidas:** fundo azul, aqua ou violeta, com selo redondo de ícone (velocidade, alvo, camadas, chama, pessoas, grade). No celular, ficam em 2 colunas.
- **Componentes:**
  - painéis, tabelas (cabeçalho em caixa alta, linha realçada no hover), ranking, turmas (faixa em gradiente), linhas de exercícios da trilha, conquistas (selo em gradiente) e selos de status;
  - tudo na mesma escala de raio e sombra.
- **Barra superior:** botão de tema, avatar em gradiente e "Sair".
- **Celular:** a barra superior continua visível. Antes ela sumia abaixo de 560 px e levava junto o botão "Sair".

### Modo escuro
- Paleta própria da plataforma (`--p-*` em `css/redesign/plataforma-ui.css`), com tintas e textos ajustados para AA.
- Logo transparente no menu escuro.
- O botão de tema (`js/ui/plataforma.js`) usa a mesma chave do site, `wavetype_theme`, então a escolha vale em todas as páginas. A troca é suave (transição de cor de 320 ms).

### Movimento
- Entrada escalonada dos blocos da página e das métricas.
- *Hover* com elevação em cartões, métricas, turmas, conquistas e linhas da trilha.
- Ícones do menu crescem levemente no *hover*.
- Brilho que percorre a barra de nível uma vez.
- Os blocos grandes só deslizam, sem começar invisíveis, para não atrasar o LCP.
- Tudo respeita `prefers-reduced-motion`.
- Transições entre páginas (View Transitions) foram testadas e descartadas: geravam erro no console nos redirecionamentos de login.

## Arquivos

- **Novos:**
  - `css/redesign/plataforma-ui.css`: a camada desta versão. É importada por `plataforma.css`, `trilha.css` e `treino.css`, depois de `app.css`.
  - `js/ui/plataforma.js`: o botão de tema.
- **Alterados:** as 25 páginas de acesso e da área logada (só a tag do script novo) e os três arquivos de entrada de CSS.
- **Sem mudança:**
  - landing page;
  - JS existente;
  - formulários, rotas, textos, chamadas ao Supabase e chaves de `localStorage`.

## Verificação

- Suíte e2e com o Supabase simulado: **156/156** (`evidencias/e2e-plataforma.txt`).
- Lighthouse (mobile) em cadastro, login e recuperar senha: desempenho 98 · acessibilidade 100 · boas práticas 100 · CLS 0.
- Varredura de contraste (`ferramentas/contraste.cjs`) em 14 telas, nos temas claro e escuro: nenhum texto abaixo de AA.
- Capturas em 375 e 1280 px, claro e escuro: `capturas/plataforma/`.
- Na página de treino (motor de digitação), a barra superior fica sem desfoque, para não pesar na digitação.
