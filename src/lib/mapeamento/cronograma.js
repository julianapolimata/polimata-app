// ═══════════════════════════════════════════════════════════════════════════
// cronograma.js — ciclo de vida do mapeamento (visão de evolução do cliente).
// 6 etapas: Entrevista → Transcrição → Elaboração → Revisão → Aprovação → Vigente.
// O estado de cada etapa é derivado de `status` (pipeline) + `etapa`/`marcos`.
// ═══════════════════════════════════════════════════════════════════════════

export const ETAPAS = [
  { key: 'entrevista',  label: 'Entrevista',              desc: 'Entrevista de levantamento gravada e enviada.' },
  { key: 'transcricao', label: 'Transcrição',            desc: 'Áudio transcrito automaticamente.' },
  { key: 'elaboracao',  label: 'Elaboração dos documentos', desc: 'POP, fluxograma e matriz de riscos gerados.' },
  { key: 'revisao',     label: 'Revisão do consultor',   desc: 'Consultor Polímata revisa e valida o conteúdo.' },
  { key: 'aprovacao',   label: 'Aprovação do cliente',   desc: 'Você analisa e aprova o procedimento.' },
  { key: 'vigente',     label: 'Procedimento vigente',   desc: 'Procedimento aprovado e em vigor.' },
]

// estados possíveis por etapa
// 'concluido' | 'andamento' | 'ajustes' | 'pendente'
export const ESTADO_CFG = {
  concluido: { label: 'Concluído',  color: '#15803D', bg: 'rgba(34,197,94,0.12)', dot: '#22C55E' },
  andamento: { label: 'Em andamento', color: '#92400E', bg: 'rgba(234,179,8,0.15)', dot: '#EAB308' },
  ajustes:   { label: 'Ajustes solicitados', color: '#9A3412', bg: 'rgba(234,88,12,0.12)', dot: '#EA580C' },
  pendente:  { label: 'Pendente',   color: '#6B7280', bg: 'rgba(107,114,128,0.10)', dot: '#9CA3AF' },
}

const TRANSCRITO = ['transcrito', 'estruturando', 'estruturado']

/** Calcula o estado e a data de cada uma das 6 etapas. */
export function computeTimeline(map) {
  const status = map?.status || 'rascunho'
  const etapa = map?.etapa || 'producao'
  const m = map?.marcos || {}
  const erro = status === 'erro'
  const estruturado = status === 'estruturado'
  const atual = map?.atualizado_em || null

  const out = (key, estado, data) => ({ ...ETAPAS.find(e => e.key === key), estado, data: data || null })

  // 1) Entrevista
  const entrevista = out('entrevista', status === 'rascunho' ? 'andamento' : 'concluido', map?.criado_em)

  // 2) Transcrição
  const transcricao = out('transcricao',
    TRANSCRITO.includes(status) ? 'concluido' : (status === 'transcrevendo' ? 'andamento' : 'pendente'),
    m.transcricao || (TRANSCRITO.includes(status) ? atual : null))

  // 3) Elaboração dos documentos
  const elaboracao = out('elaboracao',
    estruturado ? 'concluido' : (status === 'estruturando' ? 'andamento' : 'pendente'),
    m.elaboracao || (estruturado ? atual : null))

  // 4) Revisão do consultor
  let revEstado = 'pendente'
  if (['aprovacao', 'vigente'].includes(etapa)) revEstado = 'concluido'
  else if (etapa === 'ajustes') revEstado = 'andamento'
  else if (estruturado) revEstado = 'andamento'
  const revisao = out('revisao', revEstado, m.aprovacao_enviada || null)

  // 5) Aprovação do cliente
  let aprEstado = 'pendente', aprData = null
  if (etapa === 'vigente') { aprEstado = 'concluido'; aprData = m.aprovado }
  else if (etapa === 'aprovacao') { aprEstado = 'andamento'; aprData = m.aprovacao_enviada }
  else if (etapa === 'ajustes') { aprEstado = 'ajustes'; aprData = m.ajustes }
  const aprovacao = out('aprovacao', aprEstado, aprData)

  // 6) Procedimento vigente
  const vigente = out('vigente', etapa === 'vigente' ? 'concluido' : 'pendente', m.aprovado || null)

  const stages = [entrevista, transcricao, elaboracao, revisao, aprovacao, vigente]
  if (erro) {
    const i = stages.findIndex(s => s.estado === 'andamento')
    if (i >= 0) stages[i] = { ...stages[i], estado: 'pendente', erro: true }
  }
  return stages
}

/** Rótulo amigável da etapa atual (para badges/listas do cliente). */
export function etapaAtualLabel(map) {
  const tl = computeTimeline(map)
  if ((map?.etapa || 'producao') === 'vigente') return 'Vigente'
  if ((map?.etapa) === 'ajustes') return 'Ajustes solicitados'
  if ((map?.etapa) === 'aprovacao') return 'Aguardando sua aprovação'
  const a = tl.find(s => s.estado === 'andamento')
  return a ? `Em ${a.label.toLowerCase()}` : 'Em produção'
}

export const podeAprovar = (map) => (map?.etapa || 'producao') === 'aprovacao'
export const docsProntos = (map) => map?.status === 'estruturado' && !!map?.estrutura
