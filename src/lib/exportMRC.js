import ExcelJS from 'exceljs'

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT MRC PARA EXCEL (.xlsx) — Polímata brand v3
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
const WHITE_BORDER = {
  top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
  right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
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

const HM_IMP_LABELS = ['Crítico', 'Alto', 'Moderado', 'Baixo']
const HM_PROB_LABELS = ['Extrema', 'Alta', 'Média', 'Baixa']
// Cores ARGB por [impacto][probabilidade]
const HM_COLORS = [
  ['EF4444', 'EF4444', 'F97316', 'EAB308'],
  ['EF4444', 'F97316', 'EAB308', 'EAB308'],
  ['F97316', 'EAB308', 'EAB308', '22C55E'],
  ['EAB308', '22C55E', '22C55E', '22C55E'],
]
const YELLOW_COLORS = ['EAB308', 'FACC15']

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

function isYellowish(color) { return YELLOW_COLORS.includes(color) }

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

function infoLine(clienteNome, projetoNome, count) {
  const parts = []
  if (clienteNome) parts.push(`Cliente: ${clienteNome}`)
  if (projetoNome) parts.push(`Projeto: ${projetoNome}`)
  parts.push(`${count} controles`)
  parts.push(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`)
  return parts.join('  ·  ')
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA 1: MAPA DE CALOR
// ══════════════════════════════════════════════════════════════════════════════

function buildHeatmapSheet(wb, controles, logoId, clienteNome, projetoNome) {
  const ws = wb.addWorksheet('Mapa de Calor', {
    properties: { defaultRowHeight: 15 },
    pageSetup: { orientation: 'landscape', fitToPage: true },
  })

  // Layout de colunas centrado:
  // A=3(margem), B=2(eixoY), C=12(labels Y), D-G=16(grid ×4), H=2(espaço), I=16, J=16, K=16, L=16, M=3(margem)
  // Total ~13 colunas
  ws.getColumn(1).width = 3    // margem esquerda
  ws.getColumn(2).width = 3    // eixo Y label
  ws.getColumn(3).width = 12   // labels impacto
  ws.getColumn(4).width = 16   // grid col 1
  ws.getColumn(5).width = 16   // grid col 2
  ws.getColumn(6).width = 16   // grid col 3
  ws.getColumn(7).width = 16   // grid col 4
  ws.getColumn(8).width = 3    // espaço
  ws.getColumn(9).width = 16   // resumo card 1
  ws.getColumn(10).width = 16  // resumo card 2
  ws.getColumn(11).width = 16  // resumo card 3
  ws.getColumn(12).width = 16  // resumo card 4
  ws.getColumn(13).width = 3   // margem direita

  // ── HEADER (linhas 1-3) ──
  ws.mergeCells('A1:L1')
  const r1 = ws.getCell('A1')
  r1.value = '     Polímata · Consultoria em GRC'
  r1.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: CREME } }
  r1.fill = NAVY_FILL
  r1.alignment = { vertical: 'middle' }
  ws.getRow(1).height = 30
  // Preencher todas cells da row 1 com navy
  for (let c = 1; c <= 13; c++) { const cell = ws.getCell(1, c); cell.fill = NAVY_FILL }

  if (logoId !== null) {
    ws.addImage(logoId, { tl: { col: 0.2, row: 0.1 }, ext: { width: 24, height: 24 }, editAs: 'oneCell' })
  }

  ws.mergeCells('A2:L2')
  const r2 = ws.getCell('A2')
  r2.value = '     MAPA DE CALOR — IMPACTO × PROBABILIDADE'
  r2.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: GOLD } }
  r2.fill = NAVY_FILL
  r2.alignment = { vertical: 'middle' }
  ws.getRow(2).height = 20
  for (let c = 1; c <= 13; c++) { ws.getCell(2, c).fill = NAVY_FILL }

  ws.mergeCells('A3:L3')
  const r3 = ws.getCell('A3')
  r3.value = '     ' + infoLine(clienteNome, projetoNome, controles.length)
  r3.font = { name: 'Montserrat', size: 8, color: { argb: 'FF999999' } }
  r3.fill = NAVY_FILL
  r3.alignment = { vertical: 'middle' }
  ws.getRow(3).height = 16
  for (let c = 1; c <= 13; c++) { ws.getCell(3, c).fill = NAVY_FILL }

  // Linha 4: espaço
  ws.getRow(4).height = 12

  // ── CALCULAR DADOS DO HEATMAP ──
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

  // ── GRID DO HEATMAP (linhas 5-8) ──
  // Eixo Y rotacionado: coluna B, merge linhas 5-8
  ws.mergeCells('B5:B8')
  const yAxis = ws.getCell('B5')
  yAxis.value = 'IMPACTO ↑'
  yAxis.font = { name: 'Montserrat', bold: true, size: 7, color: { argb: 'FFAAAAAA' } }
  yAxis.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 }

  for (let ri = 0; ri < 4; ri++) {
    const rowNum = 5 + ri
    ws.getRow(rowNum).height = 48

    // Label Y (coluna C)
    const yLabel = ws.getCell(rowNum, 3)
    yLabel.value = HM_IMP_LABELS[ri]
    yLabel.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: 'FF555555' } }
    yLabel.alignment = { vertical: 'middle', horizontal: 'right' }

    // Células do grid (colunas D-G = 4-7)
    for (let ci = 0; ci < 4; ci++) {
      const cell = ws.getCell(rowNum, 4 + ci)
      const n = grid[ri][ci]
      const e = gridE[ri][ci], inf = gridI[ri][ci], g = gridG[ri][ci]
      const color = HM_COLORS[ri][ci]
      const isYellow = isYellowish(color)

      if (n === 0) {
        cell.value = '0'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0EDE8' } }
        cell.font = { name: 'Montserrat', bold: true, size: 14, color: { argb: 'FFCCCCCC' } }
      } else {
        cell.value = { richText: [
          { text: `${n}\n`, font: { name: 'Montserrat', bold: true, size: 18, color: { argb: isYellow ? 'FF333333' : 'FFFFFFFF' } } },
          { text: `E:${e}  I:${inf}  G:${g}`, font: { name: 'Montserrat', size: 8, color: { argb: isYellow ? 'FF666666' : 'CCFFFFFF' } } },
        ]}
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = WHITE_BORDER
    }
  }

  // Labels X (linha 9, colunas D-G)
  ws.getRow(9).height = 20
  HM_PROB_LABELS.forEach((label, ci) => {
    const cell = ws.getCell(9, 4 + ci)
    cell.value = label
    cell.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: 'FF555555' } }
    cell.alignment = { vertical: 'top', horizontal: 'center' }
  })

  // "PROBABILIDADE →" (linha 10)
  ws.mergeCells('D10:G10')
  const xAxis = ws.getCell('D10')
  xAxis.value = 'PROBABILIDADE →'
  xAxis.font = { name: 'Montserrat', bold: true, size: 7, color: { argb: 'FFAAAAAA' } }
  xAxis.alignment = { horizontal: 'center' }
  ws.getRow(10).height = 14

  // Linha 11: espaço
  ws.getRow(11).height = 8

  // ── LEGENDA (linha 12, colunas D-G centrada) ──
  ws.getRow(12).height = 18
  // Borda top para separar
  for (let c = 3; c <= 7; c++) {
    ws.getCell(12, c).border = { top: { style: 'thin', color: { argb: 'FFEEEEEE' } } }
  }

  const legData = [
    { label: '■ Crítico', color: 'EF4444' },
    { label: '■ Significativo', color: 'F97316' },
    { label: '■ Moderado', color: 'EAB308' },
    { label: '■ Baixo', color: '22C55E' },
  ]
  legData.forEach((item, i) => {
    const cell = ws.getCell(12, 4 + i)
    cell.value = item.label
    cell.font = { name: 'Montserrat', size: 9, color: { argb: item.color } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // ── SEPARADOR (linha 13-14) ──
  ws.getRow(13).height = 8
  ws.getRow(14).height = 6
  ws.mergeCells('C14:G14')
  ws.getCell('C14').border = { bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } }

  // ── RESUMO (linha 15: título, linhas 16-18: cards) ──
  ws.getRow(15).height = 18
  const resumoTitle = ws.getCell('C15')
  resumoTitle.value = 'RESUMO'
  resumoTitle.font = { name: 'Montserrat', bold: true, size: 8, color: { argb: 'FFAAAAAA' } }

  const totalEf = controles.filter(c => (c.r1 || '').toLowerCase() === 'efetivo').length
  const totalIn = controles.filter(c => (c.r1 || '').toLowerCase() === 'inefetivo').length
  const totalGp = controles.filter(c => { const v = (c.r1 || '').toLowerCase(); return v === 'gap' || v === 'gap de processo' }).length
  const tot = controles.length

  const cards = [
    { label: 'TOTAL DE CONTROLES', value: tot, sub: 'controles', color: NAVY, borderColor: NAVY },
    { label: 'EFETIVOS', value: totalEf, sub: tot > 0 ? `${Math.round(totalEf/tot*100)}% do total` : '—', color: '22C55E', borderColor: '22C55E' },
    { label: 'INEFETIVOS', value: totalIn, sub: tot > 0 ? `${Math.round(totalIn/tot*100)}% do total` : '—', color: 'FACC15', borderColor: 'FACC15' },
    { label: 'GAP', value: totalGp, sub: tot > 0 ? `${Math.round(totalGp/tot*100)}% do total` : '—', color: 'EF4444', borderColor: 'EF4444' },
  ]

  // Cada card ocupa 1 coluna (D, E, F, G) e 3 linhas (16=label, 17=valor, 18=sub)
  ws.getRow(16).height = 16
  ws.getRow(17).height = 32
  ws.getRow(18).height = 16

  cards.forEach((card, i) => {
    const col = 4 + i

    // Borda top colorida (linha 16)
    const labelCell = ws.getCell(16, col)
    labelCell.value = card.label
    labelCell.font = { name: 'Montserrat', bold: true, size: 7, color: { argb: 'FF999999' } }
    labelCell.alignment = { vertical: 'bottom', horizontal: 'left' }
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAF8' } }
    labelCell.border = {
      top: { style: 'medium', color: { argb: card.borderColor } },
      left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
    }

    // Valor grande (linha 17)
    const valCell = ws.getCell(17, col)
    valCell.value = card.value
    valCell.font = { name: 'Montserrat', size: 24, color: { argb: card.color } }
    valCell.alignment = { vertical: 'middle', horizontal: 'left' }
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAF8' } }
    valCell.border = {
      left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
    }

    // Sub (linha 18)
    const subCell = ws.getCell(18, col)
    subCell.value = card.sub
    subCell.font = { name: 'Montserrat', size: 8, color: { argb: 'FFBBBBBB' } }
    subCell.alignment = { vertical: 'top', horizontal: 'left' }
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFAF8' } }
    subCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
    }
  })

  // ── FOOTER (linha 20) ──
  ws.getRow(19).height = 10
  ws.getRow(20).height = 14
  ws.mergeCells('C20:D20')
  const footL = ws.getCell('C20')
  footL.value = 'Polímata · Consultoria em GRC'
  footL.font = { name: 'Montserrat', size: 7, color: { argb: 'FFCCCCCC' } }
  footL.border = { top: { style: 'thin', color: { argb: 'FFEEEEEE' } } }

  ws.mergeCells('F20:G20')
  const footR = ws.getCell('F20')
  const now = new Date()
  footR.value = `${now.toLocaleDateString('pt-BR')} · ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  footR.font = { name: 'Montserrat', size: 7, color: { argb: 'FFCCCCCC' } }
  footR.alignment = { horizontal: 'right' }
  footR.border = { top: { style: 'thin', color: { argb: 'FFEEEEEE' } } }

  // Preencher bordas top na linha 20
  for (let c = 4; c <= 5; c++) {
    ws.getCell(20, c).border = { top: { style: 'thin', color: { argb: 'FFEEEEEE' } } }
  }

  return ws
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA 2: DADOS DA MRC
// ══════════════════════════════════════════════════════════════════════════════

function buildMRCSheet(wb, controles, tituloAba, logoId, clienteNome, projetoNome) {
  const totalCols = MRC_COLUMNS.length + 1 // +1 para coluna A margem
  const ws = wb.addWorksheet(tituloAba, {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 1 }], // congela header + coluna A
    properties: { defaultRowHeight: 15 },
    pageSetup: { orientation: 'landscape', fitToPage: true },
  })

  // Coluna A = margem (largura 3)
  ws.getColumn(1).width = 3
  // Colunas B em diante = dados
  MRC_COLUMNS.forEach((col, idx) => {
    ws.getColumn(idx + 2).width = col.width
  })

  // ── HEADER (linhas 1-3) ──
  const lastCol = MRC_COLUMNS.length + 1
  ws.mergeCells(1, 1, 1, lastCol)
  const brandCell = ws.getCell('A1')
  brandCell.value = '     Polímata · Consultoria em GRC'
  brandCell.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: CREME } }
  brandCell.fill = NAVY_FILL
  brandCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(1).height = 30
  for (let c = 1; c <= lastCol; c++) { ws.getCell(1, c).fill = NAVY_FILL }

  if (logoId !== null) {
    ws.addImage(logoId, { tl: { col: 0.2, row: 0.1 }, ext: { width: 24, height: 24 }, editAs: 'oneCell' })
  }

  ws.mergeCells(2, 1, 2, lastCol)
  const titleCell = ws.getCell('A2')
  titleCell.value = `     MATRIZ DE RISCOS E CONTROLES — ${tituloAba.toUpperCase()}`
  titleCell.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: GOLD } }
  titleCell.fill = NAVY_FILL
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(2).height = 20
  for (let c = 1; c <= lastCol; c++) { ws.getCell(2, c).fill = NAVY_FILL }

  ws.mergeCells(3, 1, 3, lastCol)
  const infoCell = ws.getCell('A3')
  infoCell.value = '     ' + infoLine(clienteNome, projetoNome, controles.length)
  infoCell.font = { name: 'Montserrat', size: 8, color: { argb: 'FF999999' } }
  infoCell.fill = NAVY_FILL
  infoCell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(3).height = 16
  for (let c = 1; c <= lastCol; c++) { ws.getCell(3, c).fill = NAVY_FILL }

  // ── LINHA 4: CABEÇALHOS (coluna B em diante) ──
  const colHeaderRow = ws.getRow(4)
  // Coluna A vazia na linha 4
  const cellA4 = ws.getCell(4, 1)
  cellA4.fill = COL_HEADER_FILL
  cellA4.border = { bottom: { style: 'medium', color: { argb: GOLD } } }

  MRC_COLUMNS.forEach((col, idx) => {
    const cell = colHeaderRow.getCell(idx + 2)
    cell.value = col.header
    cell.fill = COL_HEADER_FILL
    cell.font = COL_HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    cell.border = { bottom: { style: 'medium', color: { argb: GOLD } } }
  })
  colHeaderRow.height = 28

  // ── DADOS (linha 5+, coluna B em diante) ──
  controles.forEach((row, rowIdx) => {
    const excelRow = ws.getRow(rowIdx + 5)
    MRC_COLUMNS.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 2) // +2 porque coluna A é margem
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

  // Auto-filter (coluna B em diante)
  ws.autoFilter = {
    from: { row: 4, column: 2 },
    to: { row: controles.length + 4, column: MRC_COLUMNS.length + 1 },
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
