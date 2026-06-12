// Centros de Custo — estrutura hierárquica (pai → filhos)
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useOrcDados, PageHeader, Card, BotaoVerde, ErroBox, VERDE } from './_shared'

export default function CentrosCusto({ projeto }) {
  const d = useOrcDados(projeto, new Date().getFullYear())
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [gestor, setGestor] = useState('')
  const [paiId, setPaiId] = useState('')

  async function adicionar() {
    if (!nome.trim()) return
    const { error } = await supabase.from('orc_centros_custo').insert({
      projeto_id: projeto.id, nome: nome.trim(), codigo: codigo.trim() || null, gestor: gestor.trim() || null, pai_id: paiId || null,
    })
    if (error) { d.setErro(error.message); return }
    setNome(''); setCodigo(''); setGestor(''); d.reload()
  }
  async function toggleAtivo(cc) {
    await supabase.from('orc_centros_custo').update({ ativo: !cc.ativo }).eq('id', cc.id); d.reload()
  }

  const raizes = d.centros.filter(c => !c.pai_id)
  const filhosDe = (id) => d.centros.filter(c => c.pai_id === id)

  return (
    <div style={{ padding: '20px 28px 40px', maxWidth: 880, margin: '0 auto' }}>
      <PageHeader projeto={projeto} titulo="Centros de Custo" subtitulo="Estrutura hierárquica para alocar o realizado e o orçado" />
      <ErroBox erro={d.erro} onClose={() => d.setErro('')} />

      <Card titulo="Novo centro de custo">
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Código</label>
            <input className="input-light" style={{ width: 100 }} value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="CC-001" /></div>
          <div style={{ flex: 1, minWidth: 160 }}><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Nome</label>
            <input className="input-light" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionar()} placeholder="Ex: Produção, Marcenaria…" /></div>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Gestor</label>
            <input className="input-light" style={{ width: 160 }} value={gestor} onChange={e => setGestor(e.target.value)} placeholder="opcional" /></div>
          <div><label style={{ fontSize: 11.5, color: 'var(--lt-text3)', display: 'block', marginBottom: 4 }}>Subordinado a</label>
            <select className="input-light" style={{ width: 170 }} value={paiId} onChange={e => setPaiId(e.target.value)}>
              <option value="">— nível raiz —</option>
              {raizes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select></div>
          <BotaoVerde onClick={adicionar} disabled={!nome.trim()}>+ Adicionar</BotaoVerde>
        </div>
      </Card>

      <Card titulo="Estrutura">
        {!raizes.length && <div style={{ fontSize: 12.5, color: 'var(--lt-text3)' }}>Nenhum centro de custo ainda. O uso é opcional — o orçamento funciona por categoria mesmo sem CC.</div>}
        {raizes.map(r => (
          <div key={r.id} style={{ marginBottom: 14 }}>
            <div style={{ padding: '10px 14px', borderLeft: '3px solid ' + VERDE, background: 'var(--lt-bg)', borderRadius: '0 8px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: r.ativo ? 1 : 0.5 }}>
              <div><strong>{r.nome}</strong> <span style={{ fontSize: 11, color: 'var(--lt-text3)' }}>{[r.codigo, r.gestor && 'Gestor: ' + r.gestor].filter(Boolean).join(' • ')}</span></div>
              <button onClick={() => toggleAtivo(r)} style={{ background: 'none', border: '1px solid var(--lt-brd)', borderRadius: 6, padding: '2px 10px', fontSize: 11, cursor: 'pointer', color: 'var(--lt-text3)', fontFamily: 'inherit' }}>{r.ativo ? 'Inativar' : 'Reativar'}</button>
            </div>
            {filhosDe(r.id).map(f => (
              <div key={f.id} style={{ padding: '8px 14px 8px 34px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--lt-brd)', opacity: f.ativo ? 1 : 0.5 }}>
                <div><strong style={{ fontSize: 13 }}>{f.nome}</strong> <span style={{ fontSize: 11, color: 'var(--lt-text3)' }}>{[f.codigo, f.gestor && 'Gestor: ' + f.gestor].filter(Boolean).join(' • ')}</span></div>
                <button onClick={() => toggleAtivo(f)} style={{ background: 'none', border: 'none', fontSize: 11, cursor: 'pointer', color: 'var(--lt-text3)', fontFamily: 'inherit' }}>{f.ativo ? '✕' : '↻'}</button>
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  )
}
