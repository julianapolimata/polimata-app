// ═══════════════════════════════════════════════════════════════════════════
// artefatos.js — geração/download dos entregáveis do mapeamento (POP, matriz,
// fluxograma) a partir do `estrutura`. Usado pela visão do consultor e do cliente.
// ═══════════════════════════════════════════════════════════════════════════
import { gerarPOPDocx } from './gerarPOPDocx'
import { gerarMatrizXlsx } from './gerarMatrizXlsx'
import { gerarFluxoDrawio } from './gerarFluxoDrawio'

export function siglaCliente(nome) {
  const limpo = (nome || 'CLI').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z]/g, '')
  return (limpo.slice(0, 3) || 'CLI').toUpperCase()
}

export function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function codigoBaseDe(map, clienteNome) {
  return `${siglaCliente(clienteNome)}-${(map.sigla_processo || 'PRO').toUpperCase()}-POP-001`
}

/** Gera e baixa um artefato. tipo: 'pop' | 'matriz' | 'fluxo'. */
export async function baixarArtefato(map, tipo, clienteNome) {
  const codigoBase = codigoBaseDe(map, clienteNome)
  const base = `${codigoBase.replace('POP-001', '')}${(map.nome_processo || 'processo').replace(/[^\wÀ-ú ]/g, '').replace(/ +/g, '_')}`
  if (tipo === 'pop') {
    const blob = await gerarPOPDocx(map.estrutura, { nomeProcesso: map.nome_processo, clienteNome, codigoBase, autor: 'Polímata Consultoria' })
    baixarBlob(blob, `POP_${base}.docx`)
  } else if (tipo === 'matriz') {
    const buf = await gerarMatrizXlsx(map.estrutura, { nomeProcesso: map.nome_processo, clienteNome, codigoBase })
    baixarBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Matriz_Riscos_RACI_${base}.xlsx`)
  } else if (tipo === 'fluxo') {
    const xml = gerarFluxoDrawio(map.estrutura, map.nome_processo)
    baixarBlob(new Blob([xml], { type: 'application/xml' }), `Fluxograma_${base}.drawio`)
  }
}
