# Mapa de integração do HTML

Este documento indica como conectar o protótipo ao JavaScript e ao schema atual do Supabase.

## Convenções usadas

- `data-page`: identifica a tela atual.
- `data-role`: identifica o perfil visual da página.
- `data-auth-required`: informa se a rota deve exigir sessão.
- `data-form`: identifica um formulário.
- `data-action`: identifica a ação esperada de um botão.
- `data-field`: liga um campo visual a uma coluna ou valor do banco.
- `data-bind`: local onde o JavaScript deve renderizar um valor.
- `data-list`: contêiner de itens repetidos.
- `data-table`: tabela que receberá dados.
- `data-resource`: tabela ou recurso principal da seção.

## Autenticação

| Tela | Formulário | Operação futura |
| --- | --- | --- |
| `login.html` | `#form-login` | `supabase.auth.signInWithPassword()` |
| `cadastro.html` | `#form-cadastro` | `supabase.auth.signUp()` |
| `recuperar-senha.html` | `#form-recuperacao` | `supabase.auth.resetPasswordForEmail()` |

Os campos `nome`, `email`, `senha` e `tipo` mantêm nomes diretos. O campo `senha` pertence apenas ao Supabase Auth e nunca deve ser salvo em `public.usuarios`.

## Usuário comum

O schema recebido possui apenas os tipos `professor` e `aluno`. Para evitar uma alteração prematura no banco, o protótipo considera o usuário comum como:

- `usuarios.tipo = 'aluno'`;
- sem matrícula ativa em `matriculas`;
- interface visual `data-role="usuario"`.

Se a equipe preferir um terceiro papel real no banco, será necessário adicionar `usuario` ao enum `tipo_usuario` e revisar todas as políticas RLS.

## Turmas

Formulário: `#form-nova-turma`

| Campo HTML | Coluna |
| --- | --- |
| `nome` | `turmas.nome` |
| `codigo_convite` | `turmas.codigo_convite` |
| `professor_id` | `turmas.professor_id` |

## Matrículas

Formulário: `#form-nova-matricula`

| Campo HTML | Coluna |
| --- | --- |
| `aluno_id` | `matriculas.aluno_id` |
| `turma_id` | `matriculas.turma_id` |
| `ativa` | `matriculas.ativa` |

O e-mail informado pelo professor é um campo de busca para localizar o `aluno_id`; ele não existe na tabela `matriculas`.

## Exercícios

Formulário: `#form-novo-exercicio`

| Campo HTML | Coluna |
| --- | --- |
| `titulo` | `exercicios.titulo` |
| `texto_referencia` | `exercicios.texto_referencia` |
| `tempo_limite_seg` | `exercicios.tempo_limite_seg` |
| `turma_id` | `exercicios.turma_id` |
| `criado_por` | `exercicios.criado_por` |

## Resultados

O componente `[data-component="typing-test"]` possui pontos de ligação para:

- `resultados.aluno_id`;
- `resultados.exercicio_id`;
- `resultados.ppm`;
- `resultados.precisao`;
- `resultados.acertos`;
- `resultados.erros`;
- `resultados.tempo_seg`.

O teste de digitação deve emitir um único objeto ao finalizar. O módulo de persistência recebe esse objeto e o envia ao Supabase.

## Proteção de páginas

Páginas com `data-auth-required="true"` devem validar a sessão antes de mostrar seu conteúdo. Depois da autenticação:

- professor → `app/professor/index.html`;
- aluno matriculado → `app/aluno/index.html`;
- aluno sem matrícula → `app/usuario/index.html`.

Essa regra preserva o schema atual sem confundir a interface de usuário comum com a área de aluno vinculada a uma turma.
