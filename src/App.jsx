import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useState, useEffect, Component } from 'react'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmDialog'
import Login from './pages/Login'
import RedefinirSenha from './pages/RedefinirSenha'
import Dashboard from './pages/Dashboard'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(err, info) { console.error('React ErrorBoundary:', err, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#F3EEE4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h2 style={{ color: '#00203E', fontSize: 18, fontWeight: 300, fontFamily: "'Raleway', sans-serif", marginBottom: 12 }}>Erro ao carregar</h2>
            <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', color: '#C62828', padding: '12px 16px', borderRadius: 8, fontSize: 12, marginBottom: 16, textAlign: 'left', wordBreak: 'break-word' }}>
              {this.state.error.message || String(this.state.error)}
            </div>
            <button onClick={() => { this.setState({ error: null }); window.location.reload() }}
              style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #CC915E', background: '#CC915E', color: '#fff', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 13 }}>
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function LoadingScreen() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="loading-screen">
      <div className="spinner" />
      {slow && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ color: '#8b9cb6', fontSize: 13, marginBottom: 12 }}>Carregando...</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #CC915E', background: '#CC915E', color: '#fff', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', fontSize: 12 }}
          >
            Recarregar página
          </button>
        </div>
      )}
    </div>
  )
}

function PasswordSetupPage() {
  const { updatePassword, signOut } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  const rules = [
    { ok: pw.length >= 8, txt: 'Mínimo 8 caracteres' },
    { ok: /[A-Z]/.test(pw), txt: 'Uma letra maiúscula' },
    { ok: /[a-z]/.test(pw), txt: 'Uma letra minúscula' },
    { ok: /[0-9]/.test(pw), txt: 'Um número' },
    { ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw), txt: 'Um caractere especial (!@#$%...)' },
    { ok: pw && pw === pw2, txt: 'Senhas coincidem' },
  ]
  const allOk = rules.every(r => r.ok)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!allOk) { setErro('Preencha todos os requisitos de senha'); return }
    setSaving(true); setErro('')
    const { error } = await updatePassword(pw)
    if (error) { setErro(error.message); setSaving(false) }
    else setOk(true)
  }

  async function handleAcessar() {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img src="/icon.png" alt="Polímata" style={{ height: 80, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="login-divider" />
        {ok ? (
          <>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 8, color: 'var(--res-ef)' }}>&#10003;</div>
              <h1 className="login-title" style={{ marginBottom: 6 }}>Senha configurada!</h1>
              <p className="login-subtitle">Seu acesso está pronto. Faça login para acessar o sistema.</p>
            </div>
            <button onClick={handleAcessar} className="login-btn" style={{ width: '100%', marginTop: 16 }}>
              Ir para o Login
            </button>
          </>
        ) : (
          <>
            <h1 className="login-title">Configure sua senha</h1>
            <p className="login-subtitle">Crie uma senha segura para acessar o sistema Polímata GRC</p>
            {erro && <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', color: '#C62828', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{erro}</div>}
            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Nova senha</label>
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ background: 'none', border: 'none', color: 'var(--txt3)', fontSize: 10, cursor: 'pointer', padding: 0 }}>
                    {showPw ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="Mínimo 8 caracteres" autoFocus required />
              </div>
              <div className="login-field">
                <label>Confirmar senha</label>
                <input type={showPw ? 'text' : 'password'} value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repita a senha" required />
              </div>
              {/* Checklist de requisitos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rules.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: r.ok ? '#22C55E' : 'var(--txt3)' }}>
                    <span style={{ fontSize: 10 }}>{r.ok ? '✓' : '○'}</span>
                    {r.txt}
                  </div>
                ))}
              </div>
              <button type="submit" disabled={saving || !allOk} className="login-btn" style={{ width: '100%', opacity: (saving || !allOk) ? 0.6 : 1 }}>
                {saving ? 'Salvando...' : 'Criar Senha e Acessar'}
              </button>
            </form>
          </>
        )}
        <div className="login-footer">Polímata Consultoria em GRC · {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user, loading, needsPasswordSetup } = useAuth()
  if (loading) return <LoadingScreen />

  if (needsPasswordSetup) return <PasswordSetupPage />

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/*" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
