-- ============================================================
-- 20261105000011_transferencia_nos_relatorios.sql
-- Conta transferida para pessoal: o professor e a escola deixam de ver
-- os dados individuais E as médias que usam esses dados.
--
-- Regra: o que o aluno produziu ANTES da transferência fica fora de tudo o
-- que o professor vê (resultados, médias da turma, atividades, ranking da
-- atividade, nível de partida e sugestões). Se depois ele voltar a uma turma
-- pelo código, o professor vê só o que vier dali em diante.
--
-- Só troca funções e políticas. Não altera dados. Idempotente.
-- ============================================================

create or replace function public.anterior_a_transferencia(p_aluno uuid, p_em timestamptz)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.contas_escolares
    where usuario_id = p_aluno and status = 'pessoal' and transferida_em is not null and p_em <= transferida_em
  );
$$;
revoke all on function public.anterior_a_transferencia(uuid, timestamptz) from public, anon;
grant execute on function public.anterior_a_transferencia(uuid, timestamptz) to authenticated;

-- Resultados (substitui a regra da migração 09)
drop policy if exists resultados_select on public.resultados;
create policy resultados_select on public.resultados
  for select to authenticated
  using (
    aluno_id = auth.uid()
    or (
      not public.anterior_a_transferencia(resultados.aluno_id, resultados.criado_em)
      and (
        (turma_id is not null and public.eh_professor_da_turma(turma_id))
        or exists (
          select 1 from public.exercicios e
          where e.id = resultados.exercicio_id and e.nivel_trilha is null and e.criado_por = auth.uid()
        )
      )
    )
  );

-- Professor do aluno (nivelamento e sugestões): só o que veio depois da transferência
create or replace function public.eh_professor_do_aluno(p_aluno uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.matriculas m join public.turmas t on t.id = m.turma_id
    where m.aluno_id = p_aluno and m.ativa and t.professor_id = auth.uid()
  );
$$;
drop policy if exists nivelamentos_select on public.nivelamentos;
create policy nivelamentos_select on public.nivelamentos
  for select to authenticated
  using (usuario_id = auth.uid() or (public.eh_professor_do_aluno(usuario_id) and not public.anterior_a_transferencia(usuario_id, criado_em)));
drop policy if exists sugestoes_nivel_select on public.sugestoes_nivel;
create policy sugestoes_nivel_select on public.sugestoes_nivel
  for select to authenticated
  using (usuario_id = auth.uid() or (public.eh_professor_do_aluno(usuario_id) and not public.anterior_a_transferencia(usuario_id, criado_em)));

-- Funções que o painel do professor usa (security definer: não passam pela
-- RLS, por isso o filtro vai dentro delas)
CREATE OR REPLACE FUNCTION public.resumo_turmas_professor()
 RETURNS TABLE(id bigint, nome character varying, descricao text, ano_letivo character varying, status character varying, codigo_convite character varying, criado_em timestamp with time zone, alunos bigint, atividades bigint, sessoes bigint, ppm_medio numeric, precisao_media numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.id, t.nome, t.descricao, t.ano_letivo, t.status, t.codigo_convite, t.criado_em,
    (select count(*) from public.matriculas m where m.turma_id = t.id and m.ativa),
    (select count(*) from public.exercicio_turmas et where et.turma_id = t.id),
    (select count(*) from public.resultados r where r.turma_id = t.id and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)),
    (select round(avg(r.ppm), 1) from public.resultados r where r.turma_id = t.id and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)),
    (select round(avg(r.precisao), 1) from public.resultados r where r.turma_id = t.id and not public.anterior_a_transferencia(r.aluno_id, r.criado_em))
  from public.turmas t
  where t.professor_id = auth.uid()
  order by t.status, t.criado_em desc;
$function$;

CREATE OR REPLACE FUNCTION public.alunos_da_turma(p_turma_id bigint)
 RETURNS TABLE(aluno_id uuid, nome character varying, email character varying, entrou_em timestamp with time zone, sessoes bigint, ppm_medio numeric, precisao_media numeric, atividades_concluidas bigint, ultima_pratica timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    max(r.criado_em)
  from public.matriculas m
  join public.usuarios u on u.id = m.aluno_id
  left join public.resultados r on r.aluno_id = u.id and r.turma_id = p_turma_id and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)
  where m.turma_id = p_turma_id and m.ativa
  group by u.id, u.nome, u.email, m.entrou_em
  order by u.nome;
end;
$function$;

CREATE OR REPLACE FUNCTION public.atividades_do_professor()
 RETURNS TABLE(id bigint, titulo character varying, instrucoes text, texto_referencia text, nivel character varying, tempo_limite_seg integer, prazo timestamp with time zone, meta_precisao numeric, publicado boolean, criado_em timestamp with time zone, turmas jsonb, entregas bigint, alunos_concluiram bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select e.id, e.titulo, e.instrucoes, e.texto_referencia, e.nivel, e.tempo_limite_seg, e.prazo,
    e.meta_precisao, e.publicado, e.criado_em,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome) order by t.nome)
      from public.exercicio_turmas et join public.turmas t on t.id = et.turma_id
      where et.exercicio_id = e.id
    ), '[]'::jsonb),
    (select count(*) from public.resultados r where r.exercicio_id = e.id and not public.anterior_a_transferencia(r.aluno_id, r.criado_em)),
    (select count(distinct r.aluno_id) from public.resultados r where r.exercicio_id = e.id and r.concluido and not public.anterior_a_transferencia(r.aluno_id, r.criado_em))
  from public.exercicios e
  where e.criado_por = auth.uid() and e.nivel_trilha is null
  order by e.criado_em desc;
$function$;

CREATE OR REPLACE FUNCTION public.ranking_exercicio(p_exercicio_id bigint)
 RETURNS TABLE(aluno_nome character varying, ppm numeric, precisao numeric, criado_em timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select nome, ppm, precisao, criado_em
  from (
    select distinct on (r.aluno_id) u.nome, r.ppm, r.precisao, r.criado_em
    from public.resultados r
    join public.usuarios u on u.id = r.aluno_id
    where r.exercicio_id = p_exercicio_id and public.pode_ver_exercicio(p_exercicio_id)
      -- atividade de turma: treinos de antes da transferência não aparecem
      and (r.turma_id is null or r.aluno_id = auth.uid() or not public.anterior_a_transferencia(r.aluno_id, r.criado_em))
    order by r.aluno_id, r.ppm desc, r.precisao desc
  ) melhores
  order by ppm desc, precisao desc
  limit 20;
$function$;

notify pgrst, 'reload schema';
