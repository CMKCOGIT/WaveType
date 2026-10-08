// js/pages/usuario-treinar.js
import { exigirPapel } from '../auth.js';
import { registrarResultado } from '../api/resultados.js';

// Escuta primeiro, para não perder nenhum resultado
document.addEventListener('wavetype:resultado', async (evento) => {
  const aviso = document.querySelector('[data-salvo]');
  try {
    await registrarResultado({ exercicio_id: null, ...evento.detail });
    aviso.textContent = 'Resultado salvo no seu histórico.';
  } catch (erro) {
    console.error('Falha ao salvar o resultado:', erro);
    aviso.textContent = 'Não foi possível salvar este resultado.';
  }
});

exigirPapel('usuario'); // se não estiver logado ou não for usuário, redireciona