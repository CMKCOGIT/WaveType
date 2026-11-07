# 03 · Motor de digitação e métricas

O teste de digitação é o coração da WaveType. Ele é dividido em duas partes:

| Parte | Arquivo | Tem DOM? | Testado por |
| --- | --- | :-: | --- |
| **Motor** (estado, regras de contagem) | `js/digitacao/motor.js` | Não | `tests/motor.test.js` |
| **Métricas** (fórmulas) | `js/digitacao/metricas.js` | Não | `tests/metricas.test.js` |
| **Configuração** (limites e modos) | `js/digitacao/config.js` | Não | — |
| **Interface** (palavras, cursor, cronômetro, gráfico, diagnóstico) | `js/script.js` | Sim | e2e |

A mesma combinação é usada no teste público (`index.html`), no treino da
área logada (`treinar.html`) e no nivelamento (`nivelamento.html`, sempre em
modo fluxo).

## API do motor

```js
import { criarMotor } from './digitacao/motor.js';

const motor = criarMotor({
  palavras: ['casa', 'mesa'],   // lista inicial (pode crescer com adicionarPalavras)
  modo: 'fluxo',                // 'fluxo' | 'correcao'
  errosParaSugerir: 3,          // só no modo correção
});

motor.digitar('c', performance.now());  // → { tipo: 'correta' | 'errada' | 'extra' | 'bloqueada', ... }
motor.espaco(t);                        // → { tipo: 'avancou' | 'avancou-com-erro' | 'bloqueada' | 'ignorada' }
motor.apagar(t);                        // → { tipo: 'apagou' | 'voltou-palavra' | 'ignorada', corrigiu? }
motor.seguirMesmoAssim();               // modo correção: aceita o erro e segue
motor.tentarDeNovo();                   // modo correção: zera erros seguidos
motor.estatisticas(segundos);           // → objeto de métricas (abaixo)
```

| Leitura | Retorno |
| --- | --- |
| `estadoLetra(iPalavra, iLetra)` | `'correta' \| 'incorreta' \| 'omitida' \| 'pendente'` |
| `extras(iPalavra)` | Letras digitadas além do fim da palavra |
| `digitadoEm(iPalavra, iLetra)` | Caractere digitado naquela posição |
| `terminou()` | `true` se o texto fixo acabou |
| `temErro(i)` | A palavra `i` tem erro? |
| `palavraAtual`, `letraAtual`, `totalPalavras`, `teclas`, `errosSeguidos` | Getters de estado |

### `estatisticas(segundos)`

| Campo | Significado |
| --- | --- |
| `teclas` | Teclas digitadas (espaço conta, Backspace não) |
| `teclasCorretas` | Teclas corretas no momento em que foram digitadas |
| `erros`, `errosCorrigidos`, `errosNaoCorrigidos` | Todo erro conta; corrigir só muda a categoria |
| `precisao` | Precisão com amostra mínima (null abaixo de 10 teclas) |
| `precisaoBruta` | Precisão sem amostra mínima (usada no resultado salvo) |
| `ppmLiquido`, `ppmBruto` | WPM líquido e bruto |
| `consistencia`, `pausas` | Consistência do ritmo (null com poucos intervalos) e pausas > 2 s |
| `corretasNoTexto`, `incorretas`, `omitidas`, `extras`, `espacosCorretos` | Contagem sobre o texto final |
| `errosPorTecla` | `[[tecla, erros]]` em ordem decrescente |
| `desempenhoPorTecla` | `[[tecla, { tentativas, erros }]]` (base da sugestão por teclas) |
| `palavrasProblema` | Palavras que tiveram erro |

## Regras de contagem

Valem nos dois modos:

- **Todo erro conta no momento em que acontece.** Apagar com Backspace marca o
  erro como "corrigido", mas ele não sai das estatísticas.
- **Espaço antecipado conta como um erro**, não como várias letras omitidas.
- **Letra a mais** (depois do fim da palavra) conta como erro de espaço.
- **Espaço no começo da palavra é ignorado** (evita espaço duplo).
- **Letra apagada e redigitada não conta duas vezes** no WPM líquido.

## Modos de erro

| Modo | Rótulo na tela | Comportamento | Padrão em |
| --- | --- | --- | --- |
| `fluxo` | Seguir (fluxo) | O cursor avança com erro, que fica em vermelho. Backspace volta na palavra e, se a anterior tiver erro, volta para ela (só uma palavra). | Teste médio/avançado; trilha níveis 3–6; atividades |
| `correcao` | Corrigir antes de avançar | A tecla errada pisca e não avança. Após 3 erros seguidos aparece "Seguir mesmo assim / Tentar de novo". | Teste fácil; trilha níveis 1–2 |

**Prioridade** (`modoErrosDoExercicio`): o modo da **turma** (definido pelo
professor) vence; senão, trilha nível ≤ 2 usa correção; senão, fluxo. Com o
modo da turma definido, o seletor fica travado.

## Fórmulas

| Métrica | Fórmula | Amostra mínima |
| --- | --- | --- |
| **Precisão** | teclas corretas ÷ teclas digitadas × 100 | 10 teclas (senão "—") |
| **WPM líquido** | (caracteres corretos no texto final ÷ 5) ÷ minutos | — |
| **WPM bruto** | (teclas digitadas ÷ 5) ÷ minutos | — |
| **Consistência** | 100 − CV × 100, com CV = desvio-padrão ÷ média dos intervalos entre teclas | 15 intervalos (senão "—") |

Detalhes da consistência:

- Intervalos acima de **2 s** são pausas e ficam fora do cálculo.
- Intervalos ≤ 0 são descartados.
- O valor é limitado entre 0 e 100.
- Abaixo de **40%**, o diagnóstico sugere buscar um ritmo mais constante.

Os limites estão em `METRICAS` (`js/digitacao/config.js`). Mudou um número?
Rode `npm test` para ver o efeito.

> **Histórico.** Antes da Etapa 1, a consistência era calculada sobre o WPM de
> cada segundo (segundos parados entravam como 0 e o resultado caía para 0%),
> e as letras omitidas inflavam o denominador da precisão. Ver
> [ETAPA-1.md](../ETAPA-1.md).

## Diagnóstico do resultado (`script.js`)

| Condição (na ordem) | Título exibido |
| --- | --- |
| Precisão < 90% | Priorize precisão antes de acelerar |
| Consistência < 40% | Busque um ritmo mais constante |
| WPM líquido < 30 | Sua base está ficando mais segura |
| Caso contrário | Bom equilíbrio entre ritmo e controle |

Além disso: até 5 teclas com mais erros, até 6 palavras a revisar, contagem de
caracteres (corretos, incorretos, omitidos, extras), gráfico de ritmo (curva
suave) e comparação com o resultado anterior salvo no navegador
(`wavetype_results_v2`, últimos 20).

## Conteúdo do teste

- **Teste público:** dicionários embutidos em `script.js` por nível
  (fácil / médio / avançado), em palavras ou frases, com duração de 15, 30 ou 60 s.
- **Exercício do banco:** o texto vem de `exercicios.texto_referencia`.
  - Na **trilha**, textos curtos ganham rodadas extras até somar pelo menos
    **150 caracteres** (`MIN_CHARS_EXERCICIO`). Cada rodada embaralha as
    palavras; com menos de 4 palavras diferentes, cria combinações novas com as
    mesmas letras (ex.: `asdf jklç` → `dkas fçjl`).
  - Em **atividades**, o texto do professor é digitado uma vez, sem repetição.

## Resultado enviado

No fim do teste, `script.js` dispara `wavetype:resultado` com:

```js
{
  ppm: 38,                 // WPM líquido
  precisao: 94,            // precisão bruta (%)
  acertos: 212,            // teclas corretas
  erros: 13,
  tempo_seg: 45,
  concluiu_texto: true,    // false se o tempo máximo acabou antes do fim
  desempenho_teclas: [...] // para a sugestão de nível
}
```

Na área logada, `pages/treino.js` grava em `resultados` (via
`api/resultados.js`). O banco decide se concluiu.

## Trilha oficial e regras de conclusão

### Estrutura

6 níveis × 4 etapas × 5 exercícios = **120 exercícios**. Os títulos estão em
`js/exercicios-dados.js`; os textos, no banco (`exercicios.nivel_trilha` 1–6 e
`exercicios.ordem` 1–20).

| Nível | Título | Etapas (exercícios 1–5, 6–10, 11–15, 16–20) |
| --- | --- | --- |
| 1 | Posição base | F e J · fileira esquerda · fileira direita · combinação |
| 2 | Fileira superior | F e J · Q W E R T · Y U I O P · fileira completa |
| 3 | Fileira inferior | F e J · Z X C V · B N M · fileira completa |
| 4 | Palavras e frases | Revisão da posição base · palavras curtas · palavras variadas · frases completas |
| 5 | Palavras complexas | Aquecimento · palavras complexas · frases avançadas · textos completos |
| 6 | Extremo | Palavras monstruosas · chuva de acentos · maiúsculas e pontuação · números e símbolos |

### Quando um resultado conclui

Decidido pelo gatilho `resultados_validar` no banco. `js/regras.js` só repete a
regra para explicar o motivo.

| Tipo | Conclui quando |
| --- | --- |
| **Trilha** (níveis 1–6) | Texto terminado **e** `tempo_seg ≤ tempo_limite_seg` **e** precisão **acima** de 85% (85% exatos não concluem). |
| **Atividade de professor** | Texto terminado **e** dentro do tempo definido **e** precisão ≥ meta do professor (se houver). |
| **Prática livre** | Sempre registrada como concluída; não avança a trilha. |

### Tempo máximo da trilha

Calculado no banco por `tempo_limite_trilha(texto, nivel)` e gravado
automaticamente no exercício (gatilho `exercicios_tempo_trilha`):

1. Repete o texto até somar ≥ 150 caracteres (como o front).
2. Divide pelo ritmo exigido no nível:

   | Nível | 1 | 2 | 3 | 4 | 5 | 6 |
   | --- | --- | --- | --- | --- | --- | --- |
   | WPM exigido | 10 | 12 | 14 | 18 | 22 | 25 |

3. Arredonda para cima em múltiplos de 5 s, com mínimo de 30 s.

O cronômetro começa na primeira tecla. Quando o tempo acaba antes do fim do
texto, o resultado é salvo com `concluiu_texto = false`.
