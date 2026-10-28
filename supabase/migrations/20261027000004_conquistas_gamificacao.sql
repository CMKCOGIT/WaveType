-- ============================================================
-- 04 · Conquistas e gamificação
-- ------------------------------------------------------------
-- Idempotente. As conquistas passam a ser calculadas no banco a partir
-- dos resultados reais (trigger após cada resultado). O navegador não
-- consegue mais liberar conquistas por conta própria.
-- ============================================================

alter table public.conquistas add column if not exists categoria varchar(30) not null default 'marcos';
alter table public.conquistas add column if not exists criterio varchar(40);
alter table public.conquistas add column if not exists meta numeric;
alter table public.conquistas add column if not exists ordem int not null default 0;
alter table public.conquistas add column if not exists papeis text[]; -- null = todos os tipos de conta

-- ------------------------------------------------------------
-- Catálogo (as 8 conquistas originais mantêm título e descrição;
-- só ganham o critério de desbloqueio)
-- ------------------------------------------------------------
insert into public.conquistas (codigo, titulo, descricao, icone, categoria, criterio, meta, ordem, papeis) values
  -- Exercícios
  ('primeiros_passos', 'Primeiros passos', 'Concluiu o primeiro exercício.', 'flag', 'exercicios', 'exercicios_concluidos', 1, 10, null),
  ('aquecendo', 'Aquecendo os dedos', 'Concluiu 10 exercícios da trilha.', 'layers', 'exercicios', 'exercicios_concluidos', 10, 11, null),
  ('dedicacao', 'Dedicação', 'Concluiu 50 exercícios da trilha.', 'star', 'exercicios', 'exercicios_concluidos', 50, 12, null),
  ('centuriao', 'Centurião', 'Concluiu 100 exercícios da trilha.', 'medal', 'exercicios', 'exercicios_concluidos', 100, 13, null),
  -- Precisão
  ('precisao_em_foco', 'Precisão em foco', 'Concluiu um treino com 98% de precisão.', 'target', 'precisao', 'melhor_precisao', 98, 20, null),
  ('sem_erros', 'Sem erros', 'Concluiu um exercício sem nenhum erro.', 'circle', 'precisao', 'sessoes_sem_erros', 1, 21, null),
  ('mira_certeira', 'Mira certeira', 'Fez 25 sessões com 95% de precisão ou mais.', 'target', 'precisao', 'sessoes_precisao_95', 25, 22, null),
  ('perfeccionista', 'Perfeccionista', 'Fez 10 sessões sem nenhum erro.', 'check', 'precisao', 'sessoes_sem_erros', 10, 23, null),
  -- Velocidade
  ('ritmo_inicial', 'Ritmo inicial', 'Atingiu 20 WPM em uma sessão.', 'trending', 'velocidade', 'melhor_ppm', 20, 30, null),
  ('digitador_veloz', 'Digitador veloz', 'Atingiu 40 WPM em uma sessão.', 'bolt', 'velocidade', 'melhor_ppm', 40, 31, null),
  ('turbo', 'Turbo', 'Atingiu 60 WPM em uma sessão.', 'rocket', 'velocidade', 'melhor_ppm', 60, 32, null),
  ('mestre_80wpm', 'Mestre 80 WPM', 'Alcançou 80 WPM em uma sessão.', 'crown', 'velocidade', 'melhor_ppm', 80, 33, null),
  ('evolucao_10', 'Evolução real', 'Ficou 10 WPM mais rápido do que na primeira sessão.', 'trending', 'velocidade', 'evolucao_ppm', 10, 34, null),
  ('evolucao_25', 'Outro patamar', 'Ficou 25 WPM mais rápido do que na primeira sessão.', 'rocket', 'velocidade', 'evolucao_ppm', 25, 35, null),
  -- Níveis e etapas
  ('primeira_etapa', 'Etapa vencida', 'Concluiu todos os exercícios de uma etapa.', 'layers', 'niveis', 'etapas_completas', 1, 40, null),
  ('nivel_1_completo', 'Base sólida', 'Concluiu o Nível 1: posição base.', 'mountain', 'niveis', 'nivel_completo', 1, 41, null),
  ('meio_caminho', 'Meio caminho', 'Concluiu 12 etapas da trilha.', 'route', 'niveis', 'etapas_completas', 12, 42, null),
  ('nivel_3_completo', 'Teclado inteiro', 'Concluiu o Nível 3: fileira inferior.', 'mountain', 'niveis', 'nivel_completo', 3, 43, null),
  ('nivel_5_completo', 'Fluência', 'Concluiu o Nível 5: palavras complexas.', 'mountain', 'niveis', 'nivel_completo', 5, 44, null),
  ('nivel_extremo', 'Domou o Extremo', 'Concluiu os 20 exercícios do Nível 6 com mais de 85% de precisão.', 'crown', 'niveis', 'nivel_completo', 6, 45, null),
  -- Constância
  ('sequencia_3_dias', 'Pegando o ritmo', 'Praticou 3 dias seguidos.', 'flame', 'constancia', 'sequencia_dias', 3, 50, null),
  ('sequencia_7_dias', 'Sequência de 7 dias', 'Praticou por uma semana seguida.', 'flame', 'constancia', 'sequencia_dias', 7, 51, null),
  ('sequencia_30_dias', 'Hábito formado', 'Praticou 30 dias seguidos.', 'flame', 'constancia', 'sequencia_dias', 30, 52, null),
  ('frequentador', 'Frequentador', 'Completou 25 sessões de prática.', 'clock', 'constancia', 'sessoes', 25, 53, null),
  ('maratonista', 'Maratonista', 'Digitou 10.000 caracteres no total.', 'route', 'constancia', 'caracteres', 10000, 54, null),
  -- Desafios especiais
  ('precisao_cirurgica', 'Precisão cirúrgica', 'Fez 98% de precisão em um exercício do Nível Extremo.', 'target', 'desafios', 'extremo_98', 1, 60, null),
  ('primeira_atividade', 'Primeira entrega', 'Concluiu a primeira atividade de um professor.', 'check', 'desafios', 'atividades_concluidas', 1, 61, array['aluno']),
  ('pontual', 'Pontualidade', 'Concluiu 5 atividades dentro do prazo.', 'clock', 'desafios', 'atividades_no_prazo', 5, 62, array['aluno']),
  ('aluno_exemplar', 'Aluno exemplar', 'Concluiu 10 atividades de professores.', 'medal', 'desafios', 'atividades_concluidas', 10, 63, array['aluno']),
  ('turma_nota_10', 'Turma nota 10', 'Ficou em primeiro no ranking da turma.', 'trophy', 'desafios', 'primeiro_ranking', 1, 64, array['aluno'])
on conflict (codigo) do update
set categoria = excluded.categoria,
    criterio = excluded.criterio,
    meta = excluded.meta,
    ordem = excluded.ordem,
    papeis = excluded.papeis,
    icone = coalesce(public.conquistas.icone, excluded.icone);

-- ------------------------------------------------------------
-- Métricas reais de um usuário (base de todas as conquistas)
-- Sessões com menos de 10 acertos não contam para recordes de precisão,
-- para que um texto de 3 letras não renda medalha.
-- ------------------------------------------------------------
create or replace function public.metricas_conquistas(p_usuario uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select r.*, e.nivel_trilha, e.ordem, e.prazo
    from public.resultados r
    left join public.exercicios e on e.id = r.exercicio_id
    where r.aluno_id = p_usuario
  ),
  feitos as (
    select distinct nivel_trilha, ordem from r where concluido and nivel_trilha is not null
  ),
  total_niveis as (
    select nivel_trilha, count(*) as total from public.exercicios where nivel_trilha is not null group by 1
  ),
  niveis as (
    select t.nivel_trilha, t.total, coalesce(f.feitos, 0) as feitos
    from total_niveis t
    left join (select nivel_trilha, count(*) as feitos from feitos group by 1) f using (nivel_trilha)
  ),
  total_etapas as (
    select nivel_trilha, (ordem - 1) / 5 as etapa, count(*) as total
    from public.exercicios where nivel_trilha is not null group by 1, 2
  ),
  feitos_etapas as (
    select nivel_trilha, (ordem - 1) / 5 as etapa, count(*) as feitos from feitos group by 1, 2
  ),
  atividades as (
    select exercicio_id, bool_or(prazo is null or criado_em <= prazo) as no_prazo
    from r
    where concluido and exercicio_id is not null and nivel_trilha is null
    group by exercicio_id
  ),
  liderancas as (
    select count(*) as total from (
      select r2.exercicio_id
      from public.resultados r2
      where r2.exercicio_id in (select exercicio_id from atividades)
      group by r2.exercicio_id
      having count(distinct r2.aluno_id) >= 2
         and max(r2.ppm) filter (where r2.aluno_id = p_usuario) = max(r2.ppm)
    ) x
  )
  select jsonb_build_object(
    'sessoes', (select count(*) from r),
    'exercicios_concluidos', (select count(*) from feitos),
    'melhor_ppm', coalesce((select max(ppm) from r), 0),
    'melhor_precisao', coalesce((select max(precisao) from r where acertos >= 10), 0),
    'sessoes_sem_erros', (select count(*) from r where erros = 0 and acertos >= 10),
    'sessoes_precisao_95', (select count(*) from r where precisao >= 95 and acertos >= 10),
    'caracteres', coalesce((select sum(acertos) from r), 0),
    'evolucao_ppm', greatest(coalesce(
      (select max(ppm) from r) - (select ppm from r order by criado_em, id limit 1), 0), 0),
    'etapas_completas', (
      select count(*) from total_etapas te join feitos_etapas fe using (nivel_trilha, etapa)
      where fe.feitos >= te.total
    ),
    'niveis_completos', (select count(*) from niveis where feitos >= total),
    'niveis', coalesce((
      select jsonb_object_agg(nivel_trilha::text, jsonb_build_object('feitos', feitos, 'total', total))
      from niveis
    ), '{}'::jsonb),
    'sequencia_dias', coalesce((
      select case when ultima_pratica_em >= current_date - 1 then sequencia_dias else 0 end
      from public.usuarios where id = p_usuario
    ), 0),
    'atividades_concluidas', (select count(*) from atividades),
    'atividades_no_prazo', (select count(*) from atividades where no_prazo),
    'primeiro_ranking', (select total from liderancas),
    'extremo_98', (select count(*) from r where nivel_trilha = 6 and precisao >= 98 and acertos >= 10),
    'xp', coalesce((select xp from public.usuarios where id = p_usuario), 0)
  );
$$;

-- Progresso de cada conquista (atual x alvo) de um usuário.
create or replace function public.calcular_conquistas(p_usuario uuid)
returns table (
  conquista_id bigint, codigo varchar, titulo varchar, descricao varchar, icone varchar,
  categoria varchar, ordem int, atual numeric, alvo numeric, desbloqueada boolean,
  desbloqueada_em timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m jsonb := public.metricas_conquistas(p_usuario);
  v_tipo text;
begin
  select u.tipo::text into v_tipo from public.usuarios u where u.id = p_usuario;

  return query
  select c.id, c.codigo, c.titulo, c.descricao, c.icone, c.categoria, c.ordem,
    case
      when c.criterio is null then null
      when c.criterio = 'nivel_completo' then coalesce((m->'niveis'->(c.meta::int)::text->>'feitos')::numeric, 0)
      else coalesce((m->>c.criterio)::numeric, 0)
    end,
    case
      when c.criterio = 'nivel_completo' then greatest(coalesce((m->'niveis'->(c.meta::int)::text->>'total')::numeric, 20), 1)
      else c.meta
    end,
    uc.id is not null,
    uc.desbloqueada_em
  from public.conquistas c
  left join public.usuario_conquistas uc on uc.conquista_id = c.id and uc.usuario_id = p_usuario
  where (c.criterio is not null and (c.papeis is null or v_tipo = any (c.papeis)))
     or uc.id is not null
  order by c.ordem, c.id;
end;
$$;

-- Libera o que já foi alcançado. Devolve os códigos liberados agora.
create or replace function public.avaliar_conquistas(p_usuario uuid)
returns setof varchar
language sql
security definer
set search_path = public
as $$
  insert into public.usuario_conquistas (usuario_id, conquista_id)
  select p_usuario, c.conquista_id
  from public.calcular_conquistas(p_usuario) c
  where not c.desbloqueada and c.alvo is not null and c.atual >= c.alvo
  on conflict (usuario_id, conquista_id) do nothing
  returning (select codigo from public.conquistas where id = conquista_id);
$$;

create or replace function public.resultados_avaliar_conquistas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.avaliar_conquistas(new.aluno_id);
  return null;
end;
$$;

-- O nome começa com "resultados_z" para rodar depois de on_novo_resultado
-- (que atualiza XP e sequência de dias): triggers rodam em ordem alfabética.
drop trigger if exists resultados_z_conquistas on public.resultados;
create trigger resultados_z_conquistas
  after insert on public.resultados
  for each row execute function public.resultados_avaliar_conquistas();

-- RPCs do usuário logado
create or replace function public.progresso_conquistas()
returns table (
  conquista_id bigint, codigo varchar, titulo varchar, descricao varchar, icone varchar,
  categoria varchar, ordem int, atual numeric, alvo numeric, desbloqueada boolean,
  desbloqueada_em timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.calcular_conquistas(auth.uid());
$$;

-- Recalcula a partir do histórico (ex.: resultados anteriores a esta migração).
create or replace function public.sincronizar_conquistas()
returns setof varchar
language sql
security definer
set search_path = public
as $$
  select public.avaliar_conquistas(auth.uid()) where auth.uid() is not null;
$$;

-- A antiga liberar_conquista deixava qualquer pessoa liberar qualquer medalha.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'liberar_conquista') then
    revoke execute on function public.liberar_conquista(varchar) from public, anon, authenticated;
  end if;
end $$;

revoke all on function public.metricas_conquistas(uuid) from public, anon, authenticated;
revoke all on function public.calcular_conquistas(uuid) from public, anon, authenticated;
revoke all on function public.avaliar_conquistas(uuid) from public, anon, authenticated;
revoke all on function public.resultados_avaliar_conquistas() from public, anon, authenticated;
revoke all on function public.progresso_conquistas() from public, anon;
revoke all on function public.sincronizar_conquistas() from public, anon;
grant execute on function public.progresso_conquistas() to authenticated;
grant execute on function public.sincronizar_conquistas() to authenticated;

-- Libera retroativamente para quem já tem histórico.
select public.avaliar_conquistas(id) from public.usuarios;
