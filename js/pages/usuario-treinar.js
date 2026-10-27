// js/pages/usuario-treinar.js
import { exigirPapel } from '../auth.js';
import { registrarResultado } from '../api/resultados.js';
import { buscarExercicio, listarExercicios } from '../api/exercicios.js';
import { NIVEIS } from '../exercicios-dados.js';

// treinar.html?id=...  -> modo exercício. Sem id -> prática livre (como antes).
const idDoExercicio = new URLSearchParams(location.search).get('id');
let exercicio = null;
const carregado = carregarExercicio();

const DESTINO_PADRAO = { href: 'exercicios.html', texto: 'Continuar exercícios' };

// Descobre para onde o botão do resultado deve levar:
// - se ainda há exercício na mesma etapa (grupo de 5): o próximo da ordem;
// - se era o último da etapa: volta para a lista de exercícios.
async function descobrirDestino() {
  if (!exercicio) return DESTINO_PADRAO;

  const nivel = NIVEIS.find((n) => n.nivel === Number(exercicio.nivel));
  const etapa = nivel?.etapas?.find(
    (e) => exercicio.ordem >= e.inicio && exercicio.ordem <= e.fim
  );
  if (!etapa) return DESTINO_PADRAO;

  // Último exercício da etapa: etapa concluída.
  if (exercicio.ordem >= etapa.fim) {
    return { href: 'exercicios.html', texto: 'Concluir etapa' };
  }

  try {
    const lista = await listarExercicios();
    const proximo = lista.find(
      (e) => e.nivel === Number(exercicio.nivel) && e.ordem === exercicio.ordem + 1
    );
    if (proximo) {
      const posicao = proximo.ordem - etapa.inicio + 1;
      const total = etapa.fim - etapa.inicio + 1;
      return {
        href: `treinar.html?id=${encodeURIComponent(proximo.id)}`,
        texto: `Próximo exercício (${posicao}/${total})`,
      };
    }
  } catch (erro) {
    console.error('Falha ao buscar o próximo exercício:', erro);
  }
  return DESTINO_PADRAO;
}

// Botão do resultado: só aparece no modo exercício e só é liberado depois que
// o resultado foi salvo (assim o progresso já está atualizado quando a pessoa
// chega na próxima tela).
function prepararBotaoContinuar() {
  if (!idDoExercicio) return null;

  let botao = document.querySelector('[data-continuar]');
  if (!botao) {
    botao = document.createElement('a');
    botao.href = 'exercicios.html';
    botao.dataset.continuar = '';
    botao.style.cssText = [
      'display:inline-block',
      'margin-top:16px',
      'padding:10px 20px',
      'border-radius:8px',
      'background:#2563eb',
      'color:#fff',
      'font-weight:600',
      'text-decoration:none',
    ].join(';');
    const painel = document.getElementById('result-panel') ?? document.body;
    painel.append(botao);
  }

  botao.textContent = 'Salvando resultado...';
  botao.removeAttribute('href');
  botao.style.pointerEvents = 'none';
  botao.style.opacity = '0.6';
  return botao;
}

function liberarBotaoContinuar(botao, destino) {
  if (!botao) return;
  botao.href = destino.href;
  botao.textContent = destino.texto;
  botao.style.pointerEvents = '';
  botao.style.opacity = '';
}

// Escuta primeiro, para não perder nenhum resultado
document.addEventListener('wavetype:resultado', async (evento) => {
  const aviso = document.querySelector('[data-salvo]');
  const botao = prepararBotaoContinuar();
  await carregado;
  try {
    await registrarResultado({ ...evento.detail, exercicio_id: exercicio?.id ?? null });
    if (aviso) aviso.textContent = 'Resultado salvo no seu histórico.';
  } catch (erro) {
    console.error('Falha ao salvar o resultado:', erro);
    if (aviso) aviso.textContent = 'Não foi possível salvar este resultado.';
  }
  liberarBotaoContinuar(botao, await descobrirDestino());
});

exigirPapel('usuario'); // se não estiver logado ou não for usuário, redireciona

async function carregarExercicio() {
  if (!idDoExercicio) return;
  const info = document.querySelector('[data-exercicio-info]');
  try {
    exercicio = await buscarExercicio(idDoExercicio);
  } catch (erro) {
    console.error('Falha ao buscar o exercício:', erro);
  }
  if (!exercicio) {
    info.hidden = false;
    info.innerHTML = 'Não encontramos esse exercício. <a href="exercicios.html">Escolher outro</a>.';
    return;
  }
  const nivel = NIVEIS.find((n) => n.nivel === exercicio.nivel);
  info.hidden = false;
  info.innerHTML = '';
  info.append(
    `Exercício: ${nivel ? `Nível ${nivel.nivel} · ` : ''}${exercicio.titulo}. `,
    Object.assign(document.createElement('a'), { href: 'exercicios.html', textContent: 'Trocar exercício' })
  );

  // Entrega o exercício para o motor do teste (js/script.js).
  window.wavetypeExercicio = exercicio;
  document.dispatchEvent(new CustomEvent('wavetype:exercicio', { detail: exercicio }));
}