# Etapa 1: correções rápidas, digitação e sessão

## Como verificar

```bash
npm test          # regras de negócio (node:test, sem dependências novas)
npm run build
# Sessão de ponta a ponta, com o Supabase simulado (requer Playwright):
VITE_SUPABASE_URL=https://mock.supabase.co VITE_SUPABASE_ANON_KEY=anon-teste npx vite --port 5173
npm run test:e2e
```

Migração nova: `supabase/migrations/20261105000008_modo_erros_turma.sql` (só
adiciona a coluna opcional `turmas.modo_erros`). O site funciona sem ela;
sem a migração, o professor só não consegue fixar o modo de erros da turma.

## Métricas (`js/digitacao/metricas.js`, limites em `js/digitacao/config.js`)

| Métrica | Fórmula | Amostra mínima |
| --- | --- | --- |
| Precisão | teclas corretas ÷ teclas digitadas (inclui as corrigidas; espaço conta; Backspace não) | 10 teclas, senão "—" |
| WPM líquido | (caracteres corretos no texto final ÷ 5) ÷ minutos | n/a |
| WPM bruto | (teclas digitadas ÷ 5) ÷ minutos | n/a |
| Consistência | 100 − CV × 100 dos intervalos entre teclas; pausas > 2 s descartadas | 15 intervalos, senão "—" |

O que estava errado:
- **Consistência 0%**: era calculada sobre o WPM de cada segundo. Os segundos
  parados entravam como 0 e o CV passava de 100%.
- **Precisão 22% em 5 s**: as letras omitidas (espaço antes do fim da
  palavra) entravam todas no denominador. Agora o espaço antecipado conta
  como **um** erro.
- **WPM líquido inflado**: uma letra certa apagada e redigitada contava duas vezes.
- Ao voltar para uma palavra pulada, as letras omitidas sumiam das
  estatísticas. Agora erro digitado nunca é apagado (vira "corrigido").

## Modos de erro (`js/digitacao/motor.js`)

- **Seguir (fluxo)**: padrão em Médio e Avançado. O erro avança e fica em
  vermelho. Backspace volta na palavra e, se a anterior tiver erro, volta
  para ela, só uma palavra.
- **Corrigir antes de avançar**: padrão em Fácil e nos níveis 1–2 da trilha.
  A tecla errada pisca e não avança. Após 3 erros seguidos aparece "Seguir
  mesmo assim / Tentar de novo".
- O professor fixa o modo por turma (Turmas → Editar → "Erros na
  digitação"). Nas atividades dessa turma o seletor fica travado.

Efeito no banco: `resultados.precisao` segue a fórmula nova, então a regra
de conclusão (> 85%) passa a ver a precisão sem a distorção das omitidas.

## Sessão (`js/sessao/`)

- `regras.js`: decisões puras (destino por papel, `?redirect=` seguro,
  expirada, papel trocado, inatividade). Coberto por `tests/sessao.test.js`.
- `local.js`: sem Supabase. Token salvo?, limpar dados locais, aviso entre
  abas (BroadcastChannel + `storage`), atividade.
- `sessao.js`: valida no servidor (`auth.getUser`), `exigirPapel`,
  `protegerPaginaDeAcesso`, `irParaArea`, `encerrarSessao`.
- `cabecalho.js`: cabeçalho público. O script no `<head>` marca
  `data-sessao` antes da pintura, então não há "flash" de Entrar.

**Para a Etapa 3**: qualquer método novo de entrada (usuário da escola,
vincular Google/e-mail) só precisa abrir a sessão do Supabase Auth e chamar
`irParaArea(perfil)`. Proteção de rota, logout, abas e inatividade já valem.

A segurança dos dados continua na RLS: as políticas usam `auth.uid()` e
`meu_tipo()`, e as RPCs de professor recusam quem não é professor. O guarda
no front é só navegação.

Limites conhecidos:
- Não existe "lembrar de mim" hoje, então não houve o que desmarcar.
- Não existe rota `/criar-conta`. As telas de acesso são `/login.html` e `/cadastro.html`.
- O modo da turma vale nas **atividades** abertas com `?turma=`. A trilha
  usa o padrão por nível (o aluno pode estar em várias turmas).
