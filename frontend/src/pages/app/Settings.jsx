import { useEffect, useState } from "react"
import { NavLink, useParams } from "react-router-dom"
import { BarChart3, BookOpen, Brain, Plug, Sparkles, Trash2, User, Wrench, Plus } from "lucide-react"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"

const TABS = [
  { key: "general", label: "General", icon: User },
  { key: "memory", label: "Memory", icon: Brain },
  { key: "abilities", label: "Abilities", icon: Sparkles },
  { key: "connectors", label: "Connectors", icon: Plug },
  { key: "usage", label: "Usage", icon: BarChart3 },
]

function General() {
  const { user, setUser, models, toast } = useStore()
  const settings = user.settings || {}
  const [name, setName] = useState(user.name)
  const [instructions, setInstructions] = useState(settings.instructions || "")
  const [model, setModel] = useState(settings.model || "")

  async function save() {
    try {
      const data = await api.post("/api/auth/settings", { name, settings: { instructions, model } })
      setUser(data.user)
      toast("Settings saved", "ok")
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  return (
    <div className="settings-section">
      <div className="field"><label>Your name</label><input className="input" dir="auto" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label>Email</label><input className="input" value={user.email} disabled /></div>
      <div className="field">
        <label>Default model</label>
        <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">Server default</option>
          {models.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Instructions for every chat</label>
        <textarea className="textarea" dir="auto" rows={7} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Answer me in Persian. Keep Python code simple, without lambda or decorators." />
        <span className="faint small">Forkwise reads this before every answer.</span>
      </div>
      <div className="row-actions"><button className="btn btn-primary" onClick={save}>Save settings</button></div>
    </div>
  )
}

function Memory() {
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

function Abilities() {
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

function Connectors() {
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

export default function Settings() {
  const { tab } = useParams()
  const current = tab || "general"
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
          {current === "memory" && <Memory />}
          {current === "abilities" && <Abilities />}
          {current === "connectors" && <Connectors />}
          {current === "usage" && <Usage />}
        </div>
      </div>
    </div>
  )
}
