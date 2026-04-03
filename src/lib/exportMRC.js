import ExcelJS from 'exceljs'

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT MRC PARA EXCEL (.xlsx) — Polímata brand
// ══════════════════════════════════════════════════════════════════════════════

const NAVY = '00203E'
const GOLD = 'CC915E'
const CREME = 'F3EEE4'
const NAVY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
const COL_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '001A3A' } }
const COL_HEADER_FONT = { name: 'Montserrat', bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
const BODY_FONT = { name: 'Montserrat', size: 9, color: { argb: 'FF333333' } }
const GOLD_FONT = { name: 'Montserrat', size: 9, bold: true, color: { argb: GOLD } }
const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
  bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
  left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
  right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
}

const MRC_COLUMNS = [
  { key: 'dt_ult', header: 'Data Última Atualização', width: 18 },
  { key: 'ger', header: 'Gerência', width: 18 },
  { key: 'resp_sub', header: 'Responsável Subprocesso', width: 20 },
  { key: 'area', header: 'Processo', width: 22 },
  { key: 'sub', header: 'Subprocesso', width: 20 },
  { key: 'rr', header: 'Ref. Risco', width: 12 },
  { key: 'dr', header: 'Descrição do Risco', width: 40 },
  { key: 'rc', header: 'Ref. Controle', width: 14 },
  { key: 'dc', header: 'Descrição do Controle', width: 40 },
  { key: 'cat', header: 'Categoria de Controle', width: 18 },
  { key: 'freq', header: 'Frequência', width: 14 },
  { key: 'nat', header: 'Natureza', width: 12 },
  { key: 'car', header: 'Característica', width: 14 },
  { key: 'sis', header: 'Sistema', width: 14 },
  { key: 'chave', header: 'Controle Chave?', width: 14 },
  { key: 'passos_f1', header: 'Passos de Teste', width: 40 },
  { key: 'r1', header: 'Resultado', width: 14 },
  { key: 'incons', header: 'Descrição da Inconsistência', width: 40 },
  { key: 'rec', header: 'Recomendação / Melhoria', width: 40 },
  { key: 'imp', header: 'Impacto', width: 12 },
  { key: 'prob', header: 'Probabilidade', width: 14 },
  { key: 'crit_label', header: 'Criticidade', width: 16 },
  { key: 'fase', header: 'Fase Atual', width: 24 },
]

const CRIT_LABEL_MAP = { 4: '4. Crítico', 3: '3. Significativo', 2: '2. Moderado', 1: '1. Baixo' }

// Heatmap: cores por célula [impacto][probabilidade] — criticidade resultante
const HM_IMP_LABELS = ['Crítico', 'Alto', 'Moderado', 'Baixo']
const HM_PROB_LABELS = ['Extrema', 'Alta', 'Média', 'Baixa']
const HM_COLORS_ARGB = [
  ['FFEF4444', 'FFEF4444', 'FFF97316', 'FFEAB308'],
  ['FFEF4444', 'FFF97316', 'FFEAB308', 'FFEAB308'],
  ['FFF97316', 'FFEAB308', 'FFEAB308', 'FF22C55E'],
  ['FFEAB308', 'FF22C55E', 'FF22C55E', 'FF22C55E'],
]
// Cores da legenda de criticidade
const CRIT_LEGEND = [
  { label: 'Crítico', argb: 'FFEF4444' },
  { label: 'Significativo', argb: 'FFF97316' },
  { label: 'Moderado', argb: 'FFEAB308' },
  { label: 'Baixo', argb: 'FF22C55E' },
]

function impToIdx(v) { return { 'Crítico': 0, 'Alto': 1, 'Moderado': 2, 'Baixo': 3 }[v] ?? -1 }
function probToIdx(v) { return { 'Extrema': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 }[v] ?? -1 }

function getFaseLabel(row) {
  if (row.r3 && row.r3 !== 'Teste Não Realizado') return 'F3 — Revisão'
  if (row.r_ader && row.r_ader !== 'Teste Não Realizado') return 'F2-E2 — Teste de Aderência'
  if (row.st_pa && row.st_pa !== '') return 'F2-E1 — Plano de Ação'
  if (row.r1 && row.r1 !== 'Teste Não Realizado') return 'F2-E2 — Teste de Aderência'
  return 'F1 — Diagnóstico'
}

function getResultadoColor(valor) {
  const v = (valor || '').toLowerCase()
  if (v === 'efetivo') return { argb: '1B5E20' }
  if (v === 'inefetivo') return { argb: 'B71C1C' }
  if (v === 'gap' || v === 'gap de processo') return { argb: 'E65100' }
  return null
}

function getCritColor(crit) {
  const map = { 4: 'EF4444', 3: 'F97316', 2: 'EAB308', 1: '22C55E' }
  return map[crit] ? { argb: map[crit] } : null
}

async function fetchLogoBase64() {
  try {
    const resp = await fetch('/logotipo-2cores.png')
    if (!resp.ok) return null
    const blob = await resp.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA 1: MAPA DE CALOR
// ══════════════════════════════════════════════════════════════════════════════

function buildHeatmapSheet(wb, controles, logoId, clienteNome, projetoNome) {
  const ws = wb.addWorksheet('Mapa de Calor', { properties: { defaultRowHeight: 15 } })

  // Larguras: A=3(margem), B=14(labels Y), C-F=14(grid), G=3(espaço), H=20(legenda)
  ws.getColumn(1).width = 3
  ws.getColumn(2).width = 14
  for (let i = 3; i <= 6; i++) ws.getColumn(i).width = 14
  ws.getColumn(7).width = 3
  ws.getColumn(8).width = 22

  // ── HEADER (linhas 1-3) ──
  ws.mergeCells('A1:H1')
  const brandCell = ws.getCell('A1')
  brandCell.value = '     Polímata · Consultoria em GRC'
  brandCell.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: CREME } }
  brandCell.fill = NAVY_FILL
  brandCell.alignment = { vertical: 'middle' }
  ws.getRow(1).height = 32

  if (logoId !== null) {
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 28, height: 28 }, editAs: 'oneCell' })
  }

  ws.mergeCells('A2:H2')
  const titleCell = ws.getCell('A2')
  titleCell.value = 'MAPA DE CALOR — IMPACTO × PROBABILIDADE'
  titleCell.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: GOLD } }
  titleCell.fill = NAVY_FILL
  titleCell.alignment = { vertical: 'middle' }
  ws.getRow(2).height = 22

  ws.mergeCells('A3:H3')
  const infoCell = ws.getCell('A3')
  const dataHoje = new Date().toLocaleDateString('pt-BR')
  const parts = []
  if (clienteNome) parts.push(`Cliente: ${clienteNome}`)
  if (projetoNome) parts.push(`Projeto: ${projetoNome}`)
  parts.push(`${controles.length} controles`)
  parts.push(`Gerado em ${dataHoje}`)
  infoCell.value = parts.join('  ·  ')
  infoCell.font = { name: 'Montserrat', size: 8, color: { argb: 'FF999999' } }
  infoCell.fill = NAVY_FILL
  infoCell.alignment = { vertical: 'middle' }
  ws.getRow(3).height = 18

  // Linha 4: vazia (espaço)
  ws.getRow(4).height = 10

  // ── GRID DO HEATMAP (linhas 5-8, colunas B-F) ──

  // Calcular dados
  const grid = Array.from({ length: 4 }, () => Array(4).fill(0))
  const gridE = Array.from({ length: 4 }, () => Array(4).fill(0))
  const gridI = Array.from({ length: 4 }, () => Array(4).fill(0))
  const gridG = Array.from({ length: 4 }, () => Array(4).fill(0))
  controles.forEach(c => {
    const ri = impToIdx(c.imp), ci = probToIdx(c.prob)
    if (ri >= 0 && ci >= 0) {
      grid[ri][ci]++
      const r = (c.r1 || '').toLowerCase()
      if (r === 'efetivo') gridE[ri][ci]++
      else if (r === 'inefetivo') gridI[ri][ci]++
      else if (r === 'gap' || r === 'gap de processo') gridG[ri][ci]++
    }
  })

  // Label "Impacto ↑" vertical (coluna A, linhas 5-8)
  ws.mergeCells('A5:A8')
  const impLabel = ws.getCell('A5')
  impLabel.value = 'IMPACTO'
  impLabel.font = { name: 'Montserrat', bold: true, size: 7, color: { argb: 'FF999999' } }
  impLabel.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 }

  // Labels Y (coluna B)
  HM_IMP_LABELS.forEach((label, ri) => {
    const cell = ws.getCell(5 + ri, 2)
    cell.value = label
    cell.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: 'FF666666' } }
    cell.alignment = { vertical: 'middle', horizontal: 'right' }
  })

  // Células do grid (colunas C-F, linhas 5-8)
  for (let ri = 0; ri < 4; ri++) {
    ws.getRow(5 + ri).height = 48
    for (let ci = 0; ci < 4; ci++) {
      const cell = ws.getCell(5 + ri, 3 + ci)
      const n = grid[ri][ci]
      const e = gridE[ri][ci], inf = gridI[ri][ci], g = gridG[ri][ci]
      cell.value = n > 0 ? `${n}\nE:${e}  I:${inf}  G:${g}` : '0'
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HM_COLORS_ARGB[ri][ci] } }
      // Texto branco exceto em amarelo
      const isYellow = HM_COLORS_ARGB[ri][ci] === 'FFEAB308'
      cell.font = { name: 'Montserrat', bold: true, size: n > 0 ? 11 : 10, color: { argb: isYellow ? 'FF333333' : 'FFFFFFFF' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      }
      if (n === 0) {
        // Célula vazia com opacidade simulada (fundo mais claro)
        const baseColor = HM_COLORS_ARGB[ri][ci].slice(2) // remove FF
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '40' + baseColor } }
        cell.font = { ...cell.font, color: { argb: 'FFBBBBBB' } }
      }
    }
  }

  // Labels X — Probabilidade (linha 9, colunas C-F)
  HM_PROB_LABELS.forEach((label, ci) => {
    const cell = ws.getCell(9, 3 + ci)
    cell.value = label
    cell.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: 'FF666666' } }
    cell.alignment = { vertical: 'top', horizontal: 'center' }
  })

  // Label "Probabilidade →" (linha 10)
  ws.mergeCells('C10:F10')
  const probLabel = ws.getCell('C10')
  probLabel.value = 'PROBABILIDADE →'
  probLabel.font = { name: 'Montserrat', bold: true, size: 7, color: { argb: 'FF999999' } }
  probLabel.alignment = { horizontal: 'center' }

  // ── LEGENDA (coluna H, linhas 5-8) ──
  const legTitle = ws.getCell('H4')
  legTitle.value = 'LEGENDA'
  legTitle.font = { name: 'Montserrat', bold: true, size: 8, color: { argb: 'FF999999' } }

  CRIT_LEGEND.forEach((item, i) => {
    const cell = ws.getCell(5 + i, 8)
    // Contar total por criticidade
    const critIdx = 4 - i // 4=Crítico, 3=Significativo, 2=Moderado, 1=Baixo
    const total = controles.filter(c => c.crit === critIdx).length
    const ef = controles.filter(c => c.crit === critIdx && (c.r1 || '').toLowerCase() === 'efetivo').length
    const inf = controles.filter(c => c.crit === critIdx && (c.r1 || '').toLowerCase() === 'inefetivo').length
    const gp = controles.filter(c => c.crit === critIdx && ((c.r1 || '').toLowerCase() === 'gap' || (c.r1 || '').toLowerCase() === 'gap de processo')).length
    cell.value = `${item.label}: ${total} (E:${ef} I:${inf} G:${gp})`
    cell.font = { name: 'Montserrat', size: 9, color: { argb: item.argb.slice(2) } }
    cell.alignment = { vertical: 'middle' }
  })

  // ── RESUMO POR RESULTADO (linha 12+) ──
  ws.getRow(12).height = 8 // espaço

  const sumTitle = ws.getCell('B13')
  sumTitle.value = 'RESUMO'
  sumTitle.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: NAVY } }

  const totalEf = controles.filter(c => (c.r1 || '').toLowerCase() === 'efetivo').length
  const totalIn = controles.filter(c => (c.r1 || '').toLowerCase() === 'inefetivo').length
  const totalGp = controles.filter(c => { const v = (c.r1 || '').toLowerCase(); return v === 'gap' || v === 'gap de processo' }).length

  const resumoData = [
    { label: 'Total de Controles', value: controles.length, color: NAVY },
    { label: 'Efetivos', value: totalEf, color: '22C55E' },
    { label: 'Inefetivos', value: totalIn, color: 'FACC15' },
    { label: 'GAP', value: totalGp, color: 'EF4444' },
  ]
  resumoData.forEach((item, i) => {
    const labelCell = ws.getCell(14 + i, 2)
    labelCell.value = item.label
    labelCell.font = { name: 'Montserrat', size: 9, color: { argb: 'FF666666' } }
    labelCell.alignment = { horizontal: 'right' }

    const valCell = ws.getCell(14 + i, 3)
    valCell.value = item.value
    valCell.font = { name: 'Montserrat', bold: true, size: 14, color: { argb: item.color } }
    valCell.alignment = { horizontal: 'left' }

    if (item.label !== 'Total de Controles' && controles.length > 0) {
      const pctCell = ws.getCell(14 + i, 4)
      pctCell.value = `${Math.round(item.value / controles.length * 100)}%`
      pctCell.font = { name: 'Montserrat', size: 9, color: { argb: 'FF999999' } }
    }
  })

  return ws
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA 2: DADOS DA MRC
// ══════════════════════════════════════════════════════════════════════════════

function buildMRCSheet(wb, controles, tituloAba, logoId, clienteNome, projetoNome) {
  const totalCols = MRC_COLUMNS.length
  const ws = wb.addWorksheet(tituloAba, {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { defaultRowHeight: 15 },
  })

  ws.columns = MRC_COLUMNS.map(col => ({ width: col.width }))

  // ── HEADER (linhas 1-3) ──
  ws.mergeCells(1, 1, 1, totalCols)
  const brandCell = ws.getCell('A1')
  brandCell.value = '     Polímata · Consultoria em GRC'
  brandCell.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: CREME } }
  brandCell.fill = NAVY_FILL
  brandCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(1).height = 32

  if (logoId !== null) {
    ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 28, height: 28 }, editAs: 'oneCell' })
  }

  ws.mergeCells(2, 1, 2, totalCols)
  const titleCell = ws.getCell('A2')
  titleCell.value = `MATRIZ DE RISCOS E CONTROLES — ${tituloAba.toUpperCase()}`
  titleCell.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: GOLD } }
  titleCell.fill = NAVY_FILL
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(2).height = 22

  ws.mergeCells(3, 1, 3, totalCols)
  const infoCell = ws.getCell('A3')
  const dataHoje = new Date().toLocaleDateString('pt-BR')
  const parts = []
  if (clienteNome) parts.push(`Cliente: ${clienteNome}`)
  if (projetoNome) parts.push(`Projeto: ${projetoNome}`)
  parts.push(`${controles.length} controles`)
  parts.push(`Gerado em ${dataHoje}`)
  infoCell.value = parts.join('  ·  ')
  infoCell.font = { name: 'Montserrat', size: 8, color: { argb: 'FF999999' } }
  infoCell.fill = NAVY_FILL
  infoCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(3).height = 18

  // ── LINHA 4: CABEÇALHOS ──
  const colHeaderRow = ws.getRow(4)
  MRC_COLUMNS.forEach((col, idx) => {
    const cell = colHeaderRow.getCell(idx + 1)
    cell.value = col.header
    cell.fill = COL_HEADER_FILL
    cell.font = COL_HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    cell.border = { bottom: { style: 'medium', color: { argb: GOLD } } }
  })
  colHeaderRow.height = 28

  // ── DADOS (linha 5+) ──
  controles.forEach((row, rowIdx) => {
    const excelRow = ws.getRow(rowIdx + 5)
    MRC_COLUMNS.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1)
      let value

      if (col.key === 'fase') {
        value = getFaseLabel(row)
      } else if (col.key === 'crit_label') {
        value = row.crit_label || CRIT_LABEL_MAP[row.crit] || '—'
      } else if (col.key === 'dt_ult') {
        const d = row.dt_ult
        if (d) { try { value = new Date(d).toLocaleDateString('pt-BR') } catch { value = d } }
        else { value = '—' }
      } else {
        value = row[col.key] || '—'
      }

      cell.value = value
      cell.font = { ...BODY_FONT }
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = THIN_BORDER

      if (rowIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F6F2' } }
      }
      if (col.key === 'rr' || col.key === 'rc') {
        cell.font = { ...GOLD_FONT }
      }
      if (col.key === 'r1') {
        const cor = getResultadoColor(value)
        if (cor) cell.font = { ...BODY_FONT, bold: true, color: cor }
      }
      if (col.key === 'crit_label') {
        const cor = getCritColor(row.crit)
        if (cor) cell.font = { ...BODY_FONT, bold: true, color: cor }
      }
    })
  })

  // Auto-filter
  ws.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: controles.length + 4, column: totalCols },
  }

  return ws
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL DE EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export async function exportarMRCExcel(controles, nomeArquivo, tituloAba = 'MRC', clienteNome = '', projetoNome = '') {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CI Polímata'
  wb.created = new Date()

  // Buscar logo uma vez e reutilizar
  const logoBase64 = await fetchLogoBase64()
  const logoId = logoBase64 ? wb.addImage({ base64: logoBase64, extension: 'png' }) : null

  // Aba 1: Mapa de Calor
  buildHeatmapSheet(wb, controles, logoId, clienteNome, projetoNome)

  // Aba 2: Dados da MRC
  buildMRCSheet(wb, controles, tituloAba, logoId, clienteNome, projetoNome)

  // Gerar e baixar
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeArquivo}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
