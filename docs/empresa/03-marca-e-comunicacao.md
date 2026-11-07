# 03 · Marca e comunicação

## Conceito: a onda

O nome **WaveType** une *wave* (onda) e *type* (digitar). A onda é a metáfora
central da marca:

- **Ritmo:** digitar bem é manter um ritmo estável, como uma onda regular.
- **Fluxo:** o aprendizado avança de forma contínua, sem saltos bruscos.
- **Evolução:** cada onda leva a próxima; cada prática leva a um resultado melhor.

Essa metáfora aparece no produto de forma concreta: divisores de seção
ondulados, gráfico de ritmo com curva suave, botão de tema em que uma onda
cobre a tela e o indicador de consistência (`<wave-meter>`), em que **uma onda
calma significa ritmo estável** e uma onda agitada, ritmo irregular.

## Ativos da marca

Todos em `assets/images/`. **Não altere os arquivos de marca**: use-os como estão.

| Arquivo | Uso |
| --- | --- |
| `brand/wavetype-logo.svg` | Logo completo (símbolo + nome), fundo claro |
| `brand/wavetype-logo-dark.svg` | Logo para fundo claro com texto escuro |
| `brand/wavetype-logo-white.svg` | Logo para fundos escuros ou azuis |
| `brand/wavetype-symbol.svg` | Só o símbolo (avatar, ícone, espaço pequeno) |
| `brand/wavetype-og.png` | Imagem de compartilhamento em redes (Open Graph) |
| `favicon.svg`, `icons/favicon.ico`, `icons/favicon-96x96.png` | Ícone da aba |
| `icons/apple-touch-icon.png` | Ícone na tela inicial do iOS |
| `icons/web-app-manifest-192x192.png`, `-512x512.png`, `wavetype-maskable-512x512.png` | Ícones do aplicativo web (`site.webmanifest`) |

## Cores

As cores oficiais têm nomes próprios. Os valores e os tokens CSS estão em
`css/redesign/tokens.css` (detalhes em [redesign/01-tokens.md](../redesign/01-tokens.md)).

| Nome oficial | Hex | Papel |
| --- | --- | --- |
| **Action Blue** | `#315FD6` | Cor principal: botões, links, destaque. Também a `theme_color` do app. |
| **Wave Blue** | `#4F7CFF` | Foco, gradientes, bordas ativas |
| **Flow Violet** | `#6B5CE7` | Final do gradiente da onda |
| **Evolution Aqua** | `#2ECAB6` | Progresso, barras, sucesso (para texto pequeno no claro use `#0E7F71`) |
| **Deep Ink** | `#17233F` | Texto principal |
| **Soft Mist** | `#F5F8FF` | Fundo do tema claro |
| Night | `#0E1730` / `#16213A` | Fundo e superfície do tema escuro |

### Gradientes

- **Onda** (`--wt-gradient-wave`): Action Blue → Wave Blue → Flow Violet. Usado
  em títulos de destaque, cursor de digitação e menu ativo.
- **Maré** (`--wt-gradient-tide`): Action Blue → Evolution Aqua. Usado em
  barras de progresso e linhas de passos.

### Regras de uso

- O texto sempre atinge contraste AA (4,5:1) ou mais. Os pares aprovados estão
  medidos no guia de tokens.
- Evolution Aqua não é usado em texto pequeno sobre fundo claro.
- No modo de alto contraste, gradientes viram cor sólida e as ondas de fundo
  somem.

## Tipografia

| Família | Uso | Arquivo |
| --- | --- | --- |
| **Manrope** (variável) | Interface, títulos e textos | `assets/fonts/Manrope-Variable.ttf` |
| **IBM Plex Mono** | Área de digitação e números das métricas | `assets/fonts/IBMPlexMono-Regular.ttf` |

As duas são servidas pelo próprio site (sem depender de serviços externos).
Títulos usam espaçamento de letras levemente fechado; rótulos em caixa alta
usam espaçamento aberto.

## Forma e movimento

- **Raios discretos**: 4 px em botões e campos, 8 px em elementos médios,
  12 px em cartões; formato "pílula" só em etiquetas e selos.
- **Movimento suave e opcional**: as animações respeitam
  `prefers-reduced-motion` e a opção "Reduzir movimentos". Nada essencial
  depende de animação.
- **Ícones** em traço SVG, na cor do texto (seguem o tema). Emojis não são
  usados como ícones de interface.

## Tom de voz

A WaveType fala como **uma boa professora**: próxima, clara e encorajadora,
sem infantilizar e sem jargão.

| Somos | Não somos |
| --- | --- |
| Claros: frases curtas, uma ideia por frase. | Técnicos: "Erro 42501: permissão negada". |
| Encorajadores: valorizamos o progresso. | Competitivos: "Você perdeu para 80% dos usuários". |
| Honestos: dizemos o que ainda não existe. | Exagerados: "A melhor plataforma do mundo". |
| Úteis: todo aviso diz o que fazer. | Vagos: "Algo deu errado". |
| Respeitosos com o ritmo de cada um. | Pressionadores: "Rápido! Não pare!". |

### Exemplos reais do produto

| Situação | Texto usado |
| --- | --- |
| Resultado que não concluiu | "Precisão de 82%; é preciso mais de 85%." |
| Sessão encerrada | "Sua sessão foi encerrada por inatividade. Entre novamente." |
| Muitas tentativas de login | "Muitas tentativas seguidas. Espere alguns minutos ou peça ajuda ao professor." |
| Conta desativada | "Esta conta está desativada. Fale com o professor ou com a escola." |
| Chamada para ação | "Seu próximo resultado começa na primeira tecla." |
| Painel ilustrativo | "Ilustração: nomes e números são fictícios." |

## Regras de escrita

1. **Português do Brasil**, com acentos e cedilha corretos.
2. **"Você"** para falar com a pessoa.
3. **Verbos de ação nos botões**: "Entrar", "Criar conta", "Fazer o teste
   grátis", "Copiar senha", "Imprimir cartão".
4. **Números com unidade e contexto**: "35 WPM", "92% de precisão",
   "+4 pontos percentuais desde o teste diagnóstico".
5. **Siglas explicadas na primeira vez**: WPM = palavras por minuto (1 palavra
   = 5 caracteres).
6. **Mensagens de erro não revelam dados**: usuário inexistente e senha errada
   recebem a mesma mensagem.
7. **Dados fictícios sempre marcados** como fictícios.
8. **Termos oficiais** conforme o [glossário](04-principios-e-glossario.md#glossário).

## Mensagens-chave

| Uso | Mensagem |
| --- | --- |
| Assinatura | Aprenda no seu ritmo. Evolua a cada tecla. |
| Institucional | Tecnologia para transformar prática em evolução. |
| Página inicial | Digite agora. Veja onde evoluir. |
| Escolas | Uma visão simples para quem ensina. Uma jornada clara para quem aprende. |
| Como funciona | Pratique, compreenda e avance. |
| Produto em uma frase | A WaveType conecta prática imediata, acompanhamento individual e gestão de turmas em uma experiência leve. |
