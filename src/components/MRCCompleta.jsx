import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── HELPERS ────────────────────────────────────────────────────────────────

const CRIT_MAP = { 4: { label: '4. Crítico', cls: 'c4' }, 3: { label: '3. Significativo', cls: 'c3' }, 2: { label: '2. Moderado', cls: 'c2' }, 1: { label: '1. Baixo', cls: 'c1' } }
const R1_MAP = { Efetivo: 'b-ef', Inefetivo: 'b-in', GAP: 'b-gp', 'Concluído': 'b-co', 'Em desenvolvimento': 'b-pa', 'Teste Não Realizado': 'b-tnr', 'N/A': 'b-na' }
const IMP_MAP = { Crítico: 'i-crit', Alto: 'i-alto', Moderado: 'i-mod', Baixo: 'i-bx', 'N/A': 'i-na' }
const PROB_MAP = { Extrema: 'p-ext', Alta: 'p-alt', Média: 'p-med', Baixa: 'p-bx' }

const HM_IMPS = ['Crítico', 'Alto', 'Moderado', 'Baixo']
const HM_PROBS = ['Baixa', 'Média', 'Alta', 'Extrema']
const HM_COLORS = [
  ['#FFC000', '#FF0000', '#FF0000', '#FF0000'],
  ['#00B050', '#FFC000', '#FF0000', '#FF0000'],
  ['#00B050', '#00B050', '#FFC000', '#FF0000'],
  ['#00B050', '#00B050', '#00B050', '#FFC000'],
]

function badge(cls, text) {
  return <span className={`bd ${cls}`}>{text}</span>
}

function critBadge(crit) {
  if (!crit) return null
  const m = CRIT_MAP[crit]
  if (!m) return null
  return <span className={`cb ${m.cls}`}><span className="cdot" />{m.label}</span>
}

function truncate(text, max = 80) {
  if (!text || text === 'N/A' || text === '') return null
  return text.length > max ? text.slice(0, max) + '…' : text
}

// ─── COMPONENTE EXPANSOR DE CÉLULA ──────────────────────────────────────────
function ExpCell({ text, maxLen = 80 }) {
  const [open, setOpen] = useState(false)
  if (!text || text === 'N/A' || text.trim() === '') return <span style={{ color: 'var(--txt3)', fontSize: 11 }}>—</span>
  const short = text.length <= maxLen
  if (short) return <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>{text}</span>
  return (
    <div className="exp-row">
      <span className="exp-btn" onClick={() => setOpen(o => !o)}>{open ? '−' : '+'}</span>
      {open
        ? <span className="exp-open">{text}</span>
        : <span className="exp-col">{text.slice(0, maxLen)}…</span>
      }
    </div>
  )
}

// ─── MODAL DE DETALHE ────────────────────────────────────────────────────────
function ModalDetalhe({ row, onClose }) {
  const [tab, setTab] = useState('f1')

  if (!row) return null

  const tabs = [
    { id: 'f1', label: 'F1 — Diagnóstico' },
    { id: 'f2', label: 'F2 — Redesenho' },
    { id: 'f3', label: 'F3 — Teste Final' },
    { id: 'info', label: 'Informações' },
  ]

  const field = (label, value, fullWidth = false) => {
    if (!value || value === 'N/A' || value === '') return null
    return (
      <div style={fullWidth ? { marginBottom: 12 } : {}}>
        <div className="ml">{label}</div>
        <div className="mv">{value}</div>
      </div>
    )
  }

  const fieldText = (label, value) => {
    if (!value || value === 'N/A' || value === '') return null
    return (
      <div style={{ marginBottom: 14 }}>
        <div className="ml">{label}</div>
        <div className="mv-t">{value}</div>
      </div>
    )
  }

  return (
    <div className="overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hdr">
          <div>
            <div className="modal-ttl">{row.rc}</div>
            <div className="modal-sub">{row.area} · {row.sub} · {row.rr}</div>
          </div>
          <button className="modal-cls" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          {tabs.map(t => (
            <div key={t.id} className={`mtab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </div>
          ))}
        </div>

        <div className="modal-body">

          {/* F1 — DIAGNÓSTICO */}
          {tab === 'f1' && (
            <div className="tp active">
              <div className="ms">
                <div className="ms-t">Risco</div>
                <div className="mr">
                  {field('Ref. Risco', row.rr)}
                  {field('Criticidade', row.crit ? <>{critBadge(row.crit)}</> : null)}
                </div>
                {fieldText('Descrição do Risco', row.dr)}
              </div>

              <div className="ms">
                <div className="ms-t">Controle</div>
                <div className="mr">
                  {field('Ref. Controle', row.rc)}
                  {field('Resultado F1', <span className={`bd ${R1_MAP[row.r1] || 'b-na'}`}>{row.r1}</span>)}
                </div>
                <div className="mr3">
                  {field('Categoria', row.cat)}
                  {field('Frequência', row.freq)}
                  {field('Natureza', row.nat)}
                </div>
                <div className="mr3">
                  {field('Caráter', row.car)}
                  {field('Sistema', row.sis)}
                  {field('Tipo', row.chave)}
                </div>
                {fieldText('Descrição do Controle (F1)', row.dc)}
              </div>

              {row.passos_f1 && row.passos_f1 !== 'N/A' && (
                <div className="ms">
                  <div className="ms-t">Passos de Teste F1</div>
                  {fieldText('', row.passos_f1)}
                </div>
              )}

              {row.incons && row.incons !== 'N/A' && (
                <div className="ms">
                  <div className="ms-t">Inconsistências Identificadas</div>
                  {fieldText('', row.incons)}
                </div>
              )}

              {row.rec && row.rec !== 'N/A' && (
                <div className="ms">
                  <div className="ms-t">Recomendações</div>
                  {fieldText('', row.rec)}
                </div>
              )}
            </div>
          )}

          {/* F2 — REDESENHO */}
          {tab === 'f2' && (
            <div className="tp active">
              <div className="ms">
                <div className="ms-t">Plano de Ação</div>
                <div className="mr3">
                  {field('Demanda PA', row.dem_pa)}
                  {field('Status PA', row.st_pa ? <span className={`bd ${R1_MAP[row.st_pa] || 'b-na'}`}>{row.st_pa}</span> : null)}
                  {field('Data Conclusão', row.dt_ult ? new Date(row.dt_ult).toLocaleDateString('pt-BR') : null)}
                </div>
                {field('Responsável PA', row.resp_pa, true)}
                {fieldText('Comentário PA', row.coment_pa)}
              </div>

              <div className="ms">
                <div className="ms-t">Controle Redesenhado (F2 — E1)</div>
                {fieldText('Novo Descritivo de Controle', row.dc_novo)}
              </div>

              {row.r_ader && (
                <div className="ms">
                  <div className="ms-t">Resultado Aderência (F2 — E2)</div>
                  <div className="mr">
                    {field('Resultado', <span className={`bd ${R1_MAP[row.r_ader] || 'b-na'}`}>{row.r_ader}</span>)}
                    {row.dt_teste && field('Data Teste', new Date(row.dt_teste).toLocaleDateString('pt-BR'))}
                  </div>
                  {row.melhoria === 'Sim' && <div style={{ marginBottom: 8 }}><span className="tag">Oportunidade de Melhoria</span></div>}
                  {fieldText('Inconsistências F2-E2', row.incons_ader)}
                  {fieldText('Comentários F2-E2', row.coment_ader)}
                </div>
              )}
            </div>
          )}

          {/* F3 — TESTE FINAL */}
          {tab === 'f3' && (
            <div className="tp active">
              <div className="ms">
                <div className="ms-t">Controle em F3</div>
                <div className="mr">
                  {field('Status F3', row.st_f3 ? <span className={`bd ${R1_MAP[row.st_f3] || 'b-na'}`}>{row.st_f3}</span> : null)}
                  {field('Resultado F3', row.r3 ? <span className={`bd ${R1_MAP[row.r3] || 'b-na'}`}>{row.r3}</span> : null)}
                </div>
                {fieldText('Inconsistências F3', row.incons_f3)}
                {fieldText('Recomendações F3', row.rec_f3)}
              </div>
            </div>
          )}

          {/* INFORMAÇÕES */}
          {tab === 'info' && (
            <div className="tp active">
              <div className="ms">
                <div className="ms-t">Localização</div>
                <div className="mr3">
                  {field('Área', row.area)}
                  {field('Subprocesso', row.sub)}
                  {field('Gerente', row.ger)}
                </div>
                {field('Resp. Subprocesso', row.resp_sub, true)}
              </div>
              <div className="ms">
                <div className="ms-t">Risco</div>
                <div className="mr3">
                  {field('Impacto', <span className={`bd ${IMP_MAP[row.imp] || ''}`}>{row.imp}</span>)}
                  {field('Probabilidade', <span className={`bd ${PROB_MAP[row.prob] || ''}`}>{row.prob}</span>)}
                  {field('Criticidade', critBadge(row.crit))}
                </div>
              </div>
            </div>
          )}

        </div>
        <div className="modal-ftr">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ─── HEATMAP ─────────────────────────────────────────────────────────────────
function Heatmap({ data, filtroImp, filtroProb, onFilterCell }) {
  const counts = {}
  HM_IMPS.forEach(i => HM_PROBS.forEach(p => { counts[`${i}|${p}`] = 0 }))
  data.forEach(r => {
    const key = `${r.imp}|${r.prob}`
    if (counts[key] !== undefined) counts[key]++
  })

  const totais = { C4: 0, C3: 0, C2: 0, C1: 0 }
  data.forEach(r => { if (r.crit) totais[`C${r.crit}`]++ })

  const legColors = { C4: '#FF0000', C3: '#FFC000', C2: '#FFFF00', C1: '#00B050' }
  const legLabels = { C4: '4. Crítico', C3: '3. Significativo', C2: '2. Moderado', C1: '1. Baixo' }

  return (
    <div className="hm-wrap">
      <div className="hm-grid-area">
        <div className="hm-title">Mapa de Calor — Impacto × Probabilidade</div>
        <div style={{ display: 'flex', gap: 3 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 64, paddingBottom: 24 }}>
            {HM_IMPS.map(imp => (
              <div key={imp} className="hm-ylabel" style={{ minHeight: 66 }}>{imp}</div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3 }}>
              {HM_IMPS.map((imp, ri) =>
                HM_PROBS.map((prob, ci) => {
                  const key = `${imp}|${prob}`
                  const n = counts[key] || 0
                  const bg = HM_COLORS[ri][ci]
                  const sel = filtroImp === imp && filtroProb === prob
                  return (
                    <div
                      key={key}
                      className={`hm-cell ${sel ? 'sel' : ''}`}
                      style={{ background: bg, opacity: n === 0 ? 0.25 : 1 }}
                      onClick={() => onFilterCell(imp, prob, sel)}
                    >
                      <div className="hm-n" style={{ color: bg === '#FFFF00' ? '#333' : '#fff' }}>{n}</div>
                      <div className="hm-eig" style={{ color: bg === '#FFFF00' ? '#555' : 'rgba(255,255,255,0.8)' }}>
                        <span>{imp.slice(0, 3)}</span>
                        <span>×</span>
                        <span>{prob.slice(0, 3)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, marginTop: 4 }}>
              {HM_PROBS.map(p => <div key={p} className="hm-xlabel">{p}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="hm-legend">
        {[4, 3, 2, 1].map(c => (
          <div key={c} className="hm-leg">
            <div className="hm-ldot" style={{ background: legColors[`C${c}`] }} />
            <div>
              <div className="hm-lbl">{legLabels[`C${c}`]}</div>
              <div className="hm-lnum" style={{ color: legColors[`C${c}`] === '#FFFF00' ? '#D4A030' : legColors[`C${c}`] }}>{totais[`C${c}`]}</div>
              <div className="hm-lsub">controles</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TABELA MRC ───────────────────────────────────────────────────────────────
function TabelaMRC({ rows, onOpenModal }) {
  const [expandAll, setExpandAll] = useState(false)

  return (
    <div className="tbl-sc">
      <table>
        <thead>
          <tr>
            <th style={{ width: 90 }}>Referência</th>
            <th style={{ width: 130 }}>Área</th>
            <th style={{ width: 160 }}>Subprocesso</th>
            <th>Descrição do Risco</th>
            <th>Descrição do Controle</th>
            <th style={{ width: 80 }}>Categoria</th>
            <th style={{ width: 70 }}>Frequência</th>
            <th style={{ width: 70 }}>Natureza</th>
            <th style={{ width: 70 }}>Caráter</th>
            <th style={{ width: 80 }}>Sistema</th>
            <th style={{ width: 80 }}>Impacto</th>
            <th style={{ width: 80 }}>Prob.</th>
            <th style={{ width: 90 }}>Criticidade</th>
            <th style={{ width: 90 }}>Result. F1</th>
            <th style={{ width: 90 }}>Result. F2</th>
            <th style={{ width: 90 }}>Result. F3</th>
            <th style={{ width: 100 }}>Fase Atual</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={17} className="empty">Nenhum controle encontrado com os filtros aplicados.</td></tr>
          )}
          {rows.map(row => (
            <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => onOpenModal(row)}>
              <td>
                <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>{row.rr}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{row.rc}</div>
              </td>
              <td><span className="tc" style={{ maxWidth: 120 }}>{row.area}</span></td>
              <td><span className="tc" style={{ maxWidth: 150 }}>{row.sub}</span></td>
              <td><ExpCell text={row.dr} maxLen={expandAll ? 9999 : 70} /></td>
              <td><ExpCell text={row.dc} maxLen={expandAll ? 9999 : 70} /></td>
              <td><span className="tc" style={{ maxWidth: 75 }}>{row.cat}</span></td>
              <td><span style={{ fontSize: 11 }}>{row.freq}</span></td>
              <td><span style={{ fontSize: 11 }}>{row.nat}</span></td>
              <td><span style={{ fontSize: 11 }}>{row.car}</span></td>
              <td><span style={{ fontSize: 11 }}>{row.sis}</span></td>
              <td><span className={`bd ${IMP_MAP[row.imp] || 'b-na'}`} style={{ fontSize: 10 }}>{row.imp}</span></td>
              <td><span className={`bd ${PROB_MAP[row.prob] || 'b-na'}`} style={{ fontSize: 10 }}>{row.prob}</span></td>
              <td>{critBadge(row.crit)}</td>
              <td>{badge(R1_MAP[row.r1] || 'b-na', row.r1)}</td>
              <td>{row.r_ader ? badge(R1_MAP[row.r_ader] || 'b-na', row.r_ader) : <span style={{ color: 'var(--txt3)', fontSize: 10 }}>—</span>}</td>
              <td>{row.r3 ? badge(R1_MAP[row.r3] || 'b-na', row.r3) : <span style={{ color: 'var(--txt3)', fontSize: 10 }}>—</span>}</td>
              <td>
                <FaseAtual row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FaseAtual({ row }) {
  // Determina fase atual baseado nos resultados
  if (row.r3 && row.r3 !== 'Teste Não Realizado') {
    return <span style={{ fontSize: 10, color: 'var(--f3c)', fontWeight: 600 }}>F3</span>
  }
  if (row.r_ader && row.r_ader !== 'Teste Não Realizado') {
    return <span style={{ fontSize: 10, color: 'var(--f2e2c)', fontWeight: 600 }}>F2 — E2</span>
  }
  if (row.dc_novo && row.dc_novo.trim() !== '') {
    return <span style={{ fontSize: 10, color: 'var(--f2e1c)', fontWeight: 600 }}>F2 — E1</span>
  }
  return <span style={{ fontSize: 10, color: 'var(--f1c)', fontWeight: 600 }}>F1</span>
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function MRCCompleta({ projetoId }) {
  const [mrc, setMrc] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroCrit, setFiltroCrit] = useState('')
  const [filtroImp, setFiltroImp] = useState('')
  const [filtroProb, setFiltroProb] = useState('')
  const [filtroR1, setFiltroR1] = useState('')

  // Modal
  const [modalRow, setModalRow] = useState(null)

  // ── Carrega dados ──
  useEffect(() => {
    if (!projetoId) return
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('mrc')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('id')
      if (error) { setErro(error.message); setLoading(false); return }
      setMrc(data || [])

      // Áreas únicas
      const areasUnicas = [...new Set((data || []).map(r => r.area))].filter(Boolean).sort()
      setAreas(areasUnicas)
      setLoading(false)
    }
    load()
  }, [projetoId])

  // ── Filtragem ──
  const filtered = mrc.filter(r => {
    if (filtroArea && r.area !== filtroArea) return false
    if (filtroCrit && r.crit !== parseInt(filtroCrit)) return false
    if (filtroImp && r.imp !== filtroImp) return false
    if (filtroProb && r.prob !== filtroProb) return false
    if (filtroR1 && r.r1 !== filtroR1) return false
    if (busca) {
      const q = busca.toLowerCase()
      return (
        (r.rr || '').toLowerCase().includes(q) ||
        (r.rc || '').toLowerCase().includes(q) ||
        (r.area || '').toLowerCase().includes(q) ||
        (r.sub || '').toLowerCase().includes(q) ||
        (r.dr || '').toLowerCase().includes(q) ||
        (r.dc || '').toLowerCase().includes(q) ||
        (r.incons || '').toLowerCase().includes(q) ||
        (r.passos_f1 || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Filtro pelo heatmap ──
  const handleHeatmapCell = (imp, prob, sel) => {
    if (sel) { setFiltroImp(''); setFiltroProb('') }
    else { setFiltroImp(imp); setFiltroProb(prob) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--txt3)' }}>
      <div>Carregando MRC…</div>
    </div>
  )

  if (erro) return (
    <div style={{ padding: 32, color: 'var(--in)' }}>Erro ao carregar MRC: {erro}</div>
  )

  return (
    <div className="mrc-wrap">
      <div className="dash-eye">Matriz de Riscos e Controles</div>
      <div className="dash-ttl" style={{ marginBottom: 14 }}>MRC Completa</div>

      {/* HEATMAP */}
      <Heatmap
        data={filtered}
        filtroImp={filtroImp}
        filtroProb={filtroProb}
        onFilterCell={handleHeatmapCell}
      />

      {/* TABELA */}
      <div className="card">
        <div className="filters">
          <input
            type="text"
            placeholder="Buscar ref., área, risco, controle, inconsistência, passos…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}>
            <option value="">Todas as áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroCrit} onChange={e => setFiltroCrit(e.target.value)}>
            <option value="">Todas criticidades</option>
            <option value="4">Crítico</option>
            <option value="3">Significativo</option>
            <option value="2">Moderado</option>
            <option value="1">Baixo</option>
          </select>
          <select value={filtroImp} onChange={e => setFiltroImp(e.target.value)}>
            <option value="">Todos impactos</option>
            <option>Crítico</option><option>Alto</option><option>Moderado</option><option>Baixo</option>
          </select>
          <select value={filtroProb} onChange={e => setFiltroProb(e.target.value)}>
            <option value="">Todas probabilidades</option>
            <option>Extrema</option><option>Alta</option><option>Média</option><option>Baixa</option>
          </select>
          <select value={filtroR1} onChange={e => setFiltroR1(e.target.value)}>
            <option value="">Todos resultados F1</option>
            <option>Efetivo</option><option>Inefetivo</option><option>GAP</option>
          </select>
          <span className="chip">{filtered.length} controles</span>
          {(busca || filtroArea || filtroCrit || filtroImp || filtroProb || filtroR1) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setBusca(''); setFiltroArea(''); setFiltroCrit(''); setFiltroImp(''); setFiltroProb(''); setFiltroR1('') }}
            >
              ✕ Limpar filtros
            </button>
          )}
        </div>

        <TabelaMRC rows={filtered} onOpenModal={setModalRow} />
      </div>

      {/* MODAL */}
      {modalRow && <ModalDetalhe row={modalRow} onClose={() => setModalRow(null)} />}
    </div>
  )
}
