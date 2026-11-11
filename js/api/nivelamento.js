// js/api/nivelamento.js
// Teste de nivelamento e sugestões do treino (migração 20261105000010).
import { supabase } from '../supabaseClient.js';
import { ULTIMO_NIVEL } from '../exercicios-dados.js';
import { traduzErro } from '../auth.js';
import { licaoRecomendadaAtual } from '../nivelamento/avaliacao.js';

const PENDENTE = 'wavetype_nivelamento_pendente';

function registro(recomendacao, resumos) {
  return {
    nivel: recomendacao.nivel,
    licao_nivel: recomendacao.licao.nivel,
    licao_ordem: recomendacao.licao.ordem,
    precisao_media: recomendacao.precisaoMedia,
    ppm_medio: recomendacao.ppmMedio,
    teclas_frageis: recomendacao.teclasFrageis,
    detalhes: { etapas: resumos, parouEm: recomendacao.parouEm, regiaoMaisFragil: recomendacao.regiaoMaisFragil },
  };
}

export async function salvarNivelamento(recomendacao, resumos) {
  const { data: sessao } = await supabase.auth.getSession();
  const usuarioId = sessao.session?.user.id;
  if (!usuarioId) throw new Error('Sessão expirada. Entre novamente.');
  const { error } = await supabase.from('nivelamentos').insert({ usuario_id: usuarioId, ...registro(recomendacao, resumos) });
  if (error) throw traduzErro(error);
}

/** Visitante: guarda o resultado neste navegador para salvar depois de entrar. */
export function guardarNivelamentoPendente(recomendacao, resumos) {
  try {
    localStorage.setItem(PENDENTE, JSON.stringify({ em: Date.now(), recomendacao, resumos }));
  } catch {
    /* sem localStorage */
  }
}

/** Depois de entrar/criar conta: envia o resultado guardado (até 7 dias). */
export async function enviarNivelamentoPendente() {
  let pendente = null;
  try {
    pendente = JSON.parse(localStorage.getItem(PENDENTE) || 'null');
  } catch {
    pendente = null;
  }
  if (!pendente) return false;
  try {
    localStorage.removeItem(PENDENTE);
  } catch {
    /* nada */
  }
  if (Date.now() - pendente.em > 7 * 24 * 3600 * 1000) return false;
  try {
    await salvarNivelamento(pendente.recomendacao, pendente.resumos);
    return true;
  } catch (erro) {
    console.warn('Não foi possível salvar o nivelamento pendente:', erro);
    return false;
  }
}

export async function ultimoNivelamento() {
  const { data, error } = await supabase
    .from('nivelamentos')
    .select('nivel, licao_nivel, licao_ordem, teclas_frageis, criado_em')
    .order('criado_em', { ascending: false })
    .limit(1);
  if (error) {
    console.warn('Nivelamento indisponível (migração 10 aplicada?):', error.message);
    return null;
  }
  return data?.[0] ?? null;
}

async function minhasDecisoes(desde) {
  let consulta = supabase.from('sugestoes_nivel').select('decisao, recomendado_nivel, recomendado_ordem, criado_em').order('criado_em');
  if (desde) consulta = consulta.gte('criado_em', desde);
  const { data, error } = await consulta;
  if (error) return [];
  return (data ?? []).map((d) => ({ decisao: d.decisao, recomendado: { nivel: d.recomendado_nivel, ordem: d.recomendado_ordem } }));
}

/** Lição recomendada agora: último nivelamento ajustado pelas decisões depois dele. */
export async function licaoRecomendada() {
  const ultimo = await ultimoNivelamento();
  if (!ultimo) return null;
  const decisoes = await minhasDecisoes(ultimo.criado_em);
  const atual = licaoRecomendadaAtual({ nivel: ultimo.licao_nivel, ordem: ultimo.licao_ordem }, decisoes);
  // Testes antigos podiam recomendar o Nível 6 (aposentado): vai para os textos completos do Nível 5.
  return atual && atual.nivel > ULTIMO_NIVEL ? { ...atual, nivel: ULTIMO_NIVEL, ordem: 16 } : atual;
}

export async function registrarDecisaoDeSugestao({ exercicioId, recomendado, decisao }) {
  const { data: sessao } = await supabase.auth.getSession();
  const usuarioId = sessao.session?.user.id;
  if (!usuarioId) return;
  const { error } = await supabase.from('sugestoes_nivel').insert({
    usuario_id: usuarioId,
    exercicio_id: exercicioId ?? null,
    recomendado_nivel: recomendado?.nivel ?? null,
    recomendado_ordem: recomendado?.ordem ?? null,
    decisao,
  });
  if (error) console.warn('Não foi possível registrar a decisão da sugestão:', error.message);
}

/** Professor: nível de partida e sugestões aceitas/ignoradas dos alunos. */
export async function nivelamentoDosAlunos(ids) {
  const vazio = { niveis: new Map(), sugestoes: new Map() };
  if (!ids.length) return vazio;
  const [niveis, sugestoes] = await Promise.all([
    supabase.from('nivelamentos').select('usuario_id, nivel, licao_nivel, licao_ordem, criado_em').in('usuario_id', ids).order('criado_em', { ascending: false }),
    supabase.from('sugestoes_nivel').select('usuario_id, decisao').in('usuario_id', ids),
  ]);
  if (niveis.error || sugestoes.error) return vazio;
  const mapaNiveis = new Map();
  for (const n of niveis.data ?? []) if (!mapaNiveis.has(n.usuario_id)) mapaNiveis.set(n.usuario_id, n);
  const mapaSugestoes = new Map();
  for (const s of sugestoes.data ?? []) {
    const atual = mapaSugestoes.get(s.usuario_id) ?? { aceitou: 0, ignorou: 0 };
    atual[s.decisao] += 1;
    mapaSugestoes.set(s.usuario_id, atual);
  }
  return { niveis: mapaNiveis, sugestoes: mapaSugestoes };
}
