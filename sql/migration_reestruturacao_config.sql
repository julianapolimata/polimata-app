-- ============================================================================
-- Polímata GRC — Reestruturação de Configurações (28/04/2026)
-- ============================================================================
-- Alterações:
--   1. Enriquecer tabela clientes (cidade, estado, segmento, contato)
--   2. Adicionar sponsor em projetos
--   3. Reestruturar areas (gerencia, resp_area_nome, resp_area_email)
--   4. Criar tabela subprocessos
--   5. Migrar dados de mrc.sub para subprocessos
--   6. RLS para subprocessos
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENRIQUECER TABELA CLIENTES
-- ============================================================================
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS segmento TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT,
  ADD COLUMN IF NOT EXISTS contato_nome TEXT,
  ADD COLUMN IF NOT EXISTS contato_cargo TEXT,
  ADD COLUMN IF NOT EXISTS contato_telefone TEXT,
  ADD COLUMN IF NOT EXISTS contato_email TEXT;

-- ============================================================================
-- 2. ADICIONAR SPONSOR EM PROJETOS
-- ============================================================================
ALTER TABLE public.projetos
  ADD COLUMN IF NOT EXISTS sponsor_nome TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_sobrenome TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_cargo TEXT,
  ADD COLUMN IF NOT EXISTS sponsor_email TEXT;

-- ============================================================================
-- 3. REESTRUTURAR AREAS (adicionar gerencia + resp. área com email)
-- ============================================================================
-- Adicionar novos campos
ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS gerencia TEXT,
  ADD COLUMN IF NOT EXISTS resp_area_nome TEXT,
  ADD COLUMN IF NOT EXISTS resp_area_email TEXT;

-- Migrar dados do campo gerente para resp_area_nome (se existir)
UPDATE public.areas SET resp_area_nome = gerente WHERE gerente IS NOT NULL AND gerente != '' AND resp_area_nome IS NULL;

-- Nota: o campo `gerente` antigo será mantido por compatibilidade, mas não será mais usado na UI.
-- Pode ser removido em uma migração futura após verificação.

-- ============================================================================
-- 4. CRIAR TABELA SUBPROCESSOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subprocessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para busca por área
CREATE INDEX IF NOT EXISTS idx_subprocessos_area ON public.subprocessos(area_id);

-- ============================================================================
-- 5. MIGRAR DADOS: mrc.sub → subprocessos
-- ============================================================================
-- Inserir subprocessos únicos extraídos do campo mrc.sub
INSERT INTO public.subprocessos (area_id, nome, ordem)
SELECT DISTINCT
  m.area_id,
  m.sub,
  ROW_NUMBER() OVER (PARTITION BY m.area_id ORDER BY m.sub)
FROM public.mrc m
WHERE m.sub IS NOT NULL AND m.sub != '' AND m.area_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Adicionar coluna subprocesso_id no MRC (referência à nova tabela)
ALTER TABLE public.mrc
  ADD COLUMN IF NOT EXISTS subprocesso_id UUID REFERENCES public.subprocessos(id);

-- Preencher subprocesso_id com base no nome + area_id
UPDATE public.mrc m
SET subprocesso_id = s.id
FROM public.subprocessos s
WHERE s.area_id = m.area_id
  AND s.nome = m.sub
  AND m.sub IS NOT NULL AND m.sub != ''
  AND m.subprocesso_id IS NULL;

-- Nota: o campo mrc.sub (texto) será mantido por compatibilidade.
-- O frontend passará a usar subprocesso_id para novos registros.

-- ============================================================================
-- 6. RLS PARA SUBPROCESSOS
-- ============================================================================
ALTER TABLE public.subprocessos ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "subprocessos_admin_all" ON public.subprocessos
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM auth.current_user_role() r WHERE r.papel = 'admin_polimata')
  );

-- Consultor: CRUD nos projetos atribuídos
CREATE POLICY "subprocessos_consultor_crud" ON public.subprocessos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.current_user_role() r
      JOIN public.areas a ON a.id = subprocessos.area_id
      JOIN public.perfis_projetos pp ON pp.projeto_id = a.projeto_id AND pp.perfil_id = r.user_id
      WHERE r.papel = 'consultor_polimata'
    )
  );

-- Gestor: CRUD no próprio cliente
CREATE POLICY "subprocessos_gestor_crud" ON public.subprocessos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.current_user_role() r
      JOIN public.areas a ON a.id = subprocessos.area_id
      JOIN public.projetos p ON p.id = a.projeto_id
      WHERE r.papel = 'gestor_cliente' AND p.cliente_id = r.cliente_id
    )
  );

-- Usuário cliente: somente leitura
CREATE POLICY "subprocessos_usuario_select" ON public.subprocessos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.current_user_role() r
      JOIN public.areas a ON a.id = subprocessos.area_id
      JOIN public.projetos p ON p.id = a.projeto_id
      WHERE r.papel = 'usuario_cliente' AND p.cliente_id = r.cliente_id
    )
  );

COMMIT;
