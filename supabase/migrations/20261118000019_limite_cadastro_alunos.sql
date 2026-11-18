-- ============================================================
-- 20261118000019_limite_cadastro_alunos.sql
-- Limite de frequência (rate limit) no cadastro de alunos pelo professor.
-- Vale para os três caminhos, porque todos passam por professor_criar_alunos:
--   Perfil → Cadastrar aluno, Alunos → Criar contas e Importar planilha.
--
-- Por professor:
--   - até 10 cadastros (envios) por minuto;
--   - até 300 contas de aluno por hora;
--   - até 1000 contas de aluno por dia (24 horas).
-- Os números cobrem uma escola inteira importada de uma vez (lotes de 60),
-- mas barram scripts e cliques repetidos criando contas sem parar.
--
-- Recusa com o código P0429 e uma mensagem em português dizendo quanto
-- esperar. Um cadastro recusado (por limite ou erro) não conta: o registro é
-- desfeito junto com a transação. Envios simultâneos do mesmo professor são
-- conferidos em fila (trava por professor), então não escapam do limite.
-- Idempotente.
-- ============================================================

create table if not exists public.cadastros_alunos_registro (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.usuarios(id) on delete cascade,
  quantidade int not null check (quantidade > 0),
  criado_em timestamptz not null default now()
);
create index if not exists idx_cadastros_alunos_registro_prof
  on public.cadastros_alunos_registro (professor_id, criado_em desc);

-- Só as funções do banco leem e gravam (nenhuma política = nenhum acesso direto).
alter table public.cadastros_alunos_registro enable row level security;
revoke all on public.cadastros_alunos_registro from public, anon, authenticated;

create or replace function public.verificar_limite_cadastro_alunos(p_quantidade int)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  c_envios_por_minuto constant int := 10;
  c_contas_por_hora constant int := 300;
  c_contas_por_dia constant int := 1000;
  v_prof uuid := auth.uid();
  v_envios int;
  v_hora int;
  v_dia int;
  v_espera int;
begin
  if v_prof is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '42501';
  end if;
  -- Um envio por vez para cada professor (envios simultâneos entram em fila).
  perform pg_advisory_xact_lock(hashtextextended('cadastro_alunos:' || v_prof::text, 0));
  -- Registros antigos não servem mais para nenhum limite.
  delete from public.cadastros_alunos_registro
   where professor_id = v_prof and criado_em < now() - interval '2 days';

  select count(*) into v_envios from public.cadastros_alunos_registro
   where professor_id = v_prof and criado_em > now() - interval '1 minute';
  if v_envios >= c_envios_por_minuto then
    select greatest(1, ceil(extract(epoch from (min(criado_em) + interval '1 minute' - now()))))::int into v_espera
      from (select criado_em from public.cadastros_alunos_registro
             where professor_id = v_prof and criado_em > now() - interval '1 minute'
             order by criado_em desc limit c_envios_por_minuto) recentes;
    raise exception 'Muitos cadastros seguidos. Aguarde % segundos e tente de novo.', v_espera
      using errcode = 'P0429', hint = 'espera_seg=' || v_espera;
  end if;

  select coalesce(sum(quantidade), 0) into v_hora from public.cadastros_alunos_registro
   where professor_id = v_prof and criado_em > now() - interval '1 hour';
  if v_hora + p_quantidade > c_contas_por_hora then
    raise exception 'Limite de % contas de aluno por hora atingido (% criadas na última hora). %',
      c_contas_por_hora, v_hora,
      case when v_hora < c_contas_por_hora
        then format('Agora você pode criar até %s. Divida a lista ou tente mais tarde.', c_contas_por_hora - v_hora)
        else 'Tente de novo mais tarde.' end
      using errcode = 'P0429', hint = 'espera_seg=600';
  end if;

  select coalesce(sum(quantidade), 0) into v_dia from public.cadastros_alunos_registro
   where professor_id = v_prof and criado_em > now() - interval '1 day';
  if v_dia + p_quantidade > c_contas_por_dia then
    raise exception 'Limite de % contas de aluno por dia atingido (% criadas nas últimas 24 horas). Tente de novo amanhã ou fale com o suporte.',
      c_contas_por_dia, v_dia
      using errcode = 'P0429', hint = 'espera_seg=3600';
  end if;

  insert into public.cadastros_alunos_registro (professor_id, quantidade) values (v_prof, p_quantidade);
end;
$$;

-- Interna: só professor_criar_alunos (security definer) a chama.
revoke all on function public.verificar_limite_cadastro_alunos(int) from public, anon, authenticated;

-- professor_criar_alunos: igual à migração 09, mais a verificação do limite.
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
  -- Limite de frequência (migração 19): conta antes de criar qualquer aluno.
  perform public.verificar_limite_cadastro_alunos(jsonb_array_length(p_alunos));

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

revoke all on function public.professor_criar_alunos(bigint, jsonb) from public, anon;
grant execute on function public.professor_criar_alunos(bigint, jsonb) to authenticated;
