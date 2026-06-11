// ═══════════════════════════════════════════════════════════════════════════
// gerarFluxoDrawio.js — gera XML draw.io (BPMN com pool/lanes) a partir da
// estrutura JSON do mapeamento. Abre direto em app.diagrams.net.
// ═══════════════════════════════════════════════════════════════════════════

const NAVY = '#00203E'
const COPPER = '#CC915E'
const CREAM = '#F3EEE4'

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function quebrar(txt, max = 24) {
  const palavras = String(txt || '').split(' ')
  const linhas = []
  let atual = ''
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length > max) { if (atual) linhas.push(atual); atual = p }
    else atual = (atual + ' ' + p).trim()
  }
  if (atual) linhas.push(atual)
  return linhas.join('&#10;')
}

/**
 * estrutura: JSON do mapeamento (campos fluxo, subprocessos, riscos)
 * Retorna string XML .drawio
 */
export function gerarFluxoDrawio(estrutura, nomeProcesso) {
  const fluxo = estrutura?.fluxo || {}
  const lanes = Array.isArray(fluxo.lanes) && fluxo.lanes.length ? fluxo.lanes : [{ ator: 'Processo', atividades: [] }]
  const seq = Array.isArray(fluxo.sequencia) ? fluxo.sequencia : []
  const gateways = Array.isArray(fluxo.gateways) ? fluxo.gateways : []

  // títulos das atividades
  const titulos = {}
  for (const sp of estrutura?.subprocessos || [])
    for (const p of sp.passos || []) titulos[p.id] = p.titulo || p.id
  for (const g of gateways) titulos[g.id] = g.pergunta || g.id

  // riscos por atividade
  const riscosPorAtv = {}
  for (const r of estrutura?.riscos || []) {
    const ref = r.atividade_ref
    if (!ref) continue
    if (!riscosPorAtv[ref]) riscosPorAtv[ref] = []
    riscosPorAtv[ref].push(r.id)
  }

  // lane de cada nó
  const laneDe = {}
  lanes.forEach((l, i) => (l.atividades || []).forEach((a) => { laneDe[a] = i }))
  const gwLane = (g) => laneDe[g.apos] ?? 0
  gateways.forEach((g) => { if (laneDe[g.id] === undefined) laneDe[g.id] = gwLane(g) })

  // colunas por ordem topológica simples (ordem de aparição na sequência)
  const col = { inicio: 0 }
  let maxCol = 0
  for (const s of seq) {
    const cDe = col[s.de] ?? 0
    if (col[s.de] === undefined) col[s.de] = cDe
    const cPara = Math.max(col[s.para] ?? 0, cDe + 1)
    col[s.para] = cPara
    if (cPara > maxCol) maxCol = cPara
  }
  // nós sem posição (não citados na sequência): empilha no fim
  const todosNos = new Set([...Object.keys(laneDe), ...gateways.map((g) => g.id)])
  for (const n of todosNos) if (col[n] === undefined) col[n] = ++maxCol

  const COL_W = 210, LANE_H = 150, LANE_LABEL = 36, POOL_X = 40, POOL_Y = 40
  const poolW = LANE_LABEL + 60 + (maxCol + 1) * COL_W + 80
  const poolH = lanes.length * LANE_H

  const xDe = (n) => 60 + (col[n] ?? 0) * COL_W
  const yLane = (n) => (laneDe[n] ?? 0)

  let cells = ''
  // pool
  cells += `<mxCell id="pool" value="${esc(nomeProcesso)}" style="swimlane;html=1;horizontal=0;startSize=28;fillColor=${NAVY};fontColor=#FFFFFF;swimlaneFillColor=#FFFFFF;fontSize=13;fontStyle=1" vertex="1" parent="1"><mxGeometry x="${POOL_X}" y="${POOL_Y}" width="${poolW}" height="${poolH}" as="geometry"/></mxCell>`
  // lanes
  lanes.forEach((l, i) => {
    cells += `<mxCell id="lane${i}" value="${esc(quebrar(l.ator, 18))}" style="swimlane;html=1;horizontal=0;startSize=${LANE_LABEL};fillColor=${i % 2 ? '#FFFFFF' : CREAM};fontColor=${NAVY};fontSize=11" vertex="1" parent="pool"><mxGeometry x="28" y="${i * LANE_H}" width="${poolW - 28}" height="${LANE_H}" as="geometry"/></mxCell>`
  })

  const noLane = (n) => `lane${yLane(n)}`
  const Y_MEIO = LANE_H / 2

  // eventos início/fim
  const evento = (id, label, x, lane, fim = false) =>
    `<mxCell id="${id}" value="${esc(label)}" style="ellipse;html=1;whiteSpace=wrap;fillColor=${fim ? '#F8CECC' : '#D5E8D4'};strokeColor=${fim ? '#B85450' : '#82B366'};strokeWidth=${fim ? 3 : 2};fontSize=9;verticalLabelPosition=bottom;verticalAlign=top" vertex="1" parent="${lane}"><mxGeometry x="${x}" y="${Y_MEIO - 20}" width="40" height="40" as="geometry"/></mxCell>`

  if (todosNos.has('inicio') || seq.some((s) => s.de === 'inicio')) {
    if (laneDe['inicio'] === undefined) laneDe['inicio'] = 0
    cells += evento('inicio', 'Início', xDe('inicio'), noLane('inicio'))
  }
  for (const fimId of ['fim_ok', 'fim_nok', 'fim']) {
    if (seq.some((s) => s.para === fimId)) {
      if (laneDe[fimId] === undefined) {
        const ult = seq.filter((s) => s.para === fimId).pop()
        laneDe[fimId] = laneDe[ult?.de] ?? 0
      }
      cells += evento(fimId, fimId === 'fim_nok' ? 'Fim (não conforme)' : 'Fim', xDe(fimId), noLane(fimId), true)
    }
  }

  // atividades
  for (const n of todosNos) {
    if (n === 'inicio' || n.startsWith('fim')) continue
    const isGw = gateways.some((g) => g.id === n)
    if (isGw) {
      cells += `<mxCell id="${n}" value="${esc(quebrar(titulos[n], 16))}" style="rhombus;html=1;whiteSpace=wrap;fillColor=#FFF2CC;strokeColor=#D6B656;fontSize=9" vertex="1" parent="${noLane(n)}"><mxGeometry x="${xDe(n) - 10}" y="${Y_MEIO - 40}" width="100" height="80" as="geometry"/></mxCell>`
    } else {
      const riscos = riscosPorAtv[n]
      cells += `<mxCell id="${n}" value="&lt;b&gt;${esc(n)}&lt;/b&gt;&#10;${esc(quebrar(titulos[n]))}" style="rounded=1;html=1;whiteSpace=wrap;arcSize=12;fillColor=#FFFFFF;strokeColor=${NAVY};strokeWidth=1.5;fontSize=10;fontColor=${NAVY}" vertex="1" parent="${noLane(n)}"><mxGeometry x="${xDe(n) - 20}" y="${Y_MEIO - 35}" width="160" height="70" as="geometry"/></mxCell>`
      if (riscos?.length) {
        cells += `<mxCell id="nota_${n}" value="${esc('⚠ ' + riscos.join(', '))}" style="shape=note;html=1;whiteSpace=wrap;backgroundOutline=1;darkOpacity=0.05;fillColor=#FFF2CC;strokeColor=#D6B656;fontSize=8;size=12" vertex="1" parent="${noLane(n)}"><mxGeometry x="${xDe(n) + 90}" y="${Y_MEIO - 68}" width="${Math.max(70, riscos.join(', ').length * 5)}" height="28" as="geometry"/></mxCell>`
      }
    }
  }

  // arestas
  seq.forEach((s, i) => {
    const para = s.para === 'fim' && !todosNos.has('fim') ? 'fim_ok' : s.para
    cells += `<mxCell id="e${i}" value="${esc(s.condicao || '')}" style="edgeStyle=orthogonalEdgeStyle;html=1;rounded=1;strokeColor=${COPPER};strokeWidth=1.5;fontSize=9;fontColor=#A6512F;labelBackgroundColor=#FFFFFF" edge="1" parent="pool" source="${s.de}" target="${para}"><mxGeometry relative="1" as="geometry"/></mxCell>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Polimata GRC" type="device">
  <diagram id="fluxo1" name="${esc(nomeProcesso)}">
    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="900" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`
}
