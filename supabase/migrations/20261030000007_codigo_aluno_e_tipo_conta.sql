-- ============================================================
-- 07 · Código curto do aluno e troca entre usuário e aluno
-- ------------------------------------------------------------
-- Idempotente. Não apaga dados.
--
-- 1. Cada perfil ganha um código curto e único (6 caracteres, sem letras
--    que se confundem, ex.: K7Q2MX). É ele que o aluno passa ao professor,
--    no lugar do ID longo (UUID), que continua aceito.
-- 2. alterar_tipo_conta: a própria pessoa troca entre "usuario" e "aluno".
--    Professor não entra nessa troca (ninguém se promove a professor).
-- 3. adicionar_aluno: o professor adiciona pelo código curto ou pelo ID.
-- ============================================================

alter table public.usuarios add column if not exists codigo_aluno varchar(8);

create or replace function public.gerar_codigo_aluno()
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
    for i in 1..6 loop
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from public.usuarios where codigo_aluno = v_codigo);
  end loop;
  return v_codigo;
end;
$$;

-- Perfis existentes recebem um código.
do $$
declare r record;
begin
  for r in select id from public.usuarios where codigo_aluno is null loop
    update public.usuarios set codigo_aluno = public.gerar_codigo_aluno() where id = r.id;
  end loop;
end $$;

create unique index if not exists uq_usuarios_codigo_aluno on public.usuarios (codigo_aluno);

-- Perfis novos recebem o código na criação; ele nunca muda depois.
-- security definer: o trigger também roda quando a pessoa edita o próprio nome.
create or replace function public.usuarios_codigo_aluno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.codigo_aluno is not null then
    new.codigo_aluno := old.codigo_aluno;
  elsif new.codigo_aluno is null then
    new.codigo_aluno := public.gerar_codigo_aluno();
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_codigo_aluno on public.usuarios;
create trigger usuarios_codigo_aluno
  before insert or update on public.usuarios
  for each row execute function public.usuarios_codigo_aluno();

-- ------------------------------------------------------------
-- Troca entre usuário e aluno (pela página Perfil)
-- ------------------------------------------------------------
create or replace function public.alterar_tipo_conta(p_tipo text)
returns public.usuarios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.usuarios;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if p_tipo is null or p_tipo not in ('usuario', 'aluno') then
    raise exception 'Só é possível trocar entre conta de usuário e conta de aluno.' using errcode = '22023';
  end if;

  select * into v_perfil from public.usuarios where id = v_uid;
  if v_perfil.id is null or not v_perfil.tipo_definido then
    raise exception 'Conclua seu cadastro antes de trocar o tipo de conta.' using errcode = '42501';
  end if;
  if v_perfil.tipo::text not in ('usuario', 'aluno') then
    raise exception 'Contas de professor não podem trocar de tipo por aqui.' using errcode = '42501';
  end if;

  update public.usuarios
  set tipo = p_tipo::public.tipo_usuario, atualizado_em = now()
  where id = v_uid
  returning * into v_perfil;
  return v_perfil;
end;
$$;

-- ------------------------------------------------------------
-- Professor adiciona aluno pelo código curto (ou pelo ID longo)
-- ------------------------------------------------------------
create or replace function public.adicionar_aluno(p_turma_id bigint, p_identificador text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_texto text := trim(coalesce(p_identificador, ''));
  v_aluno uuid;
begin
  if v_texto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_aluno := v_texto::uuid;
  else
    select id into v_aluno from public.usuarios where codigo_aluno = upper(replace(v_texto, '-', ''));
  end if;
  if v_aluno is null then
    raise exception 'Nenhum aluno encontrado com este código.' using errcode = 'P0002';
  end if;
  perform public.adicionar_aluno_por_id(p_turma_id, v_aluno);
end;
$$;

revoke all on function public.gerar_codigo_aluno() from public, anon, authenticated;
revoke all on function public.usuarios_codigo_aluno() from public, anon, authenticated;
revoke all on function public.alterar_tipo_conta(text) from public, anon;
grant execute on function public.alterar_tipo_conta(text) to authenticated;
revoke all on function public.adicionar_aluno(bigint, text) from public, anon;
grant execute on function public.adicionar_aluno(bigint, text) to authenticated;

notify pgrst, 'reload schema';
