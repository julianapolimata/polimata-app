// ═══════════════════════════════════════════════════════════════════════════
// gerarMatrizXlsx.js — Matriz de Riscos COSO+ISO, RACI, Pontos de Atenção e
// Legenda, a partir da estrutura JSON do mapeamento. Identidade Polímata.
// ═══════════════════════════════════════════════════════════════════════════

const NAVY = 'FF00203E'
const NAVY_DEEP = 'FF00112C'
const CREAM = 'FFF3EEE4'
const BRANCO = 'FFFFFFFF'

const FONTE = 'Montserrat'

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const bordaFina = { style: 'thin', color: { argb: 'FFD8D2C4' } }
const bordas = { top: bordaFina, left: bordaFina, bottom: bordaFina, right: bordaFina }

function cabecalho(ws, titulo, subtitulo, nCols) {
  ws.mergeCells(1, 1, 1, nCols)
  const c1 = ws.getCell(1, 1)
  c1.value = titulo
  c1.font = { name: FONTE, size: 14, bold: true, color: { argb: BRANCO } }
  c1.fill = fill(NAVY_DEEP)
  c1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 30
  ws.mergeCells(2, 1, 2, nCols)
  const c2 = ws.getCell(2, 1)
  c2.value = subtitulo
  c2.font = { name: FONTE, size: 9, color: { argb: 'FFA6512F' } }
  c2.fill = fill(CREAM)
  c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height = 18
}

function linhaHeader(ws, row, cols) {
  cols.forEach((t, i) => {
    const c = ws.getCell(row, i + 1)
    c.value = t
    c.font = { name: FONTE, size: 9, bold: true, color: { argb: BRANCO } }
    c.fill = fill(NAVY)
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border = bordas
  })
  ws.getRow(row).height = 28
}

const CRIT = (p, i) => {
  const s = (p || 0) * (i || 0)
  if (s >= 17) return { label: 'Crítico', cor: 'FFDC2626', bg: 'FFFEE2E2' }
  if (s >= 10) return { label: 'Alto', cor: 'FFEA580C', bg: 'FFFFEDD5' }
  if (s >= 5) return { label: 'Médio', cor: 'FFB45309', bg: 'FFFEF3C7' }
  return { label: 'Baixo', cor: 'FF15803D', bg: 'FFDCFCE7' }
}

export async function gerarMatrizXlsx(estrutura, { nomeProcesso, clienteNome, codigoBase }) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Polímata GRC'

  // ── Aba 1: Matriz de Riscos ──
  const cols1 = ['ID', 'Atividade', 'Descrição do Risco', 'Causa', 'Evento', 'Consequência',
    'Categoria COSO', 'Fonte ISO 31000', 'Prob. (1-5)', 'Impacto (1-5)', 'Score', 'Criticidade',
    'Controles Existentes', 'Tipo', 'Natureza', 'Avaliação', 'Plano de Ação']
  const ws1 = wb.addWorksheet('Matriz de Riscos', { views: [{ state: 'frozen', ySplit: 3 }] })
  cabecalho(ws1, `Matriz de Riscos e Controles — ${nomeProcesso}`, `${clienteNome} · ${codigoBase} · COSO ERM 2017 + ISO 31000:2018 · Gerado pelo módulo Mapeamento de Processos`, cols1.length)
  linhaHeader(ws1, 3, cols1)
  const widths1 = [9, 10, 38, 28, 28, 28, 16, 16, 9, 9, 8, 12, 36, 12, 12, 12, 36]
  widths1.forEach((w, i) => { ws1.getColumn(i + 1).width = w })

  ;(estrutura?.riscos || []).forEach((r, idx) => {
    const row = ws1.getRow(4 + idx)
    const crit = CRIT(r.probabilidade, r.impacto)
    const vals = [r.id, r.atividade_ref, r.descricao, r.causa, r.evento, r.consequencia,
      r.categoria_coso, r.fonte_iso, r.probabilidade, r.impacto,
      (r.probabilidade || 0) * (r.impacto || 0), crit.label,
      r.controles_existentes, r.tipo_controle, r.natureza_controle, r.avaliacao_controle, r.plano_acao]
    vals.forEach((v, i) => {
      const c = row.getCell(i + 1)
      c.value = v ?? ''
      c.font = { name: FONTE, size: 9, color: { argb: 'FF1F2937' } }
      c.alignment = { vertical: 'top', horizontal: [0, 1, 8, 9, 10, 11].includes(i) ? 'center' : 'left', wrapText: true }
      c.border = bordas
      if (idx % 2) c.fill = fill('FFFAF8F3')
    })
    const cCrit = row.getCell(12)
    cCrit.fill = fill(crit.bg)
    cCrit.font = { name: FONTE, size: 9, bold: true, color: { argb: crit.cor } }
    const cAval = row.getCell(16)
    const aval = String(r.avaliacao_controle || '')
    if (/gap/i.test(aval)) { cAval.fill = fill('FFFEE2E2'); cAval.font = { name: FONTE, size: 9, bold: true, color: { argb: 'FFDC2626' } } }
    else if (/inefetivo/i.test(aval)) { cAval.fill = fill('FFFEF3C7'); cAval.font = { name: FONTE, size: 9, bold: true, color: { argb: 'FFB45309' } } }
    else if (/efetivo/i.test(aval)) { cAval.fill = fill('FFDCFCE7'); cAval.font = { name: FONTE, size: 9, bold: true, color: { argb: 'FF15803D' } } }
  })

  // ── Aba 2: RACI ──
  const raci = estrutura?.raci || []
  const atores = [...new Set(raci.flatMap((r) => Object.keys(r.matriz || {})))]
  const cols2 = ['Atividade', 'Descrição', ...atores]
  const ws2 = wb.addWorksheet('RACI', { views: [{ state: 'frozen', ySplit: 3 }] })
  cabecalho(ws2, `Matriz RACI — ${nomeProcesso}`, `${clienteNome} · R=Responsável  A=Aprovador  C=Consultado  I=Informado`, Math.max(cols2.length, 4))
  linhaHeader(ws2, 3, cols2)
  ws2.getColumn(1).width = 12
  ws2.getColumn(2).width = 44
  atores.forEach((_, i) => { ws2.getColumn(i + 3).width = 16 })
  const CORES_RACI = { R: ['FF15803D', 'FFDCFCE7'], A: ['FFA6512F', 'FFF6E7D8'], C: ['FF1D4ED8', 'FFDBEAFE'], I: ['FF6B7280', 'FFF3F4F6'] }
  raci.forEach((r, idx) => {
    const row = ws2.getRow(4 + idx)
    row.getCell(1).value = r.atividade
    row.getCell(2).value = r.titulo || ''
    ;[row.getCell(1), row.getCell(2)].forEach((c) => { c.font = { name: FONTE, size: 9 }; c.border = bordas; c.alignment = { vertical: 'middle', wrapText: true } })
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }
    atores.forEach((a, i) => {
      const c = row.getCell(i + 3)
      const v = (r.matriz || {})[a] || ''
      c.value = v
      const [cor, bg] = CORES_RACI[v] || ['FF1F2937', 'FFFFFFFF']
      c.font = { name: FONTE, size: 10, bold: true, color: { argb: cor } }
      if (v) c.fill = fill(bg)
      c.alignment = { vertical: 'middle', horizontal: 'center' }
      c.border = bordas
    })
  })

  // ── Aba 3: Pontos de Atenção ──
  const pontos = (estrutura?.subprocessos || []).flatMap((sp) =>
    (sp.pontos_atencao || []).map((p) => ({ ...p, subprocesso: `${sp.id} ${sp.nome}` })))
  const cols3 = ['ID', 'Subprocesso', 'Descrição', 'Severidade', 'Recomendação']
  const ws3 = wb.addWorksheet('Pontos de Atenção', { views: [{ state: 'frozen', ySplit: 3 }] })
  cabecalho(ws3, `Anexo de Fragilidades — ${nomeProcesso}`, `${clienteNome} · Pontos identificados no levantamento — insumo direto para a MRC`, cols3.length)
  linhaHeader(ws3, 3, cols3)
  ;[10, 30, 50, 12, 50].forEach((w, i) => { ws3.getColumn(i + 1).width = w })
  const SEV = { Alta: ['FFDC2626', 'FFFEE2E2'], 'Média': ['FFB45309', 'FFFEF3C7'], Baixa: ['FF15803D', 'FFDCFCE7'] }
  pontos.forEach((p, idx) => {
    const row = ws3.getRow(4 + idx)
    const vals = [p.id, p.subprocesso, p.descricao, p.severidade, p.recomendacao]
    vals.forEach((v, i) => {
      const c = row.getCell(i + 1)
      c.value = v ?? ''
      c.font = { name: FONTE, size: 9 }
      c.alignment = { vertical: 'top', horizontal: i === 0 || i === 3 ? 'center' : 'left', wrapText: true }
      c.border = bordas
    })
    const [cor, bg] = SEV[p.severidade] || ['FF1F2937', 'FFFFFFFF']
    const cSev = row.getCell(4)
    cSev.fill = fill(bg)
    cSev.font = { name: FONTE, size: 9, bold: true, color: { argb: cor } }
  })

  // ── Aba 4: Legenda ──
  const ws4 = wb.addWorksheet('Legenda')
  cabecalho(ws4, 'Legenda e Taxonomia', 'Referências metodológicas do módulo de Mapeamento de Processos', 3)
  ws4.getColumn(1).width = 26; ws4.getColumn(2).width = 70
  const blocos = [
    ['CATEGORIAS COSO ERM 2017', [['Estratégico', 'Riscos ligados a objetivos estratégicos e de mercado'], ['Operacional', 'Riscos de execução dos processos, pessoas e sistemas'], ['Financeiro/Reporte', 'Riscos de integridade das informações financeiras e gerenciais'], ['Conformidade', 'Riscos de descumprimento de leis, normas e políticas']]],
    ['ESCALAS (ISO 31000)', [['Probabilidade 1-5', '1 Rara · 2 Improvável · 3 Possível · 4 Provável · 5 Quase certa'], ['Impacto 1-5', '1 Insignificante · 2 Menor · 3 Moderado · 4 Maior · 5 Catastrófico'], ['Criticidade (P×I)', '1-4 Baixo · 5-9 Médio · 10-16 Alto · 17-25 Crítico']]],
    ['TIPOS DE CONTROLE', [['Preventivo', 'Atua antes do evento, evitando a ocorrência'], ['Detectivo', 'Identifica o evento após a ocorrência'], ['Corretivo', 'Corrige efeitos do evento ocorrido']]],
    ['RACI', [['R — Responsável', 'Executa a atividade'], ['A — Aprovador', 'Responde pelo resultado (um por atividade)'], ['C — Consultado', 'Contribui com informação antes da execução'], ['I — Informado', 'É comunicado do resultado']]],
  ]
  let r4 = 4
  for (const [tit, linhas] of blocos) {
    const c = ws4.getCell(r4, 1)
    c.value = tit
    c.font = { name: FONTE, size: 10, bold: true, color: { argb: 'FFA6512F' } }
    r4++
    for (const [a, b] of linhas) {
      ws4.getCell(r4, 1).value = a
      ws4.getCell(r4, 1).font = { name: FONTE, size: 9, bold: true, color: { argb: 'FF00203E' } }
      ws4.getCell(r4, 2).value = b
      ws4.getCell(r4, 2).font = { name: FONTE, size: 9 }
      r4++
    }
    r4++
  }

  return wb.xlsx.writeBuffer()
}
