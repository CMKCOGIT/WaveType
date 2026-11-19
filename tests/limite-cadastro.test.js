import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// sessionStorage simples para o Node
const memoria = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
};
const { esperaParaEnviar, registrarEnvio, mensagemDeEspera, ENVIOS_POR_MINUTO } = await import('../js/contas/limite-cadastro.js');

beforeEach(() => memoria.clear());

test('sem envios recentes, pode enviar', () => {
  assert.equal(esperaParaEnviar(1_000_000), 0);
});

test('clique duplo: espera curta entre um envio e outro', () => {
  registrarEnvio(1_000_000);
  assert.equal(esperaParaEnviar(1_000_500), 1);
  assert.equal(esperaParaEnviar(1_001_100), 0);
});

test('50 envios no minuto: o 51º espera até o mais antigo sair da janela', () => {
  assert.equal(ENVIOS_POR_MINUTO, 50);
  const inicio = 1_000_000;
  for (let i = 0; i < ENVIOS_POR_MINUTO; i += 1) registrarEnvio(inicio + i * 1000);
  const agora = inicio + 52_000;
  assert.equal(esperaParaEnviar(agora), 8);
  assert.equal(esperaParaEnviar(inicio + 60_001), 0);
});

test('mensagem no singular e no plural', () => {
  assert.match(mensagemDeEspera(1), /1 segundo e/);
  assert.match(mensagemDeEspera(12), /12 segundos/);
});
