-- =====================================================================
-- 2026-06-11 · pe_0001_dominio_bsc_okr (APLICADA via Supabase MCP)
-- Módulo Planejamento Estratégico (pe_*): domínio BSC + OKR integrados.
-- Tenancy: projeto_id (padrão do Sistema Polímata). Adaptado da v1.0
-- (0003_strategy.sql), que usava account_id.
-- =====================================================================

create or replace function public.pe_tg_set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

do $$ begin
  create type pe_origem_medicao as enum ('manual','orcamento','integracao','importacao');
exception when duplicate_object then null; end $$;

-- ---------- DEFINIÇÃO (parametrização por projeto) -------------------

create table if not exists public.pe_unidades (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  nome       text not null,
  simbolo    text,
  tipo       text not null default 'numero',  -- numero | moeda | percentual | razao
  criado_em  timestamptz not null default now()
);
create index if not exists idx_pe_unidades_projeto on public.pe_unidades(projeto_id);

create table if not exists public.pe_periodos (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid not null references public.projetos(id) on delete cascade,
  nome        text not null,                    -- "2026", "2026-T1"...
  tipo        text not null default 'trimestre',-- ano | trimestre | mes | custom
  data_inicio date not null,
  data_fim    date not null,
  criado_em   timestamptz not null default now()
);
create index if not exists idx_pe_periodos_projeto on public.pe_periodos(projeto_id);

create table if not exists public.pe_perspectivas (
  id         uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  nome       text not null,
  descricao  text,
  cor        text,
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now()
);
create index if not exists idx_pe_perspectivas_projeto on public.pe_perspectivas(projeto_id);

create table if not exists public.pe_objetivos (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.projetos(id) on delete cascade,
  perspectiva_id uuid references public.pe_perspectivas(id) on delete set null,
  periodo_id     uuid references public.pe_periodos(id) on delete set null,
  titulo         text not null,
  descricao      text,
  responsavel_id uuid references public.perfis(id) on delete set null,
  peso           numeric not null default 1,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists idx_pe_objetivos_projeto     on public.pe_objetivos(projeto_id);
create index if not exists idx_pe_objetivos_perspectiva on public.pe_objetivos(projeto_id, perspectiva_id);

create table if not exists public.pe_key_results (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.projetos(id) on delete cascade,
  objetivo_id    uuid not null references public.pe_objetivos(id) on delete cascade,
  descricao      text not null,
  unidade_id     uuid references public.pe_unidades(id) on delete set null,
  valor_baseline numeric not null default 0,
  valor_meta     numeric not null,
  direcao        text not null default 'aumentar',  -- aumentar | reduzir
  peso           numeric not null default 1,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists idx_pe_key_results_projeto  on public.pe_key_results(projeto_id);
create index if not exists idx_pe_key_results_objetivo on public.pe_key_results(projeto_id, objetivo_id);

create table if not exists public.pe_kpis (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.projetos(id) on delete cascade,
  objetivo_id   uuid references public.pe_objetivos(id) on delete set null,
  nome          text not null,
  unidade_id    uuid references public.pe_unidades(id) on delete set null,
  formula       text,
  frequencia    text not null default 'mensal',  -- diaria | semanal | mensal | trimestral
  valor_meta    numeric,
  direcao       text not null default 'aumentar',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_pe_kpis_projeto on public.pe_kpis(projeto_id);

create table if not exists public.pe_iniciativas (
  id             uuid primary key default gen_random_uuid(),
  projeto_id     uuid not null references public.projetos(id) on delete cascade,
  objetivo_id    uuid references public.pe_objetivos(id) on delete set null,
  key_result_id  uuid references public.pe_key_results(id) on delete set null,
  titulo         text not null,
  status         text not null default 'a_fazer', -- a_fazer | em_andamento | concluida | bloqueada
  responsavel_id uuid references public.perfis(id) on delete set null,
  data_inicio    date,
  prazo          date,
  progresso      numeric not null default 0,      -- 0..100 (manual p/ iniciativa)
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists idx_pe_iniciativas_projeto on public.pe_iniciativas(projeto_id);

-- ---------- VALOR / MEDIÇÃO -----------------------------------------

create table if not exists public.pe_checkins (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.projetos(id) on delete cascade,
  key_result_id uuid not null references public.pe_key_results(id) on delete cascade,
  valor         numeric not null,
  data_medicao  date not null default current_date,
  comentario    text,
  origem        pe_origem_medicao not null default 'manual',
  ref_externa   text,
  criado_por    uuid references public.perfis(id) on delete set null,
  criado_em     timestamptz not null default now()
);
create index if not exists idx_pe_checkins_projeto on public.pe_checkins(projeto_id);
create index if not exists idx_pe_checkins_kr_data on public.pe_checkins(projeto_id, key_result_id, data_medicao desc);

create table if not exists public.pe_kpi_valores (
  id           uuid primary key default gen_random_uuid(),
  projeto_id   uuid not null references public.projetos(id) on delete cascade,
  kpi_id       uuid not null references public.pe_kpis(id) on delete cascade,
  valor        numeric not null,
  data_medicao date not null default current_date,
  origem       pe_origem_medicao not null default 'manual',
  ref_externa  text,
  criado_em    timestamptz not null default now()
);
create index if not exists idx_pe_kpi_valores_projeto on public.pe_kpi_valores(projeto_id);
create index if not exists idx_pe_kpi_valores_kpi     on public.pe_kpi_valores(projeto_id, kpi_id, data_medicao desc);

create trigger trg_pe_objetivos_upd    before update on public.pe_objetivos    for each row execute function public.pe_tg_set_atualizado_em();
create trigger trg_pe_key_results_upd  before update on public.pe_key_results  for each row execute function public.pe_tg_set_atualizado_em();
create trigger trg_pe_kpis_upd         before update on public.pe_kpis         for each row execute function public.pe_tg_set_atualizado_em();
create trigger trg_pe_iniciativas_upd  before update on public.pe_iniciativas  for each row execute function public.pe_tg_set_atualizado_em();
