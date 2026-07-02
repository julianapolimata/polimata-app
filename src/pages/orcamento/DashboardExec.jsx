// Dashboard Executivo — tela inicial do orçamento.
// Conta a história: KPIs com sinal, evolução mensal (receita×saídas×resultado, realizado+orçado),
// DRE gerencial (realizado + projeção), receita por situação fiscal e maiores rubricas (explosíveis).
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useOrcDados, useItens, PageHeader, Card, BotaoSec, fmtBRL, MESES_ABREV, ErroBox, MonthRail } from './_shared'
import { iaProjecao, iaAnaliseAno } from '../../lib/orcamento/ia'

const ANO_ATUAL = new Date().getFullYear()
const NAVY = '#00203E', COBRE = '#CC915E', VERDE = '#22B98A', RED = '#A32D2D'
const COBRE_L = 'rgba(204,145,94,0.4)', VERDE_L = 'rgba(34,185,138,0.4)'
const fmtC = (v) => v == null ? '—' : (Math.abs(v) >= 1e6 ? 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + 'M' : 'R$ ' + Math.round(v / 1e3) + 'k')

const soma = (arr, de, ate) => (arr || []).slice(de, ate + 1).reduce((s, v) => s + (v || 0), 0)
const pct = (n) => (n >= 0 ? '' : '−') + Math.abs(n).toFixed(1) + '%'

function Linha({ label, valor, w, cor, forte, sufixo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', fontSize: 12.5 }}>
      <span style={{ width: 168, flex: 'none', fontWeight: forte ? 600 : 400, color: 'var(--lt-text)' }}>{label}</span>
      <span style={{ flex: 1 }}><span style={{ display: 'block', height: 16, width: Math.max(1.5, w) + '%', background: cor, borderRadius: 3 }} /></span>
      <span style={{ width: 150, flex: 'none', textAlign: 'right', fontWeight: forte ? 600 : 500, color: cor === RED ? RED : 'var(--lt-text)' }}>{fmtBRL(valor)}{sufixo || ''}</span>
    </div>
  )
}

function BarrasMes({ titulo, real, orc, selMonth, base, light, dark, proj, ideal, curMonth }) {
  const [hv, setHv] = useState(-1)
  const VW = 360, VH = 178, T = 18, B = 26, L = 44, R = 8
  const plotH = VH - T - B, plotW = VW - L - R
  const max = Math.max(1, ...((orc || []).filter(x => x > 0)), ...((real || []).filter(x => x > 0)), ...((proj || []).filter(x => x > 0)), ...((ideal || []).filter(x => x > 0))) * 1.12
  const slot = plotW / 12
  const bw = Math.min(17, slot - 6)
  const y = (v) => T + plotH * (1 - v / max)
  const cx = (i) => L + slot * i + slot / 2
  const ticks = [0, max]
  const aberto = (curMonth != null && curMonth >= 0) ? curMonth : 99
  const lastReal = real.reduce((mx, v, i) => (v && v > 0 && i < aberto) ? i : mx, -1)
  const realPts = real.map((v, i) => (v > 0 && i < aberto) ? `${cx(i)},${y(v)}` : null).filter(Boolean).join(' ')
  const projPts = (proj && lastReal >= 0) ? real.map((v, i) => (i >= lastReal && proj[i] != null) ? `${cx(i)},${y(proj[i])}` : null).filter(Boolean).join(' ') : ''
  const idealPts = ideal ? ideal.map((v, i) => (v != null && i >= lastReal) ? `${cx(i)},${y(v)}` : null).filter(Boolean).join(' ') : ''
  return (
    <div style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}>
      <div style={{ background: base, color: '#fff', fontSize: 12.5, fontWeight: 600, textAlign: 'center', padding: '6px 0', borderRadius: '10px 10px 0 0' }}>{titulo}</div>
      <div style={{ border: '1px solid var(--lt-brd)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '8px 8px 2px', position: 'relative' }}>
        <svg width="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block' }} role="img" aria-label={titulo + ' — orçado em barras, realizado em linha'}>
          {selMonth >= 0 && selMonth < 12 && <rect x={L + slot * selMonth} y={T} width={slot} height={plotH} rx="3" fill={dark} opacity="0.22" />}
          {ticks.map((t, k) => (
            <g key={k}>
              <line x1={L} y1={y(t)} x2={VW - R} y2={y(t)} stroke="var(--lt-brd, #eee)" strokeWidth="1" />
              <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="var(--lt-text3, #999)">{fmtC(t)}</text>
            </g>
          ))}
          {orc.map((_, i) => {
            const oo = orc[i] || 0, hO = plotH * oo / max
            const x = L + slot * i + (slot - bw) / 2
            const isCur = i === curMonth
            const rr = (real[i] && real[i] > 0) ? real[i] : 0
            const hR = plotH * rr / max
            const nbw = Math.max(5, bw * 0.5), xn = L + slot * i + (slot - nbw) / 2
            return (
              <g key={i}>
                <rect x={x} y={T + plotH - hO} width={bw} height={hO} rx="2.5" fill={light} stroke={isCur ? base : 'none'} strokeWidth={isCur ? 1 : 0} strokeDasharray={isCur ? '2 2' : undefined} />
                {isCur && rr > 0 && <rect x={xn} y={T + plotH - hR} width={nbw} height={hR} rx="2" fill={i === selMonth ? NAVY : base} />}
                <text x={x + bw / 2} y={VH - 10} textAnchor="middle" fontSize="9" fill={i === selMonth ? NAVY : 'var(--lt-text3)'} fontWeight={i === selMonth ? 700 : 400}>{MESES_ABREV[i]}</text>
              </g>
            )
          })}
          {idealPts && <polyline points={idealPts} fill="none" stroke="#2a78d6" strokeWidth="1.7" strokeDasharray="7 4" strokeLinejoin="round" strokeLinecap="round" />}
          {projPts && <polyline points={projPts} fill="none" stroke={base} strokeWidth="2" strokeDasharray="2 2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />}
          {realPts && <polyline points={realPts} fill="none" stroke={base} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
          {real.map((v, i) => (v > 0 && i < aberto) ? <circle key={'d' + i} cx={cx(i)} cy={y(v)} r="2.6" fill={base} stroke="#fff" strokeWidth="1" /> : null)}
          {Array.from({ length: 12 }, (_, i) => <rect key={'hz' + i} x={L + slot * i} y={T} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(-1)} />)}
        </svg>
        {hv >= 0 && (() => {
          const leftPct = cx(hv) / VW * 100
          const oo = orc[hv] || 0, rr = real[hv]
          const temR = rr != null && rr > 0
          const pr = (proj && hv >= lastReal) ? proj[hv] : null
          const id = (ideal && hv >= lastReal) ? ideal[hv] : null
          const tx = hv <= 1 ? '0' : hv >= 10 ? '-100%' : '-50%'
          return (
            <div style={{ position: 'absolute', left: leftPct + '%', top: 4, transform: 'translateX(' + tx + ')', background: '#00203E', color: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 11, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,.22)' }}>
              <div style={{ fontWeight: 600, marginBottom: 3 }}>{MESES_ABREV[hv]}</div>
              <div>Orçado: <strong>{fmtBRL(oo)}</strong></div>
              <div>Realizado: <strong>{temR ? fmtBRL(rr) : '—'}</strong></div>
              {pr != null && <div style={{ color: '#D9A97A' }}>Projeção IA: <strong>{fmtBRL(pr)}</strong></div>}
              {id != null && <div style={{ color: '#85B7EB' }}>Ideal 15%: <strong>{fmtBRL(id)}</strong></div>}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default function DashboardExec({ projeto }) {
  const [ano, setAno] = useState(ANO_ATUAL)
  const d = useOrcDados(projeto, ano)
  const aprovado = d.cenarios.find(c => c.status === 'aprovado') || d.cenarios[d.cenarios.length - 1]
  const { porCat } = useItens(aprovado?.id)
  const [de, setDe] = useState(0)
  const [ate, setAte] = useState(11)
  const [modo, setModo] = useState('analise')
  const [proj, setProj] = useState(null)
  const [projLoad, setProjLoad] = useState(false)
  const [anoIA, setAnoIA] = useState(null)
  const [anoIALoad, setAnoIALoad] = useState(false)
  const [grpOpen, setGrpOpen] = useState({})
  const [modal, setModal] = useState(null)
  const [msg, setMsg] = useState('')
  const [tabOpen, setTabOpen] = useState(false)

  const temOrcado = useMemo(() => Object.values(porCat || {}).some(p => (p.valores || []).some(v => v != null && v !== 0)), [porCat])
  useEffect(() => { if (!temOrcado) setModo('analise') }, [temOrcado])

  useEffect(() => {
    let max = -1
    d.realizado.forEach(r => { const dt = new Date(r.competencia + 'T00:00:00'); if (dt.getFullYear() === ano) max = Math.max(max, dt.getMonth()) })
    try { const sv = JSON.parse(localStorage.getItem('orc_sel_' + projeto.id) || 'null'); if (sv && sv.ano === ano && typeof sv.de === 'number' && typeof sv.ate === 'number') { setDe(sv.de); setAte(sv.ate); return } } catch (e) { /* segue */ }
    setDe(0); setAte(max >= 0 ? max : 11)
  }, [ano, d.realizado])

  useEffect(() => { try { localStorage.setItem('orc_sel_' + projeto.id, JSON.stringify({ ano, de, ate })) } catch (e) { /* segue */ } }, [projeto?.id, ano, de, ate])

  const W = useMemo(() => {
    const catTipo = {}; d.categorias.forEach(c => { catTipo[c.id] = c.tipo })
    const tipoArr = (tipo, fonte) => {
      const out = Array(12).fill(0)
      d.catsAtivas.filter(c => c.tipo === tipo).forEach(c => {
        const a = fonte === 'real' ? (d.realPorCat[c.id] && d.realPorCat[c.id][ano]) : (porCat[c.id] && porCat[c.id].valores)
        for (let m = 0; m < 12; m++) out[m] += (a && a[m]) || 0
      })
      return out
    }
    const rReceita = tipoArr('receita', 'real'), rDeducao = tipoArr('deducao', 'real'), rCusto = tipoArr('custo', 'real'), rDespesa = tipoArr('despesa', 'real')
    const oReceita = tipoArr('receita', 'orc'), oDeducao = tipoArr('deducao', 'orc'), oCusto = tipoArr('custo', 'orc'), oDespesa = tipoArr('despesa', 'orc')
    const saidaR = rDeducao.map((v, m) => v + rCusto[m] + rDespesa[m])
    const saidaO = oDeducao.map((v, m) => v + oCusto[m] + oDespesa[m])
    const resR = rReceita.map((v, m) => v - saidaR[m])
    const resO = oReceita.map((v, m) => v - saidaO[m])

    let lastReceita = -1, lastSaida = -1
    for (let m = 0; m < 12; m++) { if (rReceita[m]) lastReceita = m; if (saidaR[m]) lastSaida = m }
    const lastReal = Math.max(lastReceita, lastSaida)
    const incompleto = lastReceita > lastSaida ? lastReceita : -1

    const gReceita = rReceita.map((v, m) => m <= lastReal ? (v || null) : (oReceita[m] || null))
    const gSaida = saidaR.map((v, m) => m <= lastReal ? (v || null) : (saidaO[m] || null))
    const gRes = resR.map((v, m) => {
      if (m === incompleto) return null
      if (m <= lastReal) return (rReceita[m] || saidaR[m]) ? v : null
      return (oReceita[m] || saidaO[m]) ? resO[m] : null
    })

    const pReceita = soma(rReceita, de, ate), pDeducao = soma(rDeducao, de, ate), pCusto = soma(rCusto, de, ate), pDespesa = soma(rDespesa, de, ate)
    const pSaida = pDeducao + pCusto + pDespesa
    const pReceitaLiq = pReceita - pDeducao, pLucroBruto = pReceitaLiq - pCusto, pResultado = pLucroBruto - pDespesa

    const projT = (rA, oA) => { let s = 0; for (let m = 0; m < 12; m++) s += rA[m] || oA[m] || 0; return s }
    const aReceita = projT(rReceita, oReceita), aDeducao = projT(rDeducao, oDeducao), aCusto = projT(rCusto, oCusto), aDespesa = projT(rDespesa, oDespesa)
    const aReceitaLiq = aReceita - aDeducao, aLucroBruto = aReceitaLiq - aCusto, aResultado = aLucroBruto - aDespesa

    const sit = { Faturado: 0, 'A faturar': 0, 'Sem nota': 0 }
    d.realizado.forEach(r => {
      const dt = new Date(r.competencia + 'T00:00:00'); if (dt.getFullYear() !== ano) return
      const m = dt.getMonth(); if (m < de || m > ate) return
      if (catTipo[r.categoria_id] !== 'receita') return
      const s = sit[r.situacao] !== undefined ? r.situacao : 'Sem nota'; sit[s] += Number(r.valor)
    })

    const cats = d.catsAtivas.map(c => {
      const rArr = (d.realPorCat[c.id] && d.realPorCat[c.id][ano]) || []
      const oArr = (porCat[c.id] && porCat[c.id].valores) || []
      return { id: c.id, nome: c.nome, tipo: c.tipo, real: soma(rArr, de, ate), orc: soma(oArr, de, ate), orcAno: soma(oArr, 0, 11), realYtd: soma(rArr, 0, 11), rArr, oArr }
    })
    const saidasCats = cats.filter(c => c.tipo !== 'receita')
    const topRub = saidasCats.filter(c => c.real > 0).sort((a, b) => b.real - a.real).slice(0, 6)
    const maior = topRub[0]
    const mesesSaida = lastSaida + 1
    const consumoCats = saidasCats.filter(c => c.orcAno > 0).sort((a, b) => b.orcAno - a.orcAno)
    const semOrcCats = saidasCats.filter(c => c.orcAno === 0 && c.realYtd > 0).sort((a, b) => b.realYtd - a.realYtd)
    const totOrcAno = saidasCats.reduce((sx, c) => sx + c.orcAno, 0)
    const totRealYtd = saidasCats.reduce((sx, c) => sx + c.realYtd, 0)
    const recCats = cats.filter(c => c.tipo === 'receita')
    const receitaOrcAno = recCats.reduce((sx, c) => sx + c.orcAno, 0)
    const receitaRealYtd = recCats.reduce((sx, c) => sx + soma(c.rArr, 0, lastSaida), 0)

    return {
      cats, saidasCats, topRub, maior, sit, lastReal, incompleto,
      consumoCats, semOrcCats, totOrcAno, totRealYtd, mesesSaida, receitaOrcAno, receitaRealYtd,
      gReceita, gSaida, gRes,
      mSaiReal: saidaR, mSaiOrc: saidaO, mRecReal: rReceita, mRecOrc: oReceita,
      pReceita, pDeducao, pCusto, pDespesa, pSaida, pReceitaLiq, pLucroBruto, pResultado,
      aReceita, aDeducao, aCusto, aDespesa, aReceitaLiq, aLucroBruto, aResultado,
      nMes: ate - de + 1, baseAV: pReceitaLiq > 0 ? pReceitaLiq : pSaida,
    }
  }, [d.catsAtivas, d.categorias, d.realPorCat, d.realizado, porCat, ano, de, ate])

  const projSig = useMemo(() => {
    const sai = W.mSaiReal || [], rec = W.mRecReal || []
    return ano + ':' + Math.round(sai.reduce((a, b) => a + (b || 0), 0)) + ':' + Math.round(rec.reduce((a, b) => a + (b || 0), 0))
  }, [W.mSaiReal, W.mRecReal, ano])

  useEffect(() => {
    const rs = W.mSaiReal || [], rr = W.mRecReal || []
    const sai = rs.map(v => v || 0)
    const rec = rr.map((v, i) => (rs[i] > 0) ? (v || 0) : 0)
    if (!sai.some(v => v > 0)) { setProj(null); return }
    const key = 'orc_proj_v2_' + projeto.id + '_' + projSig
    try { const c = localStorage.getItem(key); if (c) { setProj(JSON.parse(c)); return } } catch (e) { /* segue */ }
    let cancel = false
    setProjLoad(true)
    iaProjecao(sai, rec).then(r => {
      if (cancel) return
      const val = { saidas: r.saidas, receita: r.receita, comentario: r.comentario }
      setProj(val); try { localStorage.setItem(key, JSON.stringify(val)) } catch (e) { /* segue */ }
    }).catch(() => {
      if (cancel) return
      const mm = (arr) => { const dd = arr.filter(v => v > 0).slice(-3); const md = dd.length ? dd.reduce((a, b) => a + b, 0) / dd.length : 0; return arr.map(v => v > 0 ? v : Math.round(md)) }
      setProj({ saidas: mm(sai), receita: mm(rec), comentario: 'Projeção por média móvel (IA indisponível no momento).' })
    }).finally(() => { if (!cancel) setProjLoad(false) })
    return () => { cancel = true }
  }, [projeto?.id, projSig])

  const MARGEM_ALVO = 0.15
  const idealSai = proj ? proj.receita.map((v) => Math.round((v || 0) * (1 - MARGEM_ALVO))) : null
  const idealRec = proj ? proj.saidas.map((v) => Math.round((v || 0) / (1 - MARGEM_ALVO))) : null
  const analiseMargem = proj ? (() => {
    const idxFut = (W.mSaiReal || []).map((_, i) => i).filter(i => !((W.mSaiReal[i]) > 0))
    const fut = idxFut.length
    if (!fut) return null
    const avg = (arr) => Math.round(idxFut.reduce((sx, i) => sx + (arr[i] || 0), 0) / fut)
    const projSaiM = avg(proj.saidas), idealSaiM = avg(idealSai)
    const projRecM = avg(proj.receita), idealRecM = avg(idealRec)
    return { fut, projSaiM, idealSaiM, gapSai: projSaiM - idealSaiM, projRecM, idealRecM, gapRec: idealRecM - projRecM }
  })() : null

  const A2 = useMemo(() => {
    const n = W.mesesSaida || 0
    if (!n || !temOrcado) return null
    const saiCats = (W.cats || []).filter(c => c.tipo !== 'receita')
    const recorrentes = [], pontuais = []
    saiCats.forEach(c => {
      const desv = [], reals = [], orcs = []
      for (let m = 0; m < n; m++) { const r = (c.rArr && c.rArr[m]) || 0, oo = (c.oArr && c.oArr[m]) || 0; reals.push(r); orcs.push(oo); desv.push(r - oo) }
      const tot = desv.reduce((a, b) => a + b, 0)
      const orcTot = orcs.reduce((a, b) => a + b, 0), realTot = reals.reduce((a, b) => a + b, 0)
      const dom = Math.max(desv.filter(d => d > 0).length, desv.filter(d => d < 0).length)
      const semOrc = orcTot === 0 && realTot > 0
      const material = Math.abs(tot) >= 20000 && (semOrc ? realTot >= 20000 : Math.abs(tot) / Math.max(orcTot, realTot, 1) >= 0.08)
      if (dom >= Math.ceil(n * 0.6) && material) {
        recorrentes.push({ nome: c.nome, tipo: c.tipo, semOrc, direcao: tot > 0 ? 'acima' : 'abaixo', mesesDom: dom, n, total: Math.round(tot), media: Math.round(tot / n), orcTot: Math.round(orcTot), realTot: Math.round(realTot) })
      }
      const absd = desv.map(Math.abs), mx = Math.max(...absd)
      if (mx >= 10000) {
        const outros = absd.filter(x => x !== mx)
        const med = outros.length ? outros.reduce((a, b) => a + b, 0) / outros.length : 0
        if (mx >= 2.5 * Math.max(med, 1)) { const mi = absd.indexOf(mx); pontuais.push({ nome: c.nome, tipo: c.tipo, mes: mi, valor: Math.round(desv[mi]) }) }
      }
    })
    recorrentes.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    pontuais.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    const recRealYtd = W.receitaRealYtd || 0, recMeta = W.receitaOrcAno || 0
    const pctMeta = recMeta ? recRealYtd / recMeta * 100 : 0
    const projRec = n ? recRealYtd / n * 12 : 0
    const projPctMeta = recMeta ? projRec / recMeta * 100 : 0
    const recCats = (W.cats || []).filter(c => c.tipo === 'receita' && c.realYtd > 0).sort((a, b) => b.realYtd - a.realYtd)
    const recTot = recCats.reduce((sx, c) => sx + c.realYtd, 0)
    const concPct = recTot ? Math.round((recCats[0] ? recCats[0].realYtd : 0) / recTot * 100) : 0
    const sitTot = (W.sit.Faturado || 0) + (W.sit['A faturar'] || 0) + (W.sit['Sem nota'] || 0)
    const fatPct = sitTot ? Math.round((W.sit.Faturado || 0) / sitTot * 100) : 0
    return { n, recorrentes, pontuais, recRealYtd, recMeta, pctMeta, projRec, projPctMeta, concPct, topRecNome: recCats[0] ? recCats[0].nome : '', fatPct }
  }, [W, temOrcado])

  const anoSelecionado = de === 0 && ate === 11
  useEffect(() => {
    if (!A2 || !anoSelecionado) return
    const sigRec = A2.recorrentes.reduce((sx, r) => sx + Math.round(r.total) + (r.semOrc ? 1 : 0), 0)
    const key = 'orc_ano_v2_' + projeto.id + '_' + ano + '_' + Math.round(A2.recRealYtd) + '_' + Math.round(W.totOrcAno || 0) + '_' + sigRec + '_' + A2.recorrentes.length + '_' + A2.pontuais.length
    try { const c = localStorage.getItem(key); if (c) { setAnoIA(JSON.parse(c)); return } } catch (e) { /* segue */ }
    let cancel = false
    setAnoIALoad(true)
    const payload = {
      periodo_meses: A2.n,
      recorrentes: A2.recorrentes,
      pontuais: A2.pontuais.map(p => ({ nome: p.nome, mes: MESES_ABREV[p.mes], valor: p.valor })),
      receita: { pct_meta: Math.round(A2.pctMeta), projecao_pct_meta: Math.round(A2.projPctMeta), meta: A2.recMeta, realizado: Math.round(A2.recRealYtd), concentracao_top_pct: A2.concPct, concentracao_top: A2.topRecNome, faturado_pct: A2.fatPct },
    }
    iaAnaliseAno(payload).then(r => { if (!cancel) { setAnoIA(r); try { localStorage.setItem(key, JSON.stringify(r)) } catch (e) { /* segue */ } } })
      .catch(() => { if (!cancel) setAnoIA(null) })
      .finally(() => { if (!cancel) setAnoIALoad(false) })
    return () => { cancel = true }
  }, [A2, anoSelecionado, projeto?.id, ano])

  function appOk(dep) { if (dep === 'receita') return W.pReceita > 0; if (dep === 'orcado') return temOrcado; return true }

  async function drill(c) {
    const compIni = `${ano}-${String(de + 1).padStart(2, '0')}-01`
    const compFim = `${ano}-${String(ate + 1).padStart(2, '0')}-01`
    const max = Math.max(1, ...c.rArr.slice(de, ate + 1).map(v => v || 0))
    const barras = []
    for (let j = de; j <= ate; j++) {
      const v = c.rArr[j] || 0
      barras.push(
        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '5px 0' }}>
          <span style={{ width: 30, fontSize: 12, color: 'var(--lt-text3)' }}>{MESES_ABREV[j]}</span>
          <span style={{ flex: 1, height: 10, background: 'var(--lt-bg2, #eee)', borderRadius: 5, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (v / max * 100) + '%', background: 'var(--prod-orcamento, #22B98A)' }} /></span>
          <span style={{ width: 100, textAlign: 'right', fontSize: 12 }}>{fmtBRL(v)}</span>
        </div>)
    }
    setModal({ titulo: c.nome + ' · composição', corpo: <div style={{ fontSize: 13, color: 'var(--lt-text3)' }}>Carregando…</div> })
    let lancs = []
    try {
      const { data } = await supabase.from('orc_realizado').select('competencia, valor, conta_erp, detalhe, parceiro, documento, situacao')
        .eq('projeto_id', projeto.id).eq('categoria_id', c.id).eq('em_quarentena', false).gte('competencia', compIni).lte('competencia', compFim).order('competencia')
      lancs = data || []
    } catch (e) { /* segue */ }
    setModal({ titulo: c.nome + ' · composição', corpo: (<>
      {barras}
      <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--lt-text)' }}>Lançamentos no período ({lancs.length})</div>
      <div style={{ maxHeight: '46vh', overflowY: 'auto', marginTop: 6 }}>
        {lancs.length === 0 && <div style={{ fontSize: 12, color: 'var(--lt-text3)' }}>Sem lançamentos detalhados.</div>}
        {lancs.map((l, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, padding: '4px 0', borderBottom: '1px solid var(--lt-brd)' }}>
            <span style={{ color: 'var(--lt-text3)', whiteSpace: 'nowrap' }}>{(l.competencia || '').slice(0, 7)}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.parceiro || l.detalhe || l.conta_erp || '—'}{l.documento ? ' · ' + l.documento : ''}{l.situacao ? ' · ' + l.situacao : ''}</span>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtBRL(Number(l.valor))}</span>
          </div>))}
      </div>
    </>) })
  }

  function linhasTabela() {
    return W.cats.filter(c => c.real !== 0 || c.orc !== 0).sort((a, b) => b.real - a.real).map(c => {
      const varp = c.orc ? Math.round((c.real - c.orc) / c.orc * 100) : null
      const av = W.baseAV ? +(c.real / W.baseAV * 100).toFixed(1) : null
      const ah = (ate > de && c.rArr[ate - 1]) ? Math.round((c.rArr[ate] - c.rArr[ate - 1]) / c.rArr[ate - 1] * 100) : null
      return { ...c, varp, av, ah }
    })
  }

  async function exportar() {
    setMsg('')
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Dashboard')
      const comp = modo === 'comparativo'
      const hr = ws.addRow(['Categoria', ...(comp ? ['Orçado'] : []), 'Realizado', ...(comp ? ['Variação %'] : []), 'AV %', 'AH %'])
      hr.eachCell(c => { c.font = { name: 'Montserrat', bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00203E' } } })
      linhasTabela().forEach(r => { ws.addRow([r.nome, ...(comp ? [r.orc] : []), r.real, ...(comp ? [r.varp] : []), r.av, r.ah]).eachCell(c => { c.font = { name: 'Montserrat' } }) })
      ws.columns.forEach((c, i) => { c.width = i === 0 ? 36 : 14 })
      const buf = await wb.xlsx.writeBuffer()
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const a = document.createElement('a'); a.href = url; a.download = `Dashboard_${projeto.nome}_${MESES_ABREV[de]}-${MESES_ABREV[ate]}_${ano}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (e) { setMsg('Erro ao exportar: ' + e.message) }
  }

  const lastClosedSai = (W.mSaiReal || []).reduce((mx, v, i) => (v && v > 0) ? i : mx, -1)
  const curMonth = (ano === ANO_ATUAL && lastClosedSai < 11) ? lastClosedSai + 1 : -1
  const comp = modo === 'comparativo'
  const linhas = linhasTabela()
  const dreCol = temOrcado
  const sitTot = (W.sit.Faturado || 0) + (W.sit['A faturar'] || 0) + (W.sit['Sem nota'] || 0)
  const baseDRE = Math.max(1, dreCol ? W.aReceita : W.pReceita)

  return (
    <div style={{ padding: '20px 28px 40px' }}>
      <PageHeader projeto={projeto} titulo="Visão Geral do Orçamento" subtitulo={`${projeto?.nome || ''} · ${MESES_ABREV[de]}–${MESES_ABREV[ate]}/${ano} · regime de competência`}>
        <BotaoSec onClick={exportar}>↓ Exportar</BotaoSec>
      </PageHeader>
      <ErroBox erro={d.erro || msg} onClose={() => { d.setErro(''); setMsg('') }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: 12.5 }}>
        <span style={{ color: 'var(--lt-text3)' }}>Exercício</span>
        <select className="input-light" style={{ width: 'auto' }} value={ano} onChange={e => setAno(parseInt(e.target.value))}>
          {[ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={{ color: 'var(--lt-text3)', marginLeft: 6 }}>Período: <strong style={{ color: 'var(--lt-text)' }}>{de === ate ? MESES_ABREV[de] : MESES_ABREV[de] + '–' + MESES_ABREV[ate]}</strong></span>
        <span style={{ flex: 1 }} />
        {[['analise', 'Análise'], ['comparativo', 'Orçado × Realizado']].map(([id, lbl]) => (
          <button key={id} onClick={() => (id === 'comparativo' && !temOrcado) ? null : setModo(id)} disabled={id === 'comparativo' && !temOrcado}
            style={{ fontSize: 12, borderRadius: 999, padding: '5px 13px', cursor: (id === 'comparativo' && !temOrcado) ? 'not-allowed' : 'pointer', border: '1px solid var(--lt-brd)', background: modo === id ? 'rgba(204,145,94,0.12)' : 'transparent', color: modo === id ? 'var(--copper, #A6512F)' : 'var(--lt-text3)', opacity: (id === 'comparativo' && !temOrcado) ? 0.5 : 1 }}
            title={(id === 'comparativo' && !temOrcado) ? 'Disponível quando houver orçado cadastrado' : ''}>{lbl}</button>
        ))}
      </div>

      <MonthRail recReal={W.mRecReal} saiReal={W.mSaiReal} recOrc={W.mRecOrc} saiOrc={W.mSaiOrc} selMonth={de === ate ? de : -1} anoSel={de === 0 && ate === 11} ano={ano} onMonth={(i) => { setDe(i); setAte(i) }} onAno={() => { setDe(0); setAte(11) }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 10 }}>
        <BarrasMes titulo="Saídas por mês" real={W.mSaiReal} orc={W.mSaiOrc} selMonth={de === ate ? de : -1} base={COBRE} light={COBRE_L} dark="#A6512F" proj={proj ? proj.saidas : null} ideal={idealSai} curMonth={curMonth} />
        <BarrasMes titulo="Receita por mês" real={W.mRecReal} orc={W.mRecOrc} selMonth={de === ate ? de : -1} base={VERDE} light={VERDE_L} dark="#0F6E56" proj={proj ? proj.receita : null} ideal={idealRec} curMonth={curMonth} />
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--lt-text3)', margin: '0 2px 14px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'var(--lt-text)', fontWeight: 600 }}>Legenda</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#CBD5E1', marginRight: 3 }} />orçado (barras)</span>
        <span><span style={{ display: 'inline-block', width: 16, height: 0, borderTop: '2.5px solid #6B7280', marginRight: 3, verticalAlign: 'middle' }} />realizado</span>
        <span><span style={{ display: 'inline-block', width: 16, height: 0, borderTop: '2px dotted #6B7280', marginRight: 3, verticalAlign: 'middle' }} />projeção do realizado (IA)</span>
        <span><span style={{ display: 'inline-block', width: 16, height: 0, borderTop: '2px dashed #2a78d6', marginRight: 3, verticalAlign: 'middle' }} />projeção do ideal 15% (IA)</span>
        <span style={{ color: '#9a917f' }}>· cobre = saídas · verde = receita · mês corrente = colunas sobrepostas</span>
      </div>
      {proj && proj.comentario && <div style={{ fontSize: 11.5, color: 'var(--lt-text)', background: 'rgba(42,120,214,0.06)', border: '1px solid rgba(42,120,214,0.25)', borderRadius: 8, padding: '8px 12px', margin: '0 2px 16px', lineHeight: 1.5 }}>✨ <strong>Projeção IA:</strong> {proj.comentario}{projLoad ? ' · atualizando…' : ''}</div>}

      {analiseMargem && (
        <Card titulo="Análise de tendência da margem" extra={<span style={{ fontSize: 11, color: 'var(--lt-text3)' }}>meta: margem líquida de 15% · próximos {analiseMargem.fut} meses (projeção IA)</span>}>
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--lt-text3)', lineHeight: 1.55 }}>A linha tracejada azul nos gráficos é o <strong style={{ color: 'var(--lt-text)' }}>nível ideal para 15% de margem</strong>. Enquanto a projeção estiver do lado saudável dela, a meta se sustenta; onde cruza, é hora de agir.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div style={{ borderLeft: '3px solid ' + (analiseMargem.gapSai > 0 ? RED : VERDE), borderRadius: 0, padding: '2px 0 2px 12px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--lt-text)', marginBottom: 4 }}>Saídas — teto saudável</div>
              <div style={{ fontSize: 12.5, color: 'var(--lt-text3)', lineHeight: 1.55 }}>
                Projeção <strong style={{ color: 'var(--lt-text)' }}>{fmtBRL(analiseMargem.projSaiM)}/mês</strong> · teto p/ 15%: <strong style={{ color: 'var(--lt-text)' }}>{fmtBRL(analiseMargem.idealSaiM)}/mês</strong>.
                {analiseMargem.gapSai > 0
                  ? <> Está <strong style={{ color: RED }}>{fmtBRL(analiseMargem.gapSai)}/mês acima</strong> do teto — cortar custos recorrentes ou reduzir o ritmo protege a margem.</>
                  : <> Dentro do teto — manter o controle preserva a margem.</>}
              </div>
            </div>
            <div style={{ borderLeft: '3px solid ' + (analiseMargem.gapRec > 0 ? RED : VERDE), borderRadius: 0, padding: '2px 0 2px 12px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--lt-text)', marginBottom: 4 }}>Receita — piso necessário</div>
              <div style={{ fontSize: 12.5, color: 'var(--lt-text3)', lineHeight: 1.55 }}>
                Projeção <strong style={{ color: 'var(--lt-text)' }}>{fmtBRL(analiseMargem.projRecM)}/mês</strong> · piso p/ 15%: <strong style={{ color: 'var(--lt-text)' }}>{fmtBRL(analiseMargem.idealRecM)}/mês</strong>.
                {analiseMargem.gapRec > 0
                  ? <> Falta <strong style={{ color: RED }}>{fmtBRL(analiseMargem.gapRec)}/mês</strong> de faturamento — acelerar vendas/entregas sustenta a margem.</>
                  : <> Acima do piso — faturamento sustenta a margem.</>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {(d.importacoes && d.importacoes[0]) || W.incompleto >= 0 ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, fontSize: 11, color: 'var(--lt-text3)' }}>
          {d.importacoes && d.importacoes[0] && <span><i>Última importação:</i> {d.importacoes[0].arquivo_nome || '—'}{d.importacoes[0].criado_em ? ' · ' + new Date(d.importacoes[0].criado_em).toLocaleDateString('pt-BR') : ''}</span>}
          {W.incompleto >= 0 && <span style={{ background: 'rgba(204,145,94,0.15)', color: '#A6512F', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{MESES_ABREV[W.incompleto]} parcial</span>}
        </div>
      ) : null}



      {anoSelecionado && A2 && (() => {
        const TIPO_LAB = { custo: 'Custo (CPV)', despesa: 'Despesa', deducao: 'Dedução' }
        const fbTexto = (r) => r.semOrc
          ? `Dispêndio recorrente sem previsão orçamentária (${r.mesesDom} de ${r.n} meses), da ordem de ${fmtBRL(r.media)} por mês. Recomenda-se criar rubrica e incorporá-la ao orçamento.`
          : (r.direcao === 'acima'
            ? `Realizado sistematicamente acima do orçado (${r.mesesDom} de ${r.n} meses), desvio médio de ${fmtBRL(r.media)} por mês. Orçamento subdimensionado — recomenda-se recalibrar o teto.`
            : `Realizado consistentemente abaixo do previsto (${r.mesesDom} de ${r.n} meses). Provisão possivelmente superdimensionada — recomenda-se revisar o orçamento.`)
        const itemTexto = (r) => { const it = ((anoIA && anoIA.itens) || []).find(x => x.nome === r.nome); return (it && it.texto) || fbTexto(r) }
        const grupos = {}; A2.recorrentes.forEach(r => { (grupos[r.tipo] = grupos[r.tipo] || []).push(r) })
        const acoes = (anoIA && anoIA.acoes && anoIA.acoes.length) ? anoIA.acoes : A2.recorrentes.slice(0, 4).map(r => ({ titulo: r.semOrc ? 'Orçar ' + r.nome : (r.direcao === 'acima' ? 'Recalibrar ' + r.nome : 'Revisar ' + r.nome), detalhe: fbTexto(r), prioridade: Math.abs(r.total) > 100000 ? 'alta' : Math.abs(r.total) > 40000 ? 'média' : 'baixa' }))
        const corR = (r) => (r.semOrc || r.direcao === 'acima') ? RED : VERDE
        const prCor = (p) => p === 'alta' ? RED : p === 'média' ? '#B45309' : 'var(--lt-text3)'
        return (
          <Card titulo="Análise do Ano" extra={<span style={{ fontSize: 11, color: 'var(--lt-text3)' }}>✨ IA · {A2.n} meses fechados{anoIALoad ? ' · analisando…' : ''}</span>}>
            <div style={{ background: 'rgba(204,145,94,0.07)', border: '1px solid rgba(204,145,94,0.3)', borderRadius: 8, padding: '11px 14px', fontSize: 12.5, lineHeight: 1.6, marginBottom: 16 }}><strong>✨ Saídas.</strong> {(anoIA && anoIA.narrativaSaidas) || ('Foram identificados ' + A2.recorrentes.length + ' desvio(s) estrutural(is) recorrente(s) e ' + A2.pontuais.length + ' evento(s) pontual(is) nos meses fechados.')}</div>
            <div style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 8px' }}>Descolamentos recorrentes <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--lt-text3)' }}>· clique no grupo para abrir</span></div>
            {Object.keys(grupos).map(tp => {
              const catn = grupos[tp], net = catn.reduce((sx, r) => sx + r.total, 0), open = grpOpen[tp]
              return (
                <div key={tp} style={{ border: '1px solid var(--lt-brd)', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
                  <div onClick={() => setGrpOpen(g => ({ ...g, [tp]: !g[tp] }))} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}><span style={{ color: COBRE, marginRight: 6 }}>{open ? '▾' : '▸'}</span>{TIPO_LAB[tp] || tp} <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--lt-text3)' }}>· {catn.length} rubrica(s)</span></span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: net > 0 ? RED : VERDE }}>{net > 0 ? '+' : ''}{fmtBRL(net)}</span>
                  </div>
                  {open && catn.map(r => (
                    <div key={r.nome} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 14px 9px 16px', borderTop: '1px solid var(--lt-brd)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: corR(r), marginTop: 6, flex: 'none' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.nome}{r.semOrc && <span style={{ fontSize: 9.5, background: 'rgba(204,145,94,0.18)', color: '#A6512F', padding: '1px 6px', borderRadius: 8, marginLeft: 6, fontWeight: 600 }}>sem orçado</span>} <span style={{ fontWeight: 400, color: 'var(--lt-text3)', fontSize: 11 }}>· {r.direcao} em {r.mesesDom}/{r.n} meses</span></div>
                        <div style={{ fontSize: 11.5, color: 'var(--lt-text3)', lineHeight: 1.5, marginTop: 2 }}>{itemTexto(r)}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: corR(r), whiteSpace: 'nowrap' }}>{r.total > 0 ? '+' : ''}{fmtBRL(r.total)}</div>
                    </div>
                  ))}
                </div>
              )
            })}
            {A2.recorrentes.length === 0 && <p style={{ fontSize: 12, color: 'var(--lt-text3)', margin: 0 }}>Sem desvios estruturais recorrentes materiais no período.</p>}
            {A2.pontuais.length > 0 && (<>
              <div style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 8px' }}>Eventos pontuais <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--lt-text3)' }}>· não recorrentes</span></div>
              {A2.pontuais.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid var(--lt-brd)', fontSize: 12.5 }}>
                  <span style={{ color: '#B45309' }}>◆</span><div style={{ flex: 1 }}><strong>{p.nome} · {MESES_ABREV[p.mes]}</strong></div>
                  <div style={{ fontWeight: 700, color: '#B45309', whiteSpace: 'nowrap' }}>{p.valor > 0 ? '+' : ''}{fmtBRL(p.valor)}</div>
                </div>
              ))}
            </>)}
            <div style={{ fontSize: 13, fontWeight: 600, margin: '18px 0 8px' }}>Onde atuar <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--lt-text3)' }}>· prioridade por impacto</span></div>
            {acoes.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--lt-brd)', fontSize: 12.5 }}>
                <span style={{ width: 20, height: 20, borderRadius: 10, background: NAVY, color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontWeight: 600 }}>{i + 1}</span>
                <div style={{ flex: 1 }}><strong>{a.titulo}</strong> <span style={{ color: 'var(--lt-text3)' }}>— {a.detalhe}</span></div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: prCor(a.prioridade), textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{a.prioridade}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--lt-brd)', margin: '20px 0 14px' }} />
            <div style={{ background: 'rgba(34,185,138,0.06)', border: '1px solid rgba(34,185,138,0.3)', borderRadius: 8, padding: '11px 14px', fontSize: 12.5, lineHeight: 1.6, marginBottom: 14 }}><strong>✨ Receita.</strong> {(anoIA && anoIA.narrativaReceita) || ('Receita em ' + Math.round(A2.pctMeta) + '% da meta, projeção de fechamento em ' + Math.round(A2.projPctMeta) + '%. Concentração de ' + A2.concPct + '% em ' + A2.topRecNome + '; ' + A2.fatPct + '% faturado.')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {[['Aderência à meta', Math.round(A2.pctMeta) + '%', 'proj. ' + Math.round(A2.projPctMeta) + '% da meta', A2.projPctMeta < 90 ? RED : VERDE], ['Concentração', A2.concPct + '%', A2.topRecNome, '#B45309'], ['Qualidade fiscal', A2.fatPct + '%', 'faturado', VERDE]].map((k, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid var(--lt-brd)', borderRadius: 10, padding: '11px 13px' }}>
                  <div style={{ fontSize: 10.5, color: 'var(--lt-text3)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{k[0]}</div>
                  <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 20, fontWeight: 600, color: k[3], margin: '2px 0' }}>{k[1]}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--lt-text3)' }}>{k[2]}</div>
                </div>
              ))}
            </div>
          </Card>
        )
      })()}

      {de === ate && !anoSelecionado && (() => {
        const m = de, sc = (W.cats || []).filter(c => c.tipo !== 'receita')
        const movers = sc.map(c => { const r = (c.rArr && c.rArr[m]) || 0, oo = (c.oArr && c.oArr[m]) || 0; return { nome: c.nome, real: r, orc: oo, desv: r - oo } }).filter(x => x.orc > 0)
        const top = movers.sort((a, b) => Math.abs(b.desv) - Math.abs(a.desv)).slice(0, 3)
        const saiM = sc.reduce((sx, c) => sx + ((c.rArr && c.rArr[m]) || 0), 0), orcM = sc.reduce((sx, c) => sx + ((c.oArr && c.oArr[m]) || 0), 0)
        const recM = (W.cats || []).filter(c => c.tipo === 'receita').reduce((sx, c) => sx + ((c.rArr && c.rArr[m]) || 0), 0)
        return (
          <Card titulo={'Resumo de ' + MESES_ABREV[m]} extra={<a href="/orcamento/analise" style={{ fontSize: 11.5, color: 'var(--copper, #A6512F)', textDecoration: 'none', fontWeight: 600 }}>ver análise completa →</a>}>
            <div style={{ fontSize: 12.5, color: 'var(--lt-text3)', marginBottom: 10 }}>Saídas <strong style={{ color: 'var(--lt-text)' }}>{fmtBRL(saiM)}</strong> vs orçado {fmtBRL(orcM)}{orcM ? ' (' + (saiM > orcM ? '+' : '') + Math.round((saiM - orcM) / orcM * 100) + '%)' : ''} · Receita <strong style={{ color: 'var(--lt-text)' }}>{fmtBRL(recM)}</strong></div>
            {top.length > 0 && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Rubricas que mais mexeram</div>}
            {top.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderBottom: '1px solid var(--lt-brd)' }}>
                <span>{t.nome}</span><span style={{ fontWeight: 600, color: t.desv > 0 ? RED : VERDE }}>{t.desv > 0 ? '+' : ''}{fmtBRL(t.desv)} vs orçado</span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: 'var(--lt-text3)', margin: '10px 0 0' }}>Análise detalhada do mês na aba Análise Mensal.</p>
          </Card>
        )
      })()}

      <Card titulo={dreCol ? 'DRE gerencial — realizado e projeção do ano' : 'DRE gerencial do período'} extra={<span style={{ fontSize: 11, color: 'var(--lt-text3)' }}>barra = % da receita · explosível nas rubricas abaixo</span>}>
        {[
          ['Receita bruta', dreCol ? W.aReceita : W.pReceita, VERDE, true],
          ['(−) Deduções', dreCol ? W.aDeducao : W.pDeducao, COBRE, false],
          ['= Receita líquida', dreCol ? W.aReceitaLiq : W.pReceitaLiq, NAVY, true],
          ['(−) Custos (CPV)', dreCol ? W.aCusto : W.pCusto, COBRE, false],
          ['= Lucro bruto', dreCol ? W.aLucroBruto : W.pLucroBruto, NAVY, true],
          ['(−) Despesas', dreCol ? W.aDespesa : W.pDespesa, COBRE, false],
          ['= Resultado', dreCol ? W.aResultado : W.pResultado, (dreCol ? W.aResultado : W.pResultado) < 0 ? RED : VERDE, true],
        ].map((r, i) => <Linha key={i} label={r[0]} valor={r[1]} w={Math.abs(r[1]) / baseDRE * 100} cor={r[2]} forte={r[3]} sufixo={baseDRE ? '  ·  ' + pct(r[1] / baseDRE * 100) : ''} />)}
        {dreCol && <p style={{ fontSize: 11, color: 'var(--lt-text3)', margin: '8px 2px 0' }}>Projeção = realizado dos meses fechados + orçado dos meses futuros.</p>}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
        {appOk('receita') && (
          <Card titulo="Receita por situação fiscal" extra={<span style={{ fontSize: 11, color: 'var(--lt-text3)' }}>tudo conta como receita</span>}>
            {[['Faturado (com NF)', W.sit.Faturado || 0, VERDE], ['A faturar (sem NF ainda)', W.sit['A faturar'] || 0, COBRE], ['Sem nota', W.sit['Sem nota'] || 0, '#A6512F']].map((r, i) => (
              <Linha key={i} label={r[0]} valor={r[1]} w={sitTot ? r[1] / sitTot * 100 : 0} cor={r[2]} sufixo={sitTot ? '  ·  ' + pct(r[1] / sitTot * 100) : ''} />
            ))}
          </Card>
        )}
        <Card titulo="Para onde vai o dinheiro" extra={<span style={{ fontSize: 11, color: 'var(--lt-text3)' }}>maiores saídas · clique p/ explodir</span>}>
          {W.topRub.map(c => (
            <div key={c.id} onClick={() => drill(c)} style={{ cursor: 'pointer' }}>
              <Linha label={c.nome} valor={c.real} w={W.maior ? c.real / W.maior.real * 100 : 0} cor={NAVY} />
            </div>
          ))}
          {W.topRub.length === 0 && <p style={{ fontSize: 12, color: 'var(--lt-text3)', margin: 0 }}>Sem saídas no período.</p>}
        </Card>
      </div>

      <Card titulo={comp ? 'Orçado × Realizado por categoria' : 'Realizado por categoria'} extra={<span style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, color: 'var(--lt-text3)' }}><span>{W.pReceitaLiq > 0 ? 'AV = % da receita líquida' : 'AV = % das saídas'} · AH = último mês vs anterior</span><button onClick={() => setTabOpen(o => !o)} style={{ fontSize: 11, borderRadius: 999, padding: '4px 12px', cursor: 'pointer', border: '1px solid var(--lt-brd)', background: tabOpen ? 'rgba(204,145,94,0.12)' : 'transparent', color: tabOpen ? 'var(--copper, #A6512F)' : 'var(--lt-text3)' }}>{tabOpen ? 'ocultar' : 'ver tabela (' + linhas.length + ')'}</button></span>} pad={false}>
        {tabOpen && <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr style={{ background: 'var(--lt-bg2, #f3f3f3)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Categoria</th>
            {comp && <th style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 600 }}>Orçado</th>}
            <th style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 600 }}>Realizado</th>
            {comp && <th style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 600 }}>Var.</th>}
            <th style={{ textAlign: 'right', padding: '8px 8px', fontWeight: 600 }}>AV</th>
            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>AH</th>
          </tr></thead>
          <tbody>
            {linhas.map(c => {
              const desfav = c.tipo === 'receita' ? c.real < c.orc : c.real > c.orc
              return (
                <tr key={c.id} onClick={() => drill(c)} style={{ borderTop: '1px solid var(--lt-brd)', cursor: 'pointer' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{comp && c.orc ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: desfav ? RED : VERDE, marginRight: 6 }} /> : null}{c.nome}</td>
                  {comp && <td style={{ textAlign: 'right', padding: '8px 8px', color: 'var(--lt-text3)' }}>{fmtBRL(c.orc)}</td>}
                  <td style={{ textAlign: 'right', padding: '8px 8px' }}>{fmtBRL(c.real)}</td>
                  {comp && <td style={{ textAlign: 'right', padding: '8px 8px', color: c.varp === null ? 'var(--lt-text3)' : (desfav ? RED : VERDE) }}>{c.varp === null ? '—' : (c.varp >= 0 ? '+' : '') + c.varp + '%'}</td>}
                  <td style={{ textAlign: 'right', padding: '8px 8px', color: 'var(--lt-text3)' }}>{c.av === null ? '—' : c.av + '%'}</td>
                  <td style={{ textAlign: 'right', padding: '8px 12px', color: c.ah === null ? 'var(--lt-text3)' : (c.ah > 0 ? RED : VERDE) }}>{c.ah === null ? '—' : (c.ah > 0 ? '+' : '') + c.ah + '%'}</td>
                </tr>)
            })}
            {linhas.length === 0 && <tr><td colSpan={comp ? 6 : 4} style={{ padding: 24, textAlign: 'center', color: 'var(--lt-text3)' }}>Sem dados no período. Importe o realizado ou ajuste o filtro.</td></tr>}
          </tbody>
        </table>}
      </Card>

      {modal && (
        <div onClick={e => { if (e.target === e.currentTarget) setModal(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ width: 'min(860px, 95%)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--lt-card, #fff)', border: '1px solid var(--lt-brd)', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--lt-text)' }}>{modal.titulo}</div>
              <button onClick={() => setModal(null)} aria-label="Fechar" style={{ border: '1px solid var(--lt-brd)', background: 'transparent', borderRadius: 8, cursor: 'pointer', width: 30, height: 28, color: 'var(--lt-text3)' }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--lt-text3)', lineHeight: 1.55 }}>{modal.corpo}</div>
          </div>
        </div>
      )}
    </div>
  )
}
