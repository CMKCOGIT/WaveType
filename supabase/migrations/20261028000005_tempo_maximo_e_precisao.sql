-- ============================================================
-- 05 · Tempo máximo e precisão mínima para concluir exercícios
-- ------------------------------------------------------------
-- Idempotente.
--
-- Trilha oficial (níveis 1 a 6), para usuário e aluno:
--   conclui com precisão ACIMA de 85% (85% exatos não concluem),
--   terminando o texto dentro do tempo máximo do exercício.
-- Atividades de professor:
--   o professor define o tempo máximo e a precisão mínima.
--
-- Resultados antigos não são recalculados: o progresso que cada pessoa
-- já tinha continua valendo. As regras novas valem a partir de agora.
-- ============================================================

alter table public.resultados add column if not exists concluiu_texto boolean not null default true;
alter table public.resultados add column if not exists tempo_limite_seg int;

-- ------------------------------------------------------------
-- Tempo máximo da trilha
-- O motor de digitação repete textos curtos até somar pelo menos 150
-- caracteres (MIN_CHARS_EXERCICIO em js/script.js); o tempo considera
-- o texto que a pessoa realmente digita.
-- Ritmo exigido por nível (WPM, 5 caracteres por palavra):
--   1: 10 · 2: 12 · 3: 14 · 4: 18 · 5: 22 · 6: 25
-- Arredondado para cima em múltiplos de 5 s, mínimo de 30 s.
-- ------------------------------------------------------------
create or replace function public.tempo_limite_trilha(p_texto text, p_nivel int)
returns int
language plpgsql
immutable
as $$
declare
  v_texto text := regexp_replace(trim(coalesce(p_texto, '')), '\s+', ' ', 'g');
  v_ciclo int := char_length(v_texto) + 1;
  v_vezes int;
  v_caracteres int;
  v_wpm numeric := case p_nivel when 1 then 10 when 2 then 12 when 3 then 14 when 4 then 18 when 5 then 22 else 25 end;
  v_segundos numeric;
begin
  if char_length(v_texto) = 0 then
    return 60;
  end if;
  v_vezes := greatest(1, ceil(150::numeric / v_ciclo)::int);
  v_caracteres := v_vezes * v_ciclo - 1;
  v_segundos := v_caracteres / (v_wpm * 5 / 60.0);
  return greatest(30, (ceil(v_segundos / 5) * 5)::int);
end;
$$;

create or replace function public.precisao_minima_trilha(p_nivel int)
returns numeric
language sql
immutable
as $$
  select 85::numeric;
$$;

-- Exercícios da trilha recebem o tempo calculado (agora e sempre que o texto mudar).
create or replace function public.exercicios_tempo_trilha()
returns trigger
language plpgsql
as $$
begin
  if new.nivel_trilha is not null then
    new.tempo_limite_seg := public.tempo_limite_trilha(new.texto_referencia, new.nivel_trilha);
  end if;
  return new;
end;
$$;

drop trigger if exists exercicios_tempo_trilha on public.exercicios;
create trigger exercicios_tempo_trilha
  before insert or update of texto_referencia, nivel_trilha on public.exercicios
  for each row execute function public.exercicios_tempo_trilha();

update public.exercicios
set tempo_limite_seg = public.tempo_limite_trilha(texto_referencia, nivel_trilha)
where nivel_trilha is not null
  and tempo_limite_seg is distinct from public.tempo_limite_trilha(texto_referencia, nivel_trilha);

-- ------------------------------------------------------------
-- Validação dos resultados (substitui a versão da migração 03)
-- ------------------------------------------------------------
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
  v_no_tempo boolean;
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
  new.concluiu_texto := coalesce(new.concluiu_texto, true);

  if new.exercicio_id is null then -- prática livre
    new.turma_id := null;
    new.tempo_limite_seg := null;
    return new;
  end if;

  select id, nivel_trilha, criado_por, meta_precisao, publicado, tempo_limite_seg
  into v_ex
  from public.exercicios where id = new.exercicio_id;

  if v_ex.id is null then
    raise exception 'Exercício não encontrado.' using errcode = 'P0002';
  end if;

  -- O limite usado fica gravado junto do resultado (o exercício pode mudar depois).
  new.tempo_limite_seg := v_ex.tempo_limite_seg;
  v_no_tempo := new.concluiu_texto and (v_ex.tempo_limite_seg is null or new.tempo_seg <= v_ex.tempo_limite_seg);

  if v_ex.nivel_trilha is not null then -- trilha oficial
    new.turma_id := null;
    v_minima := public.precisao_minima_trilha(v_ex.nivel_trilha);
    new.concluido := v_no_tempo and (v_minima is null or new.precisao > v_minima);
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

  new.concluido := v_no_tempo and (v_ex.meta_precisao is null or new.precisao >= v_ex.meta_precisao);
  return new;
end;
$$;

revoke all on function public.resultados_validar() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Atividades: tempo máximo e precisão mínima passam a ser obrigatórios
-- ------------------------------------------------------------
create or replace function public.salvar_atividade(
  p_id bigint,
  p_titulo text,
  p_instrucoes text,
  p_texto text,
  p_nivel text,
  p_tempo_limite_seg int,
  p_prazo timestamptz,
  p_meta_precisao numeric,
  p_turmas bigint[],
  p_publicado boolean default true
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id bigint := p_id;
  v_turmas bigint[] := coalesce(p_turmas, '{}');
begin
  if v_uid is null or coalesce(public.meu_tipo(), '') <> 'professor' then
    raise exception 'Apenas professores podem criar atividades.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_titulo, ''))) < 3 then
    raise exception 'Informe um título com pelo menos 3 caracteres.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_texto, ''))) < 5 then
    raise exception 'Informe o texto que o aluno deverá digitar.' using errcode = '22023';
  end if;
  if p_nivel not in ('facil', 'medio', 'avancado') then
    raise exception 'Nível de dificuldade inválido.' using errcode = '22023';
  end if;
  if p_tempo_limite_seg is null or p_tempo_limite_seg < 10 or p_tempo_limite_seg > 3600 then
    raise exception 'Defina o tempo máximo entre 10 e 3600 segundos.' using errcode = '22023';
  end if;
  if p_meta_precisao is null or p_meta_precisao < 0 or p_meta_precisao > 100 then
    raise exception 'Defina a precisão mínima entre 0 e 100%%.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_turmas) as t(id)
    where not exists (select 1 from public.turmas tt where tt.id = t.id and tt.professor_id = v_uid)
  ) then
    raise exception 'Você só pode atribuir atividades às suas turmas.' using errcode = '42501';
  end if;

  if v_id is null then
    insert into public.exercicios (titulo, instrucoes, texto_referencia, nivel, tempo_limite_seg,
                                   prazo, meta_precisao, publicado, criado_por)
    values (left(trim(p_titulo), 150), nullif(trim(p_instrucoes), ''), trim(p_texto), p_nivel,
            p_tempo_limite_seg, p_prazo, p_meta_precisao, coalesce(p_publicado, true), v_uid)
    returning id into v_id;
  else
    update public.exercicios
    set titulo = left(trim(p_titulo), 150),
        instrucoes = nullif(trim(p_instrucoes), ''),
        texto_referencia = trim(p_texto),
        nivel = p_nivel,
        tempo_limite_seg = p_tempo_limite_seg,
        prazo = p_prazo,
        meta_precisao = p_meta_precisao,
        publicado = coalesce(p_publicado, publicado),
        atualizado_em = now()
    where id = v_id and criado_por = v_uid and nivel_trilha is null;
    if not found then
      raise exception 'Atividade não encontrada.' using errcode = 'P0002';
    end if;
  end if;

  delete from public.exercicio_turmas where exercicio_id = v_id and turma_id <> all (v_turmas);
  insert into public.exercicio_turmas (exercicio_id, turma_id)
  select v_id, t.id from unnest(v_turmas) as t(id)
  on conflict do nothing;

  return v_id;
end;
$$;

revoke all on function public.salvar_atividade(bigint, text, text, text, text, integer, timestamp with time zone, numeric, bigint[], boolean) from public, anon;
grant execute on function public.salvar_atividade(bigint, text, text, text, text, integer, timestamp with time zone, numeric, bigint[], boolean) to authenticated;
