import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loginBase,
  normalizarNome,
  resolverColisao,
  sugerirLogins,
  gerarSenha,
  nomesDaLista,
  PALAVRAS_SENHA,
  LOGIN_VALIDO,
} from '../js/contas/credenciais.js';

test('usuário derivado do nome: minúsculas, sem acento, com pontos', () => {
  assert.equal(loginBase('Maria Silva Santos'), 'maria.silva.santos');
  assert.equal(loginBase('  JOSÉ   da Conceição  '), 'jose.conceicao');
  assert.equal(loginBase("João D'Ávila"), 'joao.d.avila');
});

test('nomes longos: primeiro nome + dois últimos sobrenomes', () => {
  assert.equal(loginBase('Ana Beatriz Ferreira Lima Costa'), 'ana.lima.costa');
});

test('nome de uma palavra só continua válido', () => {
  assert.equal(loginBase('Lu'), 'lu.aluno');
  assert.match(loginBase('Pedro'), LOGIN_VALIDO);
});

test('todo usuário gerado passa na regra do banco', () => {
  for (const nome of ['Ícaro Ñúñez', 'Zoë 2º Ano', 'Maria-Clara Souza', 'A B']) {
    const login = loginBase(nome);
    assert.match(login, LOGIN_VALIDO, nome);
    assert.ok(login.length >= 3 && login.length <= 50, nome);
  }
});

test('colisão ganha sufixo numérico (igual ao banco)', () => {
  assert.equal(resolverColisao('maria.silva', []), 'maria.silva');
  assert.equal(resolverColisao('maria.silva', ['maria.silva']), 'maria.silva2');
  assert.equal(resolverColisao('maria.silva', ['maria.silva', 'maria.silva2']), 'maria.silva3');
});

test('lote com nomes iguais não repete usuário', () => {
  const lote = sugerirLogins(['Maria Silva', 'Maria Silva', 'Maria  Silva'], ['maria.silva']);
  assert.deepEqual(lote.map((l) => l.login), ['maria.silva2', 'maria.silva3', 'maria.silva4']);
});

test('senha inicial: palavra simples + 3 algarismos sem 0 e 1', () => {
  for (let i = 0; i < 200; i += 1) {
    const senha = gerarSenha();
    assert.match(senha, /^[a-z]+[2-9]{3}$/);
    assert.ok(PALAVRAS_SENHA.includes(senha.replace(/\d+$/, '')));
  }
});

test('senha com gerador fixo é previsível (para teste)', () => {
  assert.equal(gerarSenha({ aleatorio: () => 0 }), `${PALAVRAS_SENHA[0]}222`);
});

test('palavras da senha não têm acento nem caractere especial', () => {
  for (const palavra of PALAVRAS_SENHA) assert.match(palavra, /^[a-z]+$/);
});

test('lista colada: um nome por linha, sem vazias nem repetidas', () => {
  assert.deepEqual(nomesDaLista('Maria Silva\n\n  João  Souza \nmaria silva\nx'), ['Maria Silva', 'João Souza']);
  assert.equal(normalizarNome('Ação'), 'acao');
});

test('troca de usuário: normaliza o que o professor digitou', async () => {
  const { normalizarLoginEscolhido } = await import('../js/contas/credenciais.js');
  assert.equal(normalizarLoginEscolhido('Maria Silva'), 'maria.silva');
  assert.equal(normalizarLoginEscolhido(' maria..silva_santos '), 'maria.silva.santos');
  assert.equal(normalizarLoginEscolhido('João-Pedro'), 'joao.pedro');
  assert.equal(normalizarLoginEscolhido('ab'), '');
  assert.equal(normalizarLoginEscolhido('!!!'), '');
});
