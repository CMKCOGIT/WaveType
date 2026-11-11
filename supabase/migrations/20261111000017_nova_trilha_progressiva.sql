-- ============================================================
-- 20261111000017_nova_trilha_progressiva.sql
-- Trilha oficial refeita: 5 níveis x 4 etapas x 5 exercícios = 100.
--   1 Posição base        F e J · mão esquerda · mão direita · fileira do meio
--   2 Fileira superior    Q W E R T · Y U I O P · fileira completa · frases
--   3 Fileira inferior    Z X C V · B N M · fileira completa · frases
--   4 Combinação          palavras curtas · médias · longas · frases
--   5 Digitação avançada  maiúsculas e ponto · acentos · pontuação · textos
-- Cada exercício usa só teclas já ensinadas; até o Nível 5 não há acentos,
-- maiúsculas nem pontuação. Todos têm 150+ caracteres (o treino não
-- precisa completar o texto).
--
-- Preserva o histórico: os exercícios existentes são ATUALIZADOS no mesmo
-- registro (mesmo id, nivel_trilha e ordem), então resultados, conclusões e
-- conquistas continuam ligados a eles. Se faltar algum (nível, ordem), ele é
-- criado. O tempo máximo é recalculado pelo trigger exercicios_tempo_trilha.
--
-- Nível 6 (Extremo): sai da trilha, mas NÃO é apagado (apagar levaria os
-- resultados junto, por causa do on delete cascade). Fica como não publicado
-- e o site deixa de listá-lo. As duas conquistas que dependiam dele passam
-- a ter critérios alcançáveis; quem já as tinha continua com elas.
-- Idempotente.
-- ============================================================

create temporary table _trilha (nivel_trilha int, ordem int, titulo text, texto text, dificuldade text) on commit drop;
insert into _trilha values
  (1, 1, 'Teclas F e J · 1', 'fff jjj fff jjj fff jjj ff jj ff jj ff jj f j f j f j fff jjj fff jjj ff jj ff jj f j f j fff jjj fff jjj ff jj ff jj f j f j fff jjj ff jj f j ff jj f', 'facil'),
  (1, 2, 'Teclas F e J · 2', 'fj fj fj jf jf jf fj jf fj jf ff jj fj jf fj fj jf jf ff jj fj jf fj jf fj fj jf jf ff jj fj jf fj jf fj fj jf jf ff jj fj jf fj jf fj fj jf fj jf ff jj', 'facil'),
  (1, 3, 'Teclas F e J · 3', 'ffj ffj jjf jjf ffj jjf fjj fjj jff jff fjj jff ffj jjf fjj jff ffj jjf fjj jff ffj ffj jjf jjf fjj jff ffj jjf fjj jff ffj jjf fjj jff ffj jjf fjj jff', 'facil'),
  (1, 4, 'Teclas F e J · 4', 'fjfj fjfj jfjf jfjf fjfj jfjf ffjj ffjj jjff jjff fjfj jfjf ffjj jjff fjfj jfjf ffjj jjff fjfj fjfj jfjf jfjf ffjj jjff fjfj jfjf ffjj jjff fjfj jfjf ffjj', 'facil'),
  (1, 5, 'Teclas F e J · 5', 'fj jf ffj jjf fjf jfj fjjf jffj ff jj fjf jfj ffjj jjff fj jf fjjf jffj fjf jfj ffj jjf fj jf ffjj jjff fjf jfj fjjf jffj ff jj fj jf fjf jfj fjf jfj ffj', 'facil'),
  (1, 6, 'Mão esquerda: A S D F G · 1', 'aaa sss ddd fff ggg aaa sss ddd fff ggg aa ss dd ff gg aa ss dd ff gg a s d f g a s d f g asdfg asdfg gfdsa gfdsa asdfg gfdsa aa ss dd ff gg a s d f g', 'facil'),
  (1, 7, 'Mão esquerda: A S D F G · 2', 'as ad af ag sa sd sf sg da ds df dg fa fs fd fg ga gs gd gf as ad af ag sa sd sf sg da ds df dg fa fs fd fg ga gs gd gf as sa ad da af fa ag sa sd sf sg', 'facil'),
  (1, 8, 'Mão esquerda: A S D F G · 3', 'fas das gas sad ads afs dag gad fag sag das fas gas sad dag gad fag sag fas das gas sad dag gad fag sag ads afs fas das gas sad dag gad sag fas das gas', 'facil'),
  (1, 9, 'Mão esquerda: A S D F G · 4', 'asa asas dada dadas fada fadas saga sagas asa fada saga dada asas fadas sagas dadas asa fada saga dada asas fadas sagas dadas asa fada saga fadas sagas', 'facil'),
  (1, 10, 'Mão esquerda: A S D F G · 5', 'a fada a saga a asa a dada as fadas as sagas as asas as dadas a fada da saga a asa da fada a saga da fada as asas das fadas a dada da saga da saga a asa', 'facil'),
  (1, 11, 'Mão direita: H J K L Ç · 1', 'jjj kkk lll ççç hhh jjj kkk lll ççç hhh jj kk ll çç hh jj kk ll çç hh j k l ç h j k l ç h jklç jklç çlkj çlkj hjkl lkjh jj kk ll çç hh j k l ç h j k l', 'facil'),
  (1, 12, 'Mão direita: H J K L Ç · 2', 'jk jl jç jh kj kl kç kh lj lk lç lh çj çk çl çh hj hk hl hç jk jl jç jh kj kl kç kh lj lk lç lh çj çk çl çh hj hk hl hç jk kl lç hj jç jh kj kl kç kh lj', 'facil'),
  (1, 13, 'Mão direita: H J K L Ç · 3', 'jkl lkj klç çlk hjk kjh jlç çlj hkl lkh jkl lkj klç çlk hjk kjh jlç çlj hkl lkh jkl lkj klç çlk hjk kjh jlç çlj hkl lkh jkl klç hjk jlç çlj hkl lkh jkl', 'facil'),
  (1, 14, 'Mão direita: H J K L Ç · 4', 'hjkl lkjh jklç çlkj hjkl lkjh jklç çlkj hhjj kkll llçç jjkk hjkl jklç lkjh çlkj hhjj kkll llçç jjkk hjkl jklç lkjh çlkj hjkl jklç lkjh çlkj lkjh çlkj hhjj', 'facil'),
  (1, 15, 'Mão direita: H J K L Ç · 5', 'jh kh lh çh hj hk hl hç jkh lkh çlh hjk hkl hlç jh kh lh çh hj hk hl hç jkh lkh çlh hjk hkl hlç jh kh lh çh hj hk hl hç jkh lkh çlh hjk hl hç jkh lkh çlh', 'facil'),
  (1, 16, 'Fileira do meio completa · 1', 'asdfg hjklç asdfg hjklç gfdsa çlkjh fj dk sl aç gh fj dk sl aç gh asdf jklç asdf jklç fdsa çlkj fj dk sl aç gh asdfg hjklç gfdsa çlkjh gh asdf jklç asdf', 'facil'),
  (1, 17, 'Fileira do meio completa · 2', 'sala fala gala asa sal alas salas falas galas alfa sala fala gala asa sal alas salas falas galas alfa sala fala gala asa sal alfa salsa asa sal alas salas', 'facil'),
  (1, 18, 'Fileira do meio completa · 3', 'a sala da fada a fala da fada a gala da sala a asa da fada a salada da sala a fala da gala a fada da sala a salsa da salada a asa da fada da sala a fala', 'facil'),
  (1, 19, 'Fileira do meio completa · 4', 'falha galha salsa salada alfafa haja faça laça falhas galhas saladas alfafa haja faça laça falha salsa salada alfafa haja faça laça alfafa haja faça laça', 'facil'),
  (1, 20, 'Fileira do meio completa · 5', 'faça a salada da fada haja gala da sala a fada falha a fala da gala faça a salsa da salada haja sala da fada a asa da fada falha a fala da fada a salsa', 'facil'),
  (2, 1, 'Lado esquerdo: Q W E R T · 1', 'eee rrr ttt www qqq de fe re te ge ed ef er et eg dr fr gr tr dt ft gt wq qw ew we rt tr de fe re te ge ed er et dr fr tr ft gt ew we gt wq qw ew we rt', 'facil'),
  (2, 2, 'Lado esquerdo: Q W E R T · 2', 'ar er ta te ra re as es la le sa se da de fa fe ga ge tra tre era ere ala ele ata ete ar er ta te ra re la le sa se tra tre era ele ata era ere ala ele', 'facil'),
  (2, 3, 'Lado esquerdo: Q W E R T · 3', 'ela tela seda fera sede ele elas telas sedas feras data dedal legal sete fresta ela tela seda fera sede ele data legal sete dedal fresta sete fresta ela', 'facil'),
  (2, 4, 'Lado esquerdo: Q W E R T · 4', 'festa terra garra tarde resta trata salta falta frase deserta festa terra garra tarde resta trata salta falta frase deserta estrada sete terra garra tarde', 'facil'),
  (2, 5, 'Lado esquerdo: Q W E R T · 5', 'a tarde de festa esta sala esta tela a festa da terra a frase da tela ela salta a fera falta a festa da tarde ela resta e a fera salta tela ela salta a', 'facil'),
  (2, 6, 'Lado direito: Y U I O P · 1', 'uuu iii ooo ppp yyy ju ki lo hu ju ki lo hu ju ki lo pi pu po ip up op oi io ui iu ju ki lo hu pi pu po oi io ui iu yu uy ju ki lo op oi io ui iu ju ki', 'facil'),
  (2, 7, 'Lado direito: Y U I O P · 2', 'ju ki lo pi hu ja ka la pa ha di do du fi fo fu gi go gu si so su li lo lu ji jo ju pi po pu hi ho hu di do du fi fo fu gi go gu si so su lo lu ji jo ju', 'facil'),
  (2, 8, 'Lado direito: Y U I O P · 3', 'pia fio dia sol piso pois lisa oi solo pulo gula dias fios pias pisos sola pia fio dia sol piso pois lisa solo pulo dias fios pias pisos sola pia fio dia', 'facil'),
  (2, 9, 'Lado direito: Y U I O P · 4', 'filho folha julho ilha papai pipa polo jugo duo lupa filho folha julho ilha papai pipa polo jugo duo lupa filhos folhas ilhas pipas lupas julho ilha papai', 'facil'),
  (2, 10, 'Lado direito: Y U I O P · 5', 'o sol do dia a folha da ilha o fio da pipa o filho do papai pula o piso liso a pipa sola o dia do sol a ilha do papai a folha do galho a pipa do filho da ilha', 'facil'),
  (2, 11, 'Fileira superior completa · 1', 'qwert yuiop poiuy trewq qwert yuiop poiuy trewq qw er ty ui op po iu yt re wq qwer uiop poiu rewq qwert yuiop poiuy trewq qw er ty ui yt re wq qwer uiop', 'facil'),
  (2, 12, 'Fileira superior completa · 2', 'qu que qui quo qua que qui quo quer quero queijo quite quatro quieto qu que qui quo quer quero queijo quite quatro quieto quero queijo quieto qu que qui', 'facil'),
  (2, 13, 'Fileira superior completa · 3', 'pato sapo porta prato pedra tropa rato gato tio tia ouro outra tudo pato sapo porta prato pedra tropa rato gato tio tia ouro outra tudo pato sapo porta', 'facil'),
  (2, 14, 'Fileira superior completa · 4', 'estrada tesoura pirata sapato agosto tesouro palito trilho garoto atleta estrada tesoura pirata sapato agosto tesouro palito trilho atleta estrada tesoura', 'facil'),
  (2, 15, 'Fileira superior completa · 5', 'queijo quatro aquele aquela esquilo raquete pesquisa leque quiosque quieto queijo quatro aquele esquilo raquete leque pesquisa quiosque quieto queijo quatro', 'facil'),
  (2, 16, 'Frases com as duas fileiras · 1', 'o pato quer sopa e o sapo quer pular o gato pula a porta e o rato foge pela estrada de terra que segue ao porto e depois a ilha da tia sua tropa passa ali todo dia', 'facil'),
  (2, 17, 'Frases com as duas fileiras · 2', 'a tia tirou o queijo do prato e deu ao filho que ia sair para a festa da tarde o filho riu alto e saiu pela estrada de terra para a festa que ia durar a tarde', 'facil'),
  (2, 18, 'Frases com as duas fileiras · 3', 'o pirata guardou o tesouro de ouro perto da pedra e depois partiu pela estrada do porto a sua tropa seguiu a pista do tesouro por todo o dia a sua sede foi forte', 'facil'),
  (2, 19, 'Frases com as duas fileiras · 4', 'a garota usou a tesoura e o papel para a sua pipa da tarde depois soltou a pipa perto do lago e ela foi alta por toda a tarde de festa do seu grupo e da tia', 'facil'),
  (2, 20, 'Frases com as duas fileiras · 5', 'toda tarde o atleta pula a poça e depois espera a tropa toda pela pista de terra o grupo ri e fala alto do sapato que ele perdeu ao pular a poça de terra', 'facil'),
  (3, 1, 'Lado esquerdo: Z X C V · 1', 'zzz xxx ccc vvv az sx dc fv za xs cd vf zx xc cv vc cx xz az sx dc fv ca ce ci co cu va ve vi vo vu za ze zi zo zu ca ve zi xo cu ce vi zo ca ce ci co', 'medio'),
  (3, 2, 'Lado esquerdo: Z X C V · 2', 'casa vaca faca copo cedo doce vela vida voz luz vez casa vaca faca copo cedo doce vela vida voz luz vez casas vacas facas copos velas faca copo cedo doce', 'medio'),
  (3, 3, 'Lado esquerdo: Z X C V · 3', 'caixa taxa xale peixe deixa fixo texto exato caixa taxa xale peixe deixa fixo texto exato caixas peixes textos xale deixa taxa fixo peixe deixa fixo texto', 'medio'),
  (3, 4, 'Lado esquerdo: Z X C V · 4', 'zero azul vazio fazer dizer reza zelo prazo juiz zero azul vazio fazer dizer reza zelo prazo juiz cozer cereja cidade cavalo cueca vazio fazer dizer reza', 'medio'),
  (3, 5, 'Lado esquerdo: Z X C V · 5', 'a vaca voltou cedo para a casa e o peixe azul ficou perto da caixa vazia o gato fez xixi perto da porta e a voz do tio ecoou pela escada da casa velha', 'medio'),
  (3, 6, 'Lado direito: B N M · 1', 'bbb nnn mmm jn jm fb jb nm mn bn nb mb bm ba be bi bo bu na ne ni no nu ma me mi mo mu bn nm mb ba na ma be ne me bi ni mi bo no mo no nu ma me mi mo mu', 'medio'),
  (3, 7, 'Lado direito: B N M · 2', 'bola bolo boca bebe bom bem nome mesa mala mapa nave neve nuvem mundo bola bolo boca nome mesa mala mapa nave neve nuvem mundo bebe mundo bola bolo boca', 'medio'),
  (3, 8, 'Lado direito: B N M · 3', 'banana menino boneca cabana nomes baleia bambu mamute bombom banana menino boneca cabana baleia bambu mamute bombom nomes menina bonita menino boneca cabana', 'medio'),
  (3, 9, 'Lado direito: B N M · 4', 'o menino ama a bola nova e a menina gosta de banana madura com mel um bolo morno espera na mesa da cozinha e o cachorro dorme no tapete da sala de jantar', 'medio'),
  (3, 10, 'Lado direito: B N M · 5', 'no domingo cedo o menino bebe um bom copo de leite e come bolo de milho com manteiga depois vai ao campo jogar bola com os amigos do bairro na quadra nova', 'medio'),
  (3, 11, 'Fileira inferior completa · 1', 'zxcvbnm mnbvcxz zx xc cv vb bn nm mn nb bv vc cx xz zxcv bnm mnb vcxz zxcvbnm mnbvcxz cv bn nm xc zx vb bnm zxcv mnbvcxz zxcvbnm cv bn mnb vcxz zxcvbnm', 'medio'),
  (3, 12, 'Fileira inferior completa · 2', 'zebra cabana xadrez vizinho combina buzina bexiga nevoeiro cebola zebra cabana xadrez vizinho combina buzina bexiga nevoeiro cebola zebra cabana xadrez', 'medio'),
  (3, 13, 'Fileira inferior completa · 3', 'caminho cavalo cozinha banco boneco nuvem campo cinza cimento caminho cavalo cozinha banco boneco nuvem campo cinza cimento ninho banco cavalo cozinha', 'medio'),
  (3, 14, 'Fileira inferior completa · 4', 'macaco bicicleta cantina vacina mexerica bombom cuscuz canivete macaco bicicleta cantina vacina mexerica bombom cuscuz canivete macaco bicicleta cantina', 'medio'),
  (3, 15, 'Fileira inferior completa · 5', 'cinco vizinhos combinaram um bom caminho de bicicleta pelo campo levaram cuscuz e bombom e voltaram para casa quando a neblina chegou bem no fim da tarde', 'medio'),
  (3, 16, 'Frases com o teclado inteiro · 1', 'a zebra e o cavalo correm pelo campo verde enquanto o vento balança as folhas do coqueiro e o macaco observa tudo do alto do morro sem fazer nenhum barulho', 'medio'),
  (3, 17, 'Frases com o teclado inteiro · 2', 'o vizinho trouxe uma caixa de bombons e dividiu com todos os meninos da rua no fim da tarde cada um ganhou dois e guardou o resto no bolso da camisa azul', 'medio'),
  (3, 18, 'Frases com o teclado inteiro · 3', 'quem digita com calma erra menos e com o tempo os dedos encontram as teclas sem precisar olhar para baixo e o treino vira um bom costume para a vida toda', 'medio'),
  (3, 19, 'Frases com o teclado inteiro · 4', 'na cozinha a vizinha prepara cuscuz com milho e coco e o cheiro bom chega na varanda da casa onde os meninos esperam com fome e pratos na mesa da sala de jantar', 'medio'),
  (3, 20, 'Frases com o teclado inteiro · 5', 'de bicicleta o menino vai para a escola todos os dias pelo caminho do parque e volta cantando uma cantiga que aprendeu com a turma na aula de artes da quinta', 'medio'),
  (4, 1, 'Palavras curtas · 1', 'sol mar rio luz paz dia mel lua cor som rua voz fio bem mal sal ver ler sim eles ali aqui hoje bom mau rei pai tio boi gol ovo uva asa arte ler sim eles', 'medio'),
  (4, 2, 'Palavras curtas · 2', 'casa bola dado gato pato rato vaca mesa sapo copo faca lata mapa nave rede seda tela vela vida dedo lobo urso galo foca puma rosa lima figo rede seda tela', 'medio'),
  (4, 3, 'Palavras curtas · 3', 'azul roxo bege ouro neve fogo lago onda vale ilha mata mar ar sol lua rio pedra areia barro folha flor ramo raiz gota brisa vento frio sol lua rio pedra', 'medio'),
  (4, 4, 'Palavras curtas · 4', 'pula corre anda come bebe dorme canta pinta joga nada voa sobe desce gira toca abre fecha ouve fala ri olha pega leva puxa lava seca gira toca abre fecha', 'medio'),
  (4, 5, 'Palavras curtas · 5', 'um dia de sol no mar azul com o pai e o tio na casa de praia ver o rio ler um livro comer bolo de milho e ouvir a onda bater na areia quando a noite vem', 'medio'),
  (4, 6, 'Palavras médias · 1', 'janela caderno cadeira escola amigos pessoa cidade quintal jardim viagem tomate lanche brinco sapato camisa casaco bermuda tapete cortina viagem tomate', 'medio'),
  (4, 7, 'Palavras médias · 2', 'teclado monitor caneta lousa caderno borracha mochila estojo pincel tesoura cartaz agenda mapa livro folha pasta regra prova nota quadro cartaz agenda', 'medio'),
  (4, 8, 'Palavras médias · 3', 'correr pular nadar brincar cantar dançar estudar desenhar escrever pensar ajudar sorrir lembrar plantar cozinhar viajar descansar sonhar pensar ajudar', 'medio'),
  (4, 9, 'Palavras médias · 4', 'abacaxi morango laranja melancia goiaba ameixa pitanga caqui manga banana pera kiwi caju coco jaca amora cereja acerola tangerina uva pera kiwi caju coco', 'medio'),
  (4, 10, 'Palavras médias · 5', 'domingo segunda terça quarta quinta sexta janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro abril maio junho julho', 'medio'),
  (4, 11, 'Palavras longas · 1', 'computador bicicleta borboleta passarinho travesseiro geladeira chocolate elefante liquidificador computadores bicicletas borboletas chocolate elefante', 'medio'),
  (4, 12, 'Palavras longas · 2', 'aprendizado conhecimento desenvolvimento responsabilidade crescimento entendimento sentimento movimento acontecimento pensamento tratamento entendimento', 'medio'),
  (4, 13, 'Palavras longas · 3', 'professora biblioteca geografia coordenadora brincadeira apresentadora pesquisadora jardineira cozinheira carpinteiro marceneiro bombeiro pesquisadora', 'medio'),
  (4, 14, 'Palavras longas · 4', 'dinossauro crocodilo tartaruga papagaio capivara golfinho borboleta passarinho joaninha minhoca caranguejo girafa cachorro coelho camelo passarinho joaninha', 'medio'),
  (4, 15, 'Palavras longas · 5', 'simultaneamente perfeitamente rapidamente cuidadosamente naturalmente tranquilamente finalmente felizmente atenciosamente gentilmente tranquilamente finalmente', 'medio'),
  (4, 16, 'Frases completas · 1', 'o treino de todo dia transforma pequenos avanços em grandes conquistas no teclado e na vida quem persiste aprende mais e sente orgulho de cada passo dado', 'medio'),
  (4, 17, 'Frases completas · 2', 'olhar para a tela em vez de olhar para os dedos ajuda a memorizar o lugar de cada tecla e com o tempo a escrita fica leve e segura como uma boa conversa', 'medio'),
  (4, 18, 'Frases completas · 3', 'o computador ajuda a escrever textos fazer pesquisas organizar trabalhos e conversar com pessoas de longe por isso digitar bem abre muitas portas no futuro', 'medio'),
  (4, 19, 'Frases completas · 4', 'a biblioteca da escola tem livros de aventura poesia contos e lendas para todas as idades e cada aluno pode levar um livro para ler em casa durante a semana', 'medio'),
  (4, 20, 'Frases completas · 5', 'manter as costas retas os ombros soltos e os pulsos leves deixa o treino mais gostoso e menos cansativo e faz bem para o corpo todo depois de uma hora', 'medio'),
  (5, 1, 'Maiúsculas, ponto e vírgula · 1', 'Ana mora em Recife. Bruno mora em Belo Horizonte. Carla e Davi moram em Manaus, perto do rio. Elisa mora em Curitiba, onde faz frio no inverno. Todos estudam juntos.', 'avancado'),
  (5, 2, 'Maiúsculas, ponto e vírgula · 2', 'Hoje tem aula de Artes. Depois, a turma vai para a biblioteca, e o professor Paulo conta uma lenda antiga. No final, cada aluno desenha a parte de que mais gostou.', 'avancado'),
  (5, 3, 'Maiúsculas, ponto e vírgula · 3', 'O Brasil tem praias, florestas, rios e montanhas. Cada estado tem comidas, danças e festas diferentes. Em junho, muitas cidades fazem festas com fogueira e quadrilha.', 'avancado'),
  (5, 4, 'Maiúsculas, ponto e vírgula · 4', 'Maria leu um livro, fez um resumo e mostrou para a turma. Todos gostaram, e o professor elogiou. Depois, Pedro e Lucas leram os resumos deles para a classe.', 'avancado'),
  (5, 5, 'Maiúsculas, ponto e vírgula · 5', 'Primeiro, sente com a coluna reta. Depois, apoie os dedos na fileira do meio, com os indicadores no F e no J. Por fim, digite com calma e olhe para a tela.', 'avancado'),
  (5, 6, 'Acentuação · 1', 'café pão mãe irmão avó avô você está saúde música lápis já também até após três mês órgão ímã ação lição maçã país céu pé nós avós pássaro árvore açúcar ônibus', 'avancado'),
  (5, 7, 'Acentuação · 2', 'A família tomou café com pão e manteiga. Depois, a mãe e o irmão foram à feira comprar maçã, limão e mamão. Na volta, a avó já esperava com suco de açaí.', 'avancado'),
  (5, 8, 'Acentuação · 3', 'Ciências, história e geografia são matérias da escola. Na aula de português, a turma lê poesias e escreve histórias. Em matemática, resolve problemas.', 'avancado'),
  (5, 9, 'Acentuação · 4', 'No verão, o calor é forte e a água do mar fica ótima. No inverno, a manhã é fria e o céu fica cinza. Na primavera, as árvores da praça se enchem de flores.', 'avancado'),
  (5, 10, 'Acentuação · 5', 'A canção começou baixinho, e a plateia ficou em silêncio. Quando acabou, todos aplaudiram de pé. O músico sorriu, agradeceu e tocou mais uma, só no violão.', 'avancado'),
  (5, 11, 'Pontuação completa · 1', 'Você já terminou a lição? Ainda não! Faltam só duas frases: uma curta e outra um pouco maior. Quando acabar, revise o texto; depois, chame a professora.', 'avancado'),
  (5, 12, 'Pontuação completa · 2', 'Lista do lanche: suco, pão, queijo e fruta; para a sobremesa, um pedaço de bolo de cenoura. Quem vai levar os copos? Eu levo! E os guardanapos (de papel)?', 'avancado'),
  (5, 13, 'Pontuação completa · 3', 'A professora disse: "Quem lê mais, escreve melhor." E a turma respondeu: "Combinado!" Na semana seguinte, cada aluno trouxe um livro (de casa ou da biblioteca).', 'avancado'),
  (5, 14, 'Pontuação completa · 4', 'O guarda-chuva (o azul, de bolinhas) ficou na sala de aula. Alguém pode buscá-lo amanhã cedo? Sim: eu passo lá antes do recreio e deixo na secretaria.', 'avancado'),
  (5, 15, 'Pontuação completa · 5', 'Atenção, turma: a apresentação será na sexta-feira, às dez horas; tragam o cartaz pronto! Dúvidas? Falem comigo no intervalo - ou escrevam no caderno de recados.', 'avancado'),
  (5, 16, 'Textos completos · 1', 'Digitar bem não é apenas ser rápido. É manter o ritmo, errar menos e corrigir com calma. Quem treina um pouco todos os dias percebe que as mãos passam a encontrar as teclas sozinhas.', 'avancado'),
  (5, 17, 'Textos completos · 2', 'As abelhas visitam centenas de flores por dia. Enquanto buscam o néctar, levam o pólen de uma planta para outra e ajudam a formar frutos e sementes. Sem elas, muitas plantações não existiriam.', 'avancado'),
  (5, 18, 'Textos completos · 3', 'O Rio Amazonas atravessa vários países e despeja no mar uma quantidade enorme de água. Ao seu redor vive uma floresta cheia de animais, plantas e povos que conhecem seus segredos há séculos.', 'avancado'),
  (5, 19, 'Textos completos · 4', 'Na hora de estudar, desligue as notificações, organize a mesa e defina um objetivo pequeno. Depois de cumprir a meta, faça uma pausa curta: beba água, alongue os braços e volte com atenção.', 'avancado'),
  (5, 20, 'Textos completos · 5', 'Escrever uma boa mensagem exige clareza. Comece pelo assunto principal, explique o que precisa e termine com um agradecimento. Antes de enviar, releia o texto: um erro pequeno pode mudar o sentido de tudo.', 'avancado')
;

update public.exercicios e
set titulo = t.titulo,
    texto_referencia = t.texto,
    nivel = t.dificuldade,
    publicado = true,
    atualizado_em = now()
from _trilha t
where e.nivel_trilha = t.nivel_trilha and e.ordem = t.ordem
  and (e.titulo is distinct from t.titulo or e.texto_referencia is distinct from t.texto
       or e.nivel is distinct from t.dificuldade or not e.publicado);

insert into public.exercicios (titulo, texto_referencia, nivel, publicado, criado_por, nivel_trilha, ordem, tempo_limite_seg)
select t.titulo, t.texto, t.dificuldade, true, null, t.nivel_trilha, t.ordem, 120
from _trilha t
where not exists (select 1 from public.exercicios e where e.nivel_trilha = t.nivel_trilha and e.ordem = t.ordem);

-- Nível 6 fora da trilha (registros e resultados preservados)
update public.exercicios set publicado = false, atualizado_em = now()
where nivel_trilha = 6 and publicado;

-- Conquistas que dependiam do Nível 6
update public.conquistas
set titulo = 'Trilha completa', descricao = 'Concluiu as 20 etapas da trilha, do Nível 1 ao 5.',
    criterio = 'etapas_completas', meta = 20
where codigo = 'nivel_extremo';
update public.conquistas
set descricao = 'Fez 100 sessões com 95% de precisão ou mais.', criterio = 'sessoes_precisao_95', meta = 100
where codigo = 'precisao_cirurgica';
update public.conquistas set descricao = 'Concluiu o Nível 5: digitação avançada.' where codigo = 'nivel_5_completo';
update public.conquistas set descricao = 'Concluiu o Nível 3: fileira inferior. O teclado de letras está completo.' where codigo = 'nivel_3_completo';

notify pgrst, 'reload schema';
