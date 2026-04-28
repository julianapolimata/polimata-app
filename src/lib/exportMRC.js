import ExcelJS from 'exceljs'
import { getFaseLabel as getFaseLabelUtil, getFaseInfo } from './fases'
import { getStatusConfig } from './statusWorkflow'

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT MRC PARA EXCEL (.xlsx) — Polímata brand
// ══════════════════════════════════════════════════════════════════════════════

const NAVY = '00203E'
const GOLD = 'CC915E'
const CREME = 'F3EEE4'
const NAVY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
const CREME_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREME } }
const WHITE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } }
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
const CREME_BORDER = {
  top: { style: 'thin', color: { argb: CREME } },
  bottom: { style: 'thin', color: { argb: CREME } },
  left: { style: 'thin', color: { argb: CREME } },
  right: { style: 'thin', color: { argb: CREME } },
}

// Todas as colunas do banco na ordem do schema (ordinal_position),
// mais 2 campos computados no final (fase, status_atual).
const MRC_COLUMNS = [
  // Identificação (pos 1-3)
  { key: 'id', header: 'ID', width: 14 },
  { key: 'projeto_id', header: 'ID Projeto', width: 14 },
  { key: 'area_id', header: 'ID Área', width: 14 },
  // Estrutura (pos 4-9)
  { key: 'rr', header: 'Ref. Risco', width: 12 },
  { key: 'rc', header: 'Ref. Controle', width: 14 },
  { key: 'sub', header: 'Subprocesso', width: 20 },
  { key: 'ger', header: 'Gerência', width: 18 },
  { key: 'resp_sub', header: 'Responsável Processo', width: 20 },
  { key: 'dt_ult', header: 'Data Última Atualização', width: 18, fmt: 'date' },
  // Risco (pos 10-14)
  { key: 'dr', header: 'Descrição do Risco', width: 40 },
  { key: 'imp', header: 'Impacto', width: 12 },
  { key: 'prob', header: 'Probabilidade', width: 14 },
  { key: 'crit', header: 'Criticidade (Nível)', width: 14 },
  { key: 'crit_label', header: 'Criticidade', width: 16 },
  // Controle (pos 15-21)
  { key: 'dc', header: 'Descrição do Controle', width: 40 },
  { key: 'cat', header: 'Categoria de Controle', width: 18 },
  { key: 'freq', header: 'Frequência', width: 14 },
  { key: 'nat', header: 'Natureza', width: 12 },
  { key: 'car', header: 'Característica', width: 14 },
  { key: 'sis', header: 'Sistema', width: 14 },
  { key: 'chave', header: 'Controle Chave?', width: 14 },
  // F1 Diagnóstico (pos 22-25)
  { key: 'passos_f1', header: 'Passos de Teste (F1)', width: 40 },
  { key: 'r1', header: 'Resultado F1', width: 14 },
  { key: 'incons', header: 'Inconsistência (F1)', width: 40 },
  { key: 'rec', header: 'Recomendação (F1)', width: 40 },
  // F2 Teste de Desenho / Plano de Ação (pos 26-30)
  { key: 'dem_pa', header: 'Demanda Plano de Ação', width: 40 },
  { key: 'resp_pa', header: 'Responsável Plano de Ação', width: 20 },
  { key: 'dt_pa', header: 'Data Plano de Ação', width: 18, fmt: 'date' },
  { key: 'st_pa', header: 'Resultado Teste de Desenho', width: 18 },
  { key: 'coment_pa', header: 'Comentário Plano de Ação', width: 40 },
  // F2 Aderência (pos 31-36)
  { key: 'dt_teste', header: 'Data Teste Aderência', width: 18, fmt: 'date' },
  { key: 'dc_novo', header: 'Descrição Controle Novo', width: 40 },
  { key: 'r_ader', header: 'Resultado Aderência', width: 18 },
  { key: 'melhoria', header: 'Melhoria', width: 40 },
  { key: 'incons_ader', header: 'Inconsistência Aderência', width: 40 },
  { key: 'coment_ader', header: 'Comentário Aderência', width: 40 },
  // F3 Revisão (pos 37-40)
  { key: 'st_f3', header: 'Status F3', width: 14 },
  { key: 'r3', header: 'Resultado F3', width: 14 },
  { key: 'incons_f3', header: 'Inconsistência F3', width: 40 },
  { key: 'rec_f3', header: 'Recomendação F3', width: 40 },
  // Metadados (pos 41-44)
  { key: 'criado_por', header: 'Criado Por (ID)', width: 14 },
  { key: 'atualizado_por', header: 'Atualizado Por (ID)', width: 14 },
  { key: 'criado_em', header: 'Criado Em', width: 18, fmt: 'datetime' },
  { key: 'atualizado_em', header: 'Atualizado Em', width: 18, fmt: 'datetime' },
  // Workflow (pos 45-50)
  { key: 'status_workflow', header: 'Status Workflow', width: 18 },
  { key: 'arquivo_ficha_url', header: 'URL Arquivo Ficha', width: 30 },
  { key: 'submetido_por', header: 'Submetido Por (ID)', width: 14 },
  { key: 'submetido_em', header: 'Submetido Em', width: 18, fmt: 'datetime' },
  { key: 'aprovado_por', header: 'Aprovado Por (ID)', width: 14 },
  { key: 'aprovado_em', header: 'Aprovado Em', width: 18, fmt: 'datetime' },
  // Status do Risco (pos 51-55)
  { key: 'status_risco', header: 'Status do Risco', width: 18 },
  { key: 'motivo_inativacao', header: 'Motivo Inativação', width: 30 },
  { key: 'ativo', header: 'Ativo', width: 8, fmt: 'bool' },
  { key: 'transferido_de', header: 'Transferido De (ID)', width: 14 },
  { key: 'ref_anterior', header: 'Referência Anterior', width: 14 },
  // Premissas 5W2H (pos 56-61)
  { key: 'premissa_porque', header: 'Premissa: Por quê?', width: 30 },
  { key: 'premissa_quando', header: 'Premissa: Quando?', width: 30 },
  { key: 'premissa_onde', header: 'Premissa: Onde?', width: 30 },
  { key: 'premissa_quem', header: 'Premissa: Quem?', width: 30 },
  { key: 'premissa_como', header: 'Premissa: Como?', width: 30 },
  { key: 'premissa_resultado', header: 'Premissa: Resultado', width: 30 },
  // Consultor (pos 62)
  { key: 'consultor_id', header: 'ID Consultor', width: 14 },
  // F4 Ciclo 1 (pos 63-67)
  { key: 'r_f4c1', header: 'Resultado F4 Ciclo 1', width: 18 },
  { key: 'incons_f4c1', header: 'Inconsistência F4 Ciclo 1', width: 40 },
  { key: 'rec_f4c1', header: 'Recomendação F4 Ciclo 1', width: 40 },
  { key: 'coment_f4c1', header: 'Comentário F4 Ciclo 1', width: 40 },
  { key: 'dt_f4c1', header: 'Data F4 Ciclo 1', width: 18, fmt: 'date' },
  // F4 Ciclo 2 (pos 68-72)
  { key: 'r_f4c2', header: 'Resultado F4 Ciclo 2', width: 18 },
  { key: 'incons_f4c2', header: 'Inconsistência F4 Ciclo 2', width: 40 },
  { key: 'rec_f4c2', header: 'Recomendação F4 Ciclo 2', width: 40 },
  { key: 'coment_f4c2', header: 'Comentário F4 Ciclo 2', width: 40 },
  { key: 'dt_f4c2', header: 'Data F4 Ciclo 2', width: 18, fmt: 'date' },
  // F5 Auditoria (pos 73-77)
  { key: 'r_f5', header: 'Resultado F5', width: 18 },
  { key: 'incons_f5', header: 'Inconsistência F5', width: 40 },
  { key: 'rec_f5', header: 'Recomendação F5', width: 40 },
  { key: 'coment_f5', header: 'Comentário F5', width: 40 },
  { key: 'dt_f5', header: 'Data F5', width: 18, fmt: 'date' },
  // Campos computados
  { key: 'fase', header: 'Fase Atual', width: 24, computed: true },
  { key: 'status_atual', header: 'Status Atual', width: 18, computed: true },
]

const CRIT_LABEL_MAP = { 4: '4. Crítico', 3: '3. Significativo', 2: '2. Moderado', 1: '1. Baixo' }
const HM_IMP_LABELS = ['Crítico', 'Alto', 'Moderado', 'Baixo']
const HM_PROB_LABELS = ['Extrema', 'Alta', 'Média', 'Baixa']
const HM_COLORS = [
  ['EF4444', 'EF4444', 'F97316', 'EAB308'],
  ['EF4444', 'F97316', 'EAB308', 'EAB308'],
  ['F97316', 'EAB308', 'EAB308', '22C55E'],
  ['EAB308', '22C55E', '22C55E', '22C55E'],
]

function isYellowish(c) { return c === 'EAB308' || c === 'FACC15' }
function impToIdx(v) { return { 'Crítico': 0, 'Alto': 1, 'Moderado': 2, 'Baixo': 3 }[v] ?? -1 }
function probToIdx(v) { return { 'Extrema': 0, 'Alta': 1, 'Média': 2, 'Baixa': 3 }[v] ?? -1 }

function getFaseLabel(row) {
  return getFaseLabelUtil(row)
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

function infoLine(clienteNome, projetoNome, count) {
  const parts = []
  if (clienteNome) parts.push(`Cliente: ${clienteNome}`)
  if (projetoNome) parts.push(`Projeto: ${projetoNome}`)
  parts.push(`${count} controles`)
  parts.push(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`)
  return parts.join('  ·  ')
}

async function fetchIconBase64() {
  try {
    const resp = await fetch('/icon.png')
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

function fillCreme(ws, fromRow, toRow, fromCol, toCol) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = fromCol; c <= toCol; c++) {
      const cell = ws.getCell(r, c)
      if (!cell.fill || !cell.fill.fgColor || cell.fill.fgColor.argb === '00000000') {
        cell.fill = CREME_FILL
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA 1: MAPA DE CALOR
// ══════════════════════════════════════════════════════════════════════════════

function buildHeatmapSheet(wb, controles, iconId, clienteNome, projetoNome) {
  const ws = wb.addWorksheet('Mapa de Calor', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 15 },
    pageSetup: { orientation: 'landscape', fitToPage: true },
  })

  // Colunas: A=4, B=4.09, C-H=18
  ws.getColumn(1).width = 4
  ws.getColumn(2).width = 4.09
  ws.getColumn(3).width = 18
  ws.getColumn(4).width = 18
  ws.getColumn(5).width = 18
  ws.getColumn(6).width = 18
  ws.getColumn(7).width = 18
  ws.getColumn(8).width = 18

  const lastCol = 8

  // ── HEADER (linhas 1-3) ──
  ws.getRow(1).height = 15
  ws.mergeCells('B1:G1')
  const r1 = ws.getCell('B1')
  r1.value = '    Polímata · Consultoria em GRC'
  r1.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: CREME } }
  r1.fill = NAVY_FILL
  r1.alignment = { vertical: 'middle' }
  for (let c = 1; c <= lastCol; c++) ws.getCell(1, c).fill = NAVY_FILL

  if (iconId !== null) {
    ws.addImage(iconId, { tl: { col: 0.6, row: 0 }, ext: { width: 36, height: 36 }, editAs: 'oneCell' })
  }

  ws.mergeCells('B2:G2')
  const r2 = ws.getCell('B2')
  r2.value = 'MAPA DE CALOR — IMPACTO × PROBABILIDADE'
  r2.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: GOLD } }
  r2.fill = NAVY_FILL
  r2.alignment = { vertical: 'middle' }
  for (let c = 1; c <= lastCol; c++) ws.getCell(2, c).fill = NAVY_FILL

  ws.mergeCells('B3:G3')
  const r3 = ws.getCell('B3')
  r3.value = infoLine(clienteNome, projetoNome, controles.length)
  r3.font = { name: 'Montserrat', size: 8, color: { argb: 'FF999999' } }
  r3.fill = NAVY_FILL
  r3.alignment = { vertical: 'middle' }
  for (let c = 1; c <= lastCol; c++) ws.getCell(3, c).fill = NAVY_FILL

  // ── CALCULAR DADOS ──
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

  // ── GRID (rows 5-8, height=49.5) ──
  ws.mergeCells('B5:B8')
  const yAxis = ws.getCell('B5')
  yAxis.value = 'IMPACTO ↑'
  yAxis.font = { name: 'Montserrat', bold: true, size: 7, color: { argb: 'FFAAAAAA' } }
  yAxis.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 }
  yAxis.fill = CREME_FILL

  for (let ri = 0; ri < 4; ri++) {
    const rowNum = 5 + ri
    ws.getRow(rowNum).height = 49.5

    const yLabel = ws.getCell(rowNum, 3)
    yLabel.value = HM_IMP_LABELS[ri]
    yLabel.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: 'FF555555' } }
    yLabel.alignment = { vertical: 'middle', horizontal: 'right' }
    yLabel.fill = CREME_FILL

    for (let ci = 0; ci < 4; ci++) {
      const cell = ws.getCell(rowNum, 4 + ci)
      const n = grid[ri][ci]
      const e = gridE[ri][ci], inf = gridI[ri][ci], g = gridG[ri][ci]
      const color = HM_COLORS[ri][ci]
      const yellow = isYellowish(color)

      // Sempre colorido — com ou sem valor
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
      cell.border = CREME_BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

      if (n === 0) {
        cell.value = '0'
        cell.font = { name: 'Montserrat', bold: true, size: 14, color: { argb: yellow ? 'FF333333' : 'FFFFFFFF' } }
      } else {
        cell.value = `${n}\nE:${e}  I:${inf}  G:${g}`
        cell.font = { name: 'Montserrat', bold: false, size: 11, color: { argb: yellow ? 'FF333333' : 'FFFFFFFF' } }
      }
    }
  }

  // Labels X (row 9)
  ws.getRow(9).height = 15
  HM_PROB_LABELS.forEach((label, ci) => {
    const cell = ws.getCell(9, 4 + ci)
    cell.value = label
    cell.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: 'FF555555' } }
    cell.alignment = { vertical: 'top', horizontal: 'center' }
    cell.fill = CREME_FILL
  })

  // "PROBABILIDADE →" (row 10)
  ws.mergeCells('D10:G10')
  const xAxis = ws.getCell('D10')
  xAxis.value = 'PROBABILIDADE →'
  xAxis.font = { name: 'Montserrat', bold: true, size: 7, color: { argb: 'FFAAAAAA' } }
  xAxis.alignment = { horizontal: 'center' }
  xAxis.fill = CREME_FILL

  // ── LEGENDA (row 12) ──
  const legData = [
    { label: '■ Crítico', color: 'EF4444' },
    { label: '■ Significativo', color: 'F97316' },
    { label: '■ Moderado', color: 'EAB308' },
    { label: '■ Baixo', color: '22C55E' },
  ]
  legData.forEach((item, i) => {
    const cell = ws.getCell(12, 4 + i)
    cell.value = item.label
    cell.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: item.color } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = CREME_FILL
  })

  // ── RESUMO (row 15: title, rows 16-18: cards centralizados) ──
  const resumoTitle = ws.getCell('C15')
  resumoTitle.value = 'RESUMO'
  resumoTitle.font = { name: 'Montserrat', bold: true, size: 8, color: { argb: 'FFAAAAAA' } }
  resumoTitle.fill = CREME_FILL

  const totalEf = controles.filter(c => (c.r1 || '').toLowerCase() === 'efetivo').length
  const totalIn = controles.filter(c => (c.r1 || '').toLowerCase() === 'inefetivo').length
  const totalGp = controles.filter(c => { const v = (c.r1 || '').toLowerCase(); return v === 'gap' || v === 'gap de processo' }).length
  const tot = controles.length

  const cards = [
    { label: 'TOTAL DE CONTROLES', value: tot, sub: 'controles', color: NAVY, border: NAVY },
    { label: 'EFETIVOS', value: totalEf, sub: tot > 0 ? `${Math.round(totalEf/tot*100)}% do total` : '—', color: '22C55E', border: '22C55E' },
    { label: 'INEFETIVOS', value: totalIn, sub: tot > 0 ? `${Math.round(totalIn/tot*100)}% do total` : '—', color: 'FACC15', border: 'FACC15' },
    { label: 'GAP', value: totalGp, sub: tot > 0 ? `${Math.round(totalGp/tot*100)}% do total` : '—', color: 'EF4444', border: 'EF4444' },
  ]

  ws.getRow(17).height = 39.5

  cards.forEach((card, i) => {
    const col = 4 + i

    const labelCell = ws.getCell(16, col)
    labelCell.value = card.label
    labelCell.font = { name: 'Montserrat', bold: true, size: 7, color: { argb: 'FF999999' } }
    labelCell.alignment = { vertical: 'bottom', horizontal: 'center' }
    labelCell.fill = WHITE_FILL
    labelCell.border = {
      top: { style: 'medium', color: { argb: card.border } },
      left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
    }

    const valCell = ws.getCell(17, col)
    valCell.value = card.value
    valCell.font = { name: 'Montserrat', size: 26, color: { argb: card.color } }
    valCell.alignment = { vertical: 'middle', horizontal: 'center' }
    valCell.fill = WHITE_FILL
    valCell.border = {
      left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
    }

    const subCell = ws.getCell(18, col)
    subCell.value = card.sub
    subCell.font = { name: 'Montserrat', size: 8, color: { argb: 'FFBBBBBB' } }
    subCell.alignment = { vertical: 'top', horizontal: 'center' }
    subCell.fill = WHITE_FILL
    subCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
      right: { style: 'thin', color: { argb: 'FFEEEEEE' } },
    }
  })

  // ── FOOTER (rows 19-20) ──
  ws.getRow(19).height = 15
  ws.getRow(20).height = 15
  ws.mergeCells('B20:E20')
  const footL = ws.getCell('B20')
  footL.value = 'Polímata · Consultoria em GRC'
  footL.font = { name: 'Montserrat', size: 10, color: { argb: NAVY } }
  footL.fill = CREME_FILL
  footL.border = { top: { style: 'medium', color: { argb: GOLD } } }

  ws.getCell('F20').border = { top: { style: 'medium', color: { argb: GOLD } } }
  ws.getCell('F20').fill = CREME_FILL
  ws.getCell('G20').border = { top: { style: 'medium', color: { argb: GOLD } } }
  ws.getCell('G20').fill = CREME_FILL

  const footR = ws.getCell('H20')
  const now = new Date()
  footR.value = `${now.toLocaleDateString('pt-BR')} · ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  footR.font = { name: 'Montserrat', size: 10, color: { argb: NAVY } }
  footR.alignment = { horizontal: 'right' }
  footR.fill = CREME_FILL
  footR.border = { top: { style: 'medium', color: { argb: GOLD } } }

  // ── FUNDO CREME ──
  fillCreme(ws, 4, 20, 1, lastCol)

  return ws
}

// ══════════════════════════════════════════════════════════════════════════════
// ABA 2: DADOS DA MRC
// ══════════════════════════════════════════════════════════════════════════════

function buildMRCSheet(wb, controles, tituloAba, iconId, clienteNome, projetoNome) {
  const lastCol = MRC_COLUMNS.length + 1
  const ws = wb.addWorksheet(tituloAba, {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 1, showGridLines: false }],
    properties: { defaultRowHeight: 15 },
    pageSetup: { orientation: 'landscape', fitToPage: true },
  })

  ws.getColumn(1).width = 4
  MRC_COLUMNS.forEach((col, idx) => { ws.getColumn(idx + 2).width = col.width })

  // ── HEADER (merge B) ──
  ws.getRow(1).height = 15
  ws.mergeCells(1, 2, 1, lastCol)
  const brandCell = ws.getCell('B1')
  brandCell.value = '    Polímata · Consultoria em GRC'
  brandCell.font = { name: 'Montserrat', bold: true, size: 10, color: { argb: CREME } }
  brandCell.fill = NAVY_FILL
  brandCell.alignment = { vertical: 'middle', horizontal: 'left' }
  for (let c = 1; c <= lastCol; c++) ws.getCell(1, c).fill = NAVY_FILL

  if (iconId !== null) {
    ws.addImage(iconId, { tl: { col: 0.6, row: 0 }, ext: { width: 36, height: 36 }, editAs: 'oneCell' })
  }

  ws.mergeCells(2, 2, 2, lastCol)
  const titleCell = ws.getCell('B2')
  titleCell.value = `MATRIZ DE RISCOS E CONTROLES — ${tituloAba.toUpperCase()}`
  titleCell.font = { name: 'Montserrat', bold: true, size: 9, color: { argb: GOLD } }
  titleCell.fill = NAVY_FILL
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  for (let c = 1; c <= lastCol; c++) ws.getCell(2, c).fill = NAVY_FILL

  ws.mergeCells(3, 2, 3, lastCol)
  const infoCell = ws.getCell('B3')
  infoCell.value = infoLine(clienteNome, projetoNome, controles.length)
  infoCell.font = { name: 'Montserrat', size: 8, color: { argb: 'FF999999' } }
  infoCell.fill = NAVY_FILL
  infoCell.alignment = { vertical: 'middle', horizontal: 'left' }
  for (let c = 1; c <= lastCol; c++) ws.getCell(3, c).fill = NAVY_FILL

  // ── LINHA 4: CABEÇALHOS ──
  const colHeaderRow = ws.getRow(4)
  ws.getCell(4, 1).fill = COL_HEADER_FILL
  ws.getCell(4, 1).border = { bottom: { style: 'medium', color: { argb: GOLD } } }

  MRC_COLUMNS.forEach((col, idx) => {
    const cell = colHeaderRow.getCell(idx + 2)
    cell.value = col.header
    cell.fill = COL_HEADER_FILL
    cell.font = COL_HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    cell.border = { bottom: { style: 'medium', color: { argb: GOLD } } }
  })
  colHeaderRow.height = 28

  // Conjunto de colunas de resultado (colorir por efetividade)
  const RESULTADO_KEYS = new Set(['r1', 'st_pa', 'r_ader', 'r3', 'r_f4c1', 'r_f4c2', 'r_f5'])

  // ── DADOS ──
  controles.forEach((row, rowIdx) => {
    const excelRow = ws.getRow(rowIdx + 5)
    ws.getCell(rowIdx + 5, 1).fill = CREME_FILL

    MRC_COLUMNS.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 2)
      let value

      // Campos computados
      if (col.key === 'fase') {
        value = getFaseLabel(row)
      } else if (col.key === 'status_atual') {
        const cfg = getStatusConfig(row.status_workflow, 'admin_polimata')
        value = cfg.label || '—'
      } else if (col.key === 'crit_label') {
        value = row.crit_label || CRIT_LABEL_MAP[row.crit] || '—'
      } else if (col.fmt === 'date') {
        const d = row[col.key]
        if (d) { try { value = new Date(d).toLocaleDateString('pt-BR') } catch { value = d } }
        else { value = '—' }
      } else if (col.fmt === 'datetime') {
        const d = row[col.key]
        if (d) { try { const dt = new Date(d); value = `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` } catch { value = d } }
        else { value = '—' }
      } else if (col.fmt === 'bool') {
        const v = row[col.key]
        value = v === true ? 'Sim' : v === false ? 'Não' : '—'
      } else {
        const raw = row[col.key]
        value = raw != null && raw !== '' ? raw : '—'
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
      if (RESULTADO_KEYS.has(col.key)) {
        const cor = getResultadoColor(value)
        if (cor) cell.font = { ...BODY_FONT, bold: true, color: cor }
      }
      if (col.key === 'crit_label') {
        const cor = getCritColor(row.crit)
        if (cor) cell.font = { ...BODY_FONT, bold: true, color: cor }
      }
    })
  })

  ws.autoFilter = {
    from: { row: 4, column: 2 },
    to: { row: controles.length + 4, column: lastCol },
  }

  return ws
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export async function exportarMRCExcel(controles, nomeArquivo, tituloAba = 'MRC', clienteNome = '', projetoNome = '') {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CI Polímata'
  wb.created = new Date()

  const iconBase64 = await fetchIconBase64()
  const iconId = iconBase64 ? wb.addImage({ base64: iconBase64, extension: 'png' }) : null

  buildHeatmapSheet(wb, controles, iconId, clienteNome, projetoNome)
  buildMRCSheet(wb, controles, tituloAba, iconId, clienteNome, projetoNome)

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
