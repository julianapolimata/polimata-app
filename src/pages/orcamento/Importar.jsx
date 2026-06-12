// Importar Realizado — Excel do ERP → mapeamento conta→categoria (IA) → gravação por competência
import { useState, useRef } from 'react'
import ExcelJS from 'exceljs'
import { supabase } from '../../lib/supabase'
import { useOrcDados, PageHeader, Card, HelpTag, KPICard, KPIGrid, SeletorAno, Badge, BotaoVerde, BotaoSec, ErroBox, fmtBRL, MESES_ABREV, THL, TH, TDL, TD } from './_shared'
import { iaCategorizar } from '../../lib/orcamento/ia'

export default function Importar({ projeto }) {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth())
  const d = useOrcDados(projeto, ano)
  const fileRef = useRef(null)
  const [arquivo, setArquivo] = useState(null)
  const [linhas, setLinhas] = useState(null) // [{conta, descricao, valor, categoria_id, confianca, fonte}]
  const [processando, setProcessando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [msg, setMsg] = useState('')
  const [mostrar, setMostrar] = useState('pendentes')
  // lançamento manual
  const [mCat, setMCat] = useState(''); const [mValor, setMValor] = useState(''); const [mDet, setMDet] = useState('')

  async function processarArquivo(file) {
    setProcessando(true); setMsg(''); d.setErro('')
    try {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      // heurística: acha colunas por cabeçalho (conta/código, descrição/histórico, valor/total)
      let headerRow = null, colConta = null, colDesc = null, colValor = null
      ws.eachRow((row, n) => {
        if (headerRow) return
        const vals = row.values.map(v => String(v ?? '').toLowerCase())
        const iConta = vals.findIndex(v => /conta|c[óo]digo|cod\b/.test(v))
        const iDesc = vals.findIndex(v => /descri|hist[óo]rico|nome/.test(v))
        const iValor = vals.findIndex(v => /valor|total|montante/.test(v))
        if (iValor > 0 && (iConta > 0 || iDesc > 0)) { headerRow = n; colConta = iConta > 0 ? iConta : iDesc; colDesc = iDesc > 0 ? iDesc : iConta; colValor = iValor }
      })
      if (!headerRow) throw new Error('Não achei cabeçalho com colunas de conta/descrição/valor. Confirme o layout do Excel.')
      const porConta = {}
      ws.eachRow((row, n) => {
        if (n <= headerRow) return
        const conta = String(row.getCell(colConta).value ?? '').trim()
        const desc = String(row.getCell(colDesc).value ?? '').trim()
        let v = row.getCell(colValor).value
        if (v && typeof v === 'object' && 'result' in v) v = v.result
        const valor = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.'))
        if (!conta || !isFinite(valor) || valor === 0) return
        porConta[conta] = porConta[conta] || { conta, descricao: desc, valor: 0, qtd: 0 }
        porConta[conta].valor += valor; porConta[conta].qtd++
      })
      const contas = Object.values(porConta)
      if (!contas.length) throw new Error('Nenhum lançamento válido encontrado no arquivo.')
      // mapeamentos já conhecidos
      const { data: mapa } = await supabase.from('orc_contas_mapa').select('*').eq('projeto_id', projeto.id)
      const resultado = contas.map(c => {
        const m = (mapa || []).find(x => x.conta_erp === c.conta)
        return { ...c, categoria_id: m?.categoria_id || null, confianca: m ? 100 : null, fonte: m ? 'mapa' : null, em_escopo: m ? m.em_escopo !== false : true }
      })
      // IA para os não mapeados
      const pendentes = resultado.filter(r => !r.categoria_id && r.em_escopo)
      if (pendentes.length && d.catsAtivas.length) {
        try {
          const sug = await iaCategorizar(
            pendentes.slice(0, 80).map(p => ({ conta_erp: p.conta, descricao_erp: p.descricao, total: p.valor })),
            d.catsAtivas.map(c => ({ id: c.id, nome: c.nome, tipo: c.tipo })))
          sug.forEach(s => {
            const r = resultado.find(x => x.conta === s.conta_erp)
            if (r) { r.categoria_id = s.categoria_id || null; r.confianca = s.confianca ?? null; r.fonte = 'ia'; r.em_escopo = s.em_escopo !== false }
          })
        } catch (e) { setMsg('IA indisponível (' + e.message + ') — categorize manualmente abaixo.') }
      }
      setLinhas(resultado); setArquivo(file.name)
    } catch (e) { d.setErro(e.message) } finally { setProcessando(false) }
  }

  async function confirmar() {
    if (!linhas) return
    setGravando(true)
    try {
      const comp = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
      const validas = linhas.filter(l => l.em_escopo && l.categoria_id)
      if (!validas.length) throw new Error('Nenhuma linha em escopo com categoria definida.')
      const { data: imp, error: e1 } = await supabase.from('orc_importacoes').insert({
        projeto_id: projeto.id, arquivo_nome: arquivo, competencia_ini: comp, competencia_fim: comp, linhas: validas.length, status: 'concluida',
      }).select().single()
      if (e1) throw e1
      // grava/atualiza o mapa de contas
      const mapaRows = linhas.map(l => ({
        projeto_id: projeto.id, conta_erp: l.conta, descricao_erp: l.descricao,
        categoria_id: l.categoria_id, em_escopo: l.em_escopo, confianca_ia: l.fonte === 'ia' ? l.confianca : undefined,
        origem_sugestao: l.fonte === 'ia' ? 'ia' : 'manual',
      }))
      await supabase.from('orc_contas_mapa').upsert(mapaRows, { onConflict: 'projeto_id,conta_erp' })
      // remove realizado import anterior da mesma competência e grava o novo
      await supabase.from('orc_realizado').delete().eq('projeto_id', projeto.id).eq('competencia', comp).eq('origem', 'import')
      const realRows = validas.map(l => ({
        projeto_id: projeto.id, categoria_id: l.categoria_id, competencia: comp,
        valor: Math.round(Math.abs(l.valor) * 100) / 100, origem: 'import', importacao_id: imp.id,
        conta_erp: l.conta, detalhe: l.descricao,
      }))
      const { error: e2 } = await supabase.from('orc_realizado').insert(realRows)
      if (e2) throw e2
      setMsg(`✓ ${realRows.length} contas gravadas em ${MESES_ABREV[mes]}/${ano} (total ${fmtBRL(realRows.reduce((a, r) => a + r.valor, 0))}).`)
      setLinhas(null); setArquivo(null); d.reload()
    } catch (e) { d.setErro(e.message) } finally { setGravando(false) }
  }

  async function lancarManual() {
    if (!mCat || mValor === '') return
    const comp = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    const { error } = await supabase.from('orc_realizado').insert({ projeto_id: projeto.id, categoria_id: mCat, competencia: comp, valor: Number(mValor), origem: 'manual', detalhe: mDet || null })
    if (error) { d.setErro(error.message); return }
    setMValor(''); setMDet(''); setMsg('Lançamento manual gravado.'); d.reload()
  }

  const kpis = linhas ? {
    total: linhas.reduce((a, l) => a + Math.abs(l.valor), 0),
    alta: linhas.filter(l => (l.confianca ?? 0) >= 90).length,
    rev: linhas.filter(l => l.confianca !== null && l.confianca >= 70 && l.confianca < 90).length,
    manual: linhas.filter(l => l.confianca === null || l.confianca < 70).length,
  } : null
  const visiveis = (linhas || []).filter(l =>
    mostrar === 'todos' ? true : mostrar === 'alta' ? (l.confianca ?? 0) >= 90 : !((l.confianca ?? 0) >= 90))

  return (
    <div style={{ padding: '20px 28px 40px', maxWidth: 1180, margin: '0 auto' }}>
      <PageHeader projeto={projeto} titulo="Importar Realizado" subtitulo={arquivo ? `Revisão de mapeamento — Arquivo: ${arquivo}` : 'Excel do ERP → categorização automática → gravação por competência'}>
        <SeletorAno ano={ano} setAno={setAno} />
        <select className="input-light" style={{ width: 110 }} value={mes} onChange={e => setMes(parseInt(e.target.value))}>{MESES_ABREV.map((m, i) => <option key={i} value={i}>{m}/{ano}</option>)}</select>
        {linhas && <BotaoSec onClick={() => { setLinhas(null); setArquivo(null) }}>Cancelar</BotaoSec>}
        {linhas
          ? <BotaoVerde onClick={confirmar} disabled={gravando}>{gravando ? 'Gravando…' : 'Confirmar e Gravar'}</BotaoVerde>
          : <BotaoVerde onClick={() => fileRef.current?.click()} disabled={processando}>{processando ? 'Processando…' : '↑ Escolher Excel do ERP'}</BotaoVerde>}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) processarArquivo(f); e.target.value = '' }} />
      </PageHeader>
      <ErroBox erro={d.erro} onClose={() => d.setErro('')} />
      {msg && <div style={{ background: 'rgba(34,185,138,0.08)', border: '1px solid rgba(34,185,138,0.35)', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, marginBottom: 14 }}>{msg}</div>}

      {!linhas && (
        <>
          <HelpTag><strong>Como funciona:</strong> envie o Excel do ERP (ex.: Relatório DFC e DRE da Terra). O sistema agrega os lançamentos por conta, aplica o mapeamento conta→categoria já conhecido e usa IA para sugerir categoria às contas novas — você só revisa as de confiança média/baixa e confirma. A competência gravada é a selecionada acima.</HelpTag>
          <Card titulo="Lançamento manual (alternativa ao Excel)">
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Categoria</label>
                <select className="input-light" style={{ minWidth: 200 }} value={mCat} onChange={e => setMCat(e.target.value)}>
                  <option value="">Selecione…</option>{d.catsAtivas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select></div>
              <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Valor (R$)</label>
                <input type="number" step="0.01" className="input-light" style={{ width: 130 }} value={mValor} onChange={e => setMValor(e.target.value)} /></div>
              <div style={{ flex: 1, minWidth: 150 }}><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Detalhe</label>
                <input className="input-light" value={mDet} onChange={e => setMDet(e.target.value)} placeholder="opcional" /></div>
              <BotaoVerde onClick={lancarManual} disabled={!mCat || mValor === ''}>Lançar em {MESES_ABREV[mes]}/{ano}</BotaoVerde>
            </div>
          </Card>
        </>
      )}

      {linhas && kpis && (
        <>
          <KPIGrid>
            <KPICard label="Total do arquivo" value={fmtBRL(kpis.total)} tone="success" delta={`${linhas.length} contas agregadas`} />
            <KPICard label="Alta confiança" value={kpis.alta + ' ✓'} tone="success" delta="≥ 90% — auto-aprovadas" />
            <KPICard label="Para revisar" value={kpis.rev + ' ⚠'} tone={kpis.rev ? 'warning' : null} delta="70–89% de confiança" />
            <KPICard label="Manuais" value={kpis.manual + ' ✗'} tone={kpis.manual ? 'danger' : null} delta="sem sugestão segura" />
          </KPIGrid>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, fontSize: 12 }}>
            <label style={{ color: 'var(--lt-text3)' }}>Mostrar:</label>
            <select className="input-light" style={{ width: 220 }} value={mostrar} onChange={e => setMostrar(e.target.value)}>
              <option value="pendentes">Pendentes de revisão</option><option value="todos">Todos</option><option value="alta">Apenas alta confiança</option>
            </select>
          </div>
          <Card titulo="Revisão de Mapeamento" pad={false}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={THL}>Conta do ERP</th><th style={TH}>Total</th><th style={THL}>Categoria Polímata</th><th style={TH}>Confiança IA</th><th style={{ ...TH, textAlign: 'center' }}>Em escopo</th></tr></thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr key={l.conta} style={!l.categoria_id && l.em_escopo ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                    <td style={TDL}><div style={{ fontWeight: 600 }}>{l.descricao || l.conta}</div><div style={{ fontSize: 10.5, color: 'var(--lt-text3)', fontFamily: 'monospace' }}>{l.conta} • {l.qtd} lançamento{l.qtd > 1 ? 's' : ''}</div></td>
                    <td style={{ ...TD, fontWeight: 600 }}>{fmtBRL(Math.abs(l.valor))}</td>
                    <td style={TDL}>
                      <select className="input-light" style={{ width: 230, padding: '4px 8px', fontSize: 12 }} value={l.categoria_id || ''} onChange={e => setLinhas(prev => prev.map(x => x.conta === l.conta ? { ...x, categoria_id: e.target.value || null, fonte: 'manual', confianca: e.target.value ? 100 : null } : x))}>
                        <option value="">— Selecione —</option>
                        {d.catsAtivas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </td>
                    <td style={TD}>
                      {l.confianca !== null
                        ? <div style={{ minWidth: 90 }}>
                            <div style={{ height: 5, background: 'var(--lt-brd)', borderRadius: 3 }}><div style={{ height: 5, borderRadius: 3, width: l.confianca + '%', background: l.confianca >= 90 ? '#15803D' : l.confianca >= 70 ? '#B45309' : '#B91C1C' }} /></div>
                            <div style={{ fontSize: 10, marginTop: 2, color: l.confianca >= 90 ? '#15803D' : l.confianca >= 70 ? '#B45309' : '#B91C1C' }}>{l.confianca}%{l.fonte === 'mapa' ? ' (mapa salvo)' : l.fonte === 'manual' ? ' (manual)' : ''}</div>
                          </div>
                        : <Badge tone="danger">Manual</Badge>}
                    </td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <input type="checkbox" checked={l.em_escopo} onChange={e => setLinhas(prev => prev.map(x => x.conta === l.conta ? { ...x, em_escopo: e.target.checked } : x))} />
                    </td>
                  </tr>
                ))}
                {!visiveis.length && <tr><td colSpan={5} style={{ ...TDL, textAlign: 'center', padding: 24, color: 'var(--lt-text3)' }}>Nada neste filtro.</td></tr>}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
