// ia.js — chamadas à Edge Function orcamento-ia (Claude)
import { supabase } from '../supabase'

async function chamar(payload) {
  const { data, error } = await supabase.functions.invoke('orcamento-ia', { body: payload })
  if (error) throw new Error('IA indisponível: ' + error.message)
  if (data?.erro) throw new Error(data.erro)
  return data
}

/** Sugere categoria gerencial para contas do ERP. contas: [{conta_erp, descricao_erp, total}] */
export async function iaCategorizar(contas, categorias) {
  const r = await chamar({ acao: 'categorizar', contas, categorias })
  return r.mapeamentos || []
}

/** Sugestão orçamentária híbrida. series: [{categoria, tipo, serie_ano_anterior, serie_2_anos, contexto}] */
export async function iaSugerir(series, ano, indices, observacoes) {
  const r = await chamar({ acao: 'sugerir', series, ano, indices, observacoes })
  return r.sugestoes || []
}

/** Insight executivo curto. tipo: 'desvios' | 'cenarios' */
export async function iaInsight(tipo, dados) {
  const r = await chamar({ acao: 'insight', tipo, dados })
  return r.insight || ''
}

/** Projeção IA dos meses futuros. Séries mensais [12] (0 = mês não realizado). */
export async function iaProjecao(serieSaidas, serieReceita) {
  const r = await chamar({ acao: 'projecao', serie_saidas: serieSaidas, serie_receita: serieReceita })
  return { saidas: r.saidas_proj || [], receita: r.receita_proj || [], comentario: r.comentario || '' }
}

/** Análise consolidada do ano: narrativas executivas + interpretação por rubrica recorrente. */
export async function iaAnaliseAno(dados) {
  const r = await chamar({ acao: 'analise_ano', dados })
  return { sinopse: r.sinopse || '', narrativaSaidas: r.narrativa_saidas || '', narrativaReceita: r.narrativa_receita || '', itens: r.itens || [], acoes: r.acoes || [] }
}
