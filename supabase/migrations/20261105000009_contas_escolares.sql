-- ============================================================
-- 20261105000009_contas_escolares.sql
-- Etapa 3: aluno sem e-mail (conta criada pelo professor), entrada com
-- usuário da escola, vínculo de e-mail/Google e transferência da conta.
--
-- Desenho:
--   * public.usuarios.id (= auth.users.id) continua sendo o ID estável da
--     pessoa. Todo progresso (resultados, conquistas, matrículas) aponta para
--     ele, então trocar senha, usuário ou e-mail não perde nada.
--   * A senha fica só no Supabase Auth (auth.users.encrypted_password, bcrypt).
--   * public.contas_escolares guarda a credencial da escola (login legível,
--     ex.: maria.silva.santos) e o status do vínculo: 'escolar' (gerida pela
--     escola) ou 'pessoal' (transferida ao aluno).
--   * Conta escolar recebe um e-mail interno <id>@aluno.wavetype.com.br, que
--     nunca recebe mensagens. Ao vincular um e-mail real, ele o substitui.
--   * Entrada com usuário: a RPC login_escolar confere usuário + senha (com
--     limite de tentativas) e só então devolve o e-mail de login; o navegador
--     abre a sessão normal do Supabase. Usuário ou senha errados devolvem a
--     mesma resposta, sem revelar quais usuários existem.
--
-- Não apaga nem altera contas existentes. Idempotente.
-- Requer: pgcrypto (já vem no Supabase, schema extensions).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create or replace function public.dominio_conta_escolar()
returns text language sql immutable as $$ select 'aluno.wavetype.com.br'::text $$;

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------
create table if not exists public.contas_escolares (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  login text not null,
  criada_por uuid references public.usuarios(id) on delete set null,
  turma_origem_id bigint references public.turmas(id) on delete set null,
  status text not null default 'escolar' check (status in ('escolar', 'pessoal')),
  senha_redefinida_em timestamptz,
  transferida_em timestamptz,
  criada_em timestamptz not null default now(),
  constraint contas_escolares_login_formato
    check (login ~ '^[a-z0-9]+(\.[a-z0-9]+)*$' and char_length(login) between 3 and 60)
);
create unique index if not exists uq_contas_escolares_login on public.contas_escolares (login);
create index if not exists idx_contas_escolares_criada_por on public.contas_escolares (criada_por);

comment on table public.contas_escolares is
  'Credencial de aluno criada pelo professor (login sem e-mail) e status do vínculo com a escola.';

-- Tentativas de entrada com usuário da escola (limite contra adivinhação).
create table if not exists public.tentativas_login_escolar (
  login text primary key,
  falhas int not null default 0,
  janela_inicio timestamptz not null default now(),
  bloqueado_ate timestamptz
);

alter table public.contas_escolares enable row level security;
alter table public.tentativas_login_escolar enable row level security;
revoke all on public.tentativas_login_escolar from anon, authenticated;
revoke insert, update, delete on public.contas_escolares from anon, authenticated;
grant select on public.contas_escolares to authenticated;

-- O aluno vê a própria credencial; o professor vê a dos alunos ativos das
-- suas turmas enquanto a conta for gerida pela escola.
drop policy if exists contas_escolares_select on public.contas_escolares;
create policy contas_escolares_select on public.contas_escolares
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or (
      status = 'escolar'
      and exists (
        select 1 from public.matriculas m
        join public.turmas t on t.id = m.turma_id
        where m.aluno_id = contas_escolares.usuario_id and m.ativa and t.professor_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- Conta transferida: o professor perde o acesso aos dados individuais.
-- ------------------------------------------------------------
create or replace function public.conta_transferida(p_usuario uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.contas_escolares where usuario_id = p_usuario and status = 'pessoal');
$$;

drop policy if exists resultados_select on public.resultados;
create policy resultados_select on public.resultados
  for select to authenticated
  using (
    aluno_id = auth.uid()
    or (
      not public.conta_transferida(resultados.aluno_id)
      and (
        (turma_id is not null and public.eh_professor_da_turma(turma_id))
        or exists (
          select 1 from public.exercicios e
          where e.id = resultados.exercicio_id and e.nivel_trilha is null and e.criado_por = auth.uid()
        )
      )
    )
  );

-- O e-mail do perfil acompanha o do Auth (ex.: aluno vinculou um e-mail real).
create or replace function public.sincronizar_email_usuario()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.usuarios set email = new.email, atualizado_em = now() where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sincronizar_email_usuario();

-- ------------------------------------------------------------
-- Professor: criar alunos (individual ou em lote)
--   p_alunos: [{ "nome": "Maria Silva Santos", "login_base": "maria.silva.santos", "senha": "gato427" }]
--   O login final ganha sufixo numérico em caso de colisão (maria.silva.santos2).
--   Devolve o login final de cada aluno. A senha é gerada no navegador do
--   professor, mostrada uma vez e guardada aqui só como hash.
-- ------------------------------------------------------------
create or replace function public.professor_criar_alunos(p_turma_id bigint, p_alunos jsonb)
returns table (novo_id uuid, novo_nome text, novo_login text)
language plpgsql security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_prof uuid := auth.uid();
  v_item jsonb;
  v_nome text;
  v_base text;
  v_senha text;
  v_login text;
  v_id uuid;
  v_email text;
  v_n int;
begin
  if v_prof is null or coalesce(public.meu_tipo(), '') <> 'professor' then
    raise exception 'Só professores podem criar contas de aluno.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.turmas where id = p_turma_id and professor_id = v_prof and status = 'ativa') then
    raise exception 'Turma não encontrada ou encerrada.' using errcode = 'P0002';
  end if;
  if p_alunos is null or jsonb_typeof(p_alunos) <> 'array' or jsonb_array_length(p_alunos) = 0 then
    raise exception 'Informe pelo menos um aluno.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_alunos) > 60 then
    raise exception 'Crie no máximo 60 alunos por vez.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_alunos) loop
    v_nome := left(trim(regexp_replace(coalesce(v_item->>'nome', ''), '\s+', ' ', 'g')), 120);
    v_base := lower(trim(coalesce(v_item->>'login_base', '')));
    v_senha := coalesce(v_item->>'senha', '');

    if char_length(v_nome) < 2 then
      raise exception 'Nome inválido: "%".', v_nome using errcode = '22023';
    end if;
    if v_base !~ '^[a-z0-9]+(\.[a-z0-9]+)*$' or char_length(v_base) not between 3 and 50 then
      raise exception 'Usuário inválido para "%".', v_nome using errcode = '22023';
    end if;
    if char_length(v_senha) not between 6 and 40 or v_senha !~ '[a-z]' or v_senha !~ '[0-9]' then
      raise exception 'Senha inicial inválida para "%".', v_nome using errcode = '22023';
    end if;

    -- Login único: base, base2, base3...
    v_login := v_base;
    v_n := 1;
    while exists (select 1 from public.contas_escolares where login = v_login) loop
      v_n := v_n + 1;
      v_login := v_base || v_n;
    end loop;

    v_id := gen_random_uuid();
    v_email := v_id::text || '@' || public.dominio_conta_escolar();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_senha, extensions.gen_salt('bf', 10)), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'conta_escolar', true),
      jsonb_build_object('nome', v_nome, 'tipo', 'aluno'),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
    -- O perfil (public.usuarios, tipo aluno) nasce pelo trigger on_auth_user_created.

    insert into public.contas_escolares (usuario_id, login, criada_por, turma_origem_id)
    values (v_id, v_login, v_prof, p_turma_id);
    insert into public.matriculas (aluno_id, turma_id, ativa)
    values (v_id, p_turma_id, true)
    on conflict (aluno_id, turma_id) do update set ativa = true;

    novo_id := v_id;
    novo_nome := v_nome;
    novo_login := v_login;
    return next;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Professor: nova senha para um aluno da escola (o histórico não muda)
-- ------------------------------------------------------------
create or replace function public.professor_redefinir_senha_aluno(p_aluno_id uuid, p_senha text)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_login text;
begin
  if auth.uid() is null or coalesce(public.meu_tipo(), '') <> 'professor' then
    raise exception 'Só professores podem redefinir senhas.' using errcode = '42501';
  end if;
  select c.login into v_login
  from public.contas_escolares c
  where c.usuario_id = p_aluno_id
    and c.status = 'escolar'
    and exists (
      select 1 from public.matriculas m join public.turmas t on t.id = m.turma_id
      where m.aluno_id = c.usuario_id and m.ativa and t.professor_id = auth.uid()
    );
  if v_login is null then
    raise exception 'Este aluno não tem uma conta da escola nas suas turmas.' using errcode = 'P0002';
  end if;
  if p_senha is null or char_length(p_senha) not between 6 and 40 or p_senha !~ '[a-z]' or p_senha !~ '[0-9]' then
    raise exception 'Senha inválida.' using errcode = '22023';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf', 10)), updated_at = now()
  where id = p_aluno_id;
  -- Encerra as sessões abertas com a senha antiga.
  delete from auth.sessions where user_id = p_aluno_id;
  delete from public.tentativas_login_escolar where login = v_login;
  update public.contas_escolares set senha_redefinida_em = now() where usuario_id = p_aluno_id;
  return v_login;
end;
$$;

-- ------------------------------------------------------------
-- Entrada com usuário da escola (chamada antes de abrir a sessão)
--   Devolve o e-mail de login só se usuário e senha conferem; senão null.
--   8 falhas em 15 min bloqueiam o usuário por 10 min (vale também para
--   usuários inexistentes, então o bloqueio não revela quem existe).
-- ------------------------------------------------------------
create or replace function public.login_escolar(p_login text, p_senha text)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_login text := lower(trim(coalesce(p_login, '')));
  v_tentativa public.tentativas_login_escolar;
  v_hash text;
  v_email text;
  v_falhas int;
begin
  if v_login = '' or coalesce(p_senha, '') = '' or char_length(v_login) > 60 then
    return null;
  end if;

  select * into v_tentativa from public.tentativas_login_escolar where login = v_login;
  if found and v_tentativa.bloqueado_ate is not null and v_tentativa.bloqueado_ate > now() then
    raise exception 'Muitas tentativas seguidas. Espere alguns minutos ou peça ajuda ao professor.' using errcode = 'P0001';
  end if;

  select u.encrypted_password, u.email into v_hash, v_email
  from public.contas_escolares c
  join auth.users u on u.id = c.usuario_id
  where c.login = v_login;

  if v_hash is not null and v_hash <> '' and v_hash = extensions.crypt(p_senha, v_hash) then
    delete from public.tentativas_login_escolar where login = v_login;
    return v_email;
  end if;
  if v_hash is null then
    perform extensions.crypt(p_senha, extensions.gen_salt('bf', 10)); -- mesmo tempo de resposta
  end if;

  insert into public.tentativas_login_escolar as t (login, falhas, janela_inicio)
  values (v_login, 1, now())
  on conflict (login) do update set
    falhas = case when t.janela_inicio < now() - interval '15 minutes' then 1 else t.falhas + 1 end,
    janela_inicio = case when t.janela_inicio < now() - interval '15 minutes' then now() else t.janela_inicio end
  returning falhas into v_falhas;
  if v_falhas >= 8 then
    update public.tentativas_login_escolar set bloqueado_ate = now() + interval '10 minutes' where login = v_login;
  end if;
  return null;
end;
$$;

-- ------------------------------------------------------------
-- Aluno: dados da própria conta escolar (para a tela Perfil)
-- ------------------------------------------------------------
create or replace function public.minha_conta_escolar()
returns table (login text, status text, tem_email_pessoal boolean, tem_google boolean, transferida_em timestamptz)
language sql stable security definer
set search_path = public
as $$
  select c.login, c.status,
    u.email not like '%@' || public.dominio_conta_escolar(),
    exists (select 1 from auth.identities i where i.user_id = c.usuario_id and i.provider = 'google'),
    c.transferida_em
  from public.contas_escolares c
  join auth.users u on u.id = c.usuario_id
  where c.usuario_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- Aluno: "Transferir ao terminar a escola"
--   A mesma conta (mesmo ID) passa a ser pessoal: sai das turmas, vira conta
--   de usuário e o professor deixa de ver os dados individuais. Exige um
--   e-mail ou Google vinculado, para a pessoa nunca perder o acesso.
-- ------------------------------------------------------------
create or replace function public.transferir_conta_escolar()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_pessoal boolean;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  select status into v_status from public.contas_escolares where usuario_id = v_uid;
  if v_status is null then
    raise exception 'Esta conta não foi criada pela escola.' using errcode = 'P0002';
  end if;
  if v_status = 'pessoal' then
    raise exception 'Esta conta já é pessoal.' using errcode = 'P0001';
  end if;
  select exists (select 1 from auth.identities where user_id = v_uid and provider <> 'email')
      or exists (select 1 from auth.users where id = v_uid and email not like '%@' || public.dominio_conta_escolar())
    into v_pessoal;
  if not v_pessoal then
    raise exception 'Antes de transferir, vincule seu e-mail ou sua conta Google. Assim você não perde o acesso.' using errcode = 'P0001';
  end if;

  update public.matriculas set ativa = false where aluno_id = v_uid;
  update public.contas_escolares set status = 'pessoal', transferida_em = now() where usuario_id = v_uid;
  update public.usuarios set tipo = 'usuario', atualizado_em = now() where id = v_uid;
end;
$$;

-- ------------------------------------------------------------
-- Permissões das funções
-- ------------------------------------------------------------
revoke all on function public.professor_criar_alunos(bigint, jsonb) from public, anon;
revoke all on function public.professor_redefinir_senha_aluno(uuid, text) from public, anon;
revoke all on function public.minha_conta_escolar() from public, anon;
revoke all on function public.transferir_conta_escolar() from public, anon;
revoke all on function public.login_escolar(text, text) from public;
revoke all on function public.conta_transferida(uuid) from public, anon;
grant execute on function public.professor_criar_alunos(bigint, jsonb) to authenticated;
grant execute on function public.professor_redefinir_senha_aluno(uuid, text) to authenticated;
grant execute on function public.minha_conta_escolar() to authenticated;
grant execute on function public.transferir_conta_escolar() to authenticated;
grant execute on function public.login_escolar(text, text) to anon, authenticated;
grant execute on function public.conta_transferida(uuid) to authenticated;

notify pgrst, 'reload schema';
