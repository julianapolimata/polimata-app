// Dashboard Executivo — visão consolidada do exercício (KPIs, evolução mensal, top desvios)
import { useState, useMemo } from 'react'
import { useOrcDados, useItens, PageHeader, Card, KPICard, KPIGrid, SeletorAno, fmtBRL, fmtPct, MESES_ABREV, sinal, VERDE, ErroBox, BotaoSec } from './_shared'
import { iaInsight } from '../../lib/orcamento/ia'

export default function DashboardExec({ projeto }) {
  const [ano, setAno] = useState(new Date().getFullYear())
  const d = useOrcDados(projeto, ano)
  const aprovado = d.cenarios.find(c => c.status === 'aprovado') || d.cenarios[d.cenarios.length - 1]
  const { porCat } = useItens(aprovado?.id)
  const [insight, setInsight] = useState('')
  const [gerando, setGerando] = useState(false)

  const calc = useMemo(() => {
    const mesesComReal = new Set()
    d.realizado.forEach(r => { const dt = new Date(r.competencia + 'T00:00:00'); if (dt.getFullYear() === ano) mesesComReal.add(dt.getMonth()) })
    const ate = mesesComReal.size ? Math.max(...mesesComReal) : -1
    const soma = (serie, fim) => (serie || []).slice(0, fim + 1).reduce((a, v) => a + (v || 0), 0)
    let recOrc = 0, recReal = 0, despOrc = 0, despReal = 0
    const porMes = Array.from({ length: 12 }, () => ({ orc: 0, real: 0 }))
    const desvios = []
    d.catsAtivas.forEach(c => {
      const orc = porCat[c.id]?.valores || []
      const rea = d.realPorCat[c.id]?.[ano] || []
      const vO = soma(orc, ate), vR = soma(rea, ate)
      if (c.tipo === 'receita') { recOrc += vO; recReal += vR } else { despOrc += vO; despReal += vR }
      for (let m = 0; m < 12; m++) { if (c.tipo === 'receita') { porMes[m].orc += orc[m] || 0; porMes[m].real += rea[m] || 0 } }
      const desvio = vR - vO
      const pct = vO !== 0 ? (desvio / Math.abs(vO)) * 100 : null
      if (pct !== null && desvio * sinal(c.tipo) < 0) desvios.push({ nome: c.nome, tipo: c.tipo, pct, abs: desvio })
    })
    desvios.sort((a, b) => Math.abs(b.abs) - Math.abs(a.abs))
    const margem = recReal - despReal
    return { ate, recOrc, recReal, despOrc, despReal, margem, porMes, top5: desvios.slice(0, 5) }
  }, [d.catsAtivas, d.realPorCat, porCat, ano, d.realizado])

  async function gerarInsight() {
    setGerando(true)
    try { setInsight(await iaInsight('desvios', { ano, kpis: { receita: calc.recReal, despesa: calc.despReal, margem: calc.margem }, topDesvios: calc.top5 })) }
    catch (e) { d.setErro(e.message) } finally { setGerando(false) }
  }

  const maxMes = Math.max(1, ...calc.porMes.map(m => Math.max(m.orc, m.real)))
  const pctRec = calc.recOrc ? ((calc.recReal - calc.recOrc) / Math.abs(calc.recOrc)) * 100 : null
  const pctDesp = calc.despOrc ? ((calc.despReal - calc.despOrc) / Math.abs(calc.despOrc)) * 100 : null

  return (
    <div style={{ padding: '20px 28px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader projeto={projeto} titulo="Dashboard Executivo" subtitulo={`Visão consolidada do exercício ${ano}${aprovado ? ` · Cenário: ${aprovado.nome || 'v' + aprovado.versao}${aprovado.status === 'aprovado' ? ' ★' : ''}` : ' · sem orçamento criado'}`}>
        <SeletorAno ano={ano} setAno={setAno} />
        <BotaoSec onClick={gerarInsight} disabled={gerando}>{gerando ? 'Analisando…' : '🤖 Insight IA'}</BotaoSec>
      </PageHeader>
      <ErroBox erro={d.erro} onClose={() => d.setErro('')} />
      {insight && <div style={{ background: 'rgba(34,185,138,0.08)', border: '1px solid rgba(34,185,138,0.35)', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, lineHeight: 1.55 }}>🤖 {insight}</div>}

      <KPIGrid>
        <KPICard label={`Receita Realizada YTD`} value={fmtBRL(calc.recReal)} tone={pctRec === null ? null : pctRec >= 0 ? 'success' : 'danger'} delta={pctRec === null ? 'sem orçado p/ comparar' : `${fmtPct(pctRec)} vs Orçado (${fmtBRL(calc.recOrc)})`} />
        <KPICard label="Despesa Total YTD" value={fmtBRL(calc.despReal)} tone={pctDesp === null ? null : pctDesp <= 0 ? 'success' : pctDesp <= 10 ? 'warning' : 'danger'} delta={pctDesp === null ? 'sem orçado p/ comparar' : `${fmtPct(pctDesp)} vs Orçado (${fmtBRL(calc.despOrc)})`} />
        <KPICard label="Margem Operacional YTD" value={fmtBRL(calc.margem)} delta={calc.recReal ? (calc.margem / calc.recReal * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '% da Receita' : '—'} />
        <KPICard label="Execução do Orçamento" value={calc.ate >= 0 ? (((calc.ate + 1) / 12) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '0%'} delta={`${calc.ate + 1} de 12 meses com realizado`} />
      </KPIGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 3fr) minmax(280px, 2fr)', gap: 16 }}>
        <Card titulo={`Evolução Mensal — Receita Orçada vs Realizada (${ano})`}>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--lt-text3)', marginBottom: 10 }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--lt-brd)', borderRadius: 2, marginRight: 5 }} />Orçado</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: VERDE, borderRadius: 2, marginRight: 5 }} />Realizado</span>
          </div>
          {calc.porMes.map((m, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '38px 1fr 130px', gap: 10, alignItems: 'center', marginBottom: 5, opacity: i > calc.ate && !m.orc ? 0.4 : 1 }}>
              <div style={{ fontSize: 11, color: 'var(--lt-text3)' }}>{MESES_ABREV[i]}</div>
              <div>
                <div style={{ height: 8, background: 'var(--lt-brd)', borderRadius: 4, width: (m.orc / maxMes * 100) + '%', minWidth: m.orc ? 4 : 0, marginBottom: 2 }} />
                <div style={{ height: 8, background: VERDE, borderRadius: 4, width: (m.real / maxMes * 100) + '%', minWidth: m.real ? 4 : 0 }} />
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--lt-text3)', textAlign: 'right' }}>{fmtBRL(m.orc)}<br />{m.real ? fmtBRL(m.real) : '—'}</div>
            </div>
          ))}
        </Card>
        <Card titulo="Top 5 Desvios Desfavoráveis (YTD)">
          {calc.top5.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--lt-text3)' }}>Nenhum desvio desfavorável — ou ainda sem orçado/realizado no ano.</div>}
          {calc.top5.map((dv, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < calc.top5.length - 1 ? '1px solid var(--lt-brd)' : 'none' }}>
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>{dv.nome}</div><div style={{ fontSize: 10.5, color: 'var(--lt-text3)' }}>{dv.tipo}</div></div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: Math.abs(dv.pct) > 15 ? '#B91C1C' : '#B45309' }}>{fmtPct(dv.pct)}</div>
                <div style={{ fontSize: 10.5, color: 'var(--lt-text3)' }}>{fmtBRL(dv.abs)}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
