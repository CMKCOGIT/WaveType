# Responsividade

A auditoria automática (`ferramentas/auditoria.cjs`) passou pelas 29 páginas (site público, telas de acesso e toda a área logada de usuário, aluno e professor) em 10 larguras: 320, 360, 390, 414, 600, 768, 900, 1024, 1280 e 1440 px. Para cada combinação, ela procura:
- rolagem lateral da página;
- elementos que saem da tela;
- áreas que precisam ser arrastadas;
- alvos de toque menores que 40 px;
- textos menores que 11,5 px.

Depois da correção, rodou de novo nessas larguras e em 320, 340, 360, 375 e 390 px.

## Antes × depois

| Problema | Antes | Depois |
| --- | --- | --- |
| Menu da área logada precisando ser arrastado (celular e tablet) | 113 telas | 0 |
| Tabelas precisando ser arrastadas | 47 telas | 0 |
| Rolagem lateral da página | 0 | 0 |
| Elementos saindo da tela | 0 | 0 |
| Alvos de toque menores que 40 px | "Copiar" com 22 px, voltar/esqueci a senha com 17–19 px, botões pequenos com 38 px, menu do site com 36 px a 320 px | Só o "Copiar" de 32 px em telas a partir de 641 px (acima do mínimo de 24 px da WCAG 2.2). No celular ele tem 40 px |
| Textos da plataforma menores que 11,5 px | 3 a 15 por tela | 0 |

Saídas completas em `evidencias/responsividade-antes.txt` e `responsividade-depois.txt`.

## O que mudou

### Área logada no celular e no tablet (até 820 px)

- **Menu em gaveta.** O menu lateral, que no celular virava uma faixa para arrastar, agora abre como gaveta pelo botão ☰ do topo. Ela mostra:
  - logo e papel;
  - todos os itens, com ícone e nome;
  - o cartão "Ir ao site público".
- Ela fecha pelo ✕, tocando fora, com a tecla Esc ou ao escolher uma página.
- Com a gaveta aberta:
  - o foco vai para o item atual;
  - o resto da página fica inacessível ao teclado;
  - ao fechar, o foco volta ao ☰.
- **Cabeçalho único:** ☰, logo, tema, avatar e "Sair", fixo no topo. Abaixo de 360 px, o logo mostra só o símbolo.
- **Cabeçalho das páginas** alinhado à esquerda, com os botões de ação ocupando a largura (antes alguns ficavam centralizados).
- **Painéis lado a lado viram coluna;** formulários, filtros e grades se ajustam à largura.
- **Linhas da trilha de exercícios:** o botão Iniciar/Revisar desce e ocupa a largura.

### Tabelas no celular (até 640 px)

- Cada linha vira um cartão: a primeira coluna (exercício, aluno, turma) é o título e as outras aparecem com o nome da coluna acima do valor.
- Os nomes vêm do cabeçalho da própria tabela (`js/ui/plataforma.js`), inclusive nas linhas que a página carrega depois.
- No tablet (641–820 px), a tabela cabe na largura sem arrastar.

### Menu recolhido em ícones (821–1180 px)

- O logo mostra só o símbolo; antes aparecia cortado.
- O rótulo "Área do…" sai, porque transbordava.
- Os itens só com ícone voltaram a ter nome para leitores de tela (antes o nome ficava com `display:none`) e ganharam dica ao passar o mouse.

### Site público

- No celular, as faixas decorativas do hero não cobrem mais o título.
- O botão de menu não encolhe mais a 320 px.
- Os itens do menu móvel têm 52 px, e "Criar conta" fica em destaque no fim.

## Arquivos

- `css/redesign/responsivo.css`: nova camada, importada por último em `plataforma.css`, `trilha.css` e `treino.css`.
- `js/ui/plataforma.js`: gaveta do menu, rótulos das tabelas e dicas dos itens do menu.
- `css/redesign/site.css`: ajustes do site público no celular.

## Verificação

- Suíte e2e com o Supabase simulado: 156/156.
- Varredura de contraste em 14 telas, nos temas claro e escuro: sem falhas.
- Computador (acima de 1180 px): o botão ☰ e o logo do topo ficam ocultos e o menu lateral segue como antes.
