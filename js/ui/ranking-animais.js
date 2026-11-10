// js/ui/ranking-animais.js
// Ranking anônimo da turma (RPC ranking_turma, migração 14): cada posição
// do top 5 é um animal, do mais rápido ao mais tranquilo. Nomes, e-mails e
// IDs dos colegas nunca chegam ao navegador; só a marca "você".

export const ANIMAIS = [
  { posicao: 1, animal: 'Guepardo', artigo: 'o', emoji: '🐆', frase: 'Velocidade de ponta, com precisão.' },
  { posicao: 2, animal: 'Lebre', artigo: 'a', emoji: '🐇', frase: 'Ágil e constante.' },
  { posicao: 3, animal: 'Raposa', artigo: 'a', emoji: '🦊', frase: 'Esperta e certeira.' },
  { posicao: 4, animal: 'Cavalo', artigo: 'o', emoji: '🐎', frase: 'Ritmo firme.' },
  { posicao: 5, animal: 'Gato', artigo: 'o', emoji: '🐈', frase: 'Atento a cada tecla.' },
];

const numero = (v) => Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Separa o top 5 e a linha de quem consulta (que pode estar no top 5 ou fora). */
export function organizarRanking(linhas = []) {
  const top = linhas.filter((l) => l.posicao <= 5).sort((a, b) => a.posicao - b.posicao);
  const eu = linhas.find((l) => l.voce) ?? null;
  const participantes = linhas[0]?.participantes ?? 0;
  return { top, eu, participantes };
}

/** HTML do pódio (top 5). `compacto` é a versão do painel inicial. */
export function htmlDoRanking(linhas, { compacto = false } = {}) {
  const { top } = organizarRanking(linhas);
  if (!top.length) return '';
  const itens = top.map((l) => {
    const info = ANIMAIS[l.posicao - 1];
    return `<li class="ranking-animal posicao-${l.posicao}${l.voce ? ' is-you' : ''}">
        <span class="ranking-animal-emoji" aria-hidden="true">${info.emoji}</span>
        <span class="ranking-animal-pos">${l.posicao}º</span>
        <span class="ranking-animal-nome"><strong>${info.animal}${l.voce ? ' <em>· você</em>' : ''}</strong>${compacto ? '' : `<small>${info.frase}</small>`}</span>
        <span class="ranking-animal-pontos"><strong>${numero(l.pontuacao)}</strong><small>pontos</small></span>
        ${compacto ? '' : `<span class="ranking-animal-detalhe">${numero(l.ppm)} WPM · ${numero(l.precisao)}% de precisão</span>`}
      </li>`;
  });
  return `<ol class="ranking-animais${compacto ? ' is-compacto' : ''}" aria-label="Top 5 da turma">${itens.join('')}</ol>`;
}
