// Plano de Contas — categorias gerenciais + mapeamento conta ERP → categoria (com IA)
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useOrcDados, PageHeader, Card, Badge, BotaoVerde, BotaoSec, ErroBox, TIPOS, TIPO_ORD, THL, TH, TDL, TD } from './_shared'
import { iaCategorizar } from '../../lib/orcamento/ia'

export default function PlanoContas({ projeto }) {
  const ano = new Date().getFullYear()
  const d = useOrcDados(projeto, ano)
  const [contas, setContas] = useState(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState('despesa')
  const [filtroEscopo, setFiltroEscopo] = useState('todas')
  const [filtroCat, setFiltroCat] = useState('')
  const [busca, setBusca] = useState('')
  const [rodandoIA, setRodandoIA] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!projeto?.id) return
    supabase.from('orc_contas_mapa').select('*').eq('projeto_id', projeto.id).order('conta_erp').then(({ data }) => setContas(data || []))
  }, [projeto?.id])

  const recarregarContas = async () => {
    const { data } = await supabase.from('orc_contas_mapa').select('*').eq('projeto_id', projeto.id).order('conta_erp')
    setContas(data || [])
  }

  async function addCategoria() {
    if (!novoNome.trim()) return
    const { error } = await supabase.from('orc_categorias').insert({ projeto_id: projeto.id, nome: novoNome.trim(), tipo: novoTipo })
    if (error) { d.setErro(error.message); return }
    setNovoNome(''); d.reload()
  }
  async function toggleCategoria(c) {
    await supabase.from('orc_categorias').update({ ativo: !c.ativo }).eq('id', c.id); d.reload()
  }
  async function setContaCampo(id, campos) {
    const { error } = await supabase.from('orc_contas_mapa').update(campos).eq('id', id)
    if (error) d.setErro(error.message); else recarregarContas()
  }

  async function categorizarIA() {
    const pendentes = (contas || []).filter(c => !c.categoria_id && c.em_escopo !== false).slice(0, 80)
    if (!pendentes.length) { setMsg('Nenhuma conta pendente de categorização.'); return }
    setRodandoIA(true); setMsg('')
    try {
      const sugestoes = await iaCategorizar(
        pendentes.map(c => ({ conta_erp: c.conta_erp, descricao_erp: c.descricao_erp })),
        d.catsAtivas.map(c => ({ id: c.id, nome: c.nome, tipo: c.tipo })))
      let aplicadas = 0
      for (const s of sugestoes) {
        const conta = pendentes.find(c => c.conta_erp === s.conta_erp)
        if (!conta) continue
        await supabase.from('orc_contas_mapa').update({
          categoria_id: s.categoria_id || null, confianca_ia: s.confianca ?? null,
          em_escopo: s.em_escopo !== false, origem_sugestao: 'ia',
        }).eq('id', conta.id)
        aplicadas++
      }
      setMsg(`🤖 ${aplicadas} contas categorizadas pela IA. Revise as de confiança média/baixa.`)
      recarregarContas()
    } catch (e) { d.setErro(e.message) } finally { setRodandoIA(false) }
  }

  const visiveis = (contas || []).filter(c => {
    if (filtroEscopo === 'em' && c.em_escopo === false) return false
    if (filtroEscopo === 'fora' && c.em_escopo !== false) return false
    if (filtroCat && c.categoria_id !== filtroCat) return false
    const q = busca.trim().toLowerCase()
    if (q && !(c.conta_erp + ' ' + (c.descricao_erp || '')).toLowerCase().includes(q)) return false
    return true
  })
  const emEscopo = (contas || []).filter(c => c.em_escopo !== false).length

  return (
    <div style={{ padding: '20px 28px 40px', maxWidth: 1180, margin: '0 auto' }}>
      <PageHeader projeto={projeto} titulo="Plano de Contas — Categorização Gerencial" subtitulo={contas ? `${contas.length} contas do ERP | ${emEscopo} em escopo | ${contas.length - emEscopo} fora do escopo` : 'carregando…'}>
        <BotaoSec onClick={categorizarIA} disabled={rodandoIA}>{rodandoIA ? 'Categorizando…' : '🤖 Categorizar pendentes (IA)'}</BotaoSec>
      </PageHeader>
      <ErroBox erro={d.erro} onClose={() => d.setErro('')} />
      {msg && <div style={{ background: 'rgba(34,185,138,0.08)', border: '1px solid rgba(34,185,138,0.35)', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, marginBottom: 14 }}>{msg}</div>}

      <Card titulo="Categorias Gerenciais" extra={<span style={{ fontSize: 11, color: 'var(--lt-text3)' }}>a estrutura do seu orçamento — as contas do ERP apontam para elas</span>}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12, flexWrap: 'wrap' }}>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Nova categoria</label>
            <input className="input-light" style={{ width: 240 }} value={novoNome} onChange={e => setNovoNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategoria()} placeholder="Ex: CPV — Matéria Prima" /></div>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Tipo</label>
            <select className="input-light" value={novoTipo} onChange={e => setNovoTipo(e.target.value)}>{TIPOS.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
          <BotaoVerde onClick={addCategoria} disabled={!novoNome.trim()}>Adicionar</BotaoVerde>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[...d.categorias].sort((a, b) => (TIPO_ORD[a.tipo] - TIPO_ORD[b.tipo]) || a.nome.localeCompare(b.nome, 'pt-BR')).map(c => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, border: '1px solid var(--lt-brd)', borderRadius: 999, padding: '4px 6px 4px 12px', opacity: c.ativo ? 1 : 0.45 }}>
              <strong>{c.nome}</strong><span style={{ color: 'var(--lt-text3)' }}>{TIPOS.find(t => t.id === c.tipo)?.nome}</span>
              <button onClick={() => toggleCategoria(c)} title={c.ativo ? 'Inativar' : 'Reativar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lt-text3)', fontSize: 11 }}>{c.ativo ? '✕' : '↻'}</button>
            </span>
          ))}
          {!d.categorias.length && <span style={{ fontSize: 12, color: 'var(--lt-text3)' }}>Nenhuma categoria ainda — crie acima ou importe um realizado (o importador cria contas automaticamente).</span>}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, fontSize: 12, flexWrap: 'wrap' }}>
        <label style={{ color: 'var(--lt-text3)' }}>Escopo:</label>
        <select className="input-light" style={{ width: 150 }} value={filtroEscopo} onChange={e => setFiltroEscopo(e.target.value)}>
          <option value="todas">Todas</option><option value="em">Em escopo</option><option value="fora">Fora de escopo</option>
        </select>
        <label style={{ color: 'var(--lt-text3)' }}>Categoria:</label>
        <select className="input-light" style={{ width: 190 }} value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
          <option value="">Todas</option>{d.catsAtivas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <input className="input-light" style={{ marginLeft: 'auto', width: 220 }} placeholder="Buscar conta…" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <Card titulo="Contas do ERP → Categoria" pad={false}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={THL}>Conta (ERP)</th><th style={THL}>Descrição</th><th style={THL}>Categoria Gerencial</th><th style={TH}>Confiança IA</th><th style={{ ...TH, textAlign: 'center' }}>Em escopo</th></tr></thead>
          <tbody>
            {visiveis.map(c => (
              <tr key={c.id} style={!c.categoria_id && c.em_escopo !== false ? { background: 'rgba(234,179,8,0.05)' } : {}}>
                <td style={{ ...TDL, fontFamily: 'monospace', fontSize: 11.5 }}>{c.conta_erp}</td>
                <td style={TDL}>{c.descricao_erp || '—'}</td>
                <td style={TDL}>
                  <select className="input-light" style={{ width: 220, padding: '4px 8px', fontSize: 12 }} value={c.categoria_id || ''} onChange={e => setContaCampo(c.id, { categoria_id: e.target.value || null, origem_sugestao: 'manual' })}>
                    <option value="">— sem categoria —</option>
                    {d.catsAtivas.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                  </select>
                </td>
                <td style={TD}>{c.confianca_ia !== null && c.confianca_ia !== undefined
                  ? <Badge tone={c.confianca_ia >= 90 ? 'success' : c.confianca_ia >= 70 ? 'warning' : 'danger'}>{c.confianca_ia}%</Badge>
                  : <span style={{ color: 'var(--lt-text3)' }}>{c.origem_sugestao === 'manual' ? 'manual' : '—'}</span>}</td>
                <td style={{ ...TD, textAlign: 'center' }}>
                  <input type="checkbox" checked={c.em_escopo !== false} onChange={e => setContaCampo(c.id, { em_escopo: e.target.checked })} />
                </td>
              </tr>
            ))}
            {contas !== null && !visiveis.length && <tr><td colSpan={5} style={{ ...TDL, textAlign: 'center', padding: 24, color: 'var(--lt-text3)' }}>Nenhuma conta — elas são criadas automaticamente ao Importar Realizado, ou ajuste os filtros.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
