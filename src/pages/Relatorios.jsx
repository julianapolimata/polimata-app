import { useState, useMemo } from 'react'
import { gerarRelatorioExcel } from '../lib/gerarRelatorio'

export default function Relatorios({ projeto, areasCalc, todosControles, clienteNome, projetoNome }) {
  const [secoes, setSecoes] = useState({ resumo: true, detalhamento: true, matriz: true, planos: true })
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroFase, setFiltroFase] = useState('')
  const [gerando, setGerando] = useState(false)

  const areas = useMemo(() => {
    if (!areasCalc) return []
    return [...areasCalc].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
  }, [areasCalc])

  const controlesFiltrados = useMemo(() => {
    let lista = todosControles || []
    if (filtroArea) lista = lista.filter(c => c.area_id === filtroArea)
    if (filtroSituacao) lista = lista.filter(c => (c.status_risco || 'existente') === filtroSituacao)
    if (filtroFase) {
      lista = lista.filter(c => {
        const r1 = (c.r1 || '').toLowerCase()
        if (filtroFase === 'f1') return !!c.r1 && r1 !== 'teste não realizado'
        if (filtroFase === 'f2') return !!c.r_ader && c.r_ader !== 'Teste Não Realizado'
        if (filtroFase === 'f3') return !!c.r3 && c.r3 !== 'Teste Não Realizado'
        if (filtroFase === 'f4') return !!c.r_f4c1 && c.r_f4c1 !== 'Teste Não Realizado'
        if (filtroFase === 'f5') return !!c.r_f5 && c.r_f5 !== 'Teste Não Realizado'
        return true
      })
    }
    return lista
  }, [todosControles, filtroArea, filtroSituacao, filtroFase])

  const toggle = key => setSecoes(prev => ({ ...prev, [key]: !prev[key] }))

  const handleGerar = async () => {
    if (controlesFiltrados.length === 0) return
    setGerando(true)
    try {
      await gerarRelatorioExcel({
        controles: controlesFiltrados,
        areas: areasCalc || [],
        secoes,
        clienteNome: clienteNome || '',
        projetoNome: projetoNome || '',
        projeto,
      })
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      alert('Erro ao gerar o relatório. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  const algumaSelecionada = Object.values(secoes).some(Boolean)

  const SECOES = [
    { key: 'resumo', num: '1', titulo: 'Resumo executivo', desc: 'KPIs globais, maturidade, distribuição por fase, controles efetivos vs inefetivos' },
    { key: 'detalhamento', num: '2', titulo: 'Detalhamento por área', desc: 'Cada área em aba separada com todos os controles, fases (F1–F5), resultados e status' },
    { key: 'matriz', num: '3', titulo: 'Matriz de calor', desc: 'Impacto × probabilidade com contagem de controles e formatação condicional' },
    { key: 'planos', num: '4', titulo: 'Planos de ação', desc: 'Controles com inconsistências, recomendações, prazos e responsáveis' },
  ]

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900, fontFamily: "'Montserrat', sans-serif" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--txt1)', margin: '0 0 4px' }}>
        Gerar relatório
      </h2>
      <p style={{ fontSize: 13, color: 'var(--txt3)', margin: '0 0 28px' }}>
        Configure as seções e filtros para gerar seu relatório em Excel
      </p>

      {/* Seções */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {SECOES.map(s => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            style={{
              background: secoes[s.key] ? 'rgba(204,145,94,0.06)' : 'var(--card-bg, #fff)',
              border: secoes[s.key] ? '1.5px solid var(--copper)' : '1px solid var(--brd)',
              borderRadius: 10,
              padding: '16px 18px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all .15s',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                width: 22, height: 22, borderRadius: 5,
                background: secoes[s.key] ? 'var(--copper)' : 'var(--brd)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: '#fff',
                transition: 'background .15s',
              }}>{s.num}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)' }}>{s.titulo}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--txt3)', margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ borderTop: '1px solid var(--brd)', paddingTop: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)', marginBottom: 14 }}>Filtros</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--txt3)', display: 'block', marginBottom: 4, fontWeight: 500 }}>Área</label>
            <select
              value={filtroArea}
              onChange={e => setFiltroArea(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', fontSize: 12,
                border: '1px solid var(--brd)', borderRadius: 6,
                background: 'var(--card-bg, #fff)', color: 'var(--txt1)',
                fontFamily: 'inherit',
              }}
            >
              <option value="">Todas as áreas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--txt3)', display: 'block', marginBottom: 4, fontWeight: 500 }}>Situação do risco</label>
            <select
              value={filtroSituacao}
              onChange={e => setFiltroSituacao(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', fontSize: 12,
                border: '1px solid var(--brd)', borderRadius: 6,
                background: 'var(--card-bg, #fff)', color: 'var(--txt1)',
                fontFamily: 'inherit',
              }}
            >
              <option value="">Todos</option>
              <option value="existente">Existente</option>
              <option value="evitado">Evitado</option>
              <option value="transferido">Transferido</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--txt3)', display: 'block', marginBottom: 4, fontWeight: 500 }}>Fase mínima concluída</label>
            <select
              value={filtroFase}
              onChange={e => setFiltroFase(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', fontSize: 12,
                border: '1px solid var(--brd)', borderRadius: 6,
                background: 'var(--card-bg, #fff)', color: 'var(--txt1)',
                fontFamily: 'inherit',
              }}
            >
              <option value="">Qualquer fase</option>
              <option value="f1">F1 — Diagnóstico</option>
              <option value="f2">F2 — Aderência</option>
              <option value="f3">F3 — Revisão Integral</option>
              <option value="f4">F4 — Auditoria Contínua</option>
              <option value="f5">F5 — Auditoria Independente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumo + Botão */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--brd)', paddingTop: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--txt3)' }}>
          <strong style={{ color: 'var(--txt1)' }}>{controlesFiltrados.length}</strong> controles selecionados
          {filtroArea && <span> · {areas.find(a => a.id === filtroArea)?.nome || 'Área'}</span>}
        </div>
        <button
          onClick={handleGerar}
          disabled={gerando || !algumaSelecionada || controlesFiltrados.length === 0}
          style={{
            padding: '10px 28px',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            background: gerando || !algumaSelecionada || controlesFiltrados.length === 0 ? 'var(--brd)' : 'var(--navy)',
            color: gerando || !algumaSelecionada || controlesFiltrados.length === 0 ? 'var(--txt3)' : '#F3EEE4',
            border: 'none',
            borderRadius: 8,
            cursor: gerando || !algumaSelecionada || controlesFiltrados.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all .15s',
          }}
        >
          {gerando ? 'Gerando...' : 'Gerar relatório (.xlsx)'}
        </button>
      </div>
    </div>
  )
}
