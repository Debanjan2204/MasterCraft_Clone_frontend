import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { register } from '../api/client'
import './Landing.css'

const AVAILABLE_ROLES = [
  { value: 'ROLE_DEVELOPER', label: 'Developer' },
  { value: 'ROLE_TESTER',    label: 'Tester' },
  { value: 'ROLE_ADMIN',     label: 'Admin' },
]

export default function Landing() {
  
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('login') // 'login' | 'register'

  // Login form
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError]   = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register form
  const [regForm, setRegForm] = useState({
    username: '', email: '', password: '', confirmPassword: '', fullName: '',
  })
  const [regRoles, setRegRoles]       = useState([])
  const [regError, setRegError]       = useState('')
  const [regLoading, setRegLoading]   = useState(false)
  const [regSuccess, setRegSuccess]   = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  if (isAuthenticated) return null

  // ── Login ──
  const handleLoginChange = e => setLoginForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submitLogin = async e => {
    e.preventDefault()
    setLoginError(''); setLoginLoading(true)
    try {
      await login(loginForm.username, loginForm.password)
      navigate('/dashboard')
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials')
    } finally {
      setLoginLoading(false)
    }
  }

  // ── Register ──
  const handleRegChange = e => setRegForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const toggleRole = (role) => {
    setRegRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role])
  }

  const submitRegister = async e => {
    e.preventDefault()
    setRegError('')

    if (!regForm.username.trim() || !regForm.email.trim() ||
        !regForm.password.trim() || !regForm.fullName.trim()) {
      setRegError('All fields are required.'); return
    }
    if (regForm.password !== regForm.confirmPassword) {
      setRegError('Passwords do not match.'); return
    }
    if (regRoles.length === 0) {
      setRegError('Please select at least one role.'); return
    }

    setRegLoading(true)
    try {
      await register({
        username: regForm.username.trim(),
        email:    regForm.email.trim(),
        password: regForm.password,
        fullName: regForm.fullName.trim(),
        roles:    regRoles,
      })
      setRegSuccess(true)
    } catch (err) {
      setRegError(err.message || 'Registration failed.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="landing">
      <div className="landing__bg">
        <div className="landing__orb landing__orb--1" />
        <div className="landing__orb landing__orb--2" />
        <div className="landing__grid" />
      </div>

      {/* Left — branding */}
      <div className="landing__left">
        <div className="landing__brand">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="#4a86c8" fillOpacity="0.15" />
            <path d="M10 26L18 10L26 26" stroke="#4a86c8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 21h10" stroke="#4a86c8" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span className="landing__logo-text">Trackr</span>
        </div>

        <div className="landing__hero">
          <div className="landing__badge">Issue Tracking System</div>
          <h1 className="landing__headline">
            Manage work.<br />
            <span className="landing__headline--accent">Stay on track.</span>
          </h1>
          <p className="landing__sub">
            A structured workspace for tracking bugs, features, and tasks across your team.
          </p>
          <div className="landing__stats">
            {[['Track','Issues & Bugs'],['Manage','Priorities'],['Ship','On Time']].map(([n, l]) => (
              <div className="landing__stat" key={n}>
                <span className="landing__stat-num">{n}</span>
                <span className="landing__stat-label">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — auth panel */}
      <div className="landing__right">
        <div className="landing__card fade-in">

          {/* Tab switcher */}
          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === 'login' ? ' auth-tab--active' : ''}`}
              onClick={() => { setTab('login'); setLoginError(''); setRegError(''); setRegSuccess(false) }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab${tab === 'register' ? ' auth-tab--active' : ''}`}
              onClick={() => { setTab('register'); setLoginError(''); setRegError(''); setRegSuccess(false) }}
            >
              Register
            </button>
          </div>

          {/* ── Login form ── */}
          {tab === 'login' && (
            <>
              <div className="landing__card-header">
                <h2>Welcome back</h2>
                <p>Sign in to your workspace</p>
              </div>
              <form className="landing__form" onSubmit={submitLogin}>
                <div className="form-field">
                  <label>Username</label>
                  <input
                    name="username" value={loginForm.username}
                    onChange={handleLoginChange} placeholder="Enter username" autoFocus
                  />
                </div>
                <div className="form-field">
                  <label>Password</label>
                  <input
                    type="password" name="password" value={loginForm.password}
                    onChange={handleLoginChange} placeholder="Enter password"
                  />
                </div>
                {loginError && <div className="form-error">{loginError}</div>}
                <button type="submit" className="btn-primary btn-full" disabled={loginLoading}>
                  {loginLoading ? <span className="spinner" /> : 'Sign In'}
                </button>
              </form>
            </>
          )}

          {/* ── Register form ── */}
          {tab === 'register' && (
            <>
              <div className="landing__card-header">
                <h2>Create account</h2>
                <p>Request access to your workspace</p>
              </div>

              {regSuccess ? (
                <div className="reg-success">
                  <div className="reg-success__icon">✓</div>
                  <p className="reg-success__title">Registration submitted</p>
                  <p className="reg-success__sub">
                    Your account request has been received. Contact your administrator to activate your account.
                  </p>
                  <button className="btn-primary btn-full" style={{ marginTop: 16 }}
                    onClick={() => { setTab('login'); setRegSuccess(false) }}>
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form className="landing__form" onSubmit={submitRegister}>
                  <div className="form-field">
                    <label>Full Name</label>
                    <input
                      name="fullName" value={regForm.fullName}
                      onChange={handleRegChange} placeholder="Jane Smith" autoFocus
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Username</label>
                      <input
                        name="username" value={regForm.username}
                        onChange={handleRegChange} placeholder="jsmith"
                      />
                    </div>
                    <div className="form-field">
                      <label>Email</label>
                      <input
                        type="email" name="email" value={regForm.email}
                        onChange={handleRegChange} placeholder="jane@company.com"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Password</label>
                      <input
                        type="password" name="password" value={regForm.password}
                        onChange={handleRegChange} placeholder="Password"
                      />
                    </div>
                    <div className="form-field">
                      <label>Confirm Password</label>
                      <input
                        type="password" name="confirmPassword" value={regForm.confirmPassword}
                        onChange={handleRegChange} placeholder="Repeat password"
                      />
                    </div>
                  </div>

                  {/* Role selection */}
                  <div className="form-field">
                    <label>Roles <span className="label-hint">(select at least one)</span></label>
                    <div className="role-options">
                      {AVAILABLE_ROLES.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          className={`role-chip${regRoles.includes(r.value) ? ' role-chip--active' : ''}`}
                          onClick={() => toggleRole(r.value)}
                        >
                          {regRoles.includes(r.value) && <span className="role-chip__check">✓</span>}
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {regError && <div className="form-error">{regError}</div>}

                  <button type="submit" className="btn-primary btn-full" disabled={regLoading}>
                    {regLoading ? <span className="spinner" /> : 'Submit Registration'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}