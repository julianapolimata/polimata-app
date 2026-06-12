// bcb.js — índices de mercado via API SGS do Banco Central, com cache em orc_indices
import { supabase } from '../supabase'

export const INDICES = [
  { serie: 433, nome: 'IPCA',   desc: 'Inflação oficial ao consumidor',            aplicacao: 'Despesas gerais, contratos' },
  { serie: 188, nome: 'INPC',   desc: 'Inflação famílias de baixa renda (dissídios)', aplicacao: 'Despesa com pessoal (CCT)' },
  { serie: 189, nome: 'IGP-M',  desc: 'Índice geral de preços do mercado',          aplicacao: 'Aluguéis e contratos' },
  { serie: 192, nome: 'INCC',   desc: 'Custo da construção civil',                  aplicacao: 'Obras e instalações' },
  { serie: 263, nome: 'IPA-DI', desc: 'Preços ao produtor amplo (atacado)',         aplicacao: 'Matéria-prima (madeira, insumos)' },
]

/** Busca últimos 13 meses da série no SGS e calcula acumulado 12m e YTD. Usa cache orc_indices. */
export async function carregarIndices() {
  const resultado = []
  for (const idx of INDICES) {
    let dados = []
    try {
      const res = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${idx.serie}/dados/ultimos/13?formato=json`)
      if (res.ok) dados = await res.json()
    } catch { /* offline — cai pro cache */ }
    if (dados.length) {
      // grava cache (ignora erro de RLS p/ perfis sem permissão)
      const rows = dados.map(d => {
        const [dia, mes, ano] = d.data.split('/')
        return { serie: idx.serie, data: `${ano}-${mes}-${dia}`, valor: Number(d.valor) }
      })
      supabase.from('orc_indices').upsert(rows, { onConflict: 'serie,data' }).then(() => {})
    } else {
      const { data: cache } = await supabase.from('orc_indices').select('data, valor').eq('serie', idx.serie).order('data', { ascending: false }).limit(13)
      dados = (cache || []).reverse().map(c => ({ data: c.data.split('-').reverse().join('/'), valor: c.valor }))
    }
    const mensal = dados.map(d => Number(d.valor))
    const acum = (arr) => (arr.reduce((a, v) => a * (1 + v / 100), 1) - 1) * 100
    const anoAtual = new Date().getFullYear()
    const ytdVals = dados.filter(d => d.data.endsWith(String(anoAtual))).map(d => Number(d.valor))
    resultado.push({ ...idx, variacao12m: mensal.length >= 12 ? acum(mensal.slice(-12)) : null, ytd: ytdVals.length ? acum(ytdVals) : null })
  }
  return resultado
}
