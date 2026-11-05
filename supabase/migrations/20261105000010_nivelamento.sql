-- ============================================================
-- 20261105000010_nivelamento.sql
-- Etapa 4: teste de nivelamento e sugestões durante o treino.
--   * nivelamentos: resultado de cada teste (nível, lição de início,
--     teclas frágeis e o detalhe por etapa).
--   * sugestoes_nivel: cada sugestão "exercício difícil demais" e a decisão
--     do aluno (aceitou / ignorou), para ajustar o nível recomendado.
-- O aluno grava e lê os próprios registros. O professor lê os dos alunos
-- ativos das suas turmas (nunca de conta transferida para pessoal).
-- Só cria tabelas novas. Idempotente.
-- ============================================================

create table if not exists public.nivelamentos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  nivel text not null check (nivel in ('iniciante', 'basico', 'intermediario', 'avancado')),
  licao_nivel int not null check (licao_nivel between 1 and 6),
  licao_ordem int not null check (licao_ordem between 1 and 20),
  precisao_media numeric(5, 2) check (precisao_media between 0 and 100),
  ppm_medio numeric(6, 2) check (ppm_medio >= 0),
  teclas_frageis text[] not null default '{}',
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index if not exists idx_nivelamentos_usuario on public.nivelamentos (usuario_id, criado_em desc);

create table if not exists public.sugestoes_nivel (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  exercicio_id bigint references public.exercicios(id) on delete set null,
  recomendado_nivel int check (recomendado_nivel between 1 and 6),
  recomendado_ordem int check (recomendado_ordem between 1 and 20),
  decisao text not null check (decisao in ('aceitou', 'ignorou')),
  criado_em timestamptz not null default now()
);
create index if not exists idx_sugestoes_nivel_usuario on public.sugestoes_nivel (usuario_id, criado_em);

-- Professor de uma turma ativa do aluno (e a conta não foi transferida)
create or replace function public.eh_professor_do_aluno(p_aluno uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select not public.conta_transferida(p_aluno) and exists (
    select 1 from public.matriculas m join public.turmas t on t.id = m.turma_id
    where m.aluno_id = p_aluno and m.ativa and t.professor_id = auth.uid()
  );
$$;
revoke all on function public.eh_professor_do_aluno(uuid) from public, anon;
grant execute on function public.eh_professor_do_aluno(uuid) to authenticated;

alter table public.nivelamentos enable row level security;
alter table public.sugestoes_nivel enable row level security;
revoke all on public.nivelamentos, public.sugestoes_nivel from anon;
revoke update, delete on public.nivelamentos, public.sugestoes_nivel from authenticated;
grant select, insert on public.nivelamentos, public.sugestoes_nivel to authenticated;

drop policy if exists nivelamentos_select on public.nivelamentos;
create policy nivelamentos_select on public.nivelamentos
  for select to authenticated
  using (usuario_id = auth.uid() or public.eh_professor_do_aluno(usuario_id));
drop policy if exists nivelamentos_insert on public.nivelamentos;
create policy nivelamentos_insert on public.nivelamentos
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists sugestoes_nivel_select on public.sugestoes_nivel;
create policy sugestoes_nivel_select on public.sugestoes_nivel
  for select to authenticated
  using (usuario_id = auth.uid() or public.eh_professor_do_aluno(usuario_id));
drop policy if exists sugestoes_nivel_insert on public.sugestoes_nivel;
create policy sugestoes_nivel_insert on public.sugestoes_nivel
  for insert to authenticated with check (usuario_id = auth.uid());

notify pgrst, 'reload schema';
