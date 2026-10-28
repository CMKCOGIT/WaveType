-- ============================================================
-- 01 · Perfis e cadastro com Google
-- ------------------------------------------------------------
-- Idempotente: pode ser executada mais de uma vez sem duplicar nada.
--
-- O que faz:
--   * garante o tipo 'usuario' no enum e a coluna tipo_definido;
--   * o perfil criado pelo Google nasce "incompleto" (tipo_definido = false)
--     e só vira completo pela RPC concluir_cadastro();
--   * o usuário não consegue mais trocar o próprio tipo (ex.: virar
--     professor) nem mexer em XP/nível com um UPDATE direto do navegador.
-- ============================================================

alter type public.tipo_usuario add value if not exists 'usuario';

alter table public.usuarios add column if not exists tipo_definido boolean not null default true;
alter table public.usuarios add column if not exists avatar_url text;

-- ------------------------------------------------------------
-- Trigger de criação do perfil (cadastro por e-mail ou Google)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_tipo text := v_meta->>'tipo';
  v_definido boolean := coalesce(v_meta->>'tipo', '') in ('usuario', 'aluno', 'professor');
  v_nome text := coalesce(
    nullif(trim(v_meta->>'nome'), ''),
    nullif(trim(v_meta->>'full_name'), ''),
    nullif(trim(v_meta->>'name'), ''),
    split_part(new.email, '@', 1)
  );
begin
  insert into public.usuarios (id, nome, email, tipo, tipo_definido, avatar_url)
  values (
    new.id,
    left(v_nome, 120),
    new.email,
    (case when v_definido then v_tipo else 'aluno' end)::public.tipo_usuario,
    v_definido,
    v_meta->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- RPC: conclui o cadastro (escolha do tipo + nome).
-- Só funciona enquanto o perfil está incompleto: depois disso o tipo
-- fica travado e a chamada apenas devolve o perfil (idempotente).
-- ------------------------------------------------------------
create or replace function public.concluir_cadastro(p_tipo text, p_nome text)
returns public.usuarios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text := left(trim(coalesce(p_nome, '')), 120);
  v_perfil public.usuarios;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if p_tipo is null or p_tipo not in ('usuario', 'aluno', 'professor') then
    raise exception 'Escolha um tipo de conta válido.' using errcode = '22023';
  end if;
  if char_length(v_nome) < 2 then
    raise exception 'Informe seu nome completo.' using errcode = '22023';
  end if;

  -- Perfil ausente (ex.: conta criada antes do trigger existir): cria agora.
  insert into public.usuarios (id, nome, email, tipo, tipo_definido)
  select u.id, v_nome, u.email, 'aluno', false
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;

  update public.usuarios
  set tipo = p_tipo::public.tipo_usuario,
      nome = v_nome,
      tipo_definido = true,
      atualizado_em = now()
  where id = v_uid and tipo_definido = false
  returning * into v_perfil;

  if v_perfil.id is null then
    select * into v_perfil from public.usuarios where id = v_uid;
  end if;
  if v_perfil.id is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;
  return v_perfil;
end;
$$;

revoke all on function public.concluir_cadastro(text, text) from public, anon;
grant execute on function public.concluir_cadastro(text, text) to authenticated;

-- A antiga RPC definir_tipo (usada pela tela intermediária removida)
-- deixa de ser chamável pelo navegador: ela permitia trocar o tipo.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'definir_tipo'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.assinatura);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Colunas que o próprio usuário pode editar pelo navegador.
-- tipo, xp, nivel, sequencia e tipo_definido só mudam no servidor.
-- ------------------------------------------------------------
revoke insert, update, delete on public.usuarios from anon, authenticated;
grant select on public.usuarios to authenticated;
grant update (nome, avatar_url) on public.usuarios to authenticated;
