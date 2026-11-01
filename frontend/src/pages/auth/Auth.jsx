import { useEffect, useRef, useState } from "react"
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Brain, Eye, EyeOff, History, MonitorPlay } from "lucide-react"
import { Wordmark } from "../../components/ui/Logo"
import { BranchField, usePageTitle } from "../../components/site/parts"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"

const FACTS = [
  { icon: MonitorPlay, title: "A private computer in every chat", text: "It writes the code, runs it and shows you the live result." },
  { icon: Brain, title: "It remembers what you tell it", text: "Preferences and facts carry over to every new chat." },
  { icon: History, title: "Every message is a restore point", text: "Go back and the files go back with it." },
]

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
      <div className="auth-art band-dark" aria-hidden="true">
        <BranchField quiet />
        <div className="auth-facts">
          {FACTS.map((fact) => {
            const Icon = fact.icon
            return (
              <div className="auth-fact" key={fact.title}>
                <span><Icon size={18} /></span>
                <div><strong>{fact.title}</strong><small>{fact.text}</small></div>
              </div>
            )
          })}
        </div>
        <img className="auth-shot" src="/images/shot-chat.webp" alt="" width="1440" height="880" />
      </div>
    </div>
  )
}

function PasswordField({ value, onChange, label, autoComplete, minLength, id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} className="input" type={show ? "text" : "password"} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={minLength} />
        <button type="button" className="icon-btn tiny" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

function SubmitLabel({ busy, idle, working }) {
  return busy ? <><span className="btn-spinner" />{working}</> : idle
}

export function Login() {
  usePageTitle("Sign in", "")
  const { user, signIn, loadMe } = useStore()
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
      signIn(data.user)
      await loadMe()
      navigate(params.get("next") || "/app")
    } catch (problem) {
      if (problem.raw === "verify_email") {
        navigate("/verify?email=" + encodeURIComponent(email.trim().toLowerCase()) + "&sent=1")
        return
      }
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
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg wide" disabled={busy}><SubmitLabel busy={busy} idle="Sign in" working="Signing in" /></button>
        <p className="muted small center-text">New to Forkwise? <Link to="/register" className="auth-link">Create an account</Link></p>
      </form>
    </Shell>
  )
}

export function Register() {
  usePageTitle("Create your account", "")
  const { user, signIn, loadMe } = useStore()
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
      if (data.pending) {
        navigate("/verify?email=" + encodeURIComponent(data.email) + "&sent=1")
        return
      }
      signIn(data.user)
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
        <p>We will email you a code to confirm your address.</p>
        <div className="field"><label htmlFor="name">Name</label><input id="name" className="input" dir="auto" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus /></div>
        <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
        <PasswordField id="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} />
        <div className="strength" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => <span key={index} className={index < strength ? "on s" + strength : ""} />)}
          <small className="faint">At least 8 characters</small>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-brand btn-lg wide" disabled={busy}><SubmitLabel busy={busy} idle="Create account" working="Sending your code" /></button>
        <p className="muted small center-text">Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
      </form>
    </Shell>
  )
}

function CodeBoxes({ value, onChange, onComplete, disabled, shake }) {
  const refs = useRef([])
  const digits = value.padEnd(6, " ").split("")

  useEffect(() => {
    if (!disabled && value === "" && refs.current[0]) refs.current[0].focus()
  }, [disabled, value])

  function setAt(index, digit) {
    const next = value.padEnd(6, " ").split("")
    next[index] = digit
    const text = next.join("").replace(/ /g, "")
    onChange(text)
    if (text.length === 6) onComplete(text)
  }

  function onInput(index, event) {
    const typed = event.target.value.replace(/\D/g, "")
    if (typed === "") return
    if (typed.length > 1) {
      const text = (value.slice(0, index) + typed).slice(0, 6)
      onChange(text)
      const target = Math.min(text.length, 5)
      if (refs.current[target]) refs.current[target].focus()
      if (text.length === 6) onComplete(text)
      return
    }
    setAt(index, typed)
    if (index < 5 && refs.current[index + 1]) refs.current[index + 1].focus()
  }

  function onKey(index, event) {
    if (event.key === "Backspace") {
      event.preventDefault()
      if (digits[index] !== " ") {
        onChange(value.slice(0, index) + value.slice(index + 1))
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index))
        if (refs.current[index - 1]) refs.current[index - 1].focus()
      }
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1].focus()
    if (event.key === "ArrowRight" && index < 5) refs.current[index + 1].focus()
  }

  function onPaste(event) {
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    event.preventDefault()
    onChange(text)
    if (refs.current[Math.min(text.length, 5)]) refs.current[Math.min(text.length, 5)].focus()
    if (text.length === 6) onComplete(text)
  }

  return (
    <div className={"code-boxes" + (shake ? " shake" : "")} onPaste={onPaste}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(node) => { refs.current[index] = node }}
          className={"code-box" + (digits[index] !== " " ? " filled" : "")}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={digits[index] === " " ? "" : digits[index]}
          onChange={(event) => onInput(index, event)}
          onKeyDown={(event) => onKey(index, event)}
          onFocus={(event) => event.target.select()}
          disabled={disabled}
          aria-label={"Digit " + (index + 1)}
          autoFocus={index === 0}
        />
      ))}
    </div>
  )
}

export function Verify() {
  usePageTitle("Check your email", "")
  const { user, signIn, loadMe } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = (params.get("email") || "").toLowerCase()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState(params.get("sent") ? "We sent a 6-digit code to " + email + "." : "")
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [wait, setWait] = useState(params.get("sent") ? 30 : 0)

  useEffect(() => {
    if (wait <= 0) return undefined
    const timer = setTimeout(() => setWait(wait - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  if (user) return <Navigate to="/app" replace />
  if (!email) return <Navigate to="/register" replace />

  async function submit(text) {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const data = await api.post("/api/auth/verify", { email, code: text })
      signIn(data.user)
      await loadMe()
      navigate("/app")
    } catch (problem) {
      setError(problem.message)
      setShake(true)
      setCode("")
      setTimeout(() => setShake(false), 500)
    }
    setBusy(false)
  }

  async function resend() {
    setError("")
    setInfo("")
    try {
      await api.post("/api/auth/resend", { email })
      setInfo("A new code is on its way to " + email + ".")
      setWait(30)
      setCode("")
    } catch (problem) {
      setError(problem.message)
    }
  }

  return (
    <Shell>
      <form className="auth-form" onSubmit={(event) => { event.preventDefault(); if (code.length === 6) submit(code) }}>
        <h1>Check your email</h1>
        <p>Enter the 6-digit code we sent to <strong className="mono-email">{email}</strong>.</p>
        <CodeBoxes value={code} onChange={setCode} onComplete={submit} disabled={busy} shake={shake} />
        {info && !error && <div className="form-ok" role="status">{info}</div>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg wide" disabled={busy || code.length < 6}><SubmitLabel busy={busy} idle="Verify and continue" working="Checking" /></button>
        <div className="auth-links">
          <button type="button" className="link-btn" onClick={resend} disabled={wait > 0}>{wait > 0 ? "Send a new code in " + wait + "s" : "Send a new code"}</button>
          <Link to="/register">Use a different email</Link>
        </div>
        <p className="faint small">Can't find it? Look in your spam folder. The code works for 10 minutes.</p>
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
            <div className="form-ok" role="status">If an account exists for {email}, a reset link is on its way. It works for one hour.</div>
            <Link to="/login" className="btn btn-ghost btn-lg wide">Back to sign in</Link>
          </>
        ) : (
          <>
            <p>Enter your email and we will send you a link to choose a new password.</p>
            <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-lg wide" disabled={busy}><SubmitLabel busy={busy} idle="Send reset link" working="Sending" /></button>
            <p className="muted small center-text"><Link to="/login" className="auth-link">Back to sign in</Link></p>
          </>
        )}
      </form>
    </Shell>
  )
}

export function Reset() {
  usePageTitle("Choose a new password", "")
  const { token } = useParams()
  const { signIn, loadMe } = useStore()
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
      signIn(data.user)
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
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-lg wide" disabled={busy}><SubmitLabel busy={busy} idle="Save password" working="Saving" /></button>
      </form>
    </Shell>
  )
}
