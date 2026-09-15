// turmas.js
import { supabase } from './supabaseClient.js';
import { exigirSessao } from './auth.js';

// Gera um código de convite aleatório usando o gerador criptográfico do
// navegador (crypto.getRandomValues) — evita códigos previsíveis, que
// dariam a qualquer um a chance de "adivinhar" o convite de uma turma.
function gerarCodigoConvite(tamanho = 8) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0, I/1 (evita confusão)
  const valores = crypto.getRandomValues(new Uint32Array(tamanho));
  let codigo = '';
  for (let i = 0; i < tamanho; i++) {
    codigo += alfabeto[valores[i] % alfabeto.length];
  }
  return codigo;
}

export async function criarTurma({ nome }) {
  if (!nome || nome.trim().length < 2 || nome.length > 120) {
    throw new Error('Nome da turma inválido (2 a 120 caracteres).');
  }

  const session = await exigirSessao();

  // tenta algumas vezes até bater um código ainda não usado; o UNIQUE do
  // banco é a garantia final contra corrida entre duas criações simultâneas
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = gerarCodigoConvite();
    const { data, error } = await supabase
      .from('turmas')
      .insert({ nome: nome.trim(), codigo_convite: codigo, professor_id: session.user.id })
      .select()
      .single();

    if (!error) return data;
    if (error.code !== '23505') throw new Error(error.message); // 23505 = violação de unicidade
  }
  throw new Error('Não foi possível gerar um código de convite único. Tente novamente.');
}

export async function entrarNaTurma({ codigoConvite }) {
  if (!codigoConvite || codigoConvite.trim().length === 0 || codigoConvite.length > 20) {
    throw new Error('Código de convite inválido.');
  }

  const session = await exigirSessao();
  const codigo = codigoConvite.trim().toUpperCase();

  const { data: turma, error: erroTurma } = await supabase
    .from('turmas')
    .select('id')
    .eq('codigo_convite', codigo)
    .single();

  if (erroTurma || !turma) throw new Error('Código de convite não encontrado.');

  const { data, error } = await supabase
    .from('matriculas')
    .insert({ aluno_id: session.user.id, turma_id: turma.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Você já está matriculado nessa turma.');
    throw new Error(error.message);
  }
  return data;
}

export async function listarMinhasTurmas() {
  await exigirSessao();
  // a RLS já filtra: professor vê as suas, aluno vê as que está matriculado
  const { data, error } = await supabase
    .from('turmas')
    .select('id, nome, codigo_convite, criado_em')
    .order('criado_em', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function listarAlunosDaTurma(turmaId) {
  if (!Number.isInteger(turmaId)) throw new Error('Turma inválida.');
  await exigirSessao();

  const { data, error } = await supabase
    .from('matriculas')
    .select('id, ativa, entrou_em, aluno:usuarios(id, nome, email)')
    .eq('turma_id', turmaId);

  if (error) throw new Error(error.message);
  return data;
}
