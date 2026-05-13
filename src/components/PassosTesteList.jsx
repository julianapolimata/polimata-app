import React from 'react'

/**
 * Lista editável de passos de teste de um controle.
 * Componente controlado: o pai mantém o array em state e passa via props.
 * Cada item: { id?: uuid, descricao: string, gerar_solicitacao: bool }
 *
 * Caixinha = "Incluir na lista de Solicitações" — quando marcada e o controle
 * for salvo, o passo gera (ou mantém) uma solicitação de evidência.
 */
const PassosTesteList = ({ passos, onChange, disabled = false }) => {
  function setItem(idx, patch) {
    const novo = passos.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    onChange(novo)
  }
  function addItem() {
    onChange([...passos, { id: null, descricao: '', gerar_solicitacao: false, _local: true }])
  }
  function removeItem(idx) {
    onChange(passos.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#00203E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid #CC915E' }}>
        Passos de Teste
      </div>
      <div style={{ fontSize: 11, color: 'var(--lt-text3, #5D6E80)', lineHeight: 1.55, marginBottom: '1rem' }}>
        Liste os passos do teste deste controle. Para os passos que precisarem de evidência do cliente,
        marque <strong>“Incluir na lista de Solicitações”</strong> — uma solicitação será criada
        automaticamente ao salvar. Desmarcar cancela a solicitação correspondente.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {passos.length === 0 && (
          <div style={{ padding: '12px 14px', border: '1px dashed #D0D0D0', borderRadius: 6, fontSize: 12, color: 'var(--lt-text3, #5D6E80)', background: '#FAFAFA' }}>
            Nenhum passo cadastrado. Clique em “+ Adicionar passo” para começar.
          </div>
        )}

        {passos.map((p, idx) => (
          <div key={p.id || `local-${idx}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 6, background: 'white' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 4, minWidth: 28 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--lt-text3, #5D6E80)' }}>{idx + 1}</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6, cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }} title="Incluir na lista de Solicitações">
              <input
                type="checkbox"
                checked={!!p.gerar_solicitacao}
                onChange={e => setItem(idx, { gerar_solicitacao: e.target.checked })}
                disabled={disabled}
                style={{ width: 16, height: 16, accentColor: '#CC915E', cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
              <span style={{ fontSize: 10, fontWeight: 600, color: p.gerar_solicitacao ? 'var(--copper-text, #A6512F)' : 'var(--lt-text3, #5D6E80)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                Solicitar
              </span>
            </label>
            <textarea
              value={p.descricao || ''}
              onChange={e => setItem(idx, { descricao: e.target.value })}
              disabled={disabled}
              placeholder={`Descrição do passo ${idx + 1}…`}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #D0D0D0', borderRadius: 4, fontFamily: 'Montserrat, sans-serif', fontSize: 13, minHeight: 52, resize: 'vertical', background: disabled ? '#F5F5F5' : 'white' }}
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              disabled={disabled}
              title="Remover passo"
              style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 4, padding: '4px 8px', fontSize: 14, color: '#7A8B9C', cursor: disabled ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={disabled}
        style={{
          marginTop: 12,
          background: 'transparent',
          border: '1px dashed #CC915E',
          color: 'var(--copper-text, #A6512F)',
          padding: '8px 14px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        + Adicionar passo
      </button>
    </div>
  )
}

export default PassosTesteList
