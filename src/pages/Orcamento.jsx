// ═══════════════════════════════════════════════════════════════════════════
// Orcamento.jsx — Módulo Gestão Orçamentária
// Histórico/Realizado (competência) + Orçado (versões/ano) + Desvios.
// Motor de sugestão M11: 6 métodos com peso visual igual (lib/orcamento/sugestao).
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatNomeEmpresa } from '../lib/formatNome'
import { METODOS, sugerir, fmtBRL, MESES_ABREV } from '../lib/orcamento/sugestao'

const TIPOS = [
  { id: 'receita', nome: 'Receita' },
  { id: 'deducao', nome: 'Dedução' },
  { id: 'custo', nome: 'Custo' },
  { id: 'despesa', nome: 'Despesa' },
  { id: 'outros', nome: 'Outros' },
]
const TIPO_ORD = Object.fromEntries(TIPOS.map((t, i) => [t.id, i]))
const sinal = (tipo) => (tipo === 'receita' ? 1 : -1)

const TH = { padding: '7px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--lt-text3)', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid var(--lt-brd)' }
const TD = { padding: '6px 10px', fontSize: 12.5, color: 'var(--lt-text)', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid var(--lt-brd)' }

export default function Orcamento({ projeto }) {
  const { perfil } = useAuth()
  const isPolimata = ['admin_polimata', 'consultor_polimata'].includes(perfil?.papel)
  const hoje = new Date()
  const [tab, setTab] = useState('orcado')
  const [ano, setAno] = useState(hoje.getFullYear())
  const [categorias, setCategorias] = useState([])
  const [orcamento, setOrcamento] = useState(null)
  const [itens, setItens] = useState([])
  const [realizado, setRealizado] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const loadTudo = useCallback(async () => {
    if (!projeto?.id) return
    setLoading(true); setErro('')
    try {
      const [catRes, orcRes, realRes] = await Promise.all([
        supabase.from('orc_categorias').select('*').eq('projeto_id', projeto.id).order('ordem').order('nome'),
        supabase.from('orc_orcamentos').select('*').eq('projeto_id', projeto.id).eq('ano', ano).order('versao', { ascending: false }).limit(1),
        supabase.from('orc_realizado').select('id, categoria_id, competencia, valor, origem, detalhe').eq('projeto_id', projeto.id),
      ])
      if (catRes.error) throw catRes.error
      setCategorias(catRes.data || [])
      const orc = (orcRes.data || [])[0] || null
      setOrcamento(orc)
      setRealizado(realRes.data || [])
      if (orc) {
        const it = await supabase.from('orc_orcamento_itens').select('*').eq('orcamento_id', orc.id)
        setItens(it.data || [])
      } else setItens([])
    } catch (e) {
      console.error(e); setErro('Erro ao carregar dados do orçamento.')
    } finally { setLoading(false) }
  }, [projeto?.id, ano])

  useEffect(() => { loadTudo() }, [loadTudo])

  // realizado agregado: catId -> ano -> array[12]
  const realPorCat = useMemo(() => {
    const m = {}
    realizado.forEach(r => {
      const d = new Date(r.competencia + 'T00:00:00')
      const a = d.getFullYear(), mes = d.getMonth()
      m[r.categoria_id] = m[r.categoria_id] || {}
      m[r.categoria_id][a] = m[r.categoria_id][a] || Array(12).fill(null)
      m[r.categoria_id][a][mes] = (m[r.categoria_id][a][mes] || 0) + Number(r.valor)
    })
    return m
  }, [realizado])

  const itensMap = useMemo(() => {
    const m = {}
    itens.forEach(i => { m[i.categoria_id] = m[i.categoria_id] || Array(12).fill(null); m[i.categoria_id][i.mes - 1] = Number(i.valor) })
    return m
  }, [itens])

  const catsAtivas = useMemo(() =>
    [...categorias].filter(c => c.ativo).sort((a, b) => (TIPO_ORD[a.tipo] - TIPO_ORD[b.tipo]) || a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR')),
  [categorias])

  async function criarOrcamento() {
    const { data, error } = await supabase.from('orc_orcamentos').insert({ projeto_id: projeto.id, ano, versao: 1, nome: `Orçamento ${ano}`, status: 'rascunho' }).select().single()
    if (error) { setErro('Erro ao criar orçamento: ' + error.message); return }
    setOrcamento(data); setItens([])
  }

  async function salvarItem(categoriaId, mesIdx, valor) {
    if (!orcamento) return
    const v = valor === '' || valor === null ? 0 : Number(valor)
    const { error } = await supabase.from('orc_orcamento_itens').upsert(
      { orcamento_id: orcamento.id, categoria_id: categoriaId, mes: mesIdx + 1, valor: v, metodo: 'manual' },
      { onConflict: 'orcamento_id,categoria_id,mes' })
    if (error) { setErro('Erro ao salvar: ' + error.message); return }
    setItens(prev => {
      const rest = prev.filter(i => !(i.categoria_id === categoriaId && i.mes === mesIdx + 1))
      return [...rest, { orcamento_id: orcamento.id, categoria_id: categoriaId, mes: mesIdx + 1, valor: v, metodo: 'manual' }]
    })
  }

  async function aplicarSugestao(categoriaId, metodo, percentual) {
    if (!orcamento) return
    const s1 = realPorCat[categoriaId]?.[ano - 1] || null
    const s2 = realPorCat[categoriaId]?.[ano - 2] || null
    const vals = sugerir(metodo, s1, s2, { percentual })
    const rows = vals.map((v, m) => ({ orcamento_id: orcamento.id, categoria_id: categoriaId, mes: m + 1, valor: v, metodo }))
    const { error } = await supabase.from('orc_orcamento_itens').upsert(rows, { onConflict: 'orcamento_id,categoria_id,mes' })
    if (error) { setErro('Erro ao aplicar sugestão: ' + error.message); return }
    setItens(prev => [...prev.filter(i => i.categoria_id !== categoriaId), ...rows])
  }

  if (!projeto) return null

  return (
    <div style={{ padding: '20px 28px 40px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--lt-text3)', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 600 }}>
            {formatNomeEmpresa(projeto.clientes?.nome_fantasia || projeto.clientes?.nome)} · {projeto.nome}
          </div>
          <h1 style={{ fontFamily: "'Raleway', sans-serif", fontSize: 24, fontWeight: 700, color: 'var(--lt-text)', margin: '2px 0 0' }}>Gestão Orçamentária</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--lt-text3)' }}>Ano</label>
          <select className="input-light" style={{ width: 100 }} value={ano} onChange={e => setAno(parseInt(e.target.value))}>
            {Array.from({ length: 6 }, (_, i) => hoje.getFullYear() - 3 + i).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--lt-brd)', marginBottom: 16 }}>
        {[['orcado', 'Orçado'], ['realizado', 'Realizado'], ['desvios', 'Desvios'], ['categorias', 'Categorias']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ background: 'none', border: 'none', borderBottom: tab === id ? '2px solid var(--prod-orcamento)' : '2px solid transparent', marginBottom: -2, padding: '8px 16px', fontSize: 13, fontWeight: tab === id ? 700 : 500, color: tab === id ? 'var(--lt-text)' : 'var(--lt-text3)', cursor: 'pointer', fontFamily: 'inherit' }}>
            {label}
          </button>
        ))}
      </div>

      {erro && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#991B1B', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, marginBottom: 14 }}>{erro}</div>}
      {loading ? <div style={{ color: 'var(--lt-text3)', fontSize: 13, padding: 30 }}>Carregando…</div> : (<>
        {tab === 'categorias' && <TabCategorias projeto={projeto} categorias={categorias} reload={loadTudo} canEdit={isPolimata} setErro={setErro} />}
        {tab === 'orcado' && <TabOrcado ano={ano} orcamento={orcamento} criarOrcamento={criarOrcamento} cats={catsAtivas} itensMap={itensMap} salvarItem={salvarItem} aplicarSugestao={aplicarSugestao} canEdit={isPolimata} realPorCat={realPorCat} />}
        {tab === 'realizado' && <TabRealizado projeto={projeto} ano={ano} cats={catsAtivas} realizado={realizado} reload={loadTudo} canEdit={isPolimata} setErro={setErro} />}
        {tab === 'desvios' && <TabDesvios ano={ano} cats={catsAtivas} itensMap={itensMap} realPorCat={realPorCat} />}
      </>)}
    </div>
  )
}

// ─── Categorias ─────────────────────────────────────────────────────────────
function TabCategorias({ projeto, categorias, reload, canEdit, setErro }) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('despesa')
  const [salvando, setSalvando] = useState(false)

  async function adicionar() {
    if (!nome.trim()) return
    setSalvando(true)
    const { error } = await supabase.from('orc_categorias').insert({ projeto_id: projeto.id, nome: nome.trim(), tipo })
    setSalvando(false)
    if (error) { setErro('Erro ao criar categoria: ' + error.message); return }
    setNome(''); reload()
  }
  async function toggleAtivo(c) {
    const { error } = await supabase.from('orc_categorias').update({ ativo: !c.ativo }).eq('id', c.id)
    if (error) { setErro(error.message); return }
    reload()
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Nova categoria</label>
            <input className="input-light" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionar()} placeholder="Ex: Receita de Vendas, Folha, Marketing…" /></div>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Tipo</label>
            <select className="input-light" value={tipo} onChange={e => setTipo(e.target.value)}>{TIPOS.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
          <button onClick={adicionar} disabled={salvando || !nome.trim()} style={{ background: 'var(--prod-orcamento)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: salvando || !nome.trim() ? 0.5 : 1 }}>Adicionar</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ ...TH, textAlign: 'left' }}>Categoria</th><th style={{ ...TH, textAlign: 'left' }}>Tipo</th><th style={TH}>Status</th>{canEdit && <th style={TH} />}</tr></thead>
        <tbody>
          {categorias.length === 0 && <tr><td colSpan={4} style={{ ...TD, textAlign: 'center', color: 'var(--lt-text3)', padding: 24 }}>Nenhuma categoria ainda. Crie as categorias do plano gerencial para começar.</td></tr>}
          {[...categorias].sort((a, b) => (TIPO_ORD[a.tipo] - TIPO_ORD[b.tipo]) || a.nome.localeCompare(b.nome, 'pt-BR')).map(c => (
            <tr key={c.id} style={{ opacity: c.ativo ? 1 : 0.45 }}>
              <td style={{ ...TD, textAlign: 'left', fontWeight: 500 }}>{c.nome}</td>
              <td style={{ ...TD, textAlign: 'left' }}>{(TIPOS.find(t => t.id === c.tipo) || {}).nome}</td>
              <td style={TD}>{c.ativo ? 'Ativa' : 'Inativa'}</td>
              {canEdit && <td style={TD}><button onClick={() => toggleAtivo(c)} style={{ background: 'none', border: '1px solid var(--lt-brd)', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: 'var(--lt-text3)', fontFamily: 'inherit' }}>{c.ativo ? 'Inativar' : 'Reativar'}</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Orçado ─────────────────────────────────────────────────────────────────
function TabOrcado({ ano, orcamento, criarOrcamento, cats, itensMap, salvarItem, aplicarSugestao, canEdit, realPorCat }) {
  const [metodoSel, setMetodoSel] = useState({})
  const [pctIndice, setPctIndice] = useState({})
  const [editando, setEditando] = useState(null) // `${catId}:${mes}`
  const [valorEdit, setValorEdit] = useState('')

  if (!orcamento) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--lt-text3)' }}>
        <div style={{ fontSize: 14, marginBottom: 14 }}>Ainda não existe orçamento para {ano}.</div>
        {canEdit && <button onClick={criarOrcamento} style={{ background: 'var(--prod-orcamento)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Criar Orçamento {ano}</button>}
      </div>
    )
  }
  if (cats.length === 0) return <div style={{ color: 'var(--lt-text3)', fontSize: 13, padding: 30 }}>Cadastre as categorias na aba “Categorias” para montar o orçamento.</div>

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--lt-text3)', marginBottom: 10 }}>
        {orcamento.nome} · v{orcamento.versao} · <strong style={{ color: orcamento.status === 'aprovado' ? '#15803D' : 'var(--copper)' }}>{orcamento.status}</strong>
        {canEdit && ' — clique numa célula para editar, ou use o motor de sugestão por categoria.'}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead><tr>
            <th style={{ ...TH, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--lt-bg)' }}>Categoria</th>
            {MESES_ABREV.map(m => <th key={m} style={TH}>{m}</th>)}
            <th style={{ ...TH, fontWeight: 800 }}>Total</th>
            {canEdit && <th style={{ ...TH, textAlign: 'left' }}>Sugestão</th>}
          </tr></thead>
          <tbody>
            {cats.map(c => {
              const serie = itensMap[c.id] || Array(12).fill(null)
              const total = serie.reduce((a, v) => a + (v || 0), 0)
              const temHist = !!(realPorCat[c.id]?.[ano - 1] || realPorCat[c.id]?.[ano - 2])
              return (
                <tr key={c.id}>
                  <td style={{ ...TD, textAlign: 'left', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--lt-bg)' }}>{c.nome}</td>
                  {serie.map((v, m) => {
                    const k = c.id + ':' + m
                    if (canEdit && editando === k) {
                      return <td key={m} style={{ ...TD, padding: 2 }}>
                        <input autoFocus type="number" step="0.01" className="input-light" style={{ width: 90, padding: '4px 6px', fontSize: 12, textAlign: 'right' }}
                          value={valorEdit} onChange={e => setValorEdit(e.target.value)}
                          onBlur={() => { salvarItem(c.id, m, valorEdit); setEditando(null) }}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditando(null) }} />
                      </td>
                    }
                    return <td key={m} onClick={() => { if (canEdit) { setEditando(k); setValorEdit(v ?? '') } }}
                      style={{ ...TD, cursor: canEdit ? 'pointer' : 'default', color: v ? 'var(--lt-text)' : 'var(--lt-text3)' }}>
                      {v !== null && v !== undefined ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '·'}
                    </td>
                  })}
                  <td style={{ ...TD, fontWeight: 700 }}>{total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  {canEdit && (
                    <td style={{ ...TD, textAlign: 'left' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select className="input-light" style={{ width: 132, padding: '3px 6px', fontSize: 11 }} value={metodoSel[c.id] || 'repeticao'} onChange={e => setMetodoSel(s => ({ ...s, [c.id]: e.target.value }))} title={(METODOS.find(x => x.id === (metodoSel[c.id] || 'repeticao')) || {}).desc}>
                          {METODOS.map(mt => <option key={mt.id} value={mt.id}>{mt.nome}</option>)}
                        </select>
                        {(metodoSel[c.id] || 'repeticao') === 'indice' && (
                          <input type="number" step="0.1" className="input-light" style={{ width: 58, padding: '3px 6px', fontSize: 11 }} placeholder="%" value={pctIndice[c.id] || ''} onChange={e => setPctIndice(s => ({ ...s, [c.id]: e.target.value }))} title="Percentual do índice (ex.: IPCA 4,5)" />
                        )}
                        <button disabled={!temHist} onClick={() => aplicarSugestao(c.id, metodoSel[c.id] || 'repeticao', pctIndice[c.id])}
                          title={temHist ? 'Preencher os 12 meses com a sugestão' : 'Sem histórico de realizado para sugerir'}
                          style={{ background: temHist ? 'rgba(34,185,138,0.12)' : 'transparent', color: temHist ? '#0E7A5A' : 'var(--lt-text3)', border: '1px solid ' + (temHist ? 'rgba(34,185,138,0.4)' : 'var(--lt-brd)'), borderRadius: 6, padding: '3px 9px', fontSize: 11, cursor: temHist ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                          Aplicar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Realizado ──────────────────────────────────────────────────────────────
function TabRealizado({ projeto, ano, cats, realizado, reload, canEdit, setErro }) {
  const [mes, setMes] = useState(new Date().getMonth())
  const [catId, setCatId] = useState('')
  const [valor, setValor] = useState('')
  const [detalhe, setDetalhe] = useState('')
  const comp = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
  const doMes = realizado.filter(r => r.competencia === comp)

  async function adicionar() {
    if (!catId || valor === '') return
    const { error } = await supabase.from('orc_realizado').insert({ projeto_id: projeto.id, categoria_id: catId, competencia: comp, valor: Number(valor), origem: 'manual', detalhe: detalhe || null })
    if (error) { setErro('Erro ao lançar: ' + error.message); return }
    setValor(''); setDetalhe(''); reload()
  }
  async function excluir(id) {
    const { error } = await supabase.from('orc_realizado').delete().eq('id', id)
    if (error) { setErro(error.message); return }
    reload()
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--lt-text3)' }}>Competência</label>
        <select className="input-light" style={{ width: 130 }} value={mes} onChange={e => setMes(parseInt(e.target.value))}>
          {MESES_ABREV.map((m, i) => <option key={i} value={i}>{m}/{ano}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lt-text3)' }}>Importação do Excel do ERP: em breve (mapeamento conta→categoria já previsto no banco).</div>
      </div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Categoria</label>
            <select className="input-light" style={{ minWidth: 200 }} value={catId} onChange={e => setCatId(e.target.value)}>
              <option value="">Selecione…</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select></div>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Valor (R$)</label>
            <input type="number" step="0.01" className="input-light" style={{ width: 130 }} value={valor} onChange={e => setValor(e.target.value)} /></div>
          <div style={{ flex: 1, minWidth: 160 }}><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Detalhe</label>
            <input className="input-light" value={detalhe} onChange={e => setDetalhe(e.target.value)} placeholder="opcional" /></div>
          <button onClick={adicionar} disabled={!catId || valor === ''} style={{ background: 'var(--prod-orcamento)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: !catId || valor === '' ? 0.5 : 1 }}>Lançar</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ ...TH, textAlign: 'left' }}>Categoria</th><th style={{ ...TH, textAlign: 'left' }}>Detalhe</th><th style={TH}>Origem</th><th style={TH}>Valor</th>{canEdit && <th style={TH} />}</tr></thead>
        <tbody>
          {doMes.length === 0 && <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: 'var(--lt-text3)', padding: 24 }}>Nenhum lançamento em {MESES_ABREV[mes]}/{ano}.</td></tr>}
          {doMes.map(r => (
            <tr key={r.id}>
              <td style={{ ...TD, textAlign: 'left', fontWeight: 500 }}>{(cats.find(c => c.id === r.categoria_id) || {}).nome || '—'}</td>
              <td style={{ ...TD, textAlign: 'left', color: 'var(--lt-text3)' }}>{r.detalhe || '—'}</td>
              <td style={TD}>{r.origem}</td>
              <td style={{ ...TD, fontWeight: 600 }}>{fmtBRL(r.valor)}</td>
              {canEdit && <td style={TD}><button onClick={() => excluir(r.id)} style={{ background: 'none', border: 'none', color: '#991B1B', fontSize: 12, cursor: 'pointer' }} title="Excluir">✕</button></td>}
            </tr>
          ))}
          {doMes.length > 0 && <tr><td colSpan={3} style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>Total</td><td style={{ ...TD, fontWeight: 800 }}>{fmtBRL(doMes.reduce((a, r) => a + Number(r.valor), 0))}</td>{canEdit && <td style={TD} />}</tr>}
        </tbody>
      </table>
    </div>
  )
}

// ─── Desvios ────────────────────────────────────────────────────────────────
function TabDesvios({ ano, cats, itensMap, realPorCat }) {
  const [mes, setMes] = useState('ano') // 'ano' | 0..11
  const linhas = cats.map(c => {
    const orc = itensMap[c.id] || Array(12).fill(null)
    const rea = realPorCat[c.id]?.[ano] || Array(12).fill(null)
    const soma = (arr) => mes === 'ano' ? arr.reduce((a, v) => a + (v || 0), 0) : (arr[mes] || 0)
    const vOrc = soma(orc), vRea = soma(rea)
    const desvio = vRea - vOrc
    const pct = vOrc !== 0 ? (desvio / Math.abs(vOrc)) * 100 : null
    const favoravel = desvio * sinal(c.tipo) >= 0
    return { c, vOrc, vRea, desvio, pct, favoravel }
  }).filter(l => l.vOrc !== 0 || l.vRea !== 0)

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--lt-text3)' }}>Período</label>
        <select className="input-light" style={{ width: 150 }} value={mes} onChange={e => setMes(e.target.value === 'ano' ? 'ano' : parseInt(e.target.value))}>
          <option value="ano">Ano {ano} (acum.)</option>
          {MESES_ABREV.map((m, i) => <option key={i} value={i}>{m}/{ano}</option>)}
        </select>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ ...TH, textAlign: 'left' }}>Categoria</th><th style={TH}>Orçado</th><th style={TH}>Realizado</th><th style={TH}>Desvio R$</th><th style={TH}>Desvio %</th></tr></thead>
        <tbody>
          {linhas.length === 0 && <tr><td colSpan={5} style={{ ...TD, textAlign: 'center', color: 'var(--lt-text3)', padding: 24 }}>Sem dados de orçado/realizado no período.</td></tr>}
          {linhas.map(({ c, vOrc, vRea, desvio, pct, favoravel }) => (
            <tr key={c.id}>
              <td style={{ ...TD, textAlign: 'left', fontWeight: 500 }}>{c.nome}</td>
              <td style={TD}>{fmtBRL(vOrc)}</td>
              <td style={TD}>{fmtBRL(vRea)}</td>
              <td style={{ ...TD, fontWeight: 600, color: favoravel ? '#0E7A5A' : '#B91C1C' }}>{fmtBRL(desvio)}</td>
              <td style={{ ...TD, fontWeight: 600, color: favoravel ? '#0E7A5A' : '#B91C1C' }}>{pct === null ? '—' : pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: 'var(--lt-text3)', marginTop: 10 }}>Verde = desvio favorável (considera a natureza da categoria: receita acima do orçado é favorável; custo/despesa acima é desfavorável).</div>
    </div>
  )
}
