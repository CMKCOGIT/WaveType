-- ============================================================
-- 20261110000014_gestao_alunos_e_ranking.sql
-- Gestão de alunos do professor e ranking anônimo da turma.
--
-- 1. Só o professor coloca alunos nas turmas. entrar_na_turma (aluno digita
--    o código da turma) passa a recusar sempre e perde o EXECUTE. As outras
--    portas já eram fechadas: matriculas não tem INSERT para authenticated
--    e as RPCs que matriculam conferem se quem chama é o dono da turma.
-- 2. Aluno que já tem cadastro (em outra turma/matéria): o professor busca
--    pelo código individual (buscar_aluno_por_codigo), confere os dados
--    básicos e confirma (adicionar_aluno_existente). Nenhuma conta nova é
--    criada: a matrícula liga o MESMO usuarios.id à nova turma, então o
--    histórico, as conquistas e as outras turmas continuam iguais.
--    O modelo já permitia isso: matriculas tem chave única (aluno_id,
--    turma_id), ou seja, um aluno em várias turmas, uma vez em cada.
-- 3. Importação de planilha: professor_importar_alunos valida os nomes no
--    banco, ignora quem já está na turma (mesmo nome, sem diferenciar
--    acentos e maiúsculas) e repetições dentro do arquivo, e cria o resto
--    com professor_criar_alunos (mesmas regras de login e senha).
-- 4. alunos_da_turma devolve também o código do aluno (para exportar).
-- 5. ranking_turma: top 5 anônimo (animais por posição) + a posição de
--    quem consulta. ranking_exercicio deixa de devolver nomes de colegas.
--
-- Não apaga nem altera dados. Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- Nome normalizado (comparação de duplicados): minúsculas, sem acentos,
-- espaços simples.
-- ------------------------------------------------------------
create or replace function public.nome_normalizado(p_nome text)
returns text
language sql immutable
as $$
  select lower(translate(
    trim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')),
    'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝýÿ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYyy'
  ));
$$;

-- ------------------------------------------------------------
-- 1. Aluno não entra mais em turma pelo código
-- ------------------------------------------------------------
create or replace function public.entrar_na_turma(p_codigo varchar)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Só o professor pode adicionar alunos às turmas. Passe o seu código de aluno para ele.'
    using errcode = '42501';
end;
$$;
revoke all on function public.entrar_na_turma(character varying) from public, anon, authenticated;

-- adicionar_aluno_por_id / adicionar_aluno (migrações 02 e 07) continuam
-- existindo para o professor, agora também exigindo turma ativa.
create or replace function public.adicionar_aluno_por_id(p_turma_id bigint, p_aluno_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_professor_da_turma(p_turma_id) then
    raise exception 'Você não tem permissão para gerenciar esta turma.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.turmas where id = p_turma_id and status = 'ativa') then
    raise exception 'Esta turma está encerrada. Reabra a turma para adicionar alunos.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.usuarios where id = p_aluno_id and tipo::text = 'aluno' and tipo_definido and ativo
  ) then
    raise exception 'Nenhum aluno encontrado com este código.' using errcode = 'P0002';
  end if;

  insert into public.matriculas (aluno_id, turma_id)
  values (p_aluno_id, p_turma_id)
  on conflict (aluno_id, turma_id) do update set ativa = true;
end;
$$;

-- ------------------------------------------------------------
-- 2. Aluno existente pelo código individual
-- ------------------------------------------------------------
create or replace function public.aluno_pelo_identificador(p_identificador text)
returns uuid
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_texto text := trim(coalesce(p_identificador, ''));
  v_id uuid;
begin
  if v_texto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_id := v_texto::uuid;
  elsif upper(replace(v_texto, '-', '')) ~ '^[A-HJ-NP-Z2-9]{6}$' then
    select id into v_id from public.usuarios where codigo_aluno = upper(replace(v_texto, '-', ''));
  else
    return null;
  end if;
  -- Só contas de aluno ativas podem ser matriculadas
  select id into v_id from public.usuarios
  where id = v_id and tipo::text = 'aluno' and tipo_definido and ativo;
  return v_id;
end;
$$;
revoke all on function public.aluno_pelo_identificador(text) from public, anon, authenticated;

-- Dados mínimos para o professor confirmar que é a pessoa certa: nome,
-- código, quantas turmas ativas ela tem e se já está nesta turma.
-- Não devolve e-mail, usuário da escola nem resultados.
create or replace function public.buscar_aluno_por_codigo(p_turma_id bigint, p_codigo text)
returns table (aluno_id uuid, nome varchar, codigo_aluno varchar, turmas_ativas bigint, ja_na_turma boolean, matricula_inativa boolean)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_aluno uuid;
begin
  if auth.uid() is null or coalesce(public.meu_tipo(), '') <> 'professor' then
    raise exception 'Só professores podem buscar alunos.' using errcode = '42501';
  end if;
  if not public.eh_professor_da_turma(p_turma_id) then
    raise exception 'Você não tem permissão para gerenciar esta turma.' using errcode = '42501';
  end if;
  v_aluno := public.aluno_pelo_identificador(p_codigo);
  if v_aluno is null then
    raise exception 'Nenhum aluno encontrado com este código. Confira as 6 letras e números com o aluno.' using errcode = 'P0002';
  end if;
  return query
  select u.id, u.nome, u.codigo_aluno,
    (select count(*) from public.matriculas m join public.turmas t on t.id = m.turma_id
      where m.aluno_id = u.id and m.ativa and t.status = 'ativa'),
    exists (select 1 from public.matriculas m where m.aluno_id = u.id and m.turma_id = p_turma_id and m.ativa),
    exists (select 1 from public.matriculas m where m.aluno_id = u.id and m.turma_id = p_turma_id and not m.ativa)
  from public.usuarios u
  where u.id = v_aluno;
end;
$$;

-- Confirmação: liga o cadastro existente à turma. Devolve 'adicionado',
-- 'reativado' (já tinha passado pela turma) ou 'ja_estava'.
create or replace function public.adicionar_aluno_existente(p_turma_id bigint, p_codigo text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_aluno uuid;
  v_ativa boolean;
begin
  if auth.uid() is null or coalesce(public.meu_tipo(), '') <> 'professor' then
    raise exception 'Só professores podem adicionar alunos.' using errcode = '42501';
  end if;
  if not public.eh_professor_da_turma(p_turma_id) then
    raise exception 'Você não tem permissão para gerenciar esta turma.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.turmas where id = p_turma_id and status = 'ativa') then
    raise exception 'Esta turma está encerrada. Reabra a turma para adicionar alunos.' using errcode = '22023';
  end if;
  v_aluno := public.aluno_pelo_identificador(p_codigo);
  if v_aluno is null then
    raise exception 'Nenhum aluno encontrado com este código.' using errcode = 'P0002';
  end if;

  select ativa into v_ativa from public.matriculas where aluno_id = v_aluno and turma_id = p_turma_id;
  if v_ativa then
    return 'ja_estava';
  end if;
  insert into public.matriculas (aluno_id, turma_id, ativa)
  values (v_aluno, p_turma_id, true)
  on conflict (aluno_id, turma_id) do update set ativa = true;
  return case when v_ativa is null then 'adicionado' else 'reativado' end;
end;
$$;

-- ------------------------------------------------------------
-- 3. Importação de planilha
--   p_alunos: [{ "nome": "...", "login_base": "...", "senha": "..." }, ...]
--   Devolve uma linha por item recebido, na mesma ordem (indice começa em 0):
--   situacao = 'criado' | 'ja_na_turma' | 'repetido_no_arquivo'.
-- ------------------------------------------------------------
create or replace function public.professor_importar_alunos(p_turma_id bigint, p_alunos jsonb)
returns table (indice int, nome text, situacao text, novo_id uuid, novo_login text)
language plpgsql security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_item jsonb;
  v_i int := -1;
  v_nome text;
  v_chave text;
  v_vistos text[] := '{}';
  v_criar jsonb := '[]'::jsonb;
  v_indices int[] := '{}';
  v_status text[] := '{}';
  v_nomes text[] := '{}';
  v_criado record;
  v_n int := 0;
begin
  if auth.uid() is null or coalesce(public.meu_tipo(), '') <> 'professor' then
    raise exception 'Só professores podem importar alunos.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.turmas t where t.id = p_turma_id and t.professor_id = auth.uid() and t.status = 'ativa') then
    raise exception 'Turma não encontrada ou encerrada.' using errcode = 'P0002';
  end if;
  if p_alunos is null or jsonb_typeof(p_alunos) <> 'array' or jsonb_array_length(p_alunos) = 0 then
    raise exception 'A planilha não tem nomes para importar.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_alunos) > 60 then
    raise exception 'Envie no máximo 60 alunos por vez.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_alunos) loop
    v_i := v_i + 1;
    v_nome := left(trim(regexp_replace(coalesce(v_item->>'nome', ''), '\s+', ' ', 'g')), 120);
    v_chave := public.nome_normalizado(v_nome);
    v_nomes := v_nomes || v_nome;
    if v_chave = any (v_vistos) then
      v_status := v_status || 'repetido_no_arquivo'::text;
    elsif exists (
      select 1 from public.matriculas m join public.usuarios u on u.id = m.aluno_id
      where m.turma_id = p_turma_id and m.ativa and public.nome_normalizado(u.nome) = v_chave
    ) then
      v_status := v_status || 'ja_na_turma'::text;
    else
      v_status := v_status || 'criar'::text;
      v_criar := v_criar || jsonb_build_array(v_item);
      v_indices := v_indices || v_i;
    end if;
    v_vistos := v_vistos || v_chave;
  end loop;

  -- Cria os novos (professor_criar_alunos valida nome, usuário e senha e
  -- desfaz tudo se algum item for inválido).
  if jsonb_array_length(v_criar) > 0 then
    for v_criado in select * from public.professor_criar_alunos(p_turma_id, v_criar) loop
      v_n := v_n + 1;
      indice := v_indices[v_n];
      nome := v_criado.novo_nome;
      situacao := 'criado';
      novo_id := v_criado.novo_id;
      novo_login := v_criado.novo_login;
      return next;
    end loop;
  end if;

  for v_i in 1 .. coalesce(array_length(v_status, 1), 0) loop
    if v_status[v_i] <> 'criar' then
      indice := v_i - 1;
      nome := v_nomes[v_i];
      situacao := v_status[v_i];
      novo_id := null;
      novo_login := null;
      return next;
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 4. Alunos da turma com o código individual (exportação)
-- ------------------------------------------------------------
drop function if exists public.alunos_da_turma(bigint);
create function public.alunos_da_turma(p_turma_id bigint)
returns table (
  aluno_id uuid, nome varchar, email varchar, entrou_em timestamptz,
  sessoes bigint, ppm_medio numeric, precisao_media numeric,
  atividades_concluidas bigint, ultima_pratica timestamptz, codigo_aluno varchar
)
language plpgsql
stable security definer
set search_path = public
as $$
begin
  if not public.eh_professor_da_turma(p_turma_id) then
    raise exception 'Você não tem permissão para ver esta turma.' using errcode = '42501';
  end if;
  return query
  select u.id, u.nome, u.email, m.entrou_em,
    count(r.id),
    round(avg(r.ppm), 1),
    round(avg(r.precisao), 1),
    count(distinct r.exercicio_id) filter (where r.concluido),
    max(r.criado_em),
    u.codigo_aluno
  from public.matriculas m
  join public.usuarios u on u.id = m.aluno_id
  left join public.resultados r on r.aluno_id = u.id and r.turma_id = p_turma_id and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)
  where m.turma_id = p_turma_id and m.ativa
  group by u.id, u.nome, u.email, m.entrou_em, u.codigo_aluno
  order by u.nome;
end;
$$;

-- ------------------------------------------------------------
-- 5. Ranking anônimo da turma
--   Pontuação = média de "WPM com precisão" (WPM × precisão ÷ 100) dos 20
--   treinos concluídos mais recentes do aluno desde que entrou na turma
--   (atividades desta turma + trilha oficial; prática livre não conta,
--   porque o tamanho do texto é livre). Desempate: precisão média e número
--   de treinos. Só alunos ativos da turma entram.
--   Devolve o top 5 com o animal da posição e, se quem consulta estiver
--   fora dele, mais uma linha com a própria posição (animal = null).
--   Nunca devolve nome, e-mail ou ID de colegas: só "voce" = true/false.
-- ------------------------------------------------------------
create or replace function public.ranking_turma(p_turma_id bigint)
returns table (
  posicao int, animal text, emoji text, pontuacao numeric, ppm numeric,
  precisao numeric, treinos int, voce boolean, participantes int
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not (public.eh_aluno_da_turma(p_turma_id) or public.eh_professor_da_turma(p_turma_id)) then
    raise exception 'Você não participa desta turma.' using errcode = '42501';
  end if;
  return query
  with alunos as (
    select m.aluno_id, m.entrou_em
    from public.matriculas m
    join public.usuarios u on u.id = m.aluno_id and u.ativo
    where m.turma_id = p_turma_id and m.ativa
  ),
  treinos as (
    select r.aluno_id, r.ppm, r.precisao,
      row_number() over (partition by r.aluno_id order by r.criado_em desc) as n
    from public.resultados r
    join alunos a on a.aluno_id = r.aluno_id
    left join public.exercicios e on e.id = r.exercicio_id
    where r.concluido
      and r.criado_em >= a.entrou_em
      and (r.turma_id = p_turma_id or (r.turma_id is null and e.nivel_trilha is not null))
      and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)
  ),
  medias as (
    select t.aluno_id,
      round(avg(t.ppm * t.precisao / 100), 1) as pontos,
      round(avg(t.ppm), 1) as ppm_m,
      round(avg(t.precisao), 1) as prec_m,
      count(*)::int as qtd
    from treinos t
    where t.n <= 20
    group by t.aluno_id
  ),
  ordenado as (
    select m.*, row_number() over (order by m.pontos desc, m.prec_m desc, m.qtd desc, m.aluno_id)::int as pos,
      count(*) over ()::int as total
    from medias m
  )
  select o.pos,
    case o.pos when 1 then 'Guepardo' when 2 then 'Lebre' when 3 then 'Raposa' when 4 then 'Cavalo' when 5 then 'Gato' end,
    case o.pos when 1 then '🐆' when 2 then '🐇' when 3 then '🦊' when 4 then '🐎' when 5 then '🐈' end,
    o.pontos, o.ppm_m, o.prec_m, o.qtd, o.aluno_id = v_uid, o.total
  from ordenado o
  where o.pos <= 5 or o.aluno_id = v_uid
  order by o.pos;
end;
$$;

-- Ranking por atividade: colegas ficam anônimos para quem não é o autor.
CREATE OR REPLACE FUNCTION public.ranking_exercicio(p_exercicio_id bigint)
 RETURNS TABLE(aluno_nome character varying, ppm numeric, precisao numeric, criado_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select nome, ppm, precisao, criado_em
  from (
    select distinct on (r.aluno_id)
      case
        when r.aluno_id = auth.uid() then u.nome
        when exists (select 1 from public.exercicios e where e.id = p_exercicio_id and e.criado_por = auth.uid()) then u.nome
        else null
      end::varchar as nome,
      r.ppm, r.precisao, r.criado_em
    from public.resultados r
    join public.usuarios u on u.id = r.aluno_id
    where r.exercicio_id = p_exercicio_id and public.pode_ver_exercicio(p_exercicio_id)
      and (r.turma_id is null or r.aluno_id = auth.uid() or not public.anterior_a_transferencia(r.aluno_id, r.criado_em))
    order by r.aluno_id, r.ppm desc, r.precisao desc
  ) melhores
  order by ppm desc, precisao desc
  limit 20;
$function$;

-- ------------------------------------------------------------
-- Permissões
-- ------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.buscar_aluno_por_codigo(bigint, text)',
    'public.adicionar_aluno_existente(bigint, text)',
    'public.professor_importar_alunos(bigint, jsonb)',
    'public.alunos_da_turma(bigint)',
    'public.ranking_turma(bigint)',
    'public.ranking_exercicio(bigint)',
    'public.adicionar_aluno_por_id(bigint, uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
