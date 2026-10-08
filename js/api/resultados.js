// js/api/resultados.js
import { supabase } from '../supabaseClient.js';

/**
 * Chamado ao final de uma sessão de digitação (treinamento.html).
 * O gatilho handle_novo_resultado (schema.sql) já atualiza XP, nível
 * e sequência de dias sozinho — não precisa fazer isso aqui.
 */
export async function registrarResultado({ exercicio_id, ppm, precisao, acertos, erros, tempo_seg }) {
  const { data: sessao } = await supabase.auth.getSession();
  const alunoId = sessao.session?.user.id;
  if (!alunoId) throw new Error('Sessão expirada. Entre novamente.');

  const { data, error } = await supabase
    .from('resultados')
    .insert({ aluno_id: alunoId, exercicio_id, ppm, precisao, acertos, erros, tempo_seg })
    .select()
    .single();
  if (error) throw error;

  await verificarNovasConquistas({ ppm, precisao, erros });
  return data;
}

/** Aluno: histórico de sessões (resultados.html). */
export async function listarMeusResultados({ limite = 20 } = {}) {
  const { data, error } = await supabase
    .from('resultados')
    .select('id, ppm, precisao, acertos, erros, tempo_seg, criado_em, exercicios(titulo, turma_id)')
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}

/**
 * Confere condições simples de conquista no cliente e chama a RPC de
 * liberação (a tabela usuario_conquistas não aceita insert direto do
 * front — só leitura, por segurança).
 * Isso é best-effort de UX; a fonte da verdade de "quantas sessões",
 * "total de caracteres" etc. deveria virar uma function no banco se
 * o critério ficar mais complexo do que os exemplos abaixo.
 */
async function verificarNovasConquistas({ ppm, precisao, erros }) {
  const candidatas = [];
  if (ppm >= 40) candidatas.push('digitador_veloz');
  if (precisao >= 98) candidatas.push('precisao_em_foco');
  if (erros === 0) candidatas.push('sem_erros');
  if (ppm >= 80) candidatas.push('mestre_80wpm');

  for (const codigo of candidatas) {
    await supabase.rpc('liberar_conquista', { p_codigo: codigo }).catch(() => {});
  }
}
