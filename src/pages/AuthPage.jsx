import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { login } = useAuth()
  
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        // Use custom login function
        await login(email, password)
      } else {
        // Use custom signup implementation writing to profiles directly
        const { error: insertError } = await supabase.from('profiles').insert({
          email,
          password,
          display_name: name,
          username,
          role: 'user',
          is_approved: false
        })
        
        if (insertError) {
          if (insertError.code === '23505') {
            throw new Error('Email or Username already exists.')
          }
          throw insertError
        }

        setSuccess('Account created! Please wait for an admin to approve your account.')
        setEmail('')
        setPassword('')
        setName('')
        setUsername('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-blob blob1"></div>
      <div className="auth-blob blob2"></div>
      <div className="auth-blob blob3"></div>
      
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <h1 className="auth-app-title">That One Day</h1>
          <p className="auth-subtitle">in Life Planner</p>

          <div className="auth-tabs">
            <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Sign In</button>
            <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Sign Up</button>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input type="text" placeholder="What should we call you?" required={!isLogin} value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input type="text" placeholder="Choose a unique username" required={!isLogin} value={username} onChange={e => setUsername(e.target.value)} />
                </div>
              </>
            )}
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" placeholder="your@email.com" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" placeholder="Your password" required minLength="6" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
