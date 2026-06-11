-- =====================================================================
-- 2026-06-11 · pe_0008_campos_plano_acao (APLICADA via Supabase MCP)
-- Campos para suportar planos de ação reais (planilha Poli):
--   pe_objetivos:   classificacao (estrategico|operacional), entregavel
--   pe_key_results: como_medir (fórmula em texto), periodicidade
-- Onda/horizonte usa pe_periodos (já existia) via pe_objetivos.periodo_id.
-- =====================================================================
alter table public.pe_objetivos
  add column if not exists classificacao text,   -- estrategico | operacional
  add column if not exists entregavel    text;

alter table public.pe_key_results
  add column if not exists como_medir    text,
  add column if not exists periodicidade text;
