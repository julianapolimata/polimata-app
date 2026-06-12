// Cenários do Exercício — comparação entre cenários paralelos, aprovação e insight IA
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useOrcDados, PageHeader, Card, HelpTag, SeletorAno, Badge, BotaoVerde, BotaoSec, ErroBox, fmtNum, THL, TH, TDL, TD } from './_shared'
import { iaInsight } from '../../lib/orcamento/ia'

export default function Cenarios({ projeto }) {
  const [ano, setAno] = useState(new Date().getFullYear())
  const d = useOrcDados(projeto, ano)
  const [itensTodos, setItensTodos] = useState([])
  const [novoNome, setNovoNome] = useState('')
  const [cloneDe, setCloneDe] = useState('')
  const [criando, setCriando] = useState(false)
  const [insight, setInsight] = useState('')
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    const ids = d.cenarios.map(c => c.id)
    if (!ids.length) { setItensTodos([]); return }
    supabase.from('orc_orcamento_itens').select('orcamento_id, categoria_id, mes, valor').in('orcamento_id', ids).then(({ data }) => setItensTodos(data || []))
  }, [d.cenarios])

  const resumo = useMemo(() => d.cenarios.map(cen => {
    let receita = 0, deducao = 0, custo = 0, despesa = 0
    itensTodos.filter(i => i.orcamento_id === cen.id).forEach(i => {
      const cat = d.categorias.find(c => c.id === i.categoria_id)
      const v = Number(i.valor) || 0
      if (!cat) return
      if (cat.tipo === 'receita') receita += v
      else if (cat.tipo === 'deducao') deducao += v
      else if (cat.tipo === 'custo') custo += v
      else despesa += v
    })
    const margemBruta = receita - deducao - custo
    const resultado = margemBruta - despesa
    return { cen, receita, deducao, custo, despesa, margemBruta, resultado, margemPct: receita ? resultado / receita * 100 : null }
  }), [d.cenarios, itensTodos, d.categorias])

  async function criarCenario() {
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      const versao = Math.max(0, ...d.cenarios.map(c => c.versao)) + 1
      const { data: novo, error } = await supabase.from('orc_orcamentos').insert({ projeto_id: projeto.id, ano, versao, nome: novoNome.trim(), status: 'rascunho' }).select().single()
      if (error) throw error
      if (cloneDe) {
        const origem = itensTodos.filter(i => i.orcamento_id === cloneDe)
        if (origem.length) {
          const { data: completos } = await supabase.from('orc_orcamento_itens').select('*').eq('orcamento_id', cloneDe)
          const rows = (completos || []).map(({ id: _id, orcamento_id: _o, ...resto }) => ({ ...resto, orcamento_id: novo.id }))
          await supabase.from('orc_orcamento_itens').insert(rows)
        }
      }
      setNovoNome(''); setCloneDe(''); d.reload()
    } catch (e) { d.setErro(e.message) } finally { setCriando(false) }
  }

  async function aprovar(cenId) {
    await supabase.from('orc_orcamentos').update({ status: 'rascunho' }).eq('projeto_id', projeto.id).eq('ano', ano).eq('status', 'aprovado')
    const { error } = await supabase.from('orc_orcamentos').update({ status: 'aprovado' }).eq('id', cenId)
    if (error) d.setErro(error.message); else d.reload()
  }

  async function gerarInsight() {
    setGerando(true)
    try {
      setInsight(await iaInsight('cenarios', resumo.map(r => ({ cenario: r.cen.nome || 'v' + r.cen.versao, status: r.cen.status, receita: r.receita, custo: r.custo, despesa: r.despesa, resultado: r.resultado, margem_pct: r.margemPct }))))
    } catch (e) { d.setErro(e.message) } finally { setGerando(false) }
  }

  return (
    <div style={{ padding: '20px 28px 40px', maxWidth: 1180, margin: '0 auto' }}>
      <PageHeader projeto={projeto} titulo={`Cenários do Exercício ${ano}`} subtitulo={`Comparação entre cenários paralelos${resumo.find(r => r.cen.status === 'aprovado') ? ` | Aprovado: ${resumo.find(r => r.cen.status === 'aprovado').cen.nome} ★` : ' | nenhum cenário aprovado ainda'}`}>
        <SeletorAno ano={ano} setAno={setAno} />
        <BotaoSec onClick={gerarInsight} disabled={gerando || resumo.length < 2}>{gerando ? 'Analisando…' : '🤖 Insight IA'}</BotaoSec>
      </PageHeader>
      <ErroBox erro={d.erro} onClose={() => d.setErro('')} />
      {insight && <HelpTag><strong>Insight:</strong> {insight}</HelpTag>}

      <Card titulo="Novo cenário">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Nome do cenário</label>
            <input className="input-light" style={{ width: 220 }} placeholder='Ex: Realista, Otimista, "Sem RT"…' value={novoNome} onChange={e => setNovoNome(e.target.value)} /></div>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Copiar valores de</label>
            <select className="input-light" style={{ width: 180 }} value={cloneDe} onChange={e => setCloneDe(e.target.value)}>
              <option value="">— em branco —</option>
              {d.cenarios.map(c => <option key={c.id} value={c.id}>{c.nome || 'v' + c.versao}</option>)}
            </select></div>
          <BotaoVerde onClick={criarCenario} disabled={criando || !novoNome.trim()}>+ Criar cenário</BotaoVerde>
        </div>
      </Card>

      <Card titulo="Comparativo entre Cenários — Resultado Operacional Projetado (ano)" pad={false}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={THL}>Indicador</th>
            {resumo.map(r => <th key={r.cen.id} style={TH}>{r.cen.nome || 'v' + r.cen.versao}{r.cen.status === 'aprovado' ? ' ★' : ''}</th>)}
          </tr></thead>
          <tbody>
            {[
              ['Receita Total Projetada', r => fmtNum(r.receita)],
              ['(-) Deduções', r => `(${fmtNum(r.deducao)})`],
              ['(-) CPV Total', r => `(${fmtNum(r.custo)})`],
              ['Margem Bruta', r => fmtNum(r.margemBruta)],
              ['(-) Despesas Operacionais', r => `(${fmtNum(r.despesa)})`],
            ].map(([label, fn]) => (
              <tr key={label}><td style={TDL}>{label}</td>{resumo.map(r => <td key={r.cen.id} style={TD}>{fn(r)}</td>)}</tr>
            ))}
            <tr style={{ background: 'var(--lt-bg)' }}>
              <td style={{ ...TDL, fontWeight: 800 }}>Resultado Operacional</td>
              {resumo.map(r => <td key={r.cen.id} style={{ ...TD, fontWeight: 800 }}>{fmtNum(r.resultado)}</td>)}
            </tr>
            <tr>
              <td style={TDL}>Margem Operacional %</td>
              {resumo.map(r => {
                const melhor = Math.max(...resumo.map(x => x.margemPct ?? -Infinity))
                const ehMelhor = r.margemPct !== null && r.margemPct === melhor && resumo.length > 1
                return <td key={r.cen.id} style={{ ...TD, fontWeight: 600, background: ehMelhor ? 'rgba(34,197,94,0.10)' : 'transparent' }}>{r.margemPct === null ? '—' : r.margemPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'}</td>
              })}
            </tr>
            <tr>
              <td style={TDL}>Status</td>
              {resumo.map(r => (
                <td key={r.cen.id} style={{ ...TD }}>
                  {r.cen.status === 'aprovado'
                    ? <Badge tone="gold">★ Aprovado</Badge>
                    : <button onClick={() => aprovar(r.cen.id)} style={{ background: 'none', border: '1px solid var(--lt-brd)', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: 'var(--lt-text3)', fontFamily: 'inherit' }}>★ Definir aprovado</button>}
                </td>
              ))}
            </tr>
            {!resumo.length && <tr><td colSpan={1} style={{ ...TDL, textAlign: 'center', padding: 24, color: 'var(--lt-text3)' }}>Nenhum cenário em {ano}. Crie o primeiro acima.</td></tr>}
          </tbody>
        </table>
      </Card>
      <div style={{ fontSize: 11, color: 'var(--lt-text3)' }}>O cenário aprovado (★) é o usado no Dashboard Executivo e no Orçado vs Realizado por padrão.</div>
    </div>
  )
}
