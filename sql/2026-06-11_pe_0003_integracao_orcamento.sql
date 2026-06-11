-- =====================================================================
-- 2026-06-11 · pe_0003_integracao_orcamento (APLICADA via Supabase MCP)
-- Contrato de integração com o módulo de Gestão Orçamentária (orc_*).
-- Módulos independentes no MESMO banco: nada de joins diretos — o
-- orçamento invoca pe_ingest_budget_value() quando um realizado muda,
-- e isso vira check-in com origem = 'orcamento'.
-- =====================================================================

create table if not exists public.pe_budget_links (
  id              uuid primary key default gen_random_uuid(),
  projeto_id      uuid not null references public.projetos(id) on delete cascade,
  key_result_id   uuid not null references public.pe_key_results(id) on delete cascade,
  sistema_externo text not null default 'orcamento',
  ref_externa     text not null,           -- id da rubrica no módulo de orçamento
  rotulo_externo  text,                    -- nome legível da rubrica (cache)
  metrica         text not null default 'realizado',  -- realizado | orcado | saldo
  direcao         text not null default 'aumentar',
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  unique (projeto_id, key_result_id, ref_externa, metrica)
);
create index if not exists idx_pe_budget_links_projeto on public.pe_budget_links(projeto_id);
create index if not exists idx_pe_budget_links_kr      on public.pe_budget_links(projeto_id, key_result_id);

create or replace function public.pe_ingest_budget_value(
  p_projeto_id      uuid,
  p_ref_externa     text,
  p_valor           numeric,
  p_data_ref        date default current_date,
  p_sistema_externo text default 'orcamento',
  p_metrica         text default 'realizado'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link  record;
  v_count integer := 0;
begin
  for v_link in
    select * from public.pe_budget_links
    where projeto_id = p_projeto_id
      and ref_externa = p_ref_externa
      and sistema_externo = p_sistema_externo
      and metrica = p_metrica
      and ativo = true
  loop
    -- upsert do check-in "do dia" para esse KR vindo do orçamento (idempotente)
    delete from public.pe_checkins
      where projeto_id = p_projeto_id
        and key_result_id = v_link.key_result_id
        and origem = 'orcamento'
        and ref_externa = p_ref_externa
        and data_medicao = p_data_ref;

    insert into public.pe_checkins
      (projeto_id, key_result_id, valor, data_medicao, comentario, origem, ref_externa)
    values
      (p_projeto_id, v_link.key_result_id, p_valor, p_data_ref,
       'Valor realizado do orçamento ('||p_metrica||')', 'orcamento', p_ref_externa);

    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
