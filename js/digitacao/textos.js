// js/digitacao/textos.js
// Conteúdo dos treinos: banco de palavras e de frases (temas e níveis
// variados) e as regras que completam um exercício curto até o mínimo de
// caracteres SEM repetir o mesmo texto.
//
// Por que existe: a trilha tem lições curtas (ex.: "fff jjj fjfj") e o treino
// exige pelo menos MIN_CARACTERES. Antes, o texto era repetido (embaralhado)
// até chegar lá. Agora a lição original vem primeiro e o restante é
// preenchido com conteúdo NOVO e compatível com a lição:
//   - lição de teclas (só minúsculas): palavras reais do banco que usam só
//     as letras da lição; com poucas letras (ex.: F e J), combinações novas
//     dessas letras, sem repetir a mesma sequência;
//   - lição de frases/texto: outras frases do mesmo nível e estilo
//     (acentos, pontuação, números ou palavras longas no Nível 6).
// O total NUNCA passa de alvoDeCaracteres(texto): é o tamanho que o banco
// usa para calcular o tempo máximo (tempo_limite_trilha), então o tempo
// continua justo.

export const MIN_CARACTERES = 150;

/** Mesmo cálculo de public.tempo_limite_trilha: rodadas do texto até somar o mínimo. */
export function alvoDeCaracteres(texto, minimo = MIN_CARACTERES) {
  const limpo = String(texto ?? '').trim().replace(/\s+/g, ' ');
  if (!limpo) return 0;
  const ciclo = limpo.length + 1;
  const vezes = Math.max(1, Math.ceil(minimo / ciclo));
  return vezes * ciclo - 1;
}

// ---------------------------------------------------------------------------
// Banco de palavras (minúsculas). Variedade de tamanhos e de letras para que
// as lições de teclas encontrem palavras reais com as letras que treinam.
// ---------------------------------------------------------------------------
export const PALAVRAS = `
a à ao as às é o os e ou um uma de da do das dos em na no nas nos por para com sem sob sobre
já lá cá ali sal mal cal gala fala sala asa casa massa alfa falha galha lasca saca jaca faca
salada laje lajes gaja daqui dali dela dele seda sede desde saladas aldeia adeus asas fadas
las alas dados dedo dedal lado fada gás lágrima jalga
faça laço caça graça açúcar maçã praça calça alça ças salsa safa dada adaga flash
quer que quero queria queijo quente quieto quatro quarto quota quiosque aquilo aquela
pato pote pipa pera peito porta porto prato preto pouco poupa pouso puro pires piso pista
tia tio teto tropa trote troupe torre torta tutor tipo trigo truta tarde terra terreno
roupa rua rio rato rede reto riso rota rumo roteiro repetir respeito retorno
ouro outro outra outubro outono ótimo optar
eu teu meu seu tua sua iate ideia ira irei item
wifi web wiki
yoga
zebra zinco zona zumbido zero zelo zagueiro
xale xarope xícara xadrez
cave cava cabo cubo cinco cinza cidade cebola cavalo caneta camelo cabana coco copo
vaca vela vida vinte viver vento verde vizinho vovô vulcão vazio
bola bolo bala banco barco banana bebida beijo bicho biscoito bom bonito
nada nave neve ninho noite nome novo nuvem nunca número nós
mão mar mesa mapa mala mola mato manhã menino música mundo mudança
lua luz lago lata leite lima limão linha livro lobo louça lugar
gato gelo gema gente girafa globo gota grama grande grupo guarda
hora hoje horta hotel humano história
jogo jornal joia julho junho justo janela jardim
kiwi
abacaxi abelha abraço acordar água agora ajuda alegria aluno amigo amor animal ano antes aprender
árvore assunto atenção aula avião azul
beleza biblioteca brincadeira brisa
caderno café calma caminho campo canção capítulo carinho cartaz cedo céu chuva ciência claro
colega começo comida conversa coragem corrida cozinha criança cuidado curioso
dança desafio desenho dia digitar dinheiro direção domingo dúvida
educação energia escola escrever esforço espaço espelho estrela estudo exemplo
família feira férias festa floresta força foco fruta futebol futuro
idade igual ilha imagem importante início inverno irmão
leitura letra liberdade lição
mensagem memória método minuto momento montanha motivo movimento
natureza notícia
objetivo oceano oficina olhar onda ontem ordem orgulho
paciência padaria paisagem palavra papel parque passeio pássaro pensamento pergunta pessoa
planeta poema ponte praia prática presente primavera problema professor projeto
quadro quintal
raiz receita relógio resposta resultado ritmo
sábado saber saúde segredo semana semente silêncio sinal sonho sorriso
teclado tecla tempo tesouro trabalho travessia treino
último união universo
valor verdade viagem vitória vontade
`.trim().split(/\s+/);

// ---------------------------------------------------------------------------
// Frases por nível (facil / medio / avancado), com temas variados: natureza,
// ciência, cotidiano, história, esporte, tecnologia, culinária, arte.
// ---------------------------------------------------------------------------
export const FRASES = {
  facil: [
    'O sol nasceu cedo e a praia ficou cheia de gente.',
    'A gata dorme no sofá depois do almoço.',
    'Meu irmão gosta de pão com manteiga e café com leite.',
    'Hoje a aula de ciências foi no jardim da escola.',
    'O vento forte balançou as folhas da mangueira.',
    'A turma plantou feijão em copos de plástico.',
    'Na feira tinha banana, mamão, uva e melancia.',
    'O ônibus passou na esquina às sete horas.',
    'Ela leu um livro inteiro durante as férias.',
    'O cachorro correu atrás da bola no parque.',
    'Choveu tanto que a rua virou um pequeno rio.',
    'A professora escreveu a data no quadro.',
    'Vamos andar de bicicleta no domingo de manhã.',
    'O bolo de cenoura saiu do forno quentinho.',
    'As estrelas brilham mais longe das cidades.',
    'O peixe nadou rápido entre as pedras do lago.',
    'Minha avó conta histórias antigas na varanda.',
    'Guarde o caderno na mochila antes de sair.',
    'O time treinou passes curtos na quadra.',
    'Um beija-flor parou perto da janela.',
    'O céu ficou laranja.',
    'Bom dia, turma!',
    'A sopa está quente.',
    'Leia com calma.',
    'O trem chegou.',
    'Hoje tem jogo.',
    'A lua apareceu cedo.',
    'Que dia bonito!',
  ],
  medio: [
    'As abelhas visitam centenas de flores por dia e ajudam a polinizar as plantações.',
    'Digitar sem olhar para o teclado exige paciência, mas o resultado aparece com o treino.',
    'O Rio Amazonas é o maior do mundo em volume de água e atravessa vários países.',
    'Antes de começar a receita, separe todos os ingredientes e lave bem as mãos.',
    'A biblioteca da cidade ganhou uma sala nova, com mesas grandes e luz natural.',
    'Os astronautas treinam durante anos antes de passar alguns meses no espaço.',
    'No jogo de ontem, a goleira defendeu um pênalti nos últimos minutos.',
    'O computador guarda informações em zeros e uns, que formam letras, sons e imagens.',
    'Quem anota as dúvidas durante a aula aprende mais e esquece menos.',
    'Os pinguins vivem em grupos e se revezam para proteger os filhotes do frio.',
    'A ponte foi construída com aço e concreto para aguentar o peso dos caminhões.',
    'Uma caminhada de meia hora por dia já faz bem para o coração.',
    'O pintor misturou azul e amarelo e encontrou o verde exato que procurava.',
    'Durante a noite, as corujas enxergam bem e caçam em silêncio.',
    'A feira de ciências mostrou robôs, maquetes de vulcões e um pequeno foguete.',
    'Separar o lixo reciclável ajuda a economizar recursos e a reduzir a poluição.',
    'O músico ensaiou a mesma parte várias vezes até tocar sem nenhum erro.',
    'As tartarugas marinhas voltam à praia onde nasceram para colocar os ovos.',
    'Um bom título resume a ideia do texto e desperta a curiosidade de quem lê.',
    'O mapa antigo mostrava rios, montanhas e caminhos que já não existem.',
    'O silêncio ajuda a concentração.',
    'Cada erro ensina alguma coisa.',
    'A chuva lavou a cidade inteira.',
    'Respire fundo e continue.',
    'O caderno ficou cheio de ideias.',
    'Ritmo constante vence a pressa.',
    'O farol guiou os barcos.',
    'Pratique um pouco todo dia.',
  ],
  avancado: [
    'A fotossíntese transforma luz, água e gás carbônico em açúcar e oxigênio, sustentando quase toda a vida no planeta.',
    'Durante a Revolução Industrial, máquinas a vapor mudaram a forma de produzir, viajar e até de organizar as cidades.',
    'A precisão na digitação reduz o retrabalho: corrigir um erro custa mais tempo do que digitar devagar e com atenção.',
    'Os vulcões liberam gases e lava, mas também formam solos férteis que favorecem a agricultura ao longo dos séculos.',
    'Pesquisadores analisam grandes conjuntos de dados para identificar padrões que seriam invisíveis a olho nu.',
    'A biodiversidade da Mata Atlântica impressiona: muitas espécies de plantas e animais só existem nessa região.',
    'Uma argumentação convincente apresenta evidências, considera objeções e conclui de maneira clara e coerente.',
    'O sistema imunológico reconhece invasores, produz anticorpos e guarda uma memória para defender o corpo no futuro.',
    'Em equipes eficientes, a comunicação transparente evita mal-entendidos e acelera a solução de problemas complexos.',
    'A invenção da imprensa ampliou o acesso aos livros e contribuiu para a difusão do conhecimento científico.',
    'Os satélites meteorológicos acompanham a formação de tempestades e ajudam a prever mudanças repentinas no clima.',
    'Responsabilidade digital significa proteger senhas, checar fontes e respeitar as pessoas também na internet.',
    'Na arquitetura sustentável, ventilação cruzada e iluminação natural diminuem o consumo de energia elétrica.',
    'O desenvolvimento da linguagem escrita permitiu registrar leis, acordos comerciais e histórias de gerações passadas.',
    'A persistência transforma tentativas frustradas em aprendizado, desde que cada erro seja observado com curiosidade.',
    'Hipóteses precisam de evidências.',
    'A curiosidade impulsiona a ciência.',
    'Consistência supera velocidade isolada.',
    'Toda pesquisa começa com uma pergunta.',
    'Argumentos claros convencem mais.',
    'A tecnologia amplia possibilidades.',
  ],
};

// Estilos do Nível 6 (Extremo)
const FRASES_EXTREMO = {
  acentos: [
    'Açúcar, café e pão de queijo: o lanche da tarde também é fonte de energia.',
    'Ninguém sabia por que o ônibus atrasou, até que a notícia explicou a razão.',
    'O médico pediu exames à paciente e recomendou atenção à saúde do coração.',
    'Após três horas de reunião, a comissão aprovou a votação da próxima sessão.',
    'Ela mantém a calma; ele não contém a ansiedade; ambos têm ótimas intenções.',
    'Lá no sítio, a lição é clara: cuidar da água é garantir o pão de amanhã.',
    'A órfã ganhou um ímã em forma de coração e uma caixinha de música antiga.',
    'Às vezes, a solução está à vista, mas só a percebemos depois de uma pausa.',
    'Você já comeu açaí?',
    'Não há pressa: atenção é tudo.',
    'O avô contou a lição de cór.',
    'Pôr do sol na região é lindo.',
    'Três irmãs, três opiniões.',
    'A canção ecoou no salão.',
  ],
  pontuacao: [
    'Atenção, turma: a prova (de Ciências) será na quinta-feira, às 9h!',
    '"Quem não pergunta, não aprende", disse o Prof. Carlos; todos concordaram.',
    'Lista de compras: arroz, feijão, ovos; e, se sobrar dinheiro, chocolate.',
    'Brasília, Salvador e Recife (capitais) recebem turistas o ano inteiro.',
    'Por quê? Porque o relatório - versão revisada - ainda não foi entregue.',
    'A Dra. Paula, do Hospital Central, respondeu: "Sim; o resultado saiu."',
    'O Brasil tem 26 Estados e o Distrito Federal: são 27 unidades no total.',
    'Pergunta-chave: onde, quando e como? Responda em, no máximo, três linhas.',
    'Sim, Maria; agora, sim!',
    'Ufa! (Ainda bem.)',
    'Leia: "Menos é mais."',
    'Brasil, Chile e Peru.',
    'Pronto? Então, comece!',
    'Nota: revisar o Cap. III.',
  ],
  numeros: [
    'O voo 3542 sai às 14h35 do portão 12 e chega às 17h10 (horário local).',
    'Comprei 3 cadernos por R$ 18,90 cada e paguei R$ 56,70 no total.',
    'Senha temporária: Wv#2026!q | Código: 48-B7-Q3 | Validade: 15 min',
    'Se x = 12 e y = 7, então 2x + 3y = 45 e x * y = 84.',
    'A pesquisa ouviu 1.250 pessoas: 62% aprovaram, 31% não e 7% não sabem.',
    'Pedido #8841 enviado em 03/02/2026 para Rua das Flores, 275 - apto 41.',
    'Desconto de 15% em compras acima de R$ 200,00 até 30/06, às 23h59.',
    'Temperatura máxima de 31,5 °C e mínima de 18,2 °C; umidade em 64%.',
    'Sala 204, bloco B.',
    'Total: R$ 9,99',
    '7 x 8 = 56',
    'Às 18h45, no km 23.',
    'Nota final: 9,5/10',
    'CEP 01310-100 & nº 88',
  ],
};

const MONSTRUOSAS = [
  'inconstitucionalissimamente', 'otorrinolaringologista', 'paralelepípedo', 'desproporcionalidade',
  'interdisciplinaridade', 'incompreensibilidade', 'eletrocardiograma', 'responsabilização',
  'desoxirribonucleico', 'extraordinariamente', 'intercontinentalmente', 'hipopotomonstrosesquipedaliofobia',
  'anticonstitucional', 'superintendência', 'internacionalização', 'desenvolvimentista',
  'impermeabilização', 'descentralização', 'otorrinolaringologia', 'indiscriminadamente',
];

// ---------------------------------------------------------------------------
// Sorteio sem repetição
// ---------------------------------------------------------------------------

/** Embaralha (Fisher–Yates) com a fonte de acaso indicada. */
export function embaralhar(lista, aleatorio = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Sorteador "saco de bolinhas": devolve todos os itens antes de repetir
 * algum, e nunca o mesmo item duas vezes seguidas.
 */
export function criarSorteador(lista, aleatorio = Math.random) {
  let saco = [];
  let ultimo;
  return () => {
    if (!lista.length) return undefined;
    if (!saco.length) {
      saco = embaralhar(lista, aleatorio);
      if (saco.length > 1 && saco[saco.length - 1] === ultimo) [saco[0], saco[saco.length - 1]] = [saco[saco.length - 1], saco[0]];
    }
    ultimo = saco.pop();
    return ultimo;
  };
}

// ---------------------------------------------------------------------------
// Completar um exercício curto
// ---------------------------------------------------------------------------

const LETRA = /\p{L}/u;

/** Letras (minúsculas) que a lição treina. */
export function letrasDoTexto(texto) {
  return new Set([...String(texto).toLocaleLowerCase('pt-BR')].filter((c) => LETRA.test(c)));
}

/** Lição de teclas: só letras minúsculas e espaços (sem pontuação, números ou maiúsculas). */
export function ehLicaoDeTeclas(texto) {
  return /^[\p{Ll}\s]+$/u.test(String(texto).trim());
}

/** Estilo do texto: define de onde vem o conteúdo extra. */
export function estiloDoTexto(texto, nivel) {
  const t = String(texto);
  if (ehLicaoDeTeclas(t) && !(nivel >= 4)) return 'teclas';
  if (nivel >= 6) {
    if (/\d/.test(t)) return 'numeros';
    const letras = [...t].filter((c) => LETRA.test(c));
    const acentuadas = letras.filter((c) => /[à-öø-ÿÀ-ÖØ-ß]/.test(c)).length;
    if (letras.length && acentuadas / letras.length > 0.06) return 'acentos';
    if (/[":;()!?-]/.test(t) || /(^|\s)\p{Lu}/u.test(t)) return 'pontuacao';
    const palavras = t.split(/\s+/).filter(Boolean);
    if (palavras.length && palavras.reduce((s, p) => s + p.length, 0) / palavras.length > 11) return 'monstruosas';
    return 'avancado';
  }
  if (ehLicaoDeTeclas(t)) return 'palavras';
  return nivel >= 5 ? 'avancado' : nivel === 4 ? 'medio' : 'facil';
}

/** Palavras reais do banco escritas só com as letras da lição. */
export function palavrasCompativeis(letras, banco = PALAVRAS) {
  return [...new Set(banco)].filter((p) => [...p].every((c) => letras.has(c)));
}

// Combinação nova com as letras da lição (sem 3 letras iguais seguidas)
function palavraInventada(letras, tamanho, aleatorio) {
  let palavra = '';
  while (palavra.length < tamanho) {
    const letra = letras[Math.floor(aleatorio() * letras.length)];
    if (palavra.endsWith(letra + letra)) continue;
    palavra += letra;
  }
  return palavra;
}

const tamanho = (palavras) => (palavras.length ? palavras.join(' ').length : 0);

/**
 * Palavras do exercício: o texto original primeiro e, se ele for curto, o
 * complemento até perto de `alvo` (sem passar). Sem `nivel`, trata como
 * lição de teclas quando o texto for só de minúsculas.
 */
export function completarTexto(texto, opcoes = {}) {
  const original = String(texto ?? '').trim().replace(/\s+/g, ' ');
  let melhor = null;
  for (let tentativa = 0; tentativa < 6; tentativa += 1) {
    const palavras = gerarComplemento(texto, opcoes);
    const final = palavras.join(' ');
    // O texto original aparece uma única vez (no começo).
    if (!original || final.split(original).length - 1 <= 1) return palavras;
    melhor = palavras;
  }
  return melhor;
}

function gerarComplemento(texto, { nivel = null, alvo = alvoDeCaracteres(texto), aleatorio = Math.random } = {}) {
  const originais = String(texto ?? '').trim().split(/\s+/).filter(Boolean);
  if (!originais.length || tamanho(originais) >= alvo) return originais;

  const estilo = estiloDoTexto(texto, nivel);
  const resultado = [...originais];
  const cabe = (extra) => tamanho(resultado) + 1 + extra.length <= alvo;

  if (estilo === 'teclas' || estilo === 'palavras' || estilo === 'monstruosas') {
    const letras = letrasDoTexto(texto);
    let fonte;
    if (estilo === 'monstruosas') {
      const usadas = new Set(originais.map((p) => p.toLocaleLowerCase('pt-BR')));
      fonte = MONSTRUOSAS.filter((p) => !usadas.has(p));
    } else {
      fonte = palavrasCompativeis(letras);
    }
    const reais = criarSorteador(fonte, aleatorio);
    const listaLetras = [...letras];
    // Com poucas palavras reais, metade do complemento são combinações novas.
    const proporcaoInventada = estilo === 'monstruosas' ? 0 : fonte.length >= 25 ? 0 : fonte.length >= 8 ? 0.35 : 1;
    let tentativas = 0;
    while (tentativas < 400) {
      tentativas += 1;
      const restante = alvo - tamanho(resultado) - 1;
      if (restante < 1) break;
      let palavra;
      if (aleatorio() < proporcaoInventada && listaLetras.length) {
        const tam = Math.min(restante, 2 + Math.floor(aleatorio() * 4));
        palavra = palavraInventada(listaLetras, tam, aleatorio);
      } else {
        palavra = reais();
        if (!palavra || palavra.length > restante) {
          // Fim do texto: procura uma palavra real que caiba; senão, inventa do tamanho exato.
          const curta = embaralhar(fonte, aleatorio).find((p) => p.length <= restante && p !== resultado[resultado.length - 1]);
          if (curta) palavra = curta;
          else if (listaLetras.length && restante >= 2 && estilo !== 'monstruosas') palavra = palavraInventada(listaLetras, Math.min(restante, 5), aleatorio);
          else break;
        }
      }
      if (palavra === resultado[resultado.length - 1]) continue;
      if (cabe(palavra)) resultado.push(palavra);
    }
    return resultado;
  }

  // Frases: outras frases do mesmo estilo, sem repetir e sem passar do alvo.
  const fonte = (FRASES_EXTREMO[estilo] ?? FRASES[estilo] ?? FRASES.medio).filter((f) => f !== texto.trim());
  const restantes = embaralhar(fonte, aleatorio);
  while (restantes.length) {
    const espaco = alvo - tamanho(resultado) - 1;
    const indice = restantes.findIndex((f) => f.length <= espaco);
    if (indice < 0) break;
    const [frase] = restantes.splice(indice, 1);
    resultado.push(...frase.split(' '));
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Prática livre (sem exercício do banco)
// ---------------------------------------------------------------------------

const NIVEL_PALAVRAS = {
  easy: (p) => p.length >= 2 && p.length <= 5,
  medium: (p) => p.length >= 4 && p.length <= 9,
  advanced: (p) => p.length >= 8,
};
const NIVEL_FRASES = { easy: 'facil', medium: 'medio', advanced: 'avancado' };

/**
 * Gerador da prática livre: `proximas(n)` devolve n palavras (modo palavras)
 * ou n frases já quebradas em palavras (modo frases), sem repetir até
 * esgotar o banco do nível.
 */
export function criarPraticaLivre({ modo = 'words', nivel = 'medium', aleatorio = Math.random } = {}) {
  if (modo === 'sentences') {
    const frases = FRASES[NIVEL_FRASES[nivel] ?? 'medio'];
    const sortear = criarSorteador(frases, aleatorio);
    return (quantidade) => Array.from({ length: quantidade }, () => sortear().split(' ')).flat();
  }
  const filtro = NIVEL_PALAVRAS[nivel] ?? NIVEL_PALAVRAS.medium;
  const palavras = [...new Set(PALAVRAS)].filter(filtro);
  const sortear = criarSorteador(palavras, aleatorio);
  return (quantidade) => Array.from({ length: quantidade }, sortear);
}
