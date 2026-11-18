-- ============================================================
-- 20261117000018_limites_de_texto.sql
-- Limites de tamanho para o que o professor digita e os alunos veem.
-- Nomes muito longos desconfiguravam os cartões da plataforma e os PDFs.
--
--   turmas.nome                60 caracteres
--   turmas.descricao          500 caracteres
--   exercicios.titulo          80 caracteres (só atividades de professor)
--   exercicios.instrucoes    1000 caracteres
--   exercicios.texto_referencia 5000 caracteres
--
-- Validação por trigger (e não CHECK) para:
--  - valer na inserção direta (turmas) e nas RPCs (salvar_atividade);
--  - devolver a mensagem em português, pronta para a pessoa (código P0001);
--  - não travar registros antigos: só é conferido o campo que mudou.
-- Os mesmos limites estão em js/regras.js (LIMITES).
-- Idempotente.
-- ============================================================

create or replace function public.validar_limites_turma()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.nome := btrim(new.nome);
  if (tg_op = 'INSERT' or new.nome is distinct from old.nome) and char_length(new.nome) > 60 then
    raise exception 'O nome da turma pode ter no máximo 60 caracteres.' using errcode = 'P0001';
  end if;
  if (tg_op = 'INSERT' or new.descricao is distinct from old.descricao) and char_length(coalesce(new.descricao, '')) > 500 then
    raise exception 'A descrição da turma pode ter no máximo 500 caracteres.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists turmas_limites_de_texto on public.turmas;
create trigger turmas_limites_de_texto
  before insert or update of nome, descricao on public.turmas
  for each row execute function public.validar_limites_turma();

create or replace function public.validar_limites_exercicio()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Exercícios da trilha oficial são do sistema (títulos e textos próprios).
  if new.nivel_trilha is not null then
    return new;
  end if;
  if (tg_op = 'INSERT' or new.titulo is distinct from old.titulo) and char_length(btrim(new.titulo)) > 80 then
    raise exception 'O título do exercício pode ter no máximo 80 caracteres.' using errcode = 'P0001';
  end if;
  if (tg_op = 'INSERT' or new.instrucoes is distinct from old.instrucoes) and char_length(coalesce(new.instrucoes, '')) > 1000 then
    raise exception 'As instruções podem ter no máximo 1000 caracteres.' using errcode = 'P0001';
  end if;
  if (tg_op = 'INSERT' or new.texto_referencia is distinct from old.texto_referencia) and char_length(new.texto_referencia) > 5000 then
    raise exception 'O texto do exercício pode ter no máximo 5000 caracteres.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists exercicios_limites_de_texto on public.exercicios;
create trigger exercicios_limites_de_texto
  before insert or update of titulo, instrucoes, texto_referencia on public.exercicios
  for each row execute function public.validar_limites_exercicio();
