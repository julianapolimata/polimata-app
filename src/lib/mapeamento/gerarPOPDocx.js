// ═══════════════════════════════════════════════════════════════════════════
// gerarPOPDocx.js — gera o POP (Procedimento Operacional Padrão) no formato
// Polímata enxuto (v1.2) a partir da estrutura JSON do mapeamento.
// ═══════════════════════════════════════════════════════════════════════════
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak,
} from 'docx'

const NAVY = '00203E'
const NAVY_DEEP = '00112C'
const COPPER = 'A6512F'
const COPPER_LT = 'CC915E'
const CINZA = '4B5563'

const F = 'Montserrat'

const run = (text, opts = {}) => new TextRun({ text, font: F, size: 20, color: '1F2937', ...opts })
const p = (text, opts = {}, runOpts = {}) =>
  new Paragraph({ children: [run(text, runOpts)], spacing: { after: 120, line: 300 }, ...opts })

const h1 = (text) => new Paragraph({
  children: [run(text, { size: 30, bold: true, color: NAVY })],
  spacing: { before: 360, after: 200 },
  border: { bottom: { color: COPPER_LT, style: BorderStyle.SINGLE, size: 6, space: 4 } },
})
const h2 = (text) => new Paragraph({
  children: [run(text, { size: 24, bold: true, color: COPPER })],
  spacing: { before: 280, after: 140 },
})
const h3 = (text) => new Paragraph({
  children: [run(text, { size: 21, bold: true, color: NAVY })],
  spacing: { before: 200, after: 100 },
})

const bordaTab = { style: BorderStyle.SINGLE, size: 4, color: 'D8D2C4' }
const bordasTab = { top: bordaTab, bottom: bordaTab, left: bordaTab, right: bordaTab, insideHorizontal: bordaTab, insideVertical: bordaTab }

const cel = (text, { header = false, fill = null, bold = false, width = null } = {}) => new TableCell({
  children: [new Paragraph({
    children: [run(String(text ?? ''), { size: 18, bold: header || bold, color: header ? 'FFFFFF' : '1F2937' })],
    spacing: { before: 40, after: 40 },
  })],
  shading: header ? { type: ShadingType.SOLID, fill: NAVY } : fill ? { type: ShadingType.SOLID, fill } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
})

const tabela = (linhas, { headerRow = true, widths = null } = {}) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: bordasTab,
  rows: linhas.map((linha, li) => new TableRow({
    children: linha.map((c, ci) => cel(c, {
      header: headerRow && li === 0,
      fill: !headerRow || li > 0 ? (li % 2 === 0 ? 'FAF8F3' : null) : null,
      width: widths ? widths[ci] : null,
    })),
  })),
})

const espaco = () => new Paragraph({ children: [], spacing: { after: 120 } })

export async function gerarPOPDocx(estrutura, { nomeProcesso, clienteNome, codigoBase, autor }) {
  const e = estrutura || {}
  const proc = e.processo || {}
  const hoje = new Date().toLocaleDateString('pt-BR')
  const filhos = []

  // ── Capa ──
  filhos.push(
    new Paragraph({ children: [run('POLÍMATA', { size: 40, bold: true, color: NAVY_DEEP })], alignment: AlignmentType.CENTER, spacing: { before: 2200, after: 60 } }),
    new Paragraph({ children: [run('G O V E R N A N Ç A   ·   R I S C O S   ·   C O M P L I A N C E', { size: 16, color: COPPER })], alignment: AlignmentType.CENTER, spacing: { after: 1400 } }),
    new Paragraph({ children: [run('PROCEDIMENTO OPERACIONAL PADRÃO', { size: 22, color: CINZA })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    new Paragraph({ children: [run(nomeProcesso, { size: 48, bold: true, color: NAVY })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [run(clienteNome, { size: 24, color: COPPER })], alignment: AlignmentType.CENTER, spacing: { after: 2000 } }),
    new Paragraph({ children: [run(`${codigoBase} · Versão 1.0 · ${hoje}`, { size: 18, color: CINZA })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [run('Documento gerado pelo módulo Mapeamento de Processos — revisão do consultor pendente', { size: 16, color: CINZA })], alignment: AlignmentType.CENTER, spacing: { before: 100 } }),
    new Paragraph({ children: [new PageBreak()] }),
  )

  // ── A. Identificação ──
  filhos.push(h1('A. Identificação'))
  filhos.push(h2('A.1 O que é este documento'))
  filhos.push(p(`Este Procedimento Operacional Padrão (POP) descreve, de forma clara e prática, como funciona o processo de ${nomeProcesso} na ${clienteNome}: quem faz o quê, quando, em que sistema e seguindo quais regras. Foi elaborado a partir de entrevista de levantamento com os executores do processo, estruturada pela metodologia Polímata de mapeamento baseado em risco.`))
  filhos.push(tabela([
    ['Cliente:', clienteNome],
    ['Código:', codigoBase],
    ['Versão:', '1.0'],
    ['Data de Emissão:', hoje],
    ['Classificação:', 'Confidencial — Uso Restrito'],
  ], { headerRow: false, widths: [28, 72] }))
  filhos.push(h2('A.2 Histórico de versões'))
  filhos.push(tabela([
    ['Versão', 'Data', 'Autor', 'Descrição da mudança', 'Aprovador'],
    ['1.0', hoje, autor || 'Polímata', 'Versão inicial — gerada a partir do levantamento por áudio', '[«Nome — Cliente»]'],
  ]))
  filhos.push(h2('A.3 Aprovação'))
  filhos.push(tabela([
    ['Papel', 'Nome', 'Cargo / Área', 'Data'],
    ['Elaborado por', autor || '[«Consultor Polímata»]', 'Polímata Consultoria', hoje],
    ['Validado por', '[«Dono do Processo»]', '[«Cargo»]', '[«DD/MM/AAAA»]'],
    ['Aprovado por', '[«Sponsor»]', '[«Diretoria»]', '[«DD/MM/AAAA»]'],
  ]))
  if (e.glossario?.length) {
    filhos.push(h2('A.4 Glossário'))
    filhos.push(tabela([['Termo', 'Definição'], ...e.glossario.map((g) => [g.termo, g.definicao])], { widths: [25, 75] }))
  }

  // ── B. Contexto ──
  filhos.push(h1('B. Contexto'))
  if (proc.contexto) { filhos.push(h2('B.1 Onde o processo se encaixa')); filhos.push(p(proc.contexto)) }
  if (proc.objetivo) { filhos.push(h2('B.2 Objetivo')); filhos.push(p(proc.objetivo)) }
  if (proc.escopo_incluido?.length || proc.escopo_excluido?.length) {
    filhos.push(h2('B.3 Escopo'))
    if (proc.escopo_incluido?.length) {
      filhos.push(h3('O que ESTÁ incluído'))
      proc.escopo_incluido.forEach((i) => filhos.push(p('•  ' + i)))
    }
    if (proc.escopo_excluido?.length) {
      filhos.push(h3('O que NÃO ESTÁ incluído'))
      proc.escopo_excluido.forEach((i) => filhos.push(p('•  ' + i)))
    }
  }

  // ── C. Quem participa ──
  filhos.push(h1('C. Quem participa, como e com quais ferramentas'))
  if (proc.visao_geral_passos?.length) {
    filhos.push(h2(`C.1 Visão geral em ${proc.visao_geral_passos.length} passos`))
    proc.visao_geral_passos.forEach((passo, i) => filhos.push(p(`${i + 1}.  ${passo}`)))
  }
  if (e.atores?.length) {
    filhos.push(h2('C.2 Quem participa'))
    filhos.push(tabela([['Papel', 'Cargo / Área', 'O que faz'], ...e.atores.map((a) => [a.nome, a.cargo_area || '', a.papel_resumo || ''])], { widths: [25, 25, 50] }))
  }
  if (e.sistemas?.length) {
    filhos.push(h2('C.3 Sistemas usados'))
    filhos.push(tabela([['Sistema', 'Para que é usado'], ...e.sistemas.map((s) => [s.nome, s.uso || ''])], { widths: [25, 75] }))
  }
  filhos.push(h2('C.4 Fluxograma'))
  filhos.push(p('O fluxograma do processo, com as raias funcionais, acompanha este POP em arquivo draw.io (também gerado pelo módulo). Recomenda-se exportar em A3 para boa leitura.'))
  filhos.push(p('[ ESPAÇO PARA FLUXOGRAMA ]', { alignment: AlignmentType.CENTER }, { color: CINZA, size: 18 }))

  // ── D. Passo a passo ──
  filhos.push(h1('D. Como o processo acontece, passo a passo'))
  for (const sp of e.subprocessos || []) {
    filhos.push(h2(`${sp.id} ${sp.nome}`))
    if (sp.resumo_uma_frase) { filhos.push(h3(`${sp.id}.1 Como funciona, em uma frase`)); filhos.push(p(sp.resumo_uma_frase)) }
    if (sp.passos?.length) {
      filhos.push(h3(`${sp.id}.2 Passo a passo`))
      for (const passo of sp.passos) {
        filhos.push(p(`${passo.id} — ${passo.titulo}`, {}, { bold: true, color: NAVY }))
        const detalhe = [passo.descricao, passo.ator ? `Quem faz: ${passo.ator}.` : '', passo.sistema ? `Onde: ${passo.sistema}.` : ''].filter(Boolean).join(' ')
        filhos.push(p(detalhe))
      }
    }
    if (sp.excecoes?.length) {
      filhos.push(h3(`${sp.id}.3 Situações fora do padrão`))
      for (const ex of sp.excecoes) filhos.push(p(`${ex.situacao}: ${ex.tratamento}`))
    }
    if (sp.pontos_atencao?.length) {
      filhos.push(h3(`${sp.id}.4 Pontos de atenção identificados`))
      filhos.push(tabela([['ID', 'Descrição', 'Severidade', 'Recomendação'], ...sp.pontos_atencao.map((pa) => [pa.id, pa.descricao, pa.severidade, pa.recomendacao || ''])], { widths: [10, 40, 14, 36] }))
      filhos.push(espaco())
    }
    if (sp.indicadores?.length) {
      filhos.push(h3(`${sp.id}.5 Indicadores`))
      filhos.push(tabela([['Indicador', 'Tipo', 'Descrição'], ...sp.indicadores.map((ind) => [ind.nome, ind.tipo || '', ind.descricao || ''])], { widths: [30, 12, 58] }))
      filhos.push(espaco())
    }
  }

  // ── E. Riscos e controles ──
  if (e.riscos?.length) {
    filhos.push(h1('E. Síntese de riscos e controles'))
    filhos.push(p('A matriz completa de riscos e controles (COSO ERM + ISO 31000), com avaliação de probabilidade, impacto e planos de ação, acompanha este POP em planilha própria. Abaixo, a síntese.'))
    filhos.push(tabela([
      ['ID', 'Atividade', 'Risco', 'Criticidade', 'Controle existente'],
      ...e.riscos.map((r) => {
        const s = (r.probabilidade || 0) * (r.impacto || 0)
        const crit = s >= 17 ? 'Crítico' : s >= 10 ? 'Alto' : s >= 5 ? 'Médio' : 'Baixo'
        return [r.id, r.atividade_ref || '', r.descricao, crit, r.controles_existentes || '—']
      }),
    ], { widths: [9, 11, 40, 12, 28] }))
  }

  // ── F. Lacunas ──
  if (e.lacunas?.length) {
    filhos.push(h1('F. Lacunas do levantamento — validar com o entrevistado'))
    filhos.push(p('Os pontos abaixo não ficaram claros na entrevista e precisam ser confirmados antes da emissão da versão final deste POP.', {}, { color: COPPER }))
    e.lacunas.forEach((l, i) => filhos.push(p(`${i + 1}.  ${l}`)))
  }

  const doc = new Document({
    creator: 'Polímata GRC',
    styles: { default: { document: { run: { font: F, size: 20 } } } },
    sections: [{ properties: {}, children: filhos }],
  })
  return Packer.toBlob(doc)
}
