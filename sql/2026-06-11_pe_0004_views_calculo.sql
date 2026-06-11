-- =====================================================================
-- 2026-06-11 · pe_0004_views_calculo (APLICADA via Supabase MCP)
-- Motor de cálculo AUTOMÁTICO ("nada calculado à mão").
-- MVP: views que recalculam na leitura; Fase 2: materialização.
-- security_invoker = on -> as views respeitam o RLS das tabelas-base.
-- =====================================================================

create or replace view public.v_pe_kr_progresso
with (security_invoker = on) as
with ultimo_ci as (
  select distinct on (key_result_id)
         key_result_id, valor as valor_atual, data_medicao as data_ultima_medicao
  from public.pe_checkins
  order by key_result_id, data_medicao desc, criado_em desc
)
select
  kr.id            as key_result_id,
  kr.projeto_id,
  kr.objetivo_id,
  kr.descricao,
  kr.unidade_id,
  kr.valor_baseline,
  kr.valor_meta,
  kr.direcao,
  kr.peso,
  coalesce(uc.valor_atual, kr.valor_baseline) as valor_atual,
  uc.data_ultima_medicao,
  case
    when kr.valor_meta = kr.valor_baseline then
      case when coalesce(uc.valor_atual, kr.valor_baseline) >= kr.valor_meta then 1 else 0 end
    when kr.direcao = 'aumentar' then
      greatest(0, least(1,
        (coalesce(uc.valor_atual, kr.valor_baseline) - kr.valor_baseline)
        / nullif(kr.valor_meta - kr.valor_baseline, 0)))
    else  -- reduzir
      greatest(0, least(1,
        (kr.valor_baseline - coalesce(uc.valor_atual, kr.valor_baseline))
        / nullif(kr.valor_baseline - kr.valor_meta, 0)))
  end as progresso      -- 0..1
from public.pe_key_results kr
left join ultimo_ci uc on uc.key_result_id = kr.id;

create or replace view public.v_pe_objetivo_saude
with (security_invoker = on) as
select
  o.id           as objetivo_id,
  o.projeto_id,
  o.perspectiva_id,
  o.titulo,
  o.peso,
  coalesce(
    sum(krp.progresso * krp.peso) / nullif(sum(krp.peso), 0),
    0
  ) as saude     -- 0..1
from public.pe_objetivos o
left join public.v_pe_kr_progresso krp on krp.objetivo_id = o.id
group by o.id, o.projeto_id, o.perspectiva_id, o.titulo, o.peso;

create or replace view public.v_pe_perspectiva_saude
with (security_invoker = on) as
select
  p.id         as perspectiva_id,
  p.projeto_id,
  p.nome,
  p.ordem,
  coalesce(
    sum(os.saude * os.peso) / nullif(sum(os.peso), 0),
    0
  ) as saude     -- 0..1
from public.pe_perspectivas p
left join public.v_pe_objetivo_saude os on os.perspectiva_id = p.id
group by p.id, p.projeto_id, p.nome, p.ordem;
