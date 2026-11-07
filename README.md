# WaveType — protótipo HTML para integração

Versão visual isolada da WaveType, criada para análise e futura integração com JavaScript e Supabase.

## O que esta versão contém

- Landing page com teste de digitação visual.
- Login, cadastro e recuperação de senha.
- Área inicial de usuário comum.
- Área do aluno com treinamento, resultados, conquistas e ranking.
- Área do professor com visão geral, turmas, alunos, exercícios e relatórios.
- Formulários e componentes marcados com `id`, `name` e atributos `data-*` estáveis.

## O que esta versão não contém

- JavaScript.
- Chamadas ao Supabase.
- Autenticação real.
- Persistência de dados.
- Gráficos dinâmicos.

Os botões e formulários são intencionalmente visuais. O backend pode ser conectado posteriormente sem refazer a marcação.

## Como visualizar

Abra `index.html` no navegador. Como não existem módulos JavaScript ou requisições externas, esta versão funciona diretamente como arquivo local.

## Estrutura

```text
index.html
login.html
cadastro.html
recuperar-senha.html
app/
  usuario/
  aluno/
  professor/
assets/
  css/wavetype.css
  fonts/
  images/
docs/
  MAPA-DE-INTEGRACAO.md
```

## Identidade visual

- Interface: Manrope.
- Digitação e métricas: IBM Plex Mono.
- Cores: Action Blue, Wave Blue, Flow Violet, Evolution Aqua, Deep Ink, Soft Mist e extensões oficiais para contraste.
- Marca: símbolo e wordmark oficiais da WaveType.

Nenhum arquivo da pasta original ou do pendrive foi alterado.
