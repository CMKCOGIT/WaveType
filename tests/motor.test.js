import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMotor } from '../js/digitacao/motor.js';

function digitarTexto(motor, texto, inicio = 0, passo = 200) {
  let t = inicio;
  for (const c of texto) {
    motor.digitar(c, t);
    t += passo;
  }
  return t;
}

test('fluxo: erro avança o cursor e fica marcado', () => {
  const m = criarMotor({ palavras: ['casa', 'mesa'] });
  digitarTexto(m, 'cxsa');
  assert.equal(m.letraAtual, 4);
  assert.equal(m.estadoLetra(0, 1), 'incorreta');
  const e = m.estatisticas(60);
  assert.equal(e.erros, 1);
  assert.equal(e.teclas, 4);
  assert.equal(e.teclasCorretas, 3);
});

test('fluxo: corrigir com backspace não apaga o erro das estatísticas', () => {
  const m = criarMotor({ palavras: ['casa', 'mesa'] });
  digitarTexto(m, 'cx');
  m.apagar(1000);
  digitarTexto(m, 'asa ', 1200);
  const e = m.estatisticas(60);
  assert.equal(e.erros, 1);
  assert.equal(e.errosCorrigidos, 1);
  assert.equal(e.errosNaoCorrigidos, 0);
  assert.equal(e.teclas, 6); // c x a s a espaço (Backspace não conta)
  assert.equal(e.teclasCorretas, 5);
  // Texto final correto: 4 letras + 1 espaço
  assert.equal(e.caracteresCorretos, 5);
  assert.equal(m.estadoLetra(0, 1), 'correta');
});

test('fluxo: letra apagada e redigitada não conta duas vezes no WPM líquido', () => {
  const m = criarMotor({ palavras: ['casa'] });
  digitarTexto(m, 'ca');
  m.apagar(500);
  m.apagar(600);
  digitarTexto(m, 'casa', 700);
  const e = m.estatisticas(60);
  assert.equal(e.caracteresCorretos, 4);
  assert.equal(e.teclasCorretas, 6);
});

test('fluxo: espaço antecipado conta UM erro, não as letras que faltaram', () => {
  const m = criarMotor({ palavras: ['aprendizado', 'casa'] });
  digitarTexto(m, 'a ');
  const e = m.estatisticas(60);
  assert.equal(e.erros, 1);
  assert.equal(e.teclas, 2);
  assert.equal(e.omitidas, 10);
  assert.equal(m.palavraAtual, 1);
  assert.equal(m.estadoLetra(0, 5), 'omitida');
  assert.ok(e.palavrasProblema.includes('aprendizado'));
});

test('fluxo: precisão não fica absurda com poucas teclas', () => {
  const m = criarMotor({ palavras: ['aprendizado', 'casa'] });
  digitarTexto(m, 'a c');
  assert.equal(m.estatisticas(5).precisao, null); // amostra pequena: mostra "—"
});

test('fluxo: backspace volta para a palavra anterior com erro', () => {
  const m = criarMotor({ palavras: ['casa', 'mesa', 'bola'] });
  digitarTexto(m, 'cas ');
  assert.equal(m.palavraAtual, 1);
  assert.equal(m.apagar(1000).tipo, 'voltou-palavra');
  assert.equal(m.palavraAtual, 0);
  assert.equal(m.letraAtual, 3);
  assert.equal(m.estadoLetra(0, 3), 'pendente'); // deixa de ser "omitida"
  digitarTexto(m, 'a ', 1200);
  const e = m.estatisticas(60);
  assert.equal(e.erros, 1); // o espaço antecipado continua contado
  assert.equal(e.errosCorrigidos, 1);
  assert.equal(e.omitidas, 0);
});

test('fluxo: não volta para palavra anterior sem erro', () => {
  const m = criarMotor({ palavras: ['casa', 'mesa'] });
  digitarTexto(m, 'casa ');
  assert.equal(m.apagar(2000).tipo, 'ignorada');
  assert.equal(m.palavraAtual, 1);
});

test('fluxo: não volta além da palavra anterior', () => {
  const m = criarMotor({ palavras: ['casa', 'mesa', 'bola'] });
  digitarTexto(m, 'cxsa mxsa ');
  assert.equal(m.palavraAtual, 2);
  assert.equal(m.apagar(5000).tipo, 'voltou-palavra');
  for (let i = 0; i < 4; i += 1) m.apagar(5100 + i);
  assert.equal(m.letraAtual, 0);
  assert.equal(m.apagar(6000).tipo, 'ignorada');
  assert.equal(m.palavraAtual, 1);
});

test('fluxo: letras a mais contam como erro e podem ser apagadas', () => {
  const m = criarMotor({ palavras: ['sol', 'mar'] });
  digitarTexto(m, 'sola');
  assert.equal(m.extras(0), 1);
  m.apagar(1000);
  assert.equal(m.extras(0), 0);
  const e = m.estatisticas(60);
  assert.equal(e.erros, 1);
  assert.equal(e.errosCorrigidos, 1);
});

test('fluxo: espaço no início da palavra é ignorado', () => {
  const m = criarMotor({ palavras: ['sol'] });
  assert.equal(m.espaco(0).tipo, 'ignorada');
  assert.equal(m.teclas, 0);
});

test('correção: tecla errada não avança e conta erro', () => {
  const m = criarMotor({ palavras: ['casa'], modo: 'correcao' });
  m.digitar('c', 0);
  const r = m.digitar('x', 100);
  assert.equal(r.tipo, 'bloqueada');
  assert.equal(m.letraAtual, 1);
  m.digitar('a', 200);
  assert.equal(m.letraAtual, 2);
  const e = m.estatisticas(60);
  assert.equal(e.erros, 1);
  assert.equal(e.teclas, 3);
  assert.equal(e.teclasCorretas, 2);
  assert.equal(e.errosCorrigidos, 1);
});

test('correção: espaço antes do fim da palavra é bloqueado', () => {
  const m = criarMotor({ palavras: ['casa', 'mesa'], modo: 'correcao' });
  digitarTexto(m, 'ca');
  assert.equal(m.espaco(500).tipo, 'bloqueada');
  assert.equal(m.palavraAtual, 0);
  digitarTexto(m, 'sa ', 600);
  assert.equal(m.palavraAtual, 1);
});

test('correção: depois de 3 erros seguidos sugere seguir; seguir marca erro não corrigido', () => {
  const m = criarMotor({ palavras: ['casa'], modo: 'correcao', errosParaSugerir: 3 });
  m.digitar('c', 0);
  assert.equal(m.digitar('x', 1).sugerirSeguir, false);
  assert.equal(m.digitar('x', 2).sugerirSeguir, false);
  assert.equal(m.digitar('x', 3).sugerirSeguir, true);
  m.seguirMesmoAssim();
  assert.equal(m.letraAtual, 2);
  assert.equal(m.estadoLetra(0, 1), 'incorreta');
  const e = m.estatisticas(60);
  assert.equal(e.erros, 3);
  assert.equal(e.errosNaoCorrigidos, 1);
  assert.equal(e.errosCorrigidos, 2);
});

test('correção: tentar de novo zera a contagem de erros seguidos', () => {
  const m = criarMotor({ palavras: ['casa'], modo: 'correcao', errosParaSugerir: 2 });
  m.digitar('x', 0);
  m.digitar('x', 1);
  m.tentarDeNovo();
  assert.equal(m.errosSeguidos, 0);
  assert.equal(m.digitar('x', 2).sugerirSeguir, false);
});

test('correção: não volta para a palavra anterior', () => {
  const m = criarMotor({ palavras: ['sol', 'mar'], modo: 'correcao' });
  digitarTexto(m, 'sol ');
  assert.equal(m.apagar(1000).tipo, 'ignorada');
});

test('teclas que mais erra ficam ordenadas', () => {
  const m = criarMotor({ palavras: ['aaa', 'bab'] });
  digitarTexto(m, 'xxx bxb');
  const [primeira] = m.estatisticas(60).errosPorTecla;
  assert.deepEqual(primeira, ['a', 4]);
});

test('terminou: detecta fim do texto fixo', () => {
  const m = criarMotor({ palavras: ['sol', 'mar'] });
  digitarTexto(m, 'sol ma');
  assert.equal(m.terminou(), false);
  m.digitar('r', 2000);
  assert.equal(m.terminou(), true);
});

test('consistência usa os intervalos entre teclas', () => {
  const m = criarMotor({ palavras: Array.from({ length: 10 }, () => 'casa') });
  digitarTexto(m, 'casa casa casa casa ', 0, 150);
  assert.equal(m.estatisticas(10).consistencia, 100);
});
