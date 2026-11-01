import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { Wordmark } from "../../components/ui/Logo"
import { BranchField, Frame, usePageTitle } from "../../components/site/parts"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"

function Shell({ children }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "light"
  }, [])
  return (
    <div className="auth">
      <div className="auth-side">
        <Link to="/" className="wordmark"><Wordmark size={30} /></Link>
        {children}
        <div className="auth-foot">By continuing you agree to the <Link to="/terms">terms</Link> and <Link to="/privacy">privacy policy</Link>.</div>
      </div>
      <div className="auth-art band-dark">
        <BranchField quiet />
        <Frame src="/images/shot-chat.png" alt="" />
        <div className="auth-art-copy">
          <blockquote>Describe it in one sentence. Forkwise writes it, runs it and shows you the result.</blockquote>
          <p>Free to start. Works in English and Persian.</p>
        </div>
      </div>
    </div>
  )
}

function PasswordField({ value, onChange, label, autoComplete, minLength, id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: "relative" }}>
        <input id={id} className="input" type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={minLength} style={{ paddingRight: 46 }} />
        <button type="button" className="icon-btn tiny" style={{ position: "absolute", right: 8, top: 9 }} onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

export function Login() {
  usePageTitle("Sign in", "")
  const { user, setUser, loadMe } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={params.get("next") || "/app"} replace />

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const data = await api.post("/api/auth/login", { email, password })
      setUser(data.user)
      await loadMe()
      navigate(params.get("next") || "/app")
    } catch (problem) {
      setError(problem.message)
    }
    setBusy(false)
  }

  return (
    <Shell>
      <form className="auth-form" onSubmit={submit}>
        <h1>Welcome back</h1>
        <p>Sign in to continue where you left off.</p>
        <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus /></div>
        <PasswordField id="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <div className="auth-links"><span /><Link to="/forgot">Forgot password?</Link></div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary btn-lg wide" disabled={busy}>{busy ? "Signing in" : "Sign in"}</button>
        <p className="muted small center-text">New to Forkwise? <Link to="/register" style={{ color: "var(--iris-deep)" }}>Create an account</Link></p>
      </form>
    </Shell>
  )
}

export function Register() {
  usePageTitle("Create your account", "")
  const { user, setUser, loadMe } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/app" replace />

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const data = await api.post("/api/auth/register", { email, password, name })
      setUser(data.user)
      await loadMe()
      navigate("/app")
    } catch (problem) {
      setError(problem.message)
    }
    setBusy(false)
  }

  const strength = Math.min(4, Math.floor(password.length / 3) + (/[0-9]/.test(password) ? 1 : 0) + (/[^A-Za-z0-9]/.test(password) ? 1 : 0))

  return (
    <Shell>
      <form className="auth-form" onSubmit={submit}>
        <h1>Create your account</h1>
        <p>Your own AI engineer, ready in a minute.</p>
        <div className="field"><label htmlFor="name">Name</label><input id="name" className="input" dir="auto" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus /></div>
        <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
        <PasswordField id="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} />
        <div className="strength" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => <span key={index} className={index < strength ? "on s" + strength : ""} />)}
          <small className="faint">At least 8 characters</small>
        </div>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-brand btn-lg wide" disabled={busy}>{busy ? "Creating account" : "Create account"}</button>
        <p className="muted small center-text">Already have an account? <Link to="/login" style={{ color: "var(--iris-deep)" }}>Sign in</Link></p>
      </form>
    </Shell>
  )
}

export function Forgot() {
  usePageTitle("Reset your password", "")
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      await api.post("/api/auth/forgot", { email })
      setSent(true)
    } catch (problem) {
      setError(problem.message)
    }
    setBusy(false)
  }

  return (
    <Shell>
      <form className="auth-form" onSubmit={submit}>
        <h1>Reset your password</h1>
        {sent ? (
          <>
            <div className="form-ok">If an account exists for {email}, a reset link is on its way. It works for one hour.</div>
            <Link to="/login" className="btn btn-ghost btn-lg wide">Back to sign in</Link>
          </>
        ) : (
          <>
            <p>Enter your email and we will send you a link to choose a new password.</p>
            <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary btn-lg wide" disabled={busy}>{busy ? "Sending" : "Send reset link"}</button>
            <p className="muted small center-text"><Link to="/login" style={{ color: "var(--iris-deep)" }}>Back to sign in</Link></p>
          </>
        )}
      </form>
    </Shell>
  )
}

export function Reset() {
  usePageTitle("Choose a new password", "")
  const { token } = useParams()
  const { setUser, loadMe } = useStore()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const data = await api.post("/api/auth/reset", { token, password })
      setUser(data.user)
      await loadMe()
      navigate("/app")
    } catch (problem) {
      setError(problem.message)
    }
    setBusy(false)
  }

  return (
    <Shell>
      <form className="auth-form" onSubmit={submit}>
        <h1>Choose a new password</h1>
        <p>You will be signed in right after.</p>
        <PasswordField id="password" label="New password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} />
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn-primary btn-lg wide" disabled={busy}>{busy ? "Saving" : "Save password"}</button>
      </form>
    </Shell>
  )
}
