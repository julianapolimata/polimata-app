-- ═══════════════════════════════════════════════════════════════════════════════
-- Migração: flags de "receber email mensal" para responsáveis das áreas
-- Data: 2026-05-05
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Adiciona dois campos booleanos na tabela `areas` para controlar se cada
-- responsável (gerência e responsável de área) recebe o e-mail de reporte
-- mensal automatizado. Default: false (off) — quem não optar não recebe.
--
-- Como aplicar no Supabase Studio:
--   1. Acesse https://supabase.com/dashboard/project/iqtkpyrpwxypwcwrhulx/sql
--   2. Cole este script e clique em "Run"
--
-- Reversível? Sim. Para reverter:
--   ALTER TABLE public.areas
--     DROP COLUMN gerencia_recebe_email_mensal,
--     DROP COLUMN resp_area_recebe_email_mensal;
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS gerencia_recebe_email_mensal BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resp_area_recebe_email_mensal BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.areas.gerencia_recebe_email_mensal
  IS 'Se true, o e-mail da gerência recebe o reporte mensal automatizado';
COMMENT ON COLUMN public.areas.resp_area_recebe_email_mensal
  IS 'Se true, o e-mail do responsável de área recebe o reporte mensal automatizado';
