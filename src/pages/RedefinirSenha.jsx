import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Logo() {
  return (
    <div className="login-logo">
      <div className="login-logo-icon">
        <svg viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg" width="36">
          <path d="M7 5 L7 45" stroke="#CC915E" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M7 5 Q26 5 26 16 Q26 27 7 27" stroke="#CC915E" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
          <path d="M7 27 Q22 27 22 36 Q22 45 7 45" stroke="#A6512F" strokeWidth="3" strokeLinecap="round" fill="none"/>
        </svg>
      </div>
      <div>
        <div className="login-brand">Polímata</div>
        <div className="login-brand-sub">Consultoria em GRC</div>
      </div>
    </div>
  )
}

export default function RedefinirSenha() {
  const navigate = useNavigate()
  const [senha, setSenha]           = useState('')
  const [confirma, setConfirma]     = useState('')
  const [showSenha, setShowSenha]   = useState(false)
  const [erro, setErro]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [sucesso, setSucesso]       = useState(false)
  const [tokenValido, setTokenValido] = useState(true)

  useEffect(() => {
    // O Supabase processa o token do link automaticamente via onAuthStateChange
    // Se não houver sessão ativa após o redirecionamento, o token é inválido
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setTokenValido(false)
    })
  }, [])

  function validar() {
    if (senha.length < 8) { setErro('A senha deve ter pelo menos 8 caracteres'); return false }
    if (!/[A-Z]/.test(senha)) { setErro('A senha deve conter pelo menos uma letra maiúscula'); return false }
    if (!/[0-9]/.test(senha)) { setErro('A senha deve conter pelo menos um número'); return false }
    if (senha !== confirma) { setErro('As senhas não coincidem'); return false }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!validar()) return
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setErro('Não foi possível redefinir a senha. Tente solicitar um novo link.')
      setLoading(false)
    } else {
      setSucesso(true)
      setTimeout(() => navigate('/login'), 3000)
    }
  }

  // Token inválido ou expirado
  if (!tokenValido) {
    return (
      <div className="login-bg">
        <div className="login-card">
          <Logo />
          <div className="login-divider" />
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'8px 0 24px', textAlign:'center'}}>
            <div style={{width:56, height:56, borderRadius:'50%', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:'#F87171'}}>
              ✕
            </div>
            <div>
              <div style={{fontSize:16, fontWeight:600, color:'var(--txt1)', marginBottom:8}}>Link inválido ou expirado</div>
              <div style={{fontSize:12, color:'var(--txt3)', lineHeight:1.7}}>
                Este link de recuperação não é mais válido. Solicite um novo link de redefinição de senha.
              </div>
            </div>
          </div>
          <button className="login-btn" onClick={() => navigate('/login')}>
            Voltar ao login
          </button>
          <div className="login-footer">Polímata Consultoria em GRC · {new Date().getFullYear()}</div>
        </div>
      </div>
    )
  }

  // Senha redefinida com sucesso
  if (sucesso) {
    return (
      <div className="login-bg">
        <div className="login-card">
          <Logo />
          <div className="login-divider" />
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'8px 0 24px', textAlign:'center'}}>
            <div style={{width:56, height:56, borderRadius:'50%', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:'#22C55E'}}>
              ✓
            </div>
            <div>
              <div style={{fontSize:16, fontWeight:600, color:'var(--txt1)', marginBottom:8}}>Senha redefinida!</div>
              <div style={{fontSize:12, color:'var(--txt3)', lineHeight:1.7}}>
                Sua senha foi atualizada com sucesso. Redirecionando para o login...
              </div>
            </div>
          </div>
          <div className="login-footer">Polímata Consultoria em GRC · {new Date().getFullYear()}</div>
        </div>
      </div>
    )
  }

  // Formulário de redefinição
  return (
    <div className="login-bg">
      <div className="login-card">
        <Logo />
        <div className="login-divider" />

        <h1 className="login-title">Redefinir senha</h1>
        <p className="login-subtitle" style={{marginBottom:24}}>Crie uma nova senha para sua conta</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <label>Nova senha</label>
              <button type="button" onClick={() => setShowSenha(v => !v)}
                style={{background:'none', border:'none', color:'var(--txt3)', fontSize:10, cursor:'pointer', padding:0}}>
                {showSenha ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <input
              type={showSenha ? 'text' : 'password'}
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              autoFocus
            />
          </div>

          <div className="login-field">
            <label>Confirmar nova senha</label>
            <input
              type={showSenha ? 'text' : 'password'}
              value={confirma}
              onChange={e => setConfirma(e.target.value)}
              placeholder="Repita a senha"
              required
            />
          </div>

          {/* Requisitos visuais */}
          <div style={{display:'flex', flexDirection:'column', gap:4}}>
            {[
              { ok: senha.length >= 8,         txt: 'Mínimo 8 caracteres' },
              { ok: /[A-Z]/.test(senha),        txt: 'Uma letra maiúscula' },
              { ok: /[0-9]/.test(senha),        txt: 'Um número' },
              { ok: senha && senha === confirma, txt: 'Senhas coincidem' },
            ].map((r, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:6, fontSize:10, color: r.ok ? '#22C55E' : 'var(--txt3)'}}>
                <span style={{fontSize:10}}>{r.ok ? '✓' : '○'}</span>
                {r.txt}
              </div>
            ))}
          </div>

          {erro && <div className="login-erro">{erro}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>

        <div className="login-footer">Polímata Consultoria em GRC · {new Date().getFullYear()}</div>
      </div>
    </div>
  )
}
