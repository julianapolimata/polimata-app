// ─── Utilitário central de Passos de Teste + sync de Solicitações ───────────
// Cada passo de um controle pode opcionalmente gerar uma solicitação de
// evidência. A caixinha do passo (gerar_solicitacao) é o único gatilho;
// marcou → INSERT em solicitacoes, desmarcou → UPDATE para 'cancelada'.
//
// Regras:
//   - 1 passo → no máximo 1 solicitação ATIVA (status <> 'cancelada')
//   - Reabrir uma solicitação cancelada: INSERT nova (não reanima a antiga)
//   - Spec: project_solicitacoes_v2_spec_12mai2026.md

import { supabase } from './supabase'
import { getFaseInfo } from './fases'

// Carrega os passos persistidos de um controle, ordenados.
export async function loadPassosTeste(controleId) {
  if (!controleId) return []
  const { data, error } = await supabase
    .from('controle_passos_teste')
    .select('id, ordem, descricao, gerar_solicitacao')
    .eq('controle_id', controleId)
    .order('ordem', { ascending: true })
  if (error) {
    console.error('loadPassosTeste:', error)
    return []
  }
  return data || []
}

// Carrega solicitações ativas (não canceladas) de um conjunto de passos.
async function loadSolicitacoesAtivasDosPassos(passoIds) {
  if (!passoIds.length) return []
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('id, passo_teste_id, status')
    .in('passo_teste_id', passoIds)
    .neq('status', 'cancelada')
  if (error) {
    console.error('loadSolicitacoesAtivasDosPassos:', error)
    return []
  }
  return data || []
}

// Gera defaults para uma nova solicitação a partir de um passo + controle.
function montarSolicitacaoFromPasso({ passo, controle, projetoId }) {
  const desc = (passo.descricao || '').trim()
  const tituloCurto = desc.length > 60 ? desc.slice(0, 60) + '…' : desc
  const fase = getFaseInfo(controle)?.codigo || null
  return {
    projeto_id: projetoId,
    controle_id: controle?.id || null,
    area_id: controle?.area_id || null,
    fase,
    titulo: `Evidência: ${tituloCurto || '(sem descrição)'}`,
    descricao: desc,
    responsavel_cliente_nome: '',
    responsavel_cliente_email: '',
    prazo: null,
    status: 'aguardando',
    passo_teste_id: passo.id,
  }
}

/**
 * Sincroniza a tabela controle_passos_teste com o array do front e
 * propaga as caixinhas marcadas para a tabela solicitacoes.
 *
 * @param {Object} params
 * @param {Object} params.controle  registro da mrc já com id
 * @param {Array}  params.passos    [{ id?, descricao, gerar_solicitacao }]
 * @param {string} params.projetoId
 * @returns {Promise<{passosSalvos: Array}>}
 */
export async function syncPassosESolicitacoes({ controle, passos, projetoId }) {
  if (!controle?.id) throw new Error('syncPassosESolicitacoes: controle.id obrigatório')

  // 1. Carrega o estado atual no banco
  const antigos = await loadPassosTeste(controle.id)

  // 2. Separa novos (sem id) e existentes (com id) do front
  const desejados = (passos || []).filter(p => (p.descricao || '').trim() !== '' || p.id)
  const idsDesejados = new Set(desejados.filter(p => p.id).map(p => p.id))

  // 3. DELETE: passos que sumiram do front (linha removida pelo botão ✕)
  const idsParaDeletar = antigos.map(p => p.id).filter(id => !idsDesejados.has(id))
  if (idsParaDeletar.length) {
    // Antes de deletar, cancelar solicitação ativa (se houver)
    await supabase
      .from('solicitacoes')
      .update({ status: 'cancelada' })
      .in('passo_teste_id', idsParaDeletar)
      .neq('status', 'cancelada')
    await supabase.from('controle_passos_teste').delete().in('id', idsParaDeletar)
  }

  // 4. UPSERT dos passos desejados (preserva ordem do front)
  const linhasUpsert = desejados.map((p, idx) => ({
    id: p.id || undefined,
    controle_id: controle.id,
    ordem: idx + 1,
    descricao: (p.descricao || '').trim(),
    gerar_solicitacao: !!p.gerar_solicitacao,
  }))

  const passosSalvos = []
  for (const linha of linhasUpsert) {
    if (linha.id) {
      const { data, error } = await supabase
        .from('controle_passos_teste')
        .update({ ordem: linha.ordem, descricao: linha.descricao, gerar_solicitacao: linha.gerar_solicitacao })
        .eq('id', linha.id)
        .select()
        .single()
      if (error) { console.error('update passo:', error); continue }
      passosSalvos.push(data)
    } else {
      const { data, error } = await supabase
        .from('controle_passos_teste')
        .insert([linha])
        .select()
        .single()
      if (error) { console.error('insert passo:', error); continue }
      passosSalvos.push(data)
    }
  }

  // 5. Sync solicitações
  const passoIds = passosSalvos.map(p => p.id)
  const ativasAtuais = await loadSolicitacoesAtivasDosPassos(passoIds)
  const ativasPorPasso = Object.fromEntries(ativasAtuais.map(s => [s.passo_teste_id, s]))

  for (const passo of passosSalvos) {
    const temAtiva = !!ativasPorPasso[passo.id]
    if (passo.gerar_solicitacao && !temAtiva) {
      // INSERT nova solicitação
      const payload = montarSolicitacaoFromPasso({ passo, controle, projetoId })
      const { error } = await supabase.from('solicitacoes').insert([payload])
      if (error) console.error('insert solicitação:', error)
    } else if (!passo.gerar_solicitacao && temAtiva) {
      // CANCELA a solicitação ativa
      const { error } = await supabase
        .from('solicitacoes')
        .update({ status: 'cancelada' })
        .eq('id', ativasPorPasso[passo.id].id)
      if (error) console.error('cancela solicitação:', error)
    }
    // (marcado + já tinha ativa) ou (desmarcado + não tinha): no-op
  }

  return { passosSalvos }
}

// Helper: linha em branco padrão para a UI
export function criarPassoVazio() {
  return { id: null, descricao: '', gerar_solicitacao: false, _local: true }
}
