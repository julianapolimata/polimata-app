-- =====================================================================
-- 2026-06-11 · pe_0002_billing_stripe (APLICADA via Supabase MCP)
-- Billing do módulo Planejamento Estratégico. Sem espelho de products/
-- prices (v2.0 usa Payment Link); apenas assinatura por cliente/projeto
-- alimentada pelo webhook (Edge Function, service role) + idempotência.
-- =====================================================================

do $$ begin
  create type pe_status_assinatura as enum (
    'trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.pe_assinaturas (
  id                     uuid primary key default gen_random_uuid(),
  cliente_id             uuid not null references public.clientes(id) on delete cascade,
  projeto_id             uuid not null references public.projetos(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  status                 pe_status_assinatura not null default 'incomplete',
  cancela_no_fim_periodo boolean not null default false,
  inicio_periodo_atual   timestamptz,
  fim_periodo_atual      timestamptz,
  fim_trial              timestamptz,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now()
);
create index if not exists idx_pe_assinaturas_cliente on public.pe_assinaturas(cliente_id);
create index if not exists idx_pe_assinaturas_projeto on public.pe_assinaturas(projeto_id);

create trigger trg_pe_assinaturas_upd
  before update on public.pe_assinaturas
  for each row execute function public.pe_tg_set_atualizado_em();

create table if not exists public.pe_stripe_eventos (
  id            text primary key,            -- evt_... (id do Stripe)
  tipo          text not null,
  processado_em timestamptz not null default now(),
  payload       jsonb
);

-- O projeto tem assinatura que destrava o módulo?
create or replace function public.pe_assinatura_ativa(p_projeto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pe_assinaturas
    where projeto_id = p_projeto_id
      and status in ('trialing','active')
      and (fim_periodo_atual is null or fim_periodo_atual > now())
  );
$$;
