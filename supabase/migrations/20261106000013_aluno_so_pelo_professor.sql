-- ============================================================
-- 20261106000013_aluno_so_pelo_professor.sql
-- Contas de aluno passam a ser criadas exclusivamente pelo professor
-- (professor_criar_alunos, migração 09). A garantia fica no banco, não só
-- na tela de cadastro:
--   * cadastro público (e-mail ou Google) não cria mais conta de aluno;
--   * concluir_cadastro não aceita mais o tipo "aluno";
--   * alterar_tipo_conta não troca mais "usuário → aluno" e não deixa a
--     conta da escola virar pessoal fora da transferência.
-- Contas de aluno que já existem continuam iguais (mesmo tipo, turmas,
-- resultados). Não altera dados. Idempotente.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_tipo text := v_meta->>'tipo';
  -- Conta de aluno só nasce pelo professor (professor_criar_alunos marca
  -- raw_app_meta_data.conta_escolar, que o cadastro público não consegue
  -- definir). Quem pedir "aluno" no cadastro fica com o cadastro incompleto
  -- e escolhe entre usuário e professor.
  v_escolar boolean := coalesce((new.raw_app_meta_data->>'conta_escolar')::boolean, false);
  v_definido boolean := coalesce(v_meta->>'tipo', '') in ('usuario', 'professor')
    or (coalesce(v_meta->>'tipo', '') = 'aluno' and v_escolar);
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
$function$;

CREATE OR REPLACE FUNCTION public.concluir_cadastro(p_tipo text, p_nome text)
 RETURNS usuarios
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_nome text := left(trim(coalesce(p_nome, '')), 120);
  v_perfil public.usuarios;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if p_tipo = 'aluno' then
    raise exception 'Contas de aluno são criadas pelo professor. Peça a ele o seu usuário e a sua senha.' using errcode = '42501';
  end if;
  if p_tipo is null or p_tipo not in ('usuario', 'professor') then
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
  where id = v_uid and not tipo_definido;

  -- Confere o que ficou gravado (um trigger antigo poderia desfazer a mudança).
  select * into v_perfil from public.usuarios where id = v_uid;
  if v_perfil.id is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;
  if not v_perfil.tipo_definido then
    raise exception 'O cadastro não pôde ser gravado no banco. Avise o administrador do site.' using errcode = 'P0001';
  end if;
  return v_perfil;
end;
$function$;

CREATE OR REPLACE FUNCTION public.alterar_tipo_conta(p_tipo text)
 RETURNS usuarios
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_perfil public.usuarios;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if p_tipo = 'aluno' then
    raise exception 'Contas de aluno são criadas pelo professor. Peça a ele o seu usuário e a sua senha.' using errcode = '42501';
  end if;
  if p_tipo is null or p_tipo <> 'usuario' then
    raise exception 'Só é possível trocar uma conta de aluno para conta de usuário.' using errcode = '22023';
  end if;
  -- Conta criada pela escola vira pessoal só pela transferência, que explica
  -- o que muda (e tira o acesso do professor aos dados individuais).
  if exists (select 1 from public.contas_escolares where usuario_id = v_uid and status = 'escolar') then
    raise exception 'Esta conta foi criada pela escola. Use "Transferir ao terminar a escola" no seu perfil.' using errcode = '42501';
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
$function$;

notify pgrst, 'reload schema';
