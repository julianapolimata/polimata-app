-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSTANTES DE NEGÓCIO — Fonte única de verdade para cálculos de maturidade
-- Polímata CI — Abril 2026
-- ═══════════════════════════════════════════════════════════════════════════════
-- EXECUTAR NO SUPABASE SQL EDITOR
-- Idempotente: pode rodar várias vezes sem problema.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Criar tabela (se não existir)
CREATE TABLE IF NOT EXISTS constantes_negocio (
  id text PRIMARY KEY,
  dados jsonb NOT NULL,
  descricao text,
  atualizado_em timestamptz DEFAULT now()
);

-- 2. Habilitar RLS e permitir leitura para todos os autenticados
ALTER TABLE constantes_negocio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "constantes_leitura" ON constantes_negocio;
CREATE POLICY "constantes_leitura" ON constantes_negocio
  FOR SELECT TO authenticated USING (true);

-- 3. Popular com os valores da metodologia (upsert: atualiza se já existir)

-- Multiplicadores de criticidade
INSERT INTO constantes_negocio (id, dados, descricao) VALUES (
  'multiplicadores',
  '{"4": 0.40, "3": 0.30, "2": 0.20, "1": 0.10}'::jsonb,
  'Pesos de criticidade: 4=Crítico(40%), 3=Significativo(30%), 2=Moderado(20%), 1=Baixo(10%)'
) ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now();

-- Pesos de cada fase
INSERT INTO constantes_negocio (id, dados, descricao) VALUES (
  'peso_fase',
  '{"F1": 0.10, "F2E1": 0.125, "F2E2": 0.125, "F3": 0.25, "F4C1": 0.15, "F4C2": 0.15, "F5": 0.10}'::jsonb,
  'Peso de cada fase na trilha de maturidade (soma = 100%)'
) ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now();

-- Régua de maturidade N1-N5
INSERT INTO constantes_negocio (id, dados, descricao) VALUES (
  'regua',
  '[
    {"nivel": "N1", "nome": "Não confiável",  "min": 0,     "max": 0.10},
    {"nivel": "N2", "nome": "Informal",       "min": 0.101, "max": 0.25},
    {"nivel": "N3", "nome": "Padronizado",    "min": 0.251, "max": 0.50},
    {"nivel": "N4", "nome": "Monitorado",     "min": 0.501, "max": 0.80},
    {"nivel": "N5", "nome": "Otimizado",      "min": 0.801, "max": 1.00}
  ]'::jsonb,
  'Régua de maturidade: faixas percentuais para cada nível N1-N5'
) ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now();

-- 4. Verificar
SELECT id, descricao, atualizado_em FROM constantes_negocio ORDER BY id;
