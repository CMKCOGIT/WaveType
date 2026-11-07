# 02 · Front-end

## Mapa das páginas

Cada página carrega **um** CSS de entrada e **um** módulo de página (mais
`motion.js` e, na plataforma, `ui/plataforma.js`).

### Site público e telas de acesso

| Página | Para quê | Módulo | CSS de entrada |
| --- | --- | --- | --- |
| `index.html` | Início + teste de digitação gratuito | `script.js`, `pages/teste-publico.js`, `site.js`, `sessao/cabecalho.js` | `redesign/teste.css` |
| `escolas.html` | Proposta para escolas (painel ilustrativo) | `site.js`, `sessao/cabecalho.js` | `redesign/publico.css` |
| `como-funciona.html` | Método, métricas, perguntas frequentes | `site.js`, `sessao/cabecalho.js` | `redesign/publico.css` |
| `sobre.html` | Origem, missão, visão, valores | `site.js`, `sessao/cabecalho.js` | `redesign/publico.css` |
| `nivelamento.html` | Teste de nivelamento (5 etapas) | `pages/nivelamento.js` | `redesign/nivelamento.css` |
| `login.html` | Entrar (2 abas) | `pages/login.js` | `redesign/plataforma.css` |
| `cadastro.html` | Criar conta; `?completar=1` conclui cadastro do Google | `pages/cadastro.js` | `redesign/plataforma.css` |
| `recuperar-senha.html` | Pede o link de nova senha | `pages/recuperar-senha.js` | `redesign/plataforma.css` |
| `redefinir-senha.html` | Define a nova senha | `pages/redefinir-senha.js` | `redesign/plataforma.css` |

### Área logada

Todas exigem sessão e o papel certo (`exigirPapel`). `treinamento.html` é um
endereço antigo que redireciona para `exercicios.html`.

| Página | Usuário | Aluno | Professor | Módulo |
| --- | :-: | :-: | :-: | --- |
| `index.html` (visão geral) | ✓ | ✓ | ✓ | `usuario-inicio.js` / `aluno-inicio.js` / `professor-inicio.js` |
| `exercicios.html` (trilha / atividades) | ✓ | ✓ | ✓ | `usuario-exercicios.js` / `aluno-exercicios.js` / `professor-exercicios.js` |
| `treinar.html` (digitação) | ✓ | ✓ | | `script.js` + `usuario-treinar.js` / `aluno-treinar.js` → `treino.js` |
| `resultados.html` | ✓ | ✓ | | `usuario-resultados.js` / `aluno-resultados.js` |
| `conquistas.html` | ✓ | ✓ | | `usuario-conquistas.js` / `aluno-conquistas.js` → `conquistas.js` |
| `ranking.html` | ✓ | ✓ | | `aluno-ranking.js` |
| `turmas.html` | | ✓ | ✓ | `aluno-turmas.js` / `professor-turmas.js` |
| `alunos.html` | | | ✓ | `professor-alunos.js` |
| `relatorios.html` | | | ✓ | `professor-relatorios.js` |
| `perfil.html` | ✓ | ✓ | ✓ | `perfil.js` (+ `perfil-vinculos.js`, `professor-perfil-alunos.js`) |

O `<body>` de cada página informa a área por `data-role` e `data-page`.

## Módulos JavaScript

### Núcleo

| Arquivo | Responsabilidade |
| --- | --- |
| `supabaseClient.js` | Cria o cliente único (`persistSession`, `autoRefreshToken`, `detectSessionInUrl`). Lança erro claro se faltar URL/chave. |
| `auth.js` | Cadastro, login (e-mail, Google, usuário da escola), vincular Google/e-mail, recuperar e trocar senha, concluir cadastro, tradução de erros. Reexporta a camada de sessão. |
| `regras.js` | Espelho das regras de conclusão do banco, para **explicar** o resultado (`motivoNaoConcluiu`, `formatarTempo`). |
| `exercicios-dados.js` | `NIVEIS`: títulos e etapas dos 6 níveis da trilha (o texto dos exercícios vem do banco). |
| `script.js` | Interface do teste de digitação: gera palavras, desenha letras, cronômetro, gráfico, diagnóstico. Usa o motor de `digitacao/`. |
| `site.js` | Tema e menu móvel do site público. |
| `motion.js` | Revela blocos ao rolar. Desligável com `<html data-motion="off">`. |

### `js/sessao/` — sessão e proteção de rotas

| Arquivo | Responsabilidade |
| --- | --- |
| `regras.js` | Decisões puras: destino por papel, `?redirect=` seguro, sessão expirada, papel trocado, inatividade, iniciais do avatar. |
| `local.js` | Sem Supabase: há token salvo?, limpar dados locais, aviso entre abas (BroadcastChannel + `storage`), registro de atividade. |
| `sessao.js` | Valida no servidor (`auth.getUser`), `exigirPapel`, `protegerPaginaDeAcesso`, `irParaArea`, `encerrarSessao`, `sair`. |
| `cabecalho.js` | Cabeçalho do site público: visitante / carregando / conectado (menu da conta). |

Detalhes em [05 · Autenticação, sessão e contas](05-autenticacao-e-contas.md).

### `js/api/` — acesso a dados

Cada arquivo agrupa as chamadas de um assunto. As páginas nunca chamam o
Supabase diretamente para dados: passam por aqui.

| Arquivo | Funções | Tabelas / RPCs |
| --- | --- | --- |
| `exercicios.js` | `listarExercicios`, `buscarExercicio`, `listarMinhasAtividades`, `listarExerciciosDisponiveis`, `listarAtividadesDoProfessor`, `salvarAtividade`, `excluirAtividade` | `exercicios`, `minhas_atividades`, `atividades_do_professor`, `salvar_atividade`, `excluir_atividade` |
| `resultados.js` | `registrarResultado`, `listarMeusResultados` | `resultados`, `usuario_conquistas` |
| `turmas.js` | `listarMinhasTurmas`, `listarMinhasMatriculas`, `criarTurma`, `atualizarTurma`, `excluirTurma`, `regenerarCodigoTurma`, `entrarNaTurma`, `listarAlunosDaTurma`, `adicionarAluno`, `adicionarAlunoPorId`, `removerAlunoDaTurma`, `modosDeErroDasTurmas` | `turmas`, `matriculas`, `entrar_na_turma`, `alunos_da_turma`, `adicionar_aluno*`, `remover_aluno_da_turma`, `regenerar_codigo_turma`, `excluir_turma` |
| `contas-escolares.js` | `criarAlunosNaTurma`, `redefinirSenhaDoAluno`, `loginsDosAlunos`, `minhaContaEscolar`, `transferirContaEscolar`, `alterarLoginDoAluno` | `contas_escolares`, `professor_criar_alunos`, `professor_redefinir_senha_aluno`, `professor_alterar_login_aluno`, `minha_conta_escolar`, `transferir_conta_escolar` |
| `nivelamento.js` | `salvarNivelamento`, `guardarNivelamentoPendente`, `enviarNivelamentoPendente`, `ultimoNivelamento`, `licaoRecomendada`, `registrarDecisaoDeSugestao`, `nivelamentoDosAlunos` | `nivelamentos`, `sugestoes_nivel` |
| `dashboard.js` | `carregarDashboardAluno`, `carregarDashboardProfessor` | `usuarios`, `resultados`, `resumo_turmas_professor` |
| `achievements.js` | `listarConquistasComProgresso` | `sincronizar_conquistas`, `progresso_conquistas` |
| `ranking.js` | `buscarRankingExercicio` | `ranking_exercicio` |

**Convenção de erro:** as funções lançam o erro do Supabase (ou um `Error`
com mensagem em português); a página captura e mostra `traduzErro(erro)`.

**Compatibilidade com migrações:** `turmas.js` funciona mesmo sem a migração
08 (coluna `modo_erros`): o PostgREST recusa a coluna antes de gravar
(`PGRST204`) e a chamada é repetida sem ela.

### `js/digitacao/`, `js/nivelamento/`, `js/contas/` — regras puras

| Arquivo | Conteúdo |
| --- | --- |
| `digitacao/config.js` | Limites das métricas, modos de erro, modo padrão por nível. |
| `digitacao/metricas.js` | `consistencia`, `precisao`, `ppm`, `intervalosEntreTeclas`. |
| `digitacao/motor.js` | `criarMotor()`: estado da digitação sem DOM. |
| `nivelamento/config.js` | Etapas, limiares e mapeamento para a trilha. |
| `nivelamento/avaliacao.js` | `resumirEtapa`, `deveAvancar`, `recomendar`, `licaoRecomendadaAtual`, `teclasMuitoAbaixo`, `sugestaoDuranteTreino`. |
| `contas/credenciais.js` | `loginBase`, `resolverColisao`, `sugerirLogins`, `gerarSenha`, `nomesDaLista`, `normalizarLogin*`. |

Detalhes em [03 · Motor](03-motor-e-metricas.md) e [06 · Nivelamento](06-nivelamento-e-gamificacao.md).

### `js/ui/` — interface

| Arquivo | Conteúdo |
| --- | --- |
| `onda.js` | Web Components `<wave-divider>`, `<wave-background>`, `<wave-loader>`, `<wave-meter>`. |
| `onda-caminho.js` | Geometria pura: `caminhoOnda`, `caminhoSuave` (Catmull-Rom → Bézier), `amplitudeDaConsistencia`. |
| `tema-onda.js` | Botão de tema claro/escuro com cortina em onda (`trocarTema`, `ligarBotaoTema`, `temaAtual`). |
| `plataforma.js` | Botão de tema, menu em gaveta (≤ 820 px), rótulos das tabelas para virarem cartões no celular, dicas do menu. |
| `cartoes-acesso.js` | Cartões de usuário/senha do aluno: HTML, copiar, imprimir. |
| `ponto-de-partida.js` | Cartão "Seu ponto de partida" (envia nivelamento pendente e mostra a lição). |
| `toast-conquista.js` | Aviso discreto quando o banco libera uma conquista. |
| `icones.js` | Ícones SVG das conquistas (coluna `conquistas.icone`). |

### Componentes "Wave"

| Componente | Atributos | Uso |
| --- | --- | --- |
| `<wave-divider>` | `tipo="linha"` (opcional) | Divisor de seção. A seção que o recebe leva `data-onda-secao`. |
| `<wave-background>` | `variante="suave" \| "clara"` | Ondas ao fundo do hero e do painel do login. |
| `<wave-loader>` | — | Carregamento. |
| `<wave-meter>` | `valor="0..100"` | Indicador de consistência: onda calma = ritmo estável; sem valor = linha reta. |

Todos são decorativos (`aria-hidden`) e só animam com
`prefers-reduced-motion: no-preference` e sem "Reduzir movimentos".

## Eventos entre módulos

A interface do teste (`script.js`) não sabe se está na página pública ou na
área logada. A comunicação é por eventos no `document`:

| Evento | Quem dispara | Quem escuta | `detail` |
| --- | --- | --- | --- |
| `wavetype:exercicio` | `pages/treino.js` | `script.js` | Exercício: `texto_referencia`, `tempo_limite_seg`, `atividade`, `nivel`, `modo_erros_turma` |
| `wavetype:resultado` | `script.js` (fim do teste) | `pages/treino.js`, `pages/teste-publico.js` | `ppm`, `precisao`, `acertos`, `erros`, `tempo_seg`, `concluiu_texto`, `desempenho_teclas` |
| `wavetype:tema` | `ui/tema-onda.js` | botões de tema | `{ tema: 'light' \| 'dark' }` |

Se o exercício chegar antes do `script.js` carregar, ele também é deixado em
`window.wavetypeExercicio`.

## Armazenamento no navegador

| Chave | Conteúdo | Sobrevive ao "Sair"? |
| --- | --- | --- |
| `sb-<projeto>-auth-token` | Sessão do Supabase | Não |
| `wavetype_theme` | `light` / `dark` | Sim (preferência do aparelho) |
| `wavetype_large-text`, `wavetype_high-contrast`, `wavetype_reduce-motion`, `wavetype_single-line` | Acessibilidade | Sim |
| `wavetype_login_modo` | Aba escolhida no login | Sim |
| `wavetype_papel_sessao` | Papel gravado no login (detecta troca) | Não |
| `wavetype_ultima_atividade` | Última atividade (inatividade) | Não |
| `wavetype_redirect_pos_login` | Destino após entrar | Não |
| `wavetype_tipo_pendente` | Tipo escolhido antes do Google | Não |
| `wavetype_results_v2` | Histórico local do teste (comparação com o resultado anterior) | Não |
| `wavetype_nivelamento_pendente` | Nivelamento feito como visitante (enviado ao entrar, vale 7 dias) | Não |

`limparDadosLocais()` apaga tudo que começa com `wavetype_`, exceto as
preferências do aparelho.

## Scripts no `<head>` (antes da pintura)

Toda página pública tem dois scripts em linha que evitam "piscar":

1. **Tema:** `data-theme` vem de `wavetype_theme` ou da preferência do sistema.
2. **Sessão:** `data-sessao="carregando"` se houver token salvo, senão
   `visitante`. O CSS esconde "Entrar" enquanto carrega.

## CSS

Cada página importa um único arquivo de entrada, que junta o CSS antigo e as
camadas do redesenho, nesta ordem:

| Entrada | Páginas | Importa |
| --- | --- | --- |
| `redesign/teste.css` | `index.html` | `style.css`, tokens, typing, site, onda, motion |
| `redesign/publico.css` | escolas, como funciona, sobre | `style.css`, tokens, site, onda, motion |
| `redesign/nivelamento.css` | nivelamento | `style.css`, tokens, typing, site, onda, motion |
| `redesign/plataforma.css` | acesso e área logada | `platform.css`, tokens, app, plataforma-ui, responsivo, onda, motion |
| `redesign/treino.css` | `treinar.html` | `platform.css`, `style.css`, tokens, typing, app, plataforma-ui, responsivo, onda, motion |
| `redesign/trilha.css` | `exercicios.html` (usuário e aluno) | `platform.css`, `exercicios.css`, tokens, app, plataforma-ui, responsivo, onda, motion |

| Camada | Papel |
| --- | --- |
| `tokens.css` | Cores, espaço, raio, sombra, tipografia, movimento (`--wt-*`), temas e alto contraste |
| `typing.css` | Área de digitação |
| `site.css` | Seções do site público |
| `app.css`, `plataforma-ui.css` | Componentes da plataforma |
| `responsivo.css` | Menu em gaveta, tabelas em cartões, bloco de login/cadastro |
| `onda.css` | Estilo e animação dos componentes Wave |
| `motion.css` | Revelação ao rolar; zera durações com movimento reduzido |

Guias completos: [tokens](../redesign/01-tokens.md),
[componentes](../redesign/02-componentes.md),
[animações](../redesign/03-animacoes.md),
[responsividade](../redesign/06-responsividade.md).

### Modos visuais

| Modo | Como liga | Efeito |
| --- | --- | --- |
| Tema escuro | Botão de tema / sistema | `html[data-theme="dark"]` |
| Alto contraste | Opção no teste | `body.high-contrast`: cores sólidas, sem sombras e sem ondas de fundo |
| Texto maior | Opção no teste | `body.large-text` |
| Reduzir movimentos | Opção / sistema | `body.reduce-motion` ou `prefers-reduced-motion`: durações 0 ms |
| Movimento desligado | Desenvolvimento | `<html data-motion="off">` |
