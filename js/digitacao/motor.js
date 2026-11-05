// js/digitacao/motor.js
// Motor do teste de digitação, sem DOM: recebe teclas e guarda o estado.
// O js/script.js desenha a tela a partir dele. Coberto por testes em tests/.
//
// Regras de contagem (valem nos dois modos):
// - Todo erro conta no momento em que a tecla errada é digitada. Apagar com
//   Backspace marca o erro como "corrigido", mas ele continua nas estatísticas.
// - Precisão = teclas corretas ÷ teclas digitadas (espaço conta como tecla;
//   Backspace não). Letras "omitidas" (espaço antes do fim da palavra) não
//   entram no denominador: o espaço antecipado conta como UM erro.
// - WPM líquido = (caracteres corretos no texto ÷ 5) ÷ minutos. Uma letra
//   apagada e redigitada não conta duas vezes.
//
// Modo "fluxo": o cursor avança mesmo com erro. Backspace volta dentro da
// palavra atual e, se a palavra anterior tiver erro, volta para ela, mas não
// além disso. Espaço com palavra incompleta avança e marca a palavra.
//
// Modo "correcao": o cursor só avança com a tecla certa. A tecla errada conta
// como erro e é bloqueada. Depois de N erros seguidos na mesma posição, o
// motor sugere `seguirMesmoAssim()`.
import { DIGITACAO, MODOS_ERRO } from './config.js';
import { consistencia, intervalosEntreTeclas, ppm, precisao } from './metricas.js';

const ESPACO = 'espaço';

function chaveDaTecla(caractere) {
  return caractere === ' ' ? ESPACO : caractere.toLocaleLowerCase('pt-BR');
}

export function criarMotor({ palavras = [], modo = MODOS_ERRO.fluxo, errosParaSugerir = DIGITACAO.errosSeguidosParaSugerir } = {}) {
  const lista = [];
  let atual = 0;
  let fronteira = 0; // maior palavra já alcançada (limite para voltar)
  let teclas = 0;
  let corretas = 0;
  let erros = 0;
  let corrigidos = 0;
  let errosSeguidos = 0;
  let ultimoErrado = null;
  const errosPorTecla = new Map();
  const tentativasPorTecla = new Map(); // vezes em que cada tecla era a esperada
  const palavrasProblema = new Set();
  const tempos = [];

  function adicionarPalavras(novas) {
    novas.forEach((texto) => lista.push({ texto, digitado: [], enviada: false, espacoAntecipado: false }));
  }
  adicionarPalavras(palavras);

  const palavra = (i = atual) => lista[i];

  function registrarTempo(t) {
    if (Number.isFinite(t)) tempos.push(t);
  }

  function contarTentativa(teclaEsperada) {
    const chave = chaveDaTecla(teclaEsperada);
    tentativasPorTecla.set(chave, (tentativasPorTecla.get(chave) || 0) + 1);
  }

  function registrarErro(teclaEsperada, p) {
    erros += 1;
    const chave = chaveDaTecla(teclaEsperada);
    errosPorTecla.set(chave, (errosPorTecla.get(chave) || 0) + 1);
    if (p) palavrasProblema.add(p.texto);
  }

  function temErro(p) {
    if (!p) return false;
    if (p.digitado.length !== p.texto.length) return true;
    return p.digitado.some((c, i) => c !== p.texto[i]);
  }

  // ---------- Teclas ----------

  function digitar(caractere, t) {
    if (caractere === ' ') return espaco(t);
    const p = palavra();
    if (!p) return { tipo: 'ignorada' };
    registrarTempo(t);
    teclas += 1;
    const i = p.digitado.length;
    const esperado = i < p.texto.length ? p.texto[i] : ' ';
    contarTentativa(esperado);

    if (modo === MODOS_ERRO.correcao) {
      if (caractere === esperado) {
        p.digitado.push(caractere);
        corretas += 1;
        errosSeguidos = 0;
        return { tipo: 'correta' };
      }
      // Bloqueada: não entra no texto, então já nasce "corrigida".
      registrarErro(esperado, p);
      corrigidos += 1;
      errosSeguidos += 1;
      ultimoErrado = caractere;
      return { tipo: 'bloqueada', sugerirSeguir: errosSeguidos >= errosParaSugerir, errosSeguidos };
    }

    p.digitado.push(caractere);
    if (i >= p.texto.length) {
      // Letra a mais: a pessoa devia ter apertado espaço.
      registrarErro(' ', p);
      return { tipo: 'extra' };
    }
    if (caractere === esperado) {
      corretas += 1;
      return { tipo: 'correta' };
    }
    registrarErro(esperado, p);
    return { tipo: 'errada' };
  }

  function espaco(t) {
    const p = palavra();
    // Espaço no começo da palavra é ignorado (evita espaços duplos).
    if (!p || p.digitado.length === 0) return { tipo: 'ignorada' };
    const completa = p.digitado.length >= p.texto.length;
    contarTentativa(completa ? ' ' : p.texto[p.digitado.length]);

    if (modo === MODOS_ERRO.correcao && !completa) {
      registrarTempo(t);
      teclas += 1;
      registrarErro(p.texto[p.digitado.length], p);
      corrigidos += 1;
      errosSeguidos += 1;
      ultimoErrado = ' ';
      return { tipo: 'bloqueada', sugerirSeguir: errosSeguidos >= errosParaSugerir, errosSeguidos };
    }

    registrarTempo(t);
    teclas += 1;
    if (completa) corretas += 1;
    else {
      registrarErro(p.texto[p.digitado.length], p);
      p.espacoAntecipado = true;
    }
    if (temErro(p)) palavrasProblema.add(p.texto);
    p.enviada = true;
    atual += 1;
    fronteira = Math.max(fronteira, atual);
    errosSeguidos = 0;
    return { tipo: completa ? 'avancou' : 'avancou-com-erro' };
  }

  function apagar(t) {
    const p = palavra();
    if (!p) return { tipo: 'ignorada' };
    if (p.digitado.length > 0) {
      registrarTempo(t);
      const i = p.digitado.length - 1;
      const removido = p.digitado.pop();
      const eraErro = i >= p.texto.length || removido !== p.texto[i];
      if (eraErro) corrigidos += 1;
      return { tipo: 'apagou', corrigiu: eraErro };
    }
    // Início da palavra: volta para a anterior só no modo fluxo, só uma
    // palavra para trás e só se ela tiver erro.
    if (modo !== MODOS_ERRO.fluxo || atual === 0 || atual < fronteira) return { tipo: 'ignorada' };
    const anterior = palavra(atual - 1);
    if (!temErro(anterior)) return { tipo: 'ignorada' };
    registrarTempo(t);
    if (anterior.espacoAntecipado) corrigidos += 1; // o espaço antecipado foi desfeito
    anterior.enviada = false;
    anterior.espacoAntecipado = false;
    atual -= 1;
    return { tipo: 'voltou-palavra' };
  }

  /** Modo correção: aceita a posição atual como erro e segue. */
  function seguirMesmoAssim() {
    const p = palavra();
    if (modo !== MODOS_ERRO.correcao || !p || errosSeguidos === 0) return { tipo: 'ignorada' };
    errosSeguidos = 0;
    corrigidos = Math.max(0, corrigidos - 1); // o último erro fica sem correção
    if (p.digitado.length >= p.texto.length) {
      // Travou no espaço depois da palavra: avança de palavra.
      p.enviada = true;
      atual += 1;
      fronteira = Math.max(fronteira, atual);
      return { tipo: 'avancou-com-erro' };
    }
    const esperado = p.texto[p.digitado.length];
    p.digitado.push(ultimoErrado && ultimoErrado !== esperado && ultimoErrado !== ' ' ? ultimoErrado : ' ');
    palavrasProblema.add(p.texto);
    return { tipo: 'errada' };
  }

  /** Modo correção: zera a contagem de erros seguidos ("tentar de novo"). */
  function tentarDeNovo() {
    errosSeguidos = 0;
  }

  // ---------- Leitura ----------

  function estadoLetra(iPalavra, iLetra) {
    const p = palavra(iPalavra);
    if (!p) return 'pendente';
    if (iLetra < p.digitado.length) return p.digitado[iLetra] === p.texto[iLetra] ? 'correta' : 'incorreta';
    return p.enviada ? 'omitida' : 'pendente';
  }

  function extras(iPalavra) {
    const p = palavra(iPalavra);
    return p ? Math.max(0, p.digitado.length - p.texto.length) : 0;
  }

  function digitadoEm(iPalavra, iLetra) {
    return palavra(iPalavra)?.digitado[iLetra];
  }

  /** Último texto terminado (para exercícios de texto fixo). */
  function terminou() {
    if (!lista.length) return false;
    if (atual >= lista.length) return true;
    if (atual !== lista.length - 1) return false;
    const p = palavra();
    return p.digitado.length >= p.texto.length;
  }

  function contarTexto() {
    let corretasNoTexto = 0;
    let incorretas = 0;
    let omitidas = 0;
    let extrasNoTexto = 0;
    let espacosCorretos = 0;
    lista.forEach((p) => {
      const limite = Math.min(p.texto.length, p.digitado.length);
      for (let i = 0; i < limite; i += 1) {
        if (p.digitado[i] === p.texto[i]) corretasNoTexto += 1;
        else incorretas += 1;
      }
      extrasNoTexto += Math.max(0, p.digitado.length - p.texto.length);
      if (p.enviada) {
        omitidas += Math.max(0, p.texto.length - p.digitado.length);
        if (!temErro(p)) espacosCorretos += 1;
      }
    });
    return { corretasNoTexto, incorretas, omitidas, extras: extrasNoTexto, espacosCorretos };
  }

  function estatisticas(segundos) {
    const texto = contarTexto();
    const caracteresCorretos = texto.corretasNoTexto + texto.espacosCorretos;
    const ritmo = consistencia(intervalosEntreTeclas(tempos));
    return {
      teclas,
      teclasCorretas: corretas,
      erros,
      errosCorrigidos: Math.min(corrigidos, erros),
      errosNaoCorrigidos: Math.max(0, erros - corrigidos),
      precisao: precisao(corretas, teclas),
      precisaoBruta: teclas ? Math.round((corretas / teclas) * 100) : 0,
      caracteresCorretos,
      ppmLiquido: ppm(caracteresCorretos, segundos),
      ppmBruto: ppm(teclas, segundos),
      consistencia: ritmo.valor,
      pausas: ritmo.pausas,
      ...texto,
      errosPorTecla: [...errosPorTecla.entries()].sort((a, b) => b[1] - a[1]),
      // [[tecla, { tentativas, erros }]]: base da sugestão por teclas (Etapa 4.2)
      desempenhoPorTecla: [...tentativasPorTecla.entries()].map(([tecla, tentativas]) => [tecla, { tentativas, erros: errosPorTecla.get(tecla) || 0 }]),
      palavrasProblema: [...palavrasProblema],
    };
  }

  return {
    modo,
    adicionarPalavras,
    digitar,
    espaco,
    apagar,
    seguirMesmoAssim,
    tentarDeNovo,
    estadoLetra,
    extras,
    digitadoEm,
    terminou,
    estatisticas,
    temErro: (i) => temErro(palavra(i)),
    get palavraAtual() {
      return atual;
    },
    get letraAtual() {
      return palavra()?.digitado.length ?? 0;
    },
    get totalPalavras() {
      return lista.length;
    },
    get teclas() {
      return teclas;
    },
    get errosSeguidos() {
      return errosSeguidos;
    },
  };
}
