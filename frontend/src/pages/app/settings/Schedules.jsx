import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Clock, Play, Plus, Trash2 } from "lucide-react"
import { api } from "../../../lib/api"
import { useStore } from "../../../lib/store"
import { useConfirm } from "../../../components/ui/Modal"
import Select from "../../../components/ui/Select"

const EVERY = [
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Every Monday" },
]

const KINDS = [
  { value: "code", label: "Code" },
  { value: "chat", label: "Chat" },
  { value: "design", label: "Design" },
]

function when(item) {
  if (!item.enabled || !item.next_run) return "Paused"
  return "Next: " + new Date(item.next_run * 1000).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
}

function repeat(item) {
  const found = EVERY.find((entry) => entry.value === item.every)
  const text = found ? found.label : item.every
  return item.every === "hourly" ? text + " at :" + item.at_time.split(":")[1] : text + " at " + item.at_time
}

export default function Schedules() {
  const { toast, projects, models } = useStore()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [kind, setKind] = useState("code")
  const [every, setEvery] = useState("daily")
  const [at, setAt] = useState("09:00")
  const [project, setProject] = useState("")
  const [model, setModel] = useState("")
  const [busy, setBusy] = useState(false)

  function load() {
    api.get("/api/schedules").then((data) => setItems(data.schedules)).catch((problem) => toast(problem.message, "error"))
  }

  useEffect(() => {
    load()
  }, [])

  async function create(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post("/api/schedules", { name, prompt, kind, every, at_time: at, project_id: project, model, tz_offset: -new Date().getTimezoneOffset() })
      setName("")
      setPrompt("")
      setOpen(false)
      toast("Schedule created", "ok")
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
    setBusy(false)
  }

  async function toggle(item) {
    try {
      await api.patch("/api/schedules/" + item.id, { enabled: !item.enabled })
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  async function runNow(item) {
    try {
      const result = await api.post("/api/schedules/" + item.id + "/run")
      toast("Started. Open the chat to follow it.", "ok")
      load()
      return result
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  async function remove(item) {
    const sure = await confirm({ title: "Delete " + item.name + "?", text: "It will stop running. Chats it already made stay.", confirmLabel: "Delete", danger: true })
    if (!sure) return
    await api.del("/api/schedules/" + item.id).catch((problem) => toast(problem.message, "error"))
    load()
  }

  const projectOptions = [{ value: "", label: "No project" }].concat(projects.map((item) => ({ value: item.id, label: item.name })))
  const modelOptions = [{ value: "", label: "Default model" }].concat(models.map((item) => ({ value: item.key, label: item.label })))

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <div className="row">
          <div className="grow">
            <h3>Schedules</h3>
            <p className="muted small">Run a task on a timer without opening Forkwise: check a site every morning, summarise your inbox, open a weekly pull request. Each run becomes a normal chat you can read later. Scheduled runs never wait for approval, so they use only what you already allowed.</p>
          </div>
          {!open && <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={14} />New schedule</button>}
        </div>
        {open && (
          <form onSubmit={create} className="settings-form">
            <input className="input" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <textarea className="textarea" dir="auto" rows={4} placeholder="What should Forkwise do each time?" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <div className="form-grid">
              <Select value={every} onChange={setEvery} options={EVERY} />
              <input className="input" type="time" value={at} onChange={(e) => setAt(e.target.value)} />
              <Select value={kind} onChange={setKind} options={KINDS} />
              <Select value={project} onChange={setProject} options={projectOptions} />
              <Select value={model} onChange={setModel} options={modelOptions} />
            </div>
            <div className="row">
              <button className="btn btn-primary" disabled={busy || !prompt.trim()}>{busy ? "Saving" : "Create"}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
      <div className="settings-card">
        <div className="list">
          {!items && <div className="list-empty">Loading…</div>}
          {items && items.length === 0 && <div className="list-empty">No schedules yet.</div>}
          {items && items.map((item) => (
            <div className="list-row" key={item.id}>
              <Clock size={15} className="faint" />
              <div className="meta">
                <strong dir="auto">{item.name}</strong>
                <span>{repeat(item)} · {when(item)}{item.last_run ? " · last ran " + new Date(item.last_run * 1000).toLocaleString() : ""}</span>
              </div>
              {item.last_chat && <Link to={"/app/c/" + item.last_chat} className="btn btn-ghost btn-sm">Last run</Link>}
              <button className="icon-btn" title="Run now" aria-label="Run now" onClick={() => runNow(item)}><Play size={14} /></button>
              <label className="switch" title={item.enabled ? "Pause" : "Resume"}>
                <input type="checkbox" checked={item.enabled} onChange={() => toggle(item)} />
                <span />
              </label>
              <button className="icon-btn" title="Delete" aria-label="Delete" onClick={() => remove(item)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
