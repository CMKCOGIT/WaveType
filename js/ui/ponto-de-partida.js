// js/ui/ponto-de-partida.js
// Cartão "Seu ponto de partida" na página inicial da área logada:
// envia o nivelamento feito como visitante (se houver) e mostra a lição
// recomendada, ou convida a fazer o teste de nivelamento.
import { enviarNivelamentoPendente, licaoRecomendada } from '../api/nivelamento.js';
import { listarExercicios } from '../api/exercicios.js';
import { NIVEIS } from '../exercicios-dados.js';

export async function mostrarPontoDePartida() {
  const cabecalho = document.querySelector('.app-main .page-heading');
  if (!cabecalho) return;
  const acabouDeSalvar = await enviarNivelamentoPendente();
  const licao = await licaoRecomendada();

  const cartao = document.createElement('section');
  cartao.className = 'panel panel-pad ponto-partida';
  cartao.setAttribute('aria-labelledby', 'titulo-ponto-partida');
  if (!licao) {
    cartao.innerHTML = `<div class="panel-title"><div><h2 id="titulo-ponto-partida">Não sabe por onde começar?</h2>
      <p>Faça o teste de nivelamento: em 2 a 4 minutos ele mostra o melhor ponto de partida na trilha.</p></div>
      <a class="button secondary" href="../../nivelamento.html">Testar meu nível</a></div>`;
  } else {
    const nivel = NIVEIS.find((n) => n.nivel === licao.nivel);
    const exercicio = (await listarExercicios().catch(() => [])).find((e) => e.nivel === licao.nivel && e.ordem === licao.ordem);
    cartao.innerHTML = `<div class="panel-title"><div><h2 id="titulo-ponto-partida">${acabouDeSalvar ? 'Nivelamento salvo! ' : ''}Seu ponto de partida</h2>
      <p>Nível ${licao.nivel}${nivel ? ` · ${nivel.titulo}` : ''}, lição ${licao.ordem}. Recomendado pelo seu teste de nivelamento.</p></div>
      <div class="row-actions">${exercicio ? `<a class="button" href="treinar.html?id=${exercicio.id}">Treinar a lição recomendada</a>` : ''}<a class="button secondary" href="../../nivelamento.html">Refazer o teste</a></div></div>`;
  }
  cabecalho.after(cartao);
}
