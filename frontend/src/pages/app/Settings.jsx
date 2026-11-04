import { useEffect, useState } from "react"
import { Link, Navigate, NavLink, useNavigate, useParams } from "react-router-dom"
import { BarChart3, BookOpen, Brain, Plug, ShieldCheck, Sparkles, Trash2, User, Wrench, Plus, Laptop, Copy, Download, Clock, KeyRound, Link2, Keyboard, Palette } from "lucide-react"
import { useStore } from "../../lib/store"
import { api, apiUrl } from "../../lib/api"
import Select from "../../components/ui/Select"
import { useConfirm } from "../../components/ui/Modal"
import Connections from "./settings/Connections"
import Secrets from "./settings/Secrets"
import Schedules from "./settings/Schedules"

const GROUPS = [
  {
    title: "Account",
    tabs: [
      { key: "general", label: "Profile", icon: User },
      { key: "appearance", label: "Preferences", icon: Palette },
      { key: "security", label: "Security", icon: ShieldCheck },
    ],
  },
  {
    title: "Integrations",
    tabs: [
      { key: "connections", label: "Connected accounts", icon: Link2 },
      { key: "secrets", label: "Secrets", icon: KeyRound },
      { key: "schedules", label: "Schedules", icon: Clock },
    ],
  },
  {
    title: "Computer",
    tabs: [
      { key: "computer", label: "Your computer", icon: Laptop },
    ],
  },
  {
    title: "Workspace",
    tabs: [
      { key: "usage", label: "Usage", icon: BarChart3 },
      { key: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
      { key: "data", label: "Data", icon: BookOpen },
    ],
  },
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
        <h3>About you</h3>
        <p className="muted small">{settings.profile ? (settings.profile.account_type === "organization" ? (settings.profile.org_name || "Organization") + " · " + settings.profile.team_size + " people" : "Personal use") + (settings.profile.industry ? " · " + settings.profile.industry : "") + (settings.profile.role ? " · " + settings.profile.role : "") : "Tell Forkwise how you work so it can tailor its answers."}</p>
        <div><Link to="/welcome?next=/app/settings" className="btn btn-ghost">{settings.profile ? "Edit answers" : "Answer a few questions"}</Link></div>
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
  const confirm = useConfirm()
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
    const sure = await confirm({ title: "Delete this tool?", text: "my_" + item.name, confirmLabel: "Delete", danger: true })
    if (!sure) return
    await api.del("/api/tools/" + item.id)
    load()
  }

  async function toggleSkill(item) {
    await api.patch("/api/skills/" + item.id, { enabled: !item.enabled })
    load()
  }

  async function removeSkill(item) {
    const sure = await confirm({ title: "Delete this skill?", text: item.name, confirmLabel: "Delete", danger: true })
    if (!sure) return
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

function Appearance() {
  const { theme, setTheme } = useStore()
  const options = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
  ]
  return (
    <div className="settings-stack">
      <div className="settings-card">
        <h3>Theme</h3>
        <p className="muted small">How the app looks on this device.</p>
        <div className="seg-choice" role="radiogroup">
          {options.map((item) => (
            <button key={item.key} type="button" role="radio" aria-checked={theme === item.key} className={theme === item.key ? "on" : ""} onClick={() => setTheme(item.key)}>{item.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

const SHORTCUTS = [
  ["Open search and commands", ["Ctrl", "K"]],
  ["Show or hide the sidebar", ["Ctrl", "B"]],
  ["Send the message", ["Enter"]],
  ["New line in the message", ["Shift", "Enter"]],
  ["Save the open file", ["Ctrl", "S"]],
  ["Close a dialog or menu", ["Esc"]],
]

function Shortcuts() {
  return (
    <div className="settings-stack">
      <div className="settings-card">
        <h3>Keyboard shortcuts</h3>
        <p className="muted small">On a Mac use Cmd instead of Ctrl.</p>
        <div className="list">
          {SHORTCUTS.map((item) => (
            <div className="list-row" key={item[0]}>
              <div className="meta"><strong>{item[0]}</strong></div>
              <span className="row" style={{ gap: 4 }}>{item[1].map((key) => <span className="kbd" key={key}>{key}</span>)}</span>
            </div>
          ))}
        </div>
      </div>
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

function CopyBox({ text }) {
  const { toast } = useStore()
  return (
    <div className="copy-box" dir="ltr">
      <code>{text}</code>
      <button type="button" className="icon-btn tiny" aria-label="Copy" onClick={() => navigator.clipboard.writeText(text).then(() => toast("Copied", "ok"))}><Copy size={14} /></button>
    </div>
  )
}

function ComputerTab() {
  const { user, setUser, toast } = useStore()
  const confirm = useConfirm()
  const [data, setData] = useState(null)
  const [name, setName] = useState("")
  const [pairing, setPairing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [os, setOs] = useState(() => (navigator.userAgent.includes("Windows") ? "windows" : "unix"))

  function load() {
    api.get("/api/desktop").then(setData).catch((problem) => toast(problem.message, "error"))
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [])

  async function pair() {
    setBusy(true)
    try {
      const result = await api.post("/api/desktop/pair", { name })
      setPairing(result)
      setName("")
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
    setBusy(false)
  }

  async function remove(device) {
    if (!(await confirm({ title: "Unlink " + device.name + "?", text: "Forkwise will lose access to this computer right away.", confirmLabel: "Unlink", danger: true }))) return
    await api.del("/api/desktop/" + device.id).catch((problem) => toast(problem.message, "error"))
    load()
  }

  async function setAuto(value) {
    try {
      const result = await api.post("/api/auth/settings", { settings: { desktop_auto: value } })
      setUser(result.user)
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  const command = pairing && (os === "windows"
    ? "irm " + pairing.agent_url + " -OutFile forkwise_desktop.py; python forkwise_desktop.py --server " + pairing.server + " --token " + pairing.token
    : "curl -fsSL " + pairing.agent_url + " -o forkwise_desktop.py && python3 forkwise_desktop.py --server " + pairing.server + " --token " + pairing.token)
  const auto = Boolean(user.settings && user.settings.desktop_auto)

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <h3>Use your own computer</h3>
        <p className="muted small">Link a Windows, macOS or Linux computer with the small Forkwise Desktop app. The agent can then run terminal commands, open apps such as VS Code, open system settings, files and links, see the screen and use the mouse and keyboard. You can stop it any time with Ctrl+C in the app window.</p>
        <div className="pair-row">
          <input className="input" placeholder="Name, for example Work laptop" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button className="btn btn-brand" disabled={busy} onClick={pair}><Plus size={15} />Link a computer</button>
        </div>
        {pairing && (
          <div className="pair-steps">
            <div className="seg-choice" role="radiogroup">
              <button type="button" className={os === "windows" ? "on" : ""} onClick={() => setOs("windows")}>Windows (PowerShell)</button>
              <button type="button" className={os === "unix" ? "on" : ""} onClick={() => setOs("unix")}>macOS / Linux</button>
            </div>
            <ol className="small">
              <li>Install <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer">Python 3.9+</a> if you do not have it.</li>
              <li>Run this in {os === "windows" ? "PowerShell" : "a terminal"}. The token is shown only once:</li>
            </ol>
            <CopyBox text={command} />
            <p className="faint small">Or <a href={pairing.agent_url} download><Download size={12} /> download the app</a> and run it with <code>--token {pairing.token.slice(0, 10)}…</code></p>
          </div>
        )}
      </div>
      <div className="settings-card">
        <h3>Linked computers</h3>
        {!data && <span className="skel block h24" />}
        {data && data.devices.length === 0 && <p className="muted small">No computers linked yet.</p>}
        {data && data.devices.map((device) => (
          <div className="device-row" key={device.id}>
            <span className={"dot" + (device.online ? " ok" : "")} />
            <div className="device-text">
              <strong>{device.name}</strong>
              <span className="faint small">{device.online ? "Online" : device.last_seen ? "Last seen " + new Date(device.last_seen * 1000).toLocaleString() : "Waiting for the app to connect"}{device.platform ? " · " + device.platform : ""}{device.hostname ? " · " + device.hostname : ""}</span>
            </div>
            <button className="icon-btn" aria-label={"Unlink " + device.name} onClick={() => remove(device)}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <div className="settings-card">
        <h3>Permissions</h3>
        <label className="check">
          <input type="checkbox" checked={!auto} onChange={(e) => setAuto(!e.target.checked)} />
          <span>Ask me before every action on my computer (recommended). Screenshots never ask.</span>
        </label>
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
        <nav className="settings-nav" aria-label="Settings">
          {GROUPS.map((group) => (
            <div className="settings-group" key={group.title}>
              <div className="settings-group-title">{group.title}</div>
              {group.tabs.map((item) => {
                const Icon = item.icon
                return <NavLink key={item.key} to={"/app/settings/" + item.key} className={current === item.key ? "active" : ""}><Icon size={15} />{item.label}</NavLink>
              })}
            </div>
          ))}
        </nav>
        <div className="settings-body">
          {current === "general" && <General />}
          {current === "appearance" && <Appearance />}
          {current === "security" && <Security />}
          {current === "connections" && <Connections />}
          {current === "secrets" && <Secrets />}
          {current === "schedules" && <Schedules />}
          {current === "computer" && <ComputerTab />}
          {current === "usage" && <Usage />}
          {current === "shortcuts" && <Shortcuts />}
          {current === "data" && <DataTab />}
        </div>
      </div>
    </div>
  )
}
