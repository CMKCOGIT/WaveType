-- ============================================================
-- 20261111000015_detalhe_das_tentativas.sql
-- Análise individual das atividades pelo professor.
--
-- 1. resultados_detalhes: o que o aluno digitou em cada tentativa, palavra
--    por palavra ([esperado, digitado, erros cometidos]), erros por tecla e
--    métricas extras (WPM bruto, consistência, erros corrigidos...).
--    Uma linha por resultado (chave = resultado_id). Tabela separada para
--    não pesar nas consultas de resultados.
-- 2. registrar_detalhes_resultado: o próprio aluno grava o detalhe logo
--    depois de gravar o resultado (até 15 minutos, uma vez só, com limites
--    de tamanho). Ninguém altera nem apaga depois.
-- 3. Leitura: a política reaproveita a de resultados (quem enxerga o
--    resultado enxerga o detalhe): o próprio aluno e o professor autor da
--    atividade / dono da turma, respeitando a transferência de conta.
-- 4. entregas_da_atividade e tentativas_do_aluno: telas do professor. Só o
--    autor da atividade consegue chamar.
--
-- Resultados já gravados continuam iguais; ficam só sem o detalhe palavra
-- por palavra (a tela avisa). Não apaga dados. Idempotente.
-- ============================================================

create table if not exists public.resultados_detalhes (
  resultado_id bigint primary key references public.resultados(id) on delete cascade,
  palavras jsonb not null,
  erros_por_tecla jsonb not null default '{}'::jsonb,
  ppm_bruto numeric(6,2),
  consistencia numeric(5,2),
  erros_corrigidos int,
  omitidas int,
  extras int,
  modo_erros text,
  criado_em timestamptz not null default now(),
  constraint resultados_detalhes_palavras_array check (jsonb_typeof(palavras) = 'array'),
  constraint resultados_detalhes_tamanho check (octet_length(palavras::text) <= 400000)
);

comment on table public.resultados_detalhes is
  'O que o aluno digitou em cada tentativa (palavra por palavra), para a análise individual do professor.';

alter table public.resultados_detalhes enable row level security;
revoke insert, update, delete on public.resultados_detalhes from anon, authenticated;
grant select on public.resultados_detalhes to authenticated;

-- Quem pode ver o resultado (política resultados_select) pode ver o detalhe.
drop policy if exists resultados_detalhes_select on public.resultados_detalhes;
create policy resultados_detalhes_select on public.resultados_detalhes
  for select to authenticated
  using (exists (select 1 from public.resultados r where r.id = resultados_detalhes.resultado_id));

-- ------------------------------------------------------------
-- Gravação pelo próprio aluno
-- ------------------------------------------------------------
create or replace function public.registrar_detalhes_resultado(p_resultado_id bigint, p_detalhes jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_palavras jsonb := p_detalhes->'palavras';
  v_item jsonb;
  v_num text;
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.resultados
    where id = p_resultado_id and aluno_id = auth.uid() and criado_em > now() - interval '15 minutes'
  ) then
    raise exception 'Resultado não encontrado.' using errcode = 'P0002';
  end if;
  if v_palavras is null or jsonb_typeof(v_palavras) <> 'array' or jsonb_array_length(v_palavras) > 3000 then
    raise exception 'Detalhe inválido.' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(v_palavras) loop
    if jsonb_typeof(v_item) <> 'array' or jsonb_array_length(v_item) <> 3
       or jsonb_typeof(v_item->0) <> 'string' or jsonb_typeof(v_item->1) <> 'string' or jsonb_typeof(v_item->2) <> 'number'
       or char_length(v_item->>0) > 200 or char_length(v_item->>1) > 400 then
      raise exception 'Detalhe inválido.' using errcode = '22023';
    end if;
  end loop;
  if p_detalhes ? 'erros_por_tecla' and jsonb_typeof(p_detalhes->'erros_por_tecla') <> 'object' then
    raise exception 'Detalhe inválido.' using errcode = '22023';
  end if;

  insert into public.resultados_detalhes (
    resultado_id, palavras, erros_por_tecla, ppm_bruto, consistencia, erros_corrigidos, omitidas, extras, modo_erros
  ) values (
    p_resultado_id,
    v_palavras,
    coalesce(p_detalhes->'erros_por_tecla', '{}'::jsonb),
    least(9999, greatest(0, nullif(p_detalhes->>'ppm_bruto', '')::numeric)),
    least(100, greatest(0, nullif(p_detalhes->>'consistencia', '')::numeric)),
    greatest(0, nullif(p_detalhes->>'erros_corrigidos', '')::int),
    greatest(0, nullif(p_detalhes->>'omitidas', '')::int),
    greatest(0, nullif(p_detalhes->>'extras', '')::int),
    left(p_detalhes->>'modo_erros', 20)
  )
  on conflict (resultado_id) do nothing;
end;
$$;

-- ------------------------------------------------------------
-- Professor: visão da turma numa atividade
--   Uma linha por aluno: os matriculados nas turmas que receberam a
--   atividade (mesmo sem tentativa = pendente) e quem já tentou.
-- ------------------------------------------------------------
create or replace function public.entregas_da_atividade(p_exercicio_id bigint)
returns table (
  aluno_id uuid, nome varchar, codigo_aluno varchar, turma_id bigint, turma_nome varchar,
  tentativas bigint, concluida boolean, melhor_precisao numeric, melhor_ppm numeric,
  menor_tempo int, media_erros numeric, ultima_tentativa timestamptz, com_detalhe boolean
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.exercicios e
    where e.id = p_exercicio_id and e.criado_por = auth.uid() and e.nivel_trilha is null
  ) then
    raise exception 'Atividade não encontrada.' using errcode = 'P0002';
  end if;
  return query
  with alunos as (
    select m.aluno_id, min(t.id) as turma_id
    from public.exercicio_turmas et
    join public.turmas t on t.id = et.turma_id and t.professor_id = auth.uid()
    join public.matriculas m on m.turma_id = et.turma_id and m.ativa
    where et.exercicio_id = p_exercicio_id
    group by m.aluno_id
    union
    select r.aluno_id, min(r.turma_id)
    from public.resultados r
    where r.exercicio_id = p_exercicio_id and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)
    group by r.aluno_id
  ),
  unicos as (
    select a.aluno_id, min(a.turma_id) as turma_id from alunos a group by a.aluno_id
  ),
  tentativas as (
    select r.* from public.resultados r
    where r.exercicio_id = p_exercicio_id and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)
  )
  select u.id, u.nome, u.codigo_aluno, un.turma_id, t.nome,
    count(x.id),
    coalesce(bool_or(x.concluido), false),
    max(x.precisao),
    max(x.ppm),
    min(x.tempo_seg) filter (where x.concluido),
    round(avg(x.erros), 1),
    max(x.criado_em),
    bool_or(d.resultado_id is not null)
  from unicos un
  join public.usuarios u on u.id = un.aluno_id
  left join public.turmas t on t.id = un.turma_id
  left join tentativas x on x.aluno_id = un.aluno_id
  left join public.resultados_detalhes d on d.resultado_id = x.id
  group by u.id, u.nome, u.codigo_aluno, un.turma_id, t.nome
  order by coalesce(bool_or(x.concluido), false) desc, count(x.id) desc, u.nome;
end;
$$;

-- ------------------------------------------------------------
-- Professor: tentativas de um aluno numa atividade, com o detalhe
-- ------------------------------------------------------------
create or replace function public.tentativas_do_aluno(p_exercicio_id bigint, p_aluno_id uuid)
returns table (
  resultado_id bigint, criado_em timestamptz, ppm numeric, precisao numeric, acertos int, erros int,
  tempo_seg int, tempo_limite_seg int, concluido boolean, concluiu_texto boolean, detalhes jsonb
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.exercicios e
    where e.id = p_exercicio_id and e.criado_por = auth.uid() and e.nivel_trilha is null
  ) then
    raise exception 'Atividade não encontrada.' using errcode = 'P0002';
  end if;
  return query
  select r.id, r.criado_em, r.ppm, r.precisao, r.acertos, r.erros, r.tempo_seg, r.tempo_limite_seg,
    r.concluido, r.concluiu_texto,
    case when d.resultado_id is null then null else jsonb_build_object(
      'palavras', d.palavras, 'erros_por_tecla', d.erros_por_tecla, 'ppm_bruto', d.ppm_bruto,
      'consistencia', d.consistencia, 'erros_corrigidos', d.erros_corrigidos, 'omitidas', d.omitidas,
      'extras', d.extras, 'modo_erros', d.modo_erros
    ) end
  from public.resultados r
  left join public.resultados_detalhes d on d.resultado_id = r.id
  where r.exercicio_id = p_exercicio_id and r.aluno_id = p_aluno_id
    and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)
  order by r.criado_em desc
  limit 50;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.registrar_detalhes_resultado(bigint, jsonb)',
    'public.entregas_da_atividade(bigint)',
    'public.tentativas_do_aluno(bigint, uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
