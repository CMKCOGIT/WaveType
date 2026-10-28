-- ============================================================
-- 03 · Trilha oficial: exercício 20 de cada nível, Nível 6 (Extremo)
--      e regra de conclusão (precisão > 85% no Nível 6)
-- ------------------------------------------------------------
-- Idempotente: cada exercício só é inserido se ainda não existir
-- (mesmo nivel_trilha + ordem). Nada existente é alterado ou apagado.
-- ============================================================

-- ------------------------------------------------------------
-- Integridade da trilha
-- ------------------------------------------------------------

-- O banco pode ter uma regra antiga limitando nivel_trilha a 1..5
-- (ex.: exercicios_nivel_trilha_check). Ela é trocada por 1..6.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.exercicios'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%nivel_trilha%'
      and conname not in ('exercicios_trilha_ordem_check', 'exercicios_nivel_trilha_check')
  loop
    execute format('alter table public.exercicios drop constraint %I', c.conname);
  end loop;

  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.exercicios'::regclass and conname = 'exercicios_nivel_trilha_check'
      and pg_get_constraintdef(oid) not ilike '%6%'
  ) then
    alter table public.exercicios drop constraint exercicios_nivel_trilha_check;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.exercicios'::regclass and conname = 'exercicios_nivel_trilha_check'
  ) then
    alter table public.exercicios
      add constraint exercicios_nivel_trilha_check check (nivel_trilha is null or nivel_trilha between 1 and 6);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercicios_trilha_ordem_check') then
    alter table public.exercicios
      add constraint exercicios_trilha_ordem_check
      check (nivel_trilha is null or (nivel_trilha between 1 and 6 and ordem between 1 and 20))
      not valid;
  end if;

  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'uq_exercicios_trilha') then
    if exists (
      select 1 from public.exercicios where nivel_trilha is not null
      group by nivel_trilha, ordem having count(*) > 1
    ) then
      raise notice 'Há exercícios repetidos na trilha (mesmo nível e ordem). O índice único não foi criado: rode supabase/verificacao.sql para ver quais são.';
    else
      create unique index uq_exercicios_trilha on public.exercicios (nivel_trilha, ordem) where nivel_trilha is not null;
    end if;
  end if;
end $$;

-- ------------------------------------------------------------
-- Conteúdo novo
-- titulo_padrao só é usado se o exercício 19 do mesmo nível não tiver
-- um título no formato "... 19" (aí o 20 segue o mesmo formato).
-- ------------------------------------------------------------
create temporary table _trilha_nova (
  nivel_trilha int,
  ordem int,
  titulo_padrao text,
  texto text,
  dificuldade text
) on commit drop;

insert into _trilha_nova values
  -- Exercício 20 dos níveis 1 a 5 (última etapa de cada nível: combinação)
  (1, 20, 'Combinação das fileiras 20',
   'a sala da gala falha haja salada faça a laçada a alga da sala fala alfafa', 'facil'),
  (2, 20, 'Fileira superior completa 20',
   'o pirata quer ouro e prata a tropa sai da torre quatro patos e outra pipa', 'facil'),
  (3, 20, 'Fileira inferior completa 20',
   'a vizinha faz bolo de coco com banana e o menino vibra com o zumbido da abelha', 'facil'),
  (4, 20, 'Frases completas 20',
   'A prática diária transforma pequenos avanços em grandes conquistas no teclado.', 'medio'),
  (5, 20, 'Textos completos 20',
   'Digitar bem não é apenas ser rápido. É manter o ritmo, errar menos e corrigir com calma. Quem treina um pouco todos os dias percebe que as mãos passam a encontrar as teclas sozinhas, e a atenção fica livre para o que realmente importa: as ideias.', 'avancado'),

  -- Nível 6 · Etapa 1 · Palavras monstruosas
  (6, 1, 'Palavras monstruosas 1',
   'otorrinolaringologista paralelepípedo inconstitucionalidade', 'avancado'),
  (6, 2, 'Palavras monstruosas 2',
   'desproporcionalidade interdisciplinaridade incompreensibilidade responsabilização', 'avancado'),
  (6, 3, 'Palavras monstruosas 3',
   'eletroencefalograma desoxirribonucleico anticonstitucionalissimamente', 'avancado'),
  (6, 4, 'Palavras monstruosas 4',
   'pneumoultramicroscopicossilicovulcanoconiótico hipopotomonstrosesquipedaliofobia', 'avancado'),
  (6, 5, 'Palavras monstruosas 5',
   'Paralelepípedos desproporcionais atrapalharam otorrinolaringologistas extraordinariamente descontraídos.', 'avancado'),

  -- Nível 6 · Etapa 2 · Chuva de acentos
  (6, 6, 'Chuva de acentos 1',
   'pão mãe avô avó café saúde órgão ímã você três até após também', 'avancado'),
  (6, 7, 'Chuva de acentos 2',
   'Açaí, maçã, caçarola, pêssego, cônjuge, ênfase, bênção, órfã, juízes e baú.', 'avancado'),
  (6, 8, 'Chuva de acentos 3',
   'Não há razão para pânico: a exceção também é útil quando você está à frente da questão.', 'avancado'),
  (6, 9, 'Chuva de acentos 4',
   'Eles têm, vêm, contêm e mantêm; ninguém pôde pôr à prova o que alguém já sabia através da intuição.', 'avancado'),
  (6, 10, 'Chuva de acentos 5',
   'Ação e reação: a comissão só começará a votação após três sessões, às dez horas, no saguão principal do órgão público.', 'avancado'),

  -- Nível 6 · Etapa 3 · Maiúsculas e pontuação
  (6, 11, 'Maiúsculas e pontuação 1',
   'Rio de Janeiro, São Paulo e Belo Horizonte ficam no Sudeste; Manaus e Belém, no Norte.', 'avancado'),
  (6, 12, 'Maiúsculas e pontuação 2',
   'Atenção: o relatório (versão final) deve ser enviado até sexta-feira - sem atrasos!', 'avancado'),
  (6, 13, 'Maiúsculas e pontuação 3',
   '"Quem lê mais, escreve melhor", disse a Profa. Ana; e o aluno respondeu: "Concordo!"', 'avancado'),
  (6, 14, 'Maiúsculas e pontuação 4',
   'Perguntas-chave: Onde? Quando? Por quê? Como? Respostas curtas, objetivas e bem-feitas.', 'avancado'),
  (6, 15, 'Maiúsculas e pontuação 5',
   'A ONU, a OMS e a UNESCO (criadas no século XX) publicaram dados; veja o Anexo II, item C, e a Seção IV.', 'avancado'),

  -- Nível 6 · Etapa 4 · Números e símbolos
  (6, 16, 'Números e símbolos 1',
   'Pedido 4721: 3 cadernos a R$ 12,90 e 2 canetas a R$ 4,35 = R$ 47,40 no total.', 'avancado'),
  (6, 17, 'Números e símbolos 2',
   'E-mail: contato@wavetype.com.br | Senha: T3cl@d0#2026! | Código: X9-Q7-K4', 'avancado'),
  (6, 18, 'Números e símbolos 3',
   'Fórmula: (a + b)^2 = a^2 + 2*a*b + b^2; se a = 3 e b = 4, então (3 + 4)^2 = 49.', 'avancado'),
  (6, 19, 'Números e símbolos 4',
   '50% de desconto & frete grátis: de R$ 1.299,00 por R$ 649,50 até 31/12/2026 às 23h59.', 'avancado'),
  (6, 20, 'Números e símbolos 5',
   'Relatório #12, 1o trimestre: receita de R$ 85.430,75 (+18,6%), despesas de R$ 61.209,10 (-4,2%) e lucro de R$ 24.221,65; meta para 2026: crescer 25% & cortar 7,5% dos custos.', 'avancado');

insert into public.exercicios (titulo, texto_referencia, tempo_limite_seg, nivel, publicado, criado_por, nivel_trilha, ordem)
select
  coalesce(
    case when anterior.titulo ~ '\m19\M' then regexp_replace(anterior.titulo, '\m19\M', '20') end,
    n.titulo_padrao
  ),
  n.texto,
  coalesce(anterior.tempo_limite_seg, case when n.nivel_trilha = 6 then 180 else 120 end),
  coalesce(case when n.nivel_trilha < 6 then anterior.nivel end, n.dificuldade),
  true,
  null,
  n.nivel_trilha,
  n.ordem
from _trilha_nova n
left join lateral (
  select e.titulo, e.tempo_limite_seg, e.nivel
  from public.exercicios e
  where e.nivel_trilha = n.nivel_trilha and e.ordem = n.ordem - 1
  order by e.id
  limit 1
) anterior on n.ordem = 20 and n.nivel_trilha < 6
where not exists (
  select 1 from public.exercicios e
  where e.nivel_trilha = n.nivel_trilha and e.ordem = n.ordem
);

-- ------------------------------------------------------------
-- Regra de conclusão
--   Níveis 1 a 5: qualquer tentativa conclui (regra atual).
--   Nível 6: precisão estritamente maior que 85%.
--   Atividades de professor: precisão >= meta da atividade (se houver).
-- ------------------------------------------------------------
create or replace function public.precisao_minima_trilha(p_nivel int)
returns numeric
language sql
immutable
as $$
  select case when p_nivel = 6 then 85::numeric end;
$$;

create or replace function public.resultados_validar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ex record;
  v_turma bigint;
  v_minima numeric;
begin
  if v_uid is not null then
    if new.aluno_id is distinct from v_uid then
      raise exception 'Resultado inválido.' using errcode = '42501';
    end if;
    if not exists (select 1 from public.usuarios where id = v_uid and tipo_definido) then
      raise exception 'Conclua seu cadastro antes de praticar.' using errcode = '42501';
    end if;
  end if;

  new.concluido := true;

  if new.exercicio_id is null then -- prática livre
    new.turma_id := null;
    return new;
  end if;

  select id, nivel_trilha, criado_por, meta_precisao, publicado
  into v_ex
  from public.exercicios where id = new.exercicio_id;

  if v_ex.id is null then
    raise exception 'Exercício não encontrado.' using errcode = 'P0002';
  end if;

  if v_ex.nivel_trilha is not null then -- trilha oficial
    new.turma_id := null;
    v_minima := public.precisao_minima_trilha(v_ex.nivel_trilha);
    new.concluido := v_minima is null or new.precisao > v_minima;
    return new;
  end if;

  -- Atividade de professor: o aluno precisa estar em uma turma que a recebeu.
  if v_uid is not null and v_ex.criado_por is distinct from v_uid then
    select et.turma_id into v_turma
    from public.exercicio_turmas et
    join public.matriculas m on m.turma_id = et.turma_id and m.aluno_id = v_uid and m.ativa
    where et.exercicio_id = new.exercicio_id and v_ex.publicado
    order by (et.turma_id = new.turma_id) desc nulls last, et.turma_id
    limit 1;

    if v_turma is null then
      raise exception 'Você não tem acesso a esta atividade.' using errcode = '42501';
    end if;
    new.turma_id := v_turma;
  end if;

  new.concluido := v_ex.meta_precisao is null or new.precisao >= v_ex.meta_precisao;
  return new;
end;
$$;

drop trigger if exists resultados_validar on public.resultados;
create trigger resultados_validar
  before insert on public.resultados
  for each row execute function public.resultados_validar();

-- Resultados antigos do Nível 6 passam a seguir a regra.
update public.resultados r
set concluido = (r.precisao > 85)
from public.exercicios e
where e.id = r.exercicio_id and e.nivel_trilha = 6 and r.concluido is distinct from (r.precisao > 85);

-- Resultados antigos de atividades com meta de precisão.
update public.resultados r
set concluido = (r.precisao >= e.meta_precisao)
from public.exercicios e
where e.id = r.exercicio_id and e.nivel_trilha is null and e.meta_precisao is not null
  and r.concluido is distinct from (r.precisao >= e.meta_precisao);

revoke all on function public.resultados_validar() from public, anon, authenticated;
