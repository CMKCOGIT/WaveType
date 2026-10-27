// Use este módulo dentro do JS que já controla o treinamento.html.
// Ele NÃO cria tela nova: só busca o exercício pedido na URL e salva o resultado.
import * as auth from './auth.js';
import { EXEMPLOS } from './exercicios-dados.js';

// ---- AJUSTE AQUI conforme o seu projeto ----
const supabase = auth.supabase;
const TABELA_EXERCICIOS = 'exercicios';  // colunas: id, nivel (1-5), ordem, titulo, texto
const TABELA_RESULTADOS = 'resultados';  // colunas: usuario_id, exercicio_id, ppm, precisao, acertos, erros
// --------------------------------------------

// Lê ?id=... da URL e devolve { id, nivel, ordem, titulo, texto }, ou null se não achar.
export async function obterExercicioDaUrl() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return null;
  const { data, error } = await supabase
    .from(TABELA_EXERCICIOS)
    .select('id, nivel, ordem, titulo, texto')
    .eq('id', id)
    .maybeSingle();
  if (!error && data) return data;
  return EXEMPLOS.find((e) => String(e.id) === id) || null; // só enquanto o banco estiver vazio
}

// Devolve o link do próximo exercício do mesmo nível, ou null se for o último.
export async function linkProximoExercicio(ex) {
  const { data, error } = await supabase
    .from(TABELA_EXERCICIOS)
    .select('id')
    .eq('nivel', ex.nivel).gt('ordem', ex.ordem)
    .order('ordem').limit(1);
  let prox = !error && data?.length ? data[0] : null;
  if (!prox) {
    prox = EXEMPLOS.filter((e) => e.nivel === ex.nivel && e.ordem > ex.ordem)
      .sort((a, b) => a.ordem - b.ordem)[0];
  }
  return prox ? `treinamento.html?id=${encodeURIComponent(prox.id)}` : null;
}

// Salva o resultado. Devolve true se salvou, false se deu erro.
export async function salvarResultado(ex, { ppm, precisao, acertos, erros }) {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return false;
  const { error } = await supabase.from(TABELA_RESULTADOS).insert({
    usuario_id: data.user.id, exercicio_id: ex.id, ppm, precisao, acertos, erros,
  });
  if (error) console.error(error);
  return !error;
}