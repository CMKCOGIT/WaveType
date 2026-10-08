# WaveType — área pública para integração

Esta pasta contém somente a área pública da WaveType. Ela foi separada do backup de 15/09/2026 para ser integrada posteriormente ao projeto principal sem levar autenticação, Supabase, banco de dados ou painéis internos.

## Conteúdo mantido

- `html/index.html`: página inicial e teste de digitação.
- `html/escolas.html`: apresentação para professores e instituições.
- `html/como-funciona.html`: explicação do método e das métricas.
- `html/sobre.html`: história, missão, visão e valores.
- `css/style.css`: identidade visual e temas claro/escuro.
- `js/site.js`: tema, menu móvel e demonstração visual da plataforma.
- `js/script.js`: funcionamento completo do teste de digitação.
- `assets/`: fontes, logos, favicon e imagens da marca.
- `site.webmanifest`: configuração visual do aplicativo web.

## Conteúdo não incluído

- Supabase e arquivos `.env`.
- Login, cadastro e recuperação de senha.
- Painéis de aluno e professor.
- Scripts de turmas, exercícios e resultados conectados ao banco.
- Schema SQL e código de backend.

## Pontos de integração

Os botões **Entrar** e **Criar conta** permanecem visíveis, mas não navegam para nenhuma página nesta versão. Eles possuem os atributos:

```html
data-integration-target="login"
data-integration-target="cadastro"
```

Na integração futura, basta substituir `href="#"` pelas rotas reais e remover `aria-disabled="true"`. Também será necessário retirar o bloqueio desses links em `js/site.js`.

## Funcionamento local

Abra `html/index.html` em um servidor HTTP local. O teste de digitação, o menu, a demonstração da plataforma, as preferências de acessibilidade e os temas claro/escuro funcionam sem backend.

O histórico do teste e as preferências visuais são armazenados somente no `localStorage` do navegador.

## Dependências

Esta entrega não utiliza gerenciador de pacotes, framework, CDN ou serviço externo. Todos os recursos necessários estão nesta pasta.
