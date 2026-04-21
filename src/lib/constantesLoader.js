// ─── Loader de constantes de negócio do banco ───────────────────────────────
// Busca multiplicadores, pesos de fase e régua do Supabase.
// Usa cache em memória para evitar requests repetidos na mesma sessão.

import { supabase } from './supabase'

let _cache = null
let _loading = null

// Valores padrão (fallback se o banco não responder)
const DEFAULTS = {
  multiplicadores: { 4: 0.40, 3: 0.30, 2: 0.20, 1: 0.10 },
  peso_fase: { F1: 0.10, F2E1: 0.125, F2E2: 0.125, F3: 0.25, F4C1: 0.15, F4C2: 0.15, F5: 0.10 },
  regua: [
    { nivel: 'N1', nome: 'Não confiável',  min: 0,     max: 0.10  },
    { nivel: 'N2', nome: 'Informal',       min: 0.101, max: 0.25  },
    { nivel: 'N3', nome: 'Padronizado',    min: 0.251, max: 0.50  },
    { nivel: 'N4', nome: 'Monitorado',     min: 0.501, max: 0.80  },
    { nivel: 'N5', nome: 'Otimizado',      min: 0.801, max: 1.00  },
  ],
}

/**
 * Carrega constantes do banco (com cache e fallback).
 * Retorna { multiplicadores, peso_fase, regua }
 */
export async function carregarConstantes() {
  if (_cache) return _cache

  // Evitar requests paralelos
  if (_loading) return _loading

  _loading = (async () => {
    try {
      const { data, error } = await supabase
        .from('constantes_negocio')
        .select('id, dados')

      if (error || !data || data.length === 0) {
        console.warn('[Constantes] Erro ou tabela vazia, usando defaults:', error?.message)
        _cache = { ...DEFAULTS }
        return _cache
      }

      const result = { ...DEFAULTS }
      for (const row of data) {
        if (row.id === 'multiplicadores' && row.dados) {
          // Converter chaves string para número
          result.multiplicadores = {}
          for (const [k, v] of Object.entries(row.dados)) {
            result.multiplicadores[parseInt(k)] = v
          }
        } else if (row.id === 'peso_fase' && row.dados) {
          result.peso_fase = row.dados
        } else if (row.id === 'regua' && row.dados) {
          result.regua = row.dados
        }
      }

      _cache = result
      return _cache
    } catch (err) {
      console.warn('[Constantes] Falha ao carregar, usando defaults:', err)
      _cache = { ...DEFAULTS }
      return _cache
    } finally {
      _loading = null
    }
  })()

  return _loading
}

/**
 * Retorna constantes do cache (síncrono, retorna defaults se não carregou ainda)
 */
export function getConstantesSync() {
  return _cache || { ...DEFAULTS }
}

/**
 * Limpa o cache (útil ao trocar de projeto)
 */
export function limparCacheConstantes() {
  _cache = null
  _loading = null
}
