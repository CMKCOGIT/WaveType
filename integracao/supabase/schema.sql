-- ============================================================
-- WaveType (Type Master Pro) - Schema Supabase/Postgres
-- ============================================================
-- IMPORTANTE:
-- A autenticação usa o Supabase Auth (auth.users). NÃO existe
-- coluna de senha aqui: o hashing (bcrypt) é feito pelo próprio
-- Supabase. A tabela public.usuarios guarda só os dados de perfil
-- e é ligada 1:1 com auth.users pelo mesmo id (uuid).
-- ============================================================

create type tipo_usuario as enum ('professor', 'aluno');

-- ------------------------------------------------------------
-- usuarios (perfil, dados de auth ficam em auth.users)
-- ------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome varchar(120) not null,
  email varchar(190) not null unique,
  google_id varchar(255),
  tipo tipo_usuario not null default 'aluno',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- turmas
-- ------------------------------------------------------------
create table public.turmas (
  id bigint generated always as identity primary key,
  nome varchar(120) not null,
  codigo_convite varchar(20) not null unique,
  professor_id uuid not null references public.usuarios(id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index idx_turmas_professor on public.turmas(professor_id);

-- ------------------------------------------------------------
-- matriculas
-- ------------------------------------------------------------
create table public.matriculas (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references public.usuarios(id) on delete cascade,
  turma_id bigint not null references public.turmas(id) on delete cascade,
  ativa boolean not null default true,
  entrou_em timestamptz not null default now(),
  unique (aluno_id, turma_id)
);
create index idx_matriculas_turma on public.matriculas(turma_id);
create index idx_matriculas_aluno on public.matriculas(aluno_id);

-- ------------------------------------------------------------
-- exercicios
-- ------------------------------------------------------------
create table public.exercicios (
  id bigint generated always as identity primary key,
  titulo varchar(150) not null,
  texto_referencia text not null,
  tempo_limite_seg int not null check (tempo_limite_seg > 0 and tempo_limite_seg <= 3600),
  criado_por uuid not null references public.usuarios(id) on delete cascade,
  turma_id bigint references public.turmas(id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index idx_exercicios_turma on public.exercicios(turma_id);
create index idx_exercicios_criador on public.exercicios(criado_por);

-- ------------------------------------------------------------
-- resultados
-- ------------------------------------------------------------
create table public.resultados (
  id bigint generated always as identity primary key,
  aluno_id uuid not null references public.usuarios(id) on delete cascade,
  exercicio_id bigint not null references public.exercicios(id) on delete cascade,
  ppm decimal(6,2) not null check (ppm >= 0),
  precisao decimal(5,2) not null check (precisao between 0 and 100),
  acertos int not null check (acertos >= 0),
  erros int not null check (erros >= 0),
  tempo_seg int not null check (tempo_seg >= 0 and tempo_seg <= 3600),
  criado_em timestamptz not null default now()
);
create index idx_resultados_aluno on public.resultados(aluno_id);
create index idx_resultados_exercicio on public.resultados(exercicio_id);

-- ============================================================
-- Trigger: cria a linha em public.usuarios automaticamente
-- quando alguém se cadastra via supabase.auth.signUp()
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'tipo')::tipo_usuario, 'aluno')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security (RLS)
-- Todo acesso do frontend passa pela chave anon + RLS.
-- Sem isso, qualquer usuário logado leria/escreveria a tabela toda.
-- ============================================================
alter table public.usuarios enable row level security;
alter table public.turmas enable row level security;
alter table public.matriculas enable row level security;
alter table public.exercicios enable row level security;
alter table public.resultados enable row level security;

-- usuarios: cada um só vê/edita o próprio perfil
create policy "usuarios_select_own" on public.usuarios
  for select using (auth.uid() = id);
create policy "usuarios_update_own" on public.usuarios
  for update using (auth.uid() = id);

-- turmas: professor dono gerencia; aluno matriculado só lê
create policy "turmas_select" on public.turmas
  for select using (
    professor_id = auth.uid()
    or exists (
      select 1 from public.matriculas m
      where m.turma_id = turmas.id and m.aluno_id = auth.uid()
    )
  );
create policy "turmas_insert" on public.turmas
  for insert with check (
    professor_id = auth.uid()
    and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.tipo = 'professor')
  );
create policy "turmas_update" on public.turmas
  for update using (professor_id = auth.uid());
create policy "turmas_delete" on public.turmas
  for delete using (professor_id = auth.uid());

-- matriculas: aluno vê a própria; professor vê as da(s) sua(s) turma(s)
create policy "matriculas_select" on public.matriculas
  for select using (
    aluno_id = auth.uid()
    or exists (select 1 from public.turmas t where t.id = matriculas.turma_id and t.professor_id = auth.uid())
  );
create policy "matriculas_insert" on public.matriculas
  for insert with check (aluno_id = auth.uid());
create policy "matriculas_update" on public.matriculas
  for update using (
    exists (select 1 from public.turmas t where t.id = matriculas.turma_id and t.professor_id = auth.uid())
  );

-- exercicios: criador gerencia; aluno matriculado ativo na turma lê
create policy "exercicios_select" on public.exercicios
  for select using (
    criado_por = auth.uid()
    or exists (
      select 1 from public.matriculas m
      where m.turma_id = exercicios.turma_id and m.aluno_id = auth.uid() and m.ativa
    )
  );
create policy "exercicios_insert" on public.exercicios
  for insert with check (
    criado_por = auth.uid()
    and exists (select 1 from public.usuarios u where u.id = auth.uid() and u.tipo = 'professor')
  );
create policy "exercicios_update" on public.exercicios
  for update using (criado_por = auth.uid());
create policy "exercicios_delete" on public.exercicios
  for delete using (criado_por = auth.uid());

-- resultados: aluno só insere/lê os próprios; professor lê os dos exercícios dele
create policy "resultados_select" on public.resultados
  for select using (
    aluno_id = auth.uid()
    or exists (select 1 from public.exercicios e where e.id = resultados.exercicio_id and e.criado_por = auth.uid())
  );
create policy "resultados_insert" on public.resultados
  for insert with check (aluno_id = auth.uid());

-- ============================================================
-- RPC de ranking (security definer): evita que o front precise
-- ler a tabela usuarios de outras pessoas para montar o ranking.
-- ============================================================
create or replace function public.ranking_exercicio(p_exercicio_id bigint)
returns table (aluno_nome varchar, ppm decimal, precisao decimal, criado_em timestamptz)
language sql
security definer
set search_path = public
as $$
  select u.nome, r.ppm, r.precisao, r.criado_em
  from public.resultados r
  join public.usuarios u on u.id = r.aluno_id
  where r.exercicio_id = p_exercicio_id
  order by r.ppm desc
  limit 20;
$$;
