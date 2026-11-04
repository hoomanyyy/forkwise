import { useEffect, useRef, useState } from "react"
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Brain, Building2, Check, Eye, EyeOff, History, MonitorPlay, User } from "lucide-react"
import Select from "../../components/ui/Select"
import { Wordmark } from "../../components/ui/Logo"
import { BranchField, usePageTitle } from "../../components/site/parts"
import { useStore } from "../../lib/store"
import { api, apiUrl } from "../../lib/api"

const FACTS = [
  { icon: MonitorPlay, title: "A private computer in every chat", text: "It writes the code, runs it and shows you the live result." },
  { icon: Brain, title: "It remembers what you tell it", text: "Preferences and facts carry over to every new chat." },
  { icon: History, title: "Every message is a restore point", text: "Go back and the files go back with it." },
]

function GoogleButton({ label }) {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    api.get("/api/auth/providers").then((data) => setEnabled(Boolean(data.google))).catch(() => setEnabled(false))
  }, [])
  if (!enabled) return null
  return (
    <>
      <a className="btn btn-google btn-lg wide" href={apiUrl("/api/auth/google/start")}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {label}
      </a>
      <div className="auth-or"><span>or</span></div>
    </>
  )
}

function Shell({ children }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "dark"
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
        {params.get("error") && <div className="form-error" role="alert">{params.get("error") === "google_unverified" ? "Google says this email is not verified." : params.get("error") === "google_off" ? "Google sign-in is not switched on yet." : "Google sign-in did not work. Please try again."}</div>}
        <GoogleButton label="Continue with Google" />
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
        <GoogleButton label="Sign up with Google" />
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

const TEAM_SIZES = ["2-10", "11-50", "51-200", "201-1000", "1000+"]
const INDUSTRIES = ["Software & IT", "Marketing & Media", "Education", "Finance", "E-commerce & Retail", "Healthcare", "Design & Creative", "Research & Science", "Consulting & Agency", "Government & Non-profit", "Student", "Other"]
const ROLES = ["Founder / Executive", "Software engineer", "Product manager", "Designer", "Data / Analyst", "Marketing", "Operations", "Researcher", "Student", "Other"]
const GOALS = ["Build websites & apps", "Automate tasks", "Data analysis", "Research", "Write & edit content", "Design & images", "Learn to code", "Control my computer"]
const EXPERIENCE = [
  { value: "beginner", label: "New to code" },
  { value: "intermediate", label: "Some experience" },
  { value: "expert", label: "Professional" },
]
const REFERRALS = ["Google search", "Friend or colleague", "X / Twitter", "YouTube", "LinkedIn", "Reddit", "Newsletter or blog", "Other"]

function options(list) {
  return list.map((item) => ({ value: item, label: item }))
}

export function Welcome() {
  usePageTitle("Tell us about you", "")
  const { user, ready, setUser } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const saved = (user && user.settings && user.settings.profile) || {}
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState({
    account_type: saved.account_type || "",
    org_name: saved.org_name || "",
    team_size: saved.team_size && saved.team_size !== "1" ? saved.team_size : "2-10",
    industry: saved.industry || "",
    role: saved.role || "",
    goals: saved.goals || [],
    experience: saved.experience || "",
    referral: saved.referral || "",
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const next = params.get("next") || "/app"

  if (!ready) return <div className="auth-loading" />
  if (!user) return <Navigate to="/login?next=/welcome" replace />

  function set(key, value) {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function toggleGoal(goal) {
    set("goals", profile.goals.includes(goal) ? profile.goals.filter((item) => item !== goal) : [...profile.goals, goal])
  }

  async function finish(skipped) {
    setBusy(true)
    setError("")
    try {
      const data = await api.post("/api/auth/profile", { ...profile, account_type: profile.account_type || "personal", skipped: Boolean(skipped) })
      setUser(data.user)
      navigate(next, { replace: true })
    } catch (problem) {
      setError(problem.message)
      setBusy(false)
    }
  }

  const org = profile.account_type === "organization"
  const canContinue = step === 0 ? Boolean(profile.account_type) : step === 1 ? Boolean(profile.industry) && (!org || profile.org_name.trim()) : true

  return (
    <Shell>
      <form className="auth-form welcome" onSubmit={(event) => { event.preventDefault(); if (!canContinue) return; if (step < 2) setStep(step + 1); else finish(false) }}>
        <div className="welcome-steps" aria-label={"Step " + (step + 1) + " of 3"}>
          {[0, 1, 2].map((index) => <span key={index} className={index <= step ? "on" : ""} />)}
        </div>
        <div className="welcome-pane" key={step}>
          {step === 0 && (
            <>
              <h1>Welcome{user.name ? ", " + user.name.split(" ")[0] : ""}</h1>
              <p>How are you planning to use Forkwise?</p>
              <div className="choice-grid" role="radiogroup">
                <button type="button" role="radio" aria-checked={profile.account_type === "personal"} className={"choice-card" + (profile.account_type === "personal" ? " on" : "")} onClick={() => set("account_type", "personal")}>
                  <span className="choice-icon"><User size={20} /></span>
                  <strong>For myself</strong>
                  <small>Personal projects, learning and everyday tasks.</small>
                  <Check className="choice-check" size={16} />
                </button>
                <button type="button" role="radio" aria-checked={org} className={"choice-card" + (org ? " on" : "")} onClick={() => set("account_type", "organization")}>
                  <span className="choice-icon"><Building2 size={20} /></span>
                  <strong>For my team</strong>
                  <small>Work for a company, startup, agency or school.</small>
                  <Check className="choice-check" size={16} />
                </button>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h1>{org ? "About your team" : "About you"}</h1>
              <p>This helps Forkwise pick better examples and defaults.</p>
              {org && (
                <>
                  <div className="field"><label htmlFor="org">Organization name</label><input id="org" className="input" dir="auto" value={profile.org_name} onChange={(e) => set("org_name", e.target.value)} maxLength={120} autoFocus required /></div>
                  <div className="field">
                    <span className="field-label">Team size</span>
                    <div className="seg-choice" role="radiogroup">
                      {TEAM_SIZES.map((size) => <button type="button" role="radio" aria-checked={profile.team_size === size} key={size} className={profile.team_size === size ? "on" : ""} onClick={() => set("team_size", size)}>{size}</button>)}
                    </div>
                  </div>
                </>
              )}
              <div className="field"><label htmlFor="industry">{org ? "Industry" : "Field"}</label><Select id="industry" value={profile.industry} onChange={(value) => set("industry", value)} options={options(INDUSTRIES)} placeholder="Choose one" /></div>
              <div className="field"><label htmlFor="role">Your role</label><Select id="role" value={profile.role} onChange={(value) => set("role", value)} options={options(ROLES)} placeholder="Choose one" /></div>
            </>
          )}
          {step === 2 && (
            <>
              <h1>What will you build?</h1>
              <p>Pick as many as you like.</p>
              <div className="goal-chips">
                {GOALS.map((goal) => <button type="button" key={goal} aria-pressed={profile.goals.includes(goal)} className={"goal-chip" + (profile.goals.includes(goal) ? " on" : "")} onClick={() => toggleGoal(goal)}>{profile.goals.includes(goal) && <Check size={14} />}{goal}</button>)}
              </div>
              <div className="field">
                <span className="field-label">Coding experience</span>
                <div className="seg-choice" role="radiogroup">
                  {EXPERIENCE.map((item) => <button type="button" role="radio" aria-checked={profile.experience === item.value} key={item.value} className={profile.experience === item.value ? "on" : ""} onClick={() => set("experience", item.value)}>{item.label}</button>)}
                </div>
              </div>
              <div className="field"><label htmlFor="referral">How did you hear about us?</label><Select id="referral" value={profile.referral} onChange={(value) => set("referral", value)} options={options(REFERRALS)} placeholder="Optional" /></div>
            </>
          )}
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="welcome-actions">
          {step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={16} />Back</button> : <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => finish(true)}>Skip for now</button>}
          <button className="btn btn-brand btn-lg" disabled={busy || !canContinue}>{step < 2 ? <>Continue<ArrowRight size={16} /></> : <SubmitLabel busy={busy} idle="Start using Forkwise" working="Saving" />}</button>
        </div>
      </form>
    </Shell>
  )
}
