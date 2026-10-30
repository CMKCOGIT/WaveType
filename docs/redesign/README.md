# Redesenho visual do WaveType

| Documento | Conteúdo |
| --- | --- |
| [00-auditoria.md](00-auditoria.md) | Fase 0: mapa do projeto, identidade, contrato com o JS, linha de base e problemas |
| [01-tokens.md](01-tokens.md) | Guia de tokens (cores, contraste, raio, sombra, movimento) |
| [02-componentes.md](02-componentes.md) | Catálogo de componentes e o que mudou em cada um |
| [03-animacoes.md](03-animacoes.md) | Catálogo de animações e como desligar |
| [04-relatorio-final.md](04-relatorio-final.md) | Relatório final: métricas antes/depois, checklist de não-regressão e itens não executados |

- `capturas/antes/` e `capturas/depois/`: capturas em 375, 768 e 1280 px, os modos de tema e acessibilidade, `metricas.json` e o vídeo `hero-e-teste.webm`.
- `evidencias/`: Lighthouse, INP, checklist e saída da suíte e2e.
- `ferramentas/`: scripts usados nas medições (Playwright com o Supabase simulado). Use `node <script> <url-base>`, com o build servido por `npx vite preview`.

## Estrutura do CSS

Cada página carrega um único arquivo de entrada, que importa o CSS antigo e depois as camadas do redesenho:

| Entrada | Páginas | Importa |
| --- | --- | --- |
| `css/redesign/teste.css` | index | `style.css`, tokens, typing, site, motion |
| `css/redesign/publico.css` | escolas, como funciona, sobre | `style.css`, tokens, site, motion |
| `css/redesign/plataforma.css` | login, cadastro, senhas e área logada | `platform.css`, tokens, app, motion |
| `css/redesign/treino.css` | `app/*/treinar.html` | `platform.css`, `style.css`, tokens, typing, app, motion |
| `css/redesign/trilha.css` | `app/*/exercicios.html` (usuário e aluno) | `platform.css`, `exercicios.css`, tokens, app, motion |
