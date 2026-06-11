-- =====================================================================
-- 2026-06-11 · pe_0006_checkins_clock_timestamp (APLICADA via Supabase MCP)
-- now() é fixo por transação: dois check-ins do mesmo dia criados na
-- mesma transação empatavam no desempate (criado_em) da view
-- v_pe_kr_progresso. clock_timestamp() torna a ordem determinística.
-- (Detectado no smoke test do motor de cálculo.)
-- =====================================================================
alter table public.pe_checkins    alter column criado_em set default clock_timestamp();
alter table public.pe_kpi_valores alter column criado_em set default clock_timestamp();

-- =====================================================================
-- 2026-06-11 · pe_0007_hardening_funcoes (APLICADA via Supabase MCP)
-- 1) search_path travado na trigger function (advisor WARN).
-- 2) pe_ingest_budget_value: EXECUTE revogado de anon/authenticated —
--    somente service_role (Edge Function / integração) pode ingerir
--    valores de orçamento. Evita injeção de medições falsas via RPC.
-- 3) pe_assinatura_ativa: revogada de anon; mantida p/ authenticated
--    (o app precisa consultar o gate de acesso).
-- =====================================================================

create or replace function public.pe_tg_set_atualizado_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

revoke execute on function public.pe_ingest_budget_value(uuid, text, numeric, date, text, text) from anon, authenticated, public;
revoke execute on function public.pe_assinatura_ativa(uuid) from anon, public;
grant  execute on function public.pe_assinatura_ativa(uuid) to authenticated;
