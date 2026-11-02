import { useEffect, useState } from "react"
import { Link, Navigate, NavLink, useNavigate, useParams } from "react-router-dom"
import { BarChart3, BookOpen, Brain, Plug, ShieldCheck, Sparkles, Trash2, User, Wrench, Plus } from "lucide-react"
import { useStore } from "../../lib/store"
import { api, apiUrl } from "../../lib/api"
import Select from "../../components/ui/Select"

const TABS = [
  { key: "general", label: "Profile", icon: User },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "usage", label: "Usage", icon: BarChart3 },
  { key: "data", label: "Data", icon: BookOpen },
]

function General() {
  const { user, setUser, models, toast } = useStore()
  const settings = user.settings || {}
  const [name, setName] = useState(user.name)
  const [instructions, setInstructions] = useState(settings.instructions || "")
  const [model, setModel] = useState(settings.model || "")
  const [plan, setPlan] = useState("free")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get("/api/billing").then((data) => setPlan(data.plan)).catch(() => setPlan("free"))
  }, [])

  async function save() {
    setSaving(true)
    try {
      const data = await api.post("/api/auth/settings", { name, settings: { instructions, model } })
      setUser(data.user)
      toast("Settings saved", "ok")
    } catch (problem) {
      toast(problem.message, "error")
    }
    setSaving(false)
  }

  return (
    <div className="settings-stack">
      <div className="settings-card profile-card">
        <span className="avatar-l">{(user.name || user.email).charAt(0).toUpperCase()}</span>
        <div className="profile-text">
          <strong>{user.name || user.email}</strong>
          <span className="muted small">{user.email}</span>
        </div>
        <Link to="/app/billing" className={"chip plan-" + plan}>{plan.charAt(0).toUpperCase() + plan.slice(1)} plan</Link>
      </div>
      <div className="settings-card">
        <h3>Profile</h3>
        <p className="muted small">How Forkwise addresses you.</p>
        <div className="field"><label htmlFor="s-name">Display name</label><input id="s-name" className="input" dir="auto" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="s-email">Email</label><input id="s-email" className="input" value={user.email} disabled /></div>
      </div>
      <div className="settings-card">
        <h3>AI preferences</h3>
        <p className="muted small">Applied to every new chat.</p>
        <div className="field">
          <label htmlFor="s-model">Default model</label>
          <Select id="s-model" value={model} onChange={setModel} options={[{ value: "", label: "Server default" }].concat(models.map((item) => ({ value: item.key, label: item.label })))} />
        </div>
        <div className="field">
          <label htmlFor="s-instructions">Custom instructions</label>
          <textarea id="s-instructions" className="textarea" dir="auto" rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Tell Forkwise how you like answers, for example: keep Python code simple, explain steps briefly." />
          <span className="faint small">Forkwise reads this before every answer.</span>
        </div>
      </div>
      <div className="settings-save"><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving" : "Save changes"}</button></div>
    </div>
  )
}

function Security() {
  const { user, signOut, toast } = useStore()
  const navigate = useNavigate()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState("")

  async function changePassword(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post("/api/auth/password", { current: current, password: next })
      setCurrent("")
      setNext("")
      toast("Password changed. Other devices were signed out.", "ok")
    } catch (problem) {
      toast(problem.message, "error")
    }
    setBusy(false)
  }

  async function others() {
    try {
      await api.post("/api/auth/sign-out-others")
      toast("Signed out of all other devices", "ok")
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  async function remove() {
    try {
      await api.post("/api/auth/delete", { email: confirm })
      await signOut()
      navigate("/")
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  return (
    <div className="settings-stack">
      <form className="settings-card" onSubmit={changePassword}>
        <h3>Password</h3>
        <p className="muted small">Use at least 8 characters. Changing it signs you out everywhere else.</p>
        <div className="field"><label htmlFor="p-current">Current password</label><input id="p-current" className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></div>
        <div className="field"><label htmlFor="p-new">New password</label><input id="p-new" className="input" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required /></div>
        <div className="settings-save"><button className="btn btn-primary" disabled={busy}>{busy ? "Saving" : "Change password"}</button></div>
        <p className="faint small">Signed up with Google? Use Forgot password on the sign-in page once to create a password.</p>
      </form>
      <div className="settings-card">
        <h3>Devices</h3>
        <p className="muted small">Sign out everywhere except this browser, for example after using a shared computer.</p>
        <button className="btn btn-ghost" onClick={others}>Sign out other devices</button>
      </div>
      <div className="settings-card danger-zone">
        <h3>Delete account</h3>
        <p className="muted small">Removes your account, chats, projects, memories and abilities for good. Active paid time is not refunded.</p>
        <div className="field"><label htmlFor="d-email">Type {user.email} to confirm</label><input id="d-email" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></div>
        <button className="btn btn-danger" disabled={confirm.trim().toLowerCase() !== user.email.toLowerCase()} onClick={remove}><Trash2 size={15} />Delete my account</button>
      </div>
    </div>
  )
}

export function Memory() {
  const { toast } = useStore()
  const [items, setItems] = useState([])
  const [text, setText] = useState("")

  async function load() {
    const data = await api.get("/api/memories")
    setItems(data.memories)
  }

  useEffect(() => {
    load()
  }, [])

  async function add(event) {
    event.preventDefault()
    if (!text.trim()) return
    await api.post("/api/memories", { content: text })
    setText("")
    load()
  }

  async function remove(id) {
    await api.del("/api/memories/" + id)
    toast("Forgotten")
    load()
  }

  return (
    <div className="settings-section">
      <p className="muted">Forkwise saves facts here when you ask it to remember something, and uses them in every chat. Tell it "forget …" or remove them here.</p>
      <form className="inline-form" onSubmit={add}>
        <input className="input" dir="auto" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add something for Forkwise to remember" />
        <button className="btn btn-primary" disabled={!text.trim()}><Plus size={15} />Add</button>
      </form>
      {items.length === 0 && <div className="empty-small">Nothing saved yet.</div>}
      <div className="list">
        {items.map((item) => (
          <div key={item.id} className="list-row">
            <Brain size={15} />
            <span dir="auto">{item.content}</span>
            <span className="tool-spacer" />
            {item.project_id && <span className="chip">project</span>}
            <button className="icon-btn tiny" title="Forget" onClick={() => remove(item.id)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Abilities() {
  const [tools, setTools] = useState([])
  const [skills, setSkills] = useState([])
  const [open, setOpen] = useState(null)

  async function load() {
    const a = await api.get("/api/tools")
    const b = await api.get("/api/skills")
    setTools(a.tools)
    setSkills(b.skills)
  }

  useEffect(() => {
    load()
  }, [])

  async function toggleTool(item) {
    await api.patch("/api/tools/" + item.id, { enabled: !item.enabled })
    load()
  }

  async function removeTool(item) {
    if (!window.confirm("Delete the tool my_" + item.name + "?")) return
    await api.del("/api/tools/" + item.id)
    load()
  }

  async function toggleSkill(item) {
    await api.patch("/api/skills/" + item.id, { enabled: !item.enabled })
    load()
  }

  async function removeSkill(item) {
    if (!window.confirm("Delete the skill " + item.name + "?")) return
    await api.del("/api/skills/" + item.id)
    load()
  }

  return (
    <div className="settings-section">
      <p className="muted">Forkwise grows: when it needs something it will use again, it writes itself a tool or saves a skill. Ask it, for example, "make yourself a tool that checks gold prices".</p>
      <h3 className="section-title"><Wrench size={15} />Tools it made</h3>
      {tools.length === 0 && <div className="empty-small">No tools yet.</div>}
      <div className="list">
        {tools.map((item) => (
          <div key={item.id} className="ability">
            <div className="list-row">
              <Sparkles size={15} />
              <button className="ability-name mono" onClick={() => setOpen(open === item.id ? null : item.id)}>my_{item.name}</button>
              <span className="muted small ability-desc">{item.description}</span>
              <span className="tool-spacer" />
              <span className="faint small">{item.uses} uses</span>
              <label className="switch"><input type="checkbox" checked={Boolean(item.enabled)} onChange={() => toggleTool(item)} /><span /></label>
              <button className="icon-btn tiny" title="Delete" onClick={() => removeTool(item)}><Trash2 size={14} /></button>
            </div>
            {open === item.id && <pre className="tool-pre ability-code">{item.code}</pre>}
          </div>
        ))}
      </div>
      <h3 className="section-title"><BookOpen size={15} />Skills it saved</h3>
      {skills.length === 0 && <div className="empty-small">No skills yet.</div>}
      <div className="list">
        {skills.map((item) => (
          <div key={item.id} className="ability">
            <div className="list-row">
              <BookOpen size={15} />
              <button className="ability-name mono" onClick={() => setOpen(open === item.id ? null : item.id)}>{item.name}</button>
              <span className="muted small ability-desc">{item.description}</span>
              <span className="tool-spacer" />
              <label className="switch"><input type="checkbox" checked={Boolean(item.enabled)} onChange={() => toggleSkill(item)} /><span /></label>
              <button className="icon-btn tiny" title="Delete" onClick={() => removeSkill(item)}><Trash2 size={14} /></button>
            </div>
            {open === item.id && <pre className="tool-pre ability-code">{item.body}</pre>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Connectors() {
  const { toast } = useStore()
  const [servers, setServers] = useState([])
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)

  async function load() {
    const data = await api.get("/api/mcp")
    setServers(data.servers)
  }

  useEffect(() => {
    load()
  }, [])

  async function add(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const headers = token ? { Authorization: "Bearer " + token } : {}
      const data = await api.post("/api/mcp", { name, url, headers })
      toast("Connected with " + data.tools.length + " tools", "ok")
      setName("")
      setUrl("")
      setToken("")
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
    setBusy(false)
  }

  async function remove(id) {
    await api.del("/api/mcp/" + id)
    load()
  }

  return (
    <div className="settings-section">
      <p className="muted">Connect any MCP server over HTTP (GitHub, Notion, your own database, and many more). Its tools become available to Forkwise in every chat.</p>
      <form className="panel-card form-card" onSubmit={add}>
        <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="github" /></div>
        <div className="field"><label>Server link</label><input className="input mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/mcp" /></div>
        <div className="field"><label>Access token</label><input className="input mono" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Optional" /></div>
        <div className="row-actions"><button className="btn btn-primary" disabled={busy || !name || !url}>{busy ? "Connecting" : "Connect"}</button></div>
      </form>
      <div className="list">
        {servers.map((server) => (
          <div key={server.id} className="list-row">
            <Plug size={15} />
            <strong>{server.name}</strong>
            <span className="faint small mono">{server.url}</span>
            <span className="tool-spacer" />
            <button className="icon-btn tiny" title="Remove" onClick={() => remove(server.id)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Usage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get("/api/usage").then(setData)
  }, [])

  if (!data) return null
  const max = Math.max(1, ...data.days.map((day) => day.tokens_in + day.tokens_out))
  return (
    <div className="settings-section">
      <p className="muted">Tokens are the amount of text the AI reads and writes. {data.limit > 0 ? "Your daily limit is " + data.limit.toLocaleString() + " tokens." : ""}</p>
      {data.days.length === 0 && <div className="empty-small">No usage yet.</div>}
      <div className="usage-bars">
        {data.days.slice().reverse().map((day) => (
          <div key={day.day} className="usage-bar" title={day.day + ": " + (day.tokens_in + day.tokens_out).toLocaleString() + " tokens, " + day.runs + " tasks"}>
            <span style={{ height: ((day.tokens_in + day.tokens_out) / max) * 100 + "%" }} />
            <small>{day.day.slice(5)}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Instructions() {
  const { user, setUser, models, toast } = useStore()
  const settings = user.settings || {}
  const [instructions, setInstructions] = useState(settings.instructions || "")
  const [model, setModel] = useState(settings.model || "")
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const data = await api.post("/api/auth/settings", { name: user.name, settings: { instructions, model } })
      setUser(data.user)
      toast("Saved", "ok")
    } catch (problem) {
      toast(problem.message, "error")
    }
    setSaving(false)
  }

  return (
    <div className="settings-stack wide">
      <div className="settings-card">
        <h3>Custom instructions</h3>
        <p className="muted small">Forkwise reads this before every answer, in every chat.</p>
        <textarea className="textarea" dir="auto" rows={8} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="For example: reply in Persian, keep Python code simple, explain steps briefly." />
      </div>
      <div className="settings-card">
        <h3>Default model</h3>
        <p className="muted small">Used for new chats. You can still change it in any chat.</p>
        <Select value={model} onChange={setModel} options={[{ value: "", label: "Server default" }].concat(models.map((item) => ({ value: item.key, label: item.label })))} />
      </div>
      <div className="settings-save"><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving" : "Save changes"}</button></div>
    </div>
  )
}

function DataTab() {
  const { toast } = useStore()

  async function download() {
    try {
      const response = await fetch(apiUrl("/api/account/export"), { credentials: "include" })
      if (!response.ok) throw new Error("Could not prepare your export.")
      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = "forkwise-export.json"
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <h3>Export your data</h3>
        <p className="muted small">A JSON file with your profile, chats and memories. Files that Forkwise built live in each chat's Files panel, where you can download them as a zip.</p>
        <div><button className="btn btn-ghost" onClick={download}>Download my data</button></div>
      </div>
    </div>
  )
}

export default function Settings() {
  const { tab } = useParams()
  const current = tab || "general"
  if (current === "memory" || current === "abilities" || current === "connectors") return <Navigate to={"/app/customize/" + current} replace />
  return (
    <div className="page settings">
      <div className="page-head"><div><h1>Settings</h1></div></div>
      <div className="settings-layout">
        <nav className="settings-nav">
          {TABS.map((item) => {
            const Icon = item.icon
            return <NavLink key={item.key} to={"/app/settings/" + item.key} className={current === item.key ? "active" : ""}><Icon size={15} />{item.label}</NavLink>
          })}
        </nav>
        <div className="settings-body">
          {current === "general" && <General />}
          {current === "security" && <Security />}
          {current === "data" && <DataTab />}
          {current === "usage" && <Usage />}
        </div>
      </div>
    </div>
  )
}
