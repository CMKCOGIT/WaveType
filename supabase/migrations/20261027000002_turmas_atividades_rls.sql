-- ============================================================
-- 02 · Turmas, atividades de professor e RLS
-- ------------------------------------------------------------
-- Idempotente. Antes de recriar as políticas, remove TODAS as políticas
-- das tabelas abaixo, para o banco ficar exatamente no estado descrito
-- aqui (as antigas tinham brechas: o aluno podia se matricular em
-- qualquer turma sem código e as políticas de turmas/matriculas se
-- chamavam em recursão).
-- ============================================================

-- ------------------------------------------------------------
-- Colunas novas
-- ------------------------------------------------------------
alter table public.turmas add column if not exists descricao text;
alter table public.turmas add column if not exists atualizado_em timestamptz not null default now();

alter table public.exercicios add column if not exists instrucoes text;
alter table public.exercicios add column if not exists prazo timestamptz;
alter table public.exercicios add column if not exists meta_precisao numeric(5,2);
alter table public.exercicios add column if not exists atualizado_em timestamptz not null default now();
alter table public.exercicios add column if not exists nivel_trilha int;
alter table public.exercicios add column if not exists ordem int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercicios_meta_precisao_check') then
    alter table public.exercicios
      add constraint exercicios_meta_precisao_check check (meta_precisao is null or meta_precisao between 0 and 100);
  end if;
end $$;

-- Exercícios oficiais (trilha) não pertencem a uma pessoa: se o autor
-- apagasse a conta, o "on delete cascade" levaria a trilha inteira junto.
alter table public.exercicios alter column criado_por drop not null;
update public.exercicios set criado_por = null where nivel_trilha is not null and criado_por is not null;

-- Prática livre grava resultado sem exercício.
alter table public.resultados alter column exercicio_id drop not null;
alter table public.resultados add column if not exists turma_id bigint references public.turmas(id) on delete set null;
alter table public.resultados add column if not exists concluido boolean not null default true;
create index if not exists idx_resultados_turma on public.resultados(turma_id);
create index if not exists idx_resultados_aluno_exercicio on public.resultados(aluno_id, exercicio_id);

-- ------------------------------------------------------------
-- Uma atividade pode ser atribuída a várias turmas
-- ------------------------------------------------------------
create table if not exists public.exercicio_turmas (
  exercicio_id bigint not null references public.exercicios(id) on delete cascade,
  turma_id bigint not null references public.turmas(id) on delete cascade,
  atribuido_em timestamptz not null default now(),
  primary key (exercicio_id, turma_id)
);
create index if not exists idx_exercicio_turmas_turma on public.exercicio_turmas(turma_id);

-- Migra o vínculo antigo (exercicios.turma_id) para a tabela nova.
insert into public.exercicio_turmas (exercicio_id, turma_id)
select id, turma_id from public.exercicios where turma_id is not null and nivel_trilha is null
on conflict do nothing;

-- Resultados antigos de atividades passam a apontar para a turma.
update public.resultados r
set turma_id = e.turma_id
from public.exercicios e
where r.exercicio_id = e.id and r.turma_id is null and e.turma_id is not null and e.nivel_trilha is null;

-- Excluir uma turma não pode apagar as atividades (nem os resultados delas):
-- o FK legado exercicios.turma_id passa a ser "on delete set null".
do $$
declare v_nome text;
begin
  select c.conname into v_nome
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.exercicios'::regclass and c.contype = 'f' and a.attname = 'turma_id';
  if v_nome is not null then
    execute format('alter table public.exercicios drop constraint %I', v_nome);
  end if;
  alter table public.exercicios
    add constraint exercicios_turma_id_fkey foreign key (turma_id) references public.turmas(id) on delete set null;
end $$;

-- ------------------------------------------------------------
-- Funções auxiliares das políticas (security definer evita a recursão
-- turmas → matriculas → turmas e deixa as políticas legíveis)
-- ------------------------------------------------------------
create or replace function public.meu_tipo()
returns text language sql stable security definer set search_path = public as $$
  select tipo::text from public.usuarios where id = auth.uid() and tipo_definido;
$$;

create or replace function public.eh_professor_da_turma(p_turma_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.turmas where id = p_turma_id and professor_id = auth.uid());
$$;

create or replace function public.eh_aluno_da_turma(p_turma_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matriculas
    where turma_id = p_turma_id and aluno_id = auth.uid() and ativa
  );
$$;

create or replace function public.pode_ver_exercicio(p_exercicio_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.exercicios e
    where e.id = p_exercicio_id
      and (
        e.nivel_trilha is not null
        or e.criado_por = auth.uid()
        or (e.publicado and exists (
          select 1 from public.exercicio_turmas et
          join public.matriculas m on m.turma_id = et.turma_id and m.aluno_id = auth.uid() and m.ativa
          where et.exercicio_id = e.id
        ))
        or exists (
          select 1 from public.exercicio_turmas et
          join public.turmas t on t.id = et.turma_id and t.professor_id = auth.uid()
          where et.exercicio_id = e.id
        )
      )
  );
$$;

create or replace function public.turma_tem_resultados(p_turma_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.resultados where turma_id = p_turma_id);
$$;

create or replace function public.exercicio_tem_resultados(p_exercicio_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.resultados where exercicio_id = p_exercicio_id);
$$;

-- ------------------------------------------------------------
-- Código de convite: gerado no banco, único e sem caracteres ambíguos
-- (security definer: precisa enxergar os códigos de todas as turmas)
-- ------------------------------------------------------------
create or replace function public.gerar_codigo_convite()
returns varchar
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
begin
  loop
    v_codigo := '';
    for i in 1..8 loop
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.turmas where codigo_convite = v_codigo);
  end loop;
  return v_codigo;
end;
$$;

create or replace function public.turmas_antes_de_salvar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.codigo_convite := coalesce(nullif(upper(trim(new.codigo_convite)), ''), public.gerar_codigo_convite());
  else
    -- o código só muda pela RPC regenerar_codigo_turma
    if new.codigo_convite is distinct from old.codigo_convite
       and coalesce(current_setting('wavetype.regenerando_codigo', true), '') <> 'sim' then
      new.codigo_convite := old.codigo_convite;
    end if;
    new.professor_id := old.professor_id;
  end if;
  new.nome := trim(new.nome);
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists turmas_antes_de_salvar on public.turmas;
create trigger turmas_antes_de_salvar
  before insert or update on public.turmas
  for each row execute function public.turmas_antes_de_salvar();

-- ------------------------------------------------------------
-- Políticas RLS (recriadas do zero)
-- ------------------------------------------------------------
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('usuarios', 'turmas', 'matriculas', 'exercicios', 'exercicio_turmas',
                        'resultados', 'conquistas', 'usuario_conquistas')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.usuarios enable row level security;
alter table public.turmas enable row level security;
alter table public.matriculas enable row level security;
alter table public.exercicios enable row level security;
alter table public.exercicio_turmas enable row level security;
alter table public.resultados enable row level security;
alter table public.conquistas enable row level security;
alter table public.usuario_conquistas enable row level security;

-- usuarios: cada um só vê e edita o próprio perfil (colunas limitadas na migração 01).
-- Dados de alunos para o professor saem só pela RPC alunos_da_turma().
create policy usuarios_select_proprio on public.usuarios
  for select to authenticated using (id = auth.uid());
create policy usuarios_update_proprio on public.usuarios
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- turmas
create policy turmas_select on public.turmas
  for select to authenticated
  using (professor_id = auth.uid() or public.eh_aluno_da_turma(id));
create policy turmas_insert on public.turmas
  for insert to authenticated
  with check (professor_id = auth.uid() and public.meu_tipo() = 'professor');
create policy turmas_update on public.turmas
  for update to authenticated
  using (professor_id = auth.uid()) with check (professor_id = auth.uid());
create policy turmas_delete on public.turmas
  for delete to authenticated
  using (professor_id = auth.uid() and not public.turma_tem_resultados(id));

-- matriculas: entrada só pelas RPCs (código válido ou professor dono da turma)
create policy matriculas_select on public.matriculas
  for select to authenticated
  using (aluno_id = auth.uid() or public.eh_professor_da_turma(turma_id));
create policy matriculas_update on public.matriculas
  for update to authenticated
  using (public.eh_professor_da_turma(turma_id)) with check (public.eh_professor_da_turma(turma_id));

-- exercicios: trilha oficial é lida por todos os logados; atividades,
-- pelo autor, pelos alunos das turmas atribuídas e pelos donos das turmas.
create policy exercicios_select on public.exercicios
  for select to authenticated
  using (public.pode_ver_exercicio(id));
create policy exercicios_insert on public.exercicios
  for insert to authenticated
  with check (criado_por = auth.uid() and nivel_trilha is null and public.meu_tipo() = 'professor');
create policy exercicios_update on public.exercicios
  for update to authenticated
  using (criado_por = auth.uid() and nivel_trilha is null)
  with check (criado_por = auth.uid() and nivel_trilha is null);
create policy exercicios_delete on public.exercicios
  for delete to authenticated
  using (criado_por = auth.uid() and nivel_trilha is null and not public.exercicio_tem_resultados(id));

-- exercicio_turmas
create policy exercicio_turmas_select on public.exercicio_turmas
  for select to authenticated
  using (public.eh_professor_da_turma(turma_id) or public.eh_aluno_da_turma(turma_id));
create policy exercicio_turmas_insert on public.exercicio_turmas
  for insert to authenticated
  with check (
    public.eh_professor_da_turma(turma_id)
    and exists (select 1 from public.exercicios e where e.id = exercicio_id and e.criado_por = auth.uid())
  );
create policy exercicio_turmas_delete on public.exercicio_turmas
  for delete to authenticated
  using (public.eh_professor_da_turma(turma_id));

-- resultados: o aluno insere e lê os próprios; o professor lê os das
-- suas turmas e das suas atividades. As regras de conclusão ficam no
-- trigger resultados_validar (migração 03).
create policy resultados_select on public.resultados
  for select to authenticated
  using (
    aluno_id = auth.uid()
    or (turma_id is not null and public.eh_professor_da_turma(turma_id))
    or exists (
      select 1 from public.exercicios e
      where e.id = resultados.exercicio_id and e.nivel_trilha is null and e.criado_por = auth.uid()
    )
  );
create policy resultados_insert on public.resultados
  for insert to authenticated
  with check (aluno_id = auth.uid());

-- conquistas: catálogo público; desbloqueios só pelo servidor (migração 04)
create policy conquistas_select on public.conquistas
  for select to anon, authenticated using (true);
create policy usuario_conquistas_select on public.usuario_conquistas
  for select to authenticated using (usuario_id = auth.uid());

-- Privilégios de tabela coerentes com as políticas
revoke insert, update, delete on public.matriculas from anon, authenticated;
grant select on public.matriculas to authenticated;
grant update (ativa) on public.matriculas to authenticated;
revoke update, delete on public.resultados from anon, authenticated;
revoke insert, update, delete on public.usuario_conquistas from anon, authenticated;
revoke insert, update, delete on public.conquistas from anon, authenticated;
grant select, insert, delete on public.exercicio_turmas to authenticated;

-- ------------------------------------------------------------
-- RPCs de turmas
-- ------------------------------------------------------------

-- Aluno entra na turma pelo código.
create or replace function public.entrar_na_turma(p_codigo varchar)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_turma_id bigint;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para participar de uma turma.' using errcode = '28000';
  end if;
  if coalesce(public.meu_tipo(), '') <> 'aluno' then
    raise exception 'Apenas contas de aluno podem entrar em turmas.' using errcode = '42501';
  end if;

  select id into v_turma_id
  from public.turmas
  where codigo_convite = upper(trim(coalesce(p_codigo, ''))) and status = 'ativa';

  if v_turma_id is null then
    raise exception 'Código inválido ou turma encerrada.' using errcode = 'P0002';
  end if;

  insert into public.matriculas (aluno_id, turma_id)
  values (v_uid, v_turma_id)
  on conflict (aluno_id, turma_id) do update set ativa = true;

  return v_turma_id;
end;
$$;

-- Professor adiciona um aluno pelo ID do perfil.
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
  if not exists (
    select 1 from public.usuarios where id = p_aluno_id and tipo::text = 'aluno' and tipo_definido and ativo
  ) then
    raise exception 'Nenhum aluno encontrado com este ID.' using errcode = 'P0002';
  end if;

  insert into public.matriculas (aluno_id, turma_id)
  values (p_aluno_id, p_turma_id)
  on conflict (aluno_id, turma_id) do update set ativa = true;
end;
$$;

-- Professor remove um aluno (a matrícula fica inativa e os resultados são mantidos).
create or replace function public.remover_aluno_da_turma(p_turma_id bigint, p_aluno_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_professor_da_turma(p_turma_id) then
    raise exception 'Você não tem permissão para gerenciar esta turma.' using errcode = '42501';
  end if;
  update public.matriculas set ativa = false where turma_id = p_turma_id and aluno_id = p_aluno_id;
end;
$$;

create or replace function public.regenerar_codigo_turma(p_turma_id bigint)
returns varchar
language plpgsql
security definer
set search_path = public
as $$
declare v_codigo varchar;
begin
  if not public.eh_professor_da_turma(p_turma_id) then
    raise exception 'Você não tem permissão para gerenciar esta turma.' using errcode = '42501';
  end if;
  v_codigo := public.gerar_codigo_convite();
  perform set_config('wavetype.regenerando_codigo', 'sim', true);
  update public.turmas set codigo_convite = v_codigo where id = p_turma_id;
  perform set_config('wavetype.regenerando_codigo', '', true);
  return v_codigo;
end;
$$;

-- Turma com resultados não é apagada (os resultados ficariam órfãos): encerre-a.
create or replace function public.excluir_turma(p_turma_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_professor_da_turma(p_turma_id) then
    raise exception 'Você não tem permissão para gerenciar esta turma.' using errcode = '42501';
  end if;
  if public.turma_tem_resultados(p_turma_id) then
    raise exception 'Esta turma já tem resultados registrados. Encerre a turma em vez de excluí-la.' using errcode = '23503';
  end if;
  delete from public.turmas where id = p_turma_id;
end;
$$;

-- Professor: turmas com contagem de alunos ativos e médias dos resultados.
create or replace function public.resumo_turmas_professor()
returns table (
  id bigint, nome varchar, descricao text, ano_letivo varchar, status varchar,
  codigo_convite varchar, criado_em timestamptz, alunos bigint, atividades bigint,
  sessoes bigint, ppm_medio numeric, precisao_media numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.nome, t.descricao, t.ano_letivo, t.status, t.codigo_convite, t.criado_em,
    (select count(*) from public.matriculas m where m.turma_id = t.id and m.ativa),
    (select count(*) from public.exercicio_turmas et where et.turma_id = t.id),
    (select count(*) from public.resultados r where r.turma_id = t.id),
    (select round(avg(r.ppm), 1) from public.resultados r where r.turma_id = t.id),
    (select round(avg(r.precisao), 1) from public.resultados r where r.turma_id = t.id)
  from public.turmas t
  where t.professor_id = auth.uid()
  order by t.status, t.criado_em desc;
$$;

-- Professor: alunos de uma turma com estatísticas (sem expor outras turmas).
create or replace function public.alunos_da_turma(p_turma_id bigint)
returns table (
  aluno_id uuid, nome varchar, email varchar, entrou_em timestamptz,
  sessoes bigint, ppm_medio numeric, precisao_media numeric,
  atividades_concluidas bigint, ultima_pratica timestamptz
)
language plpgsql
stable
security definer
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
    max(r.criado_em)
  from public.matriculas m
  join public.usuarios u on u.id = m.aluno_id
  left join public.resultados r on r.aluno_id = u.id and r.turma_id = p_turma_id
  where m.turma_id = p_turma_id and m.ativa
  group by u.id, u.nome, u.email, m.entrou_em
  order by u.nome;
end;
$$;

-- ------------------------------------------------------------
-- RPCs de atividades do professor
-- ------------------------------------------------------------

-- Cria ou edita uma atividade e sincroniza as turmas numa única transação.
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
  if p_meta_precisao is not null and (p_meta_precisao < 0 or p_meta_precisao > 100) then
    raise exception 'A meta de precisão deve ficar entre 0 e 100.' using errcode = '22023';
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
            coalesce(p_tempo_limite_seg, 120), p_prazo, p_meta_precisao, coalesce(p_publicado, true), v_uid)
    returning id into v_id;
  else
    update public.exercicios
    set titulo = left(trim(p_titulo), 150),
        instrucoes = nullif(trim(p_instrucoes), ''),
        texto_referencia = trim(p_texto),
        nivel = p_nivel,
        tempo_limite_seg = coalesce(p_tempo_limite_seg, tempo_limite_seg),
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

-- Atividade com resultados não é apagada: é arquivada (sai da lista dos alunos).
create or replace function public.excluir_atividade(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.exercicios where id = p_id and criado_por = auth.uid() and nivel_trilha is null
  ) then
    raise exception 'Atividade não encontrada.' using errcode = 'P0002';
  end if;
  if public.exercicio_tem_resultados(p_id) then
    update public.exercicios set publicado = false, atualizado_em = now() where id = p_id;
    return 'arquivada';
  end if;
  delete from public.exercicios where id = p_id;
  return 'excluida';
end;
$$;

-- Professor: as próprias atividades com turmas e contagem de entregas.
create or replace function public.atividades_do_professor()
returns table (
  id bigint, titulo varchar, instrucoes text, texto_referencia text, nivel varchar,
  tempo_limite_seg int, prazo timestamptz, meta_precisao numeric, publicado boolean,
  criado_em timestamptz, turmas jsonb, entregas bigint, alunos_concluiram bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.titulo, e.instrucoes, e.texto_referencia, e.nivel, e.tempo_limite_seg, e.prazo,
    e.meta_precisao, e.publicado, e.criado_em,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome) order by t.nome)
      from public.exercicio_turmas et join public.turmas t on t.id = et.turma_id
      where et.exercicio_id = e.id
    ), '[]'::jsonb),
    (select count(*) from public.resultados r where r.exercicio_id = e.id),
    (select count(distinct r.aluno_id) from public.resultados r where r.exercicio_id = e.id and r.concluido)
  from public.exercicios e
  where e.criado_por = auth.uid() and e.nivel_trilha is null
  order by e.criado_em desc;
$$;

-- Aluno: atividades das turmas em que está matriculado (uma linha por
-- atividade, mesmo que ela tenha sido atribuída a mais de uma turma).
create or replace function public.minhas_atividades()
returns table (
  id bigint, titulo varchar, instrucoes text, nivel varchar, tempo_limite_seg int,
  prazo timestamptz, meta_precisao numeric, turma_id bigint, turmas text,
  professor_nome varchar, tentativas bigint, melhor_precisao numeric, melhor_ppm numeric,
  concluida boolean, concluida_em timestamptz, situacao text
)
language sql
stable
security definer
set search_path = public
as $$
  with minhas as (
    select et.exercicio_id, et.turma_id, t.nome as turma_nome
    from public.exercicio_turmas et
    join public.matriculas m on m.turma_id = et.turma_id and m.aluno_id = auth.uid() and m.ativa
    join public.turmas t on t.id = et.turma_id
  )
  select e.id, e.titulo, e.instrucoes, e.nivel, e.tempo_limite_seg, e.prazo, e.meta_precisao,
    (select min(mm.turma_id) from minhas mm where mm.exercicio_id = e.id),
    (select string_agg(distinct mm.turma_nome, ', ') from minhas mm where mm.exercicio_id = e.id),
    p.nome,
    count(r.id),
    max(r.precisao),
    max(r.ppm),
    coalesce(bool_or(r.concluido), false),
    min(r.criado_em) filter (where r.concluido),
    case
      when coalesce(bool_or(r.concluido), false) then 'concluida'
      when e.prazo is not null and e.prazo < now() then 'atrasada'
      else 'pendente'
    end
  from public.exercicios e
  left join public.usuarios p on p.id = e.criado_por
  left join public.resultados r on r.exercicio_id = e.id and r.aluno_id = auth.uid()
  where e.publicado and e.nivel_trilha is null
    and exists (select 1 from minhas mm where mm.exercicio_id = e.id)
  group by e.id, p.nome
  order by
    case when coalesce(bool_or(r.concluido), false) then 1 else 0 end,
    e.prazo nulls last,
    e.criado_em desc;
$$;

-- ------------------------------------------------------------
-- Ranking: só de exercícios que a pessoa pode ver; melhor resultado por aluno.
-- ------------------------------------------------------------
drop function if exists public.ranking_exercicio(bigint);
create function public.ranking_exercicio(p_exercicio_id bigint)
returns table (aluno_nome varchar, ppm numeric, precisao numeric, criado_em timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select nome, ppm, precisao, criado_em
  from (
    select distinct on (r.aluno_id) u.nome, r.ppm, r.precisao, r.criado_em
    from public.resultados r
    join public.usuarios u on u.id = r.aluno_id
    where r.exercicio_id = p_exercicio_id and public.pode_ver_exercicio(p_exercicio_id)
    order by r.aluno_id, r.ppm desc, r.precisao desc
  ) melhores
  order by ppm desc, precisao desc
  limit 20;
$$;

-- ------------------------------------------------------------
-- Permissões de execução
-- ------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.meu_tipo()', 'public.eh_professor_da_turma(bigint)', 'public.eh_aluno_da_turma(bigint)',
    'public.pode_ver_exercicio(bigint)', 'public.turma_tem_resultados(bigint)',
    'public.exercicio_tem_resultados(bigint)', 'public.gerar_codigo_convite()',
    'public.entrar_na_turma(character varying)', 'public.adicionar_aluno_por_id(bigint, uuid)',
    'public.remover_aluno_da_turma(bigint, uuid)', 'public.regenerar_codigo_turma(bigint)',
    'public.excluir_turma(bigint)', 'public.resumo_turmas_professor()', 'public.alunos_da_turma(bigint)',
    'public.salvar_atividade(bigint, text, text, text, text, integer, timestamp with time zone, numeric, bigint[], boolean)',
    'public.excluir_atividade(bigint)', 'public.atividades_do_professor()', 'public.minhas_atividades()',
    'public.ranking_exercicio(bigint)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
