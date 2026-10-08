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
  -- NOVO: usados no dashboard do aluno (index.html mostra "Nível 5", "420/800 XP")
  xp int not null default 0 check (xp >= 0),
  nivel int not null default 1 check (nivel >= 1),
  sequencia_dias int not null default 0 check (sequencia_dias >= 0),
  ultima_pratica_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- turmas
-- ------------------------------------------------------------
create table public.turmas (
  id bigint generated always as identity primary key,
  nome varchar(120) not null,
  -- NOVO: turmas.html mostra "2026 · 1º semestre" e status Ativa/Encerrada
  ano_letivo varchar(20),
  status varchar(20) not null default 'ativa' check (status in ('ativa', 'encerrada')),
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
  -- NOVO: exercicios.html mostra "fácil / médio / avançado" e permite rascunho sem turma
  nivel varchar(20) not null default 'medio' check (nivel in ('facil', 'medio', 'avancado')),
  publicado boolean not null default true,
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
-- NOVO: conquistas.html precisava dessas duas tabelas
-- ============================================================
create table public.conquistas (
  id bigint generated always as identity primary key,
  codigo varchar(50) not null unique, -- ex: 'primeiros_passos', 'digitador_veloz'
  titulo varchar(120) not null,
  descricao varchar(255) not null,
  icone varchar(50) -- referência ao ícone SVG usado no front
);

create table public.usuario_conquistas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  conquista_id bigint not null references public.conquistas(id) on delete cascade,
  desbloqueada_em timestamptz not null default now(),
  unique (usuario_id, conquista_id)
);
create index idx_usuario_conquistas_usuario on public.usuario_conquistas(usuario_id);

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
-- NOVO: trigger que atualiza XP, nível e sequência de dias
-- automaticamente sempre que um resultado é inserido.
-- Regra simples (ajuste os números como quiser):
--   +10 XP por resultado, +1 XP para cada ponto de precisão acima de 90.
--   Nível = 1 + floor(xp / 200).
--   Sequência: soma 1 se a última prática foi ontem, mantém se foi hoje,
--   zera e recomeça em 1 se ficou mais de 1 dia sem praticar.
-- ============================================================
create or replace function public.handle_novo_resultado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ultima date;
  v_seq int;
  v_ganho int;
begin
  select ultima_pratica_em, sequencia_dias into v_ultima, v_seq
  from public.usuarios where id = new.aluno_id;

  if v_ultima is null or v_ultima < current_date - 1 then
    v_seq := 1;
  elsif v_ultima = current_date - 1 then
    v_seq := v_seq + 1;
  end if; -- se v_ultima = hoje, mantém v_seq

  v_ganho := 10 + greatest(0, floor(new.precisao - 90))::int;

  update public.usuarios
  set xp = xp + v_ganho,
      nivel = 1 + floor((xp + v_ganho) / 200.0),
      sequencia_dias = v_seq,
      ultima_pratica_em = current_date,
      atualizado_em = now()
  where id = new.aluno_id;

  return new;
end;
$$;

create trigger on_novo_resultado
  after insert on public.resultados
  for each row execute function public.handle_novo_resultado();

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
alter table public.conquistas enable row level security;
alter table public.usuario_conquistas enable row level security;

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

-- NOVO: conquistas são catálogo público (todo mundo pode ler os títulos/ícones)
create policy "conquistas_select_all" on public.conquistas
  for select using (true);

-- NOVO: usuario_conquistas: cada aluno só vê as próprias; ninguém insere pelo front
-- (a liberação é feita por uma function security definer, nunca por insert direto do cliente)
create policy "usuario_conquistas_select_own" on public.usuario_conquistas
  for select using (usuario_id = auth.uid());

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

-- ============================================================
-- NOVO: RPC que gera um código de convite único ao criar turma
-- (evita gerar no front e colidir com o unique da coluna)
-- ============================================================
create or replace function public.gerar_codigo_convite()
returns varchar
language plpgsql
as $$
declare
  v_codigo varchar;
  v_existe boolean;
begin
  loop
    v_codigo := upper(substr(md5(random()::text), 1, 8));
    select exists(select 1 from public.turmas where codigo_convite = v_codigo) into v_existe;
    exit when not v_existe;
  end loop;
  return v_codigo;
end;
$$;

-- ============================================================
-- NOVO: RPC para o aluno entrar em turma pelo código (treinamento.html)
-- security definer porque o aluno não tem select direto em turmas
-- antes de estar matriculado.
-- ============================================================
create or replace function public.entrar_na_turma(p_codigo varchar)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turma_id bigint;
begin
  select id into v_turma_id from public.turmas where codigo_convite = upper(p_codigo) and status = 'ativa';
  if v_turma_id is null then
    raise exception 'Código de convite inválido ou turma encerrada.';
  end if;

  insert into public.matriculas (aluno_id, turma_id)
  values (auth.uid(), v_turma_id)
  on conflict (aluno_id, turma_id) do update set ativa = true;

  return v_turma_id;
end;
$$;

-- ============================================================
-- NOVO: RPC que libera uma conquista para o usuário logado.
-- security definer porque usuario_conquistas não tem policy de
-- insert para o cliente (só esta function pode gravar).
-- ============================================================
create or replace function public.liberar_conquista(p_codigo varchar)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conquista_id bigint;
begin
  select id into v_conquista_id from public.conquistas where codigo = p_codigo;
  if v_conquista_id is null then
    raise exception 'Conquista % não existe.', p_codigo;
  end if;

  insert into public.usuario_conquistas (usuario_id, conquista_id)
  values (auth.uid(), v_conquista_id)
  on conflict (usuario_id, conquista_id) do nothing;
end;
$$;

-- Seed inicial das conquistas mostradas em conquistas.html
insert into public.conquistas (codigo, titulo, descricao, icone) values
  ('primeiros_passos', 'Primeiros passos', 'Concluiu o primeiro exercício.', 'flag'),
  ('digitador_veloz', 'Digitador veloz', 'Atingiu 40 WPM em uma sessão.', 'bolt'),
  ('precisao_em_foco', 'Precisão em foco', 'Concluiu um treino com 98% de precisão.', 'target'),
  ('sequencia_7_dias', 'Sequência de 7 dias', 'Praticou por uma semana seguida.', 'flame'),
  ('sem_erros', 'Sem erros', 'Concluiu um exercício sem nenhum erro.', 'circle'),
  ('maratonista', 'Maratonista', 'Digitou 10.000 caracteres no total.', 'route'),
  ('mestre_80wpm', 'Mestre 80 WPM', 'Alcançou 80 WPM em uma sessão.', 'crown'),
  ('turma_nota_10', 'Turma nota 10', 'Ficou em primeiro no ranking da turma.', 'trophy')
on conflict (codigo) do nothing;
