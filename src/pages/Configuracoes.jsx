import { useState } from 'react'
import ClientesConfig from './config/ClientesConfig'
import ProjetosConfig from './config/ProjetosConfig'
import UsuariosConfig from './config/UsuariosConfig'
import { useAuth } from '../contexts/AuthContext'
import '../styles/config.css'

export default function Configuracoes() {
  const { perfil } = useAuth()

  const TABS = [
    { id: 'clientes', label: 'Clientes', icon: '◎' },
    { id: 'projetos', label: 'Projetos', icon: '◆' },
    { id: 'usuarios', label: 'Usuários', icon: '◈' },
  ]

  const [tab, setTab] = useState('clientes')
  const [projetoIdAbrir, setProjetoIdAbrir] = useState(null)

  function abrirProjeto(projetoId) {
    setProjetoIdAbrir(projetoId)
    setTab('projetos')
  }

  return (
    <div className="cfg-wrap">
      <div className="cfg-hdr">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Gestão de clientes, projetos e usuários</p>
        </div>
      </div>

      <div className="cfg-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`cfg-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => { setTab(t.id); if (t.id !== 'projetos') setProjetoIdAbrir(null) }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="cfg-body">
        {tab === 'clientes' && <ClientesConfig onAbrirProjeto={abrirProjeto} />}
        {tab === 'projetos' && <ProjetosConfig projetoIdInicial={projetoIdAbrir} />}
        {tab === 'usuarios' && <UsuariosConfig />}
      </div>
    </div>
  )
}
