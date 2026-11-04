import { useEffect, useState } from "react"
import { KeyRound, Plus, Trash2 } from "lucide-react"
import { api } from "../../../lib/api"
import { useStore } from "../../../lib/store"
import { useConfirm } from "../../../components/ui/Modal"
import Select from "../../../components/ui/Select"

export default function Secrets() {
  const { toast, projects } = useStore()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [name, setName] = useState("")
  const [value, setValue] = useState("")
  const [project, setProject] = useState("")
  const [busy, setBusy] = useState(false)

  function load() {
    api.get("/api/secrets").then((data) => setItems(data.secrets)).catch((problem) => toast(problem.message, "error"))
  }

  useEffect(() => {
    load()
  }, [])

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await api.post("/api/secrets", { name: name.trim(), value: value, project_id: project })
      setName("")
      setValue("")
      toast("Secret saved", "ok")
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
    setBusy(false)
  }

  async function remove(item) {
    const sure = await confirm({ title: "Delete " + item.name + "?", text: "Commands that read this variable will no longer see it.", confirmLabel: "Delete", danger: true })
    if (!sure) return
    await api.del("/api/secrets/" + item.id).catch((problem) => toast(problem.message, "error"))
    load()
  }

  function projectName(id) {
    if (!id) return "All projects"
    const found = projects.find((item) => item.id === id)
    return found ? found.name : "One project"
  }

  const options = [{ value: "", label: "All projects" }].concat(projects.map((item) => ({ value: item.id, label: item.name })))

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <h3>Secrets and environment variables</h3>
        <p className="muted small">Store API keys and other values once. Forkwise passes them to its terminal and commands as environment variables, for example <code>$STRIPE_KEY</code>, without writing them into files, chats or logs. Values are encrypted and cannot be read back.</p>
        <form onSubmit={save} className="form-grid">
          <input className="input mono" placeholder="NAME, for example MY_API_KEY" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} maxLength={64} autoComplete="off" spellCheck={false} />
          <Select value={project} onChange={setProject} options={options} />
          <input className="input" type="password" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="new-password" style={{ gridColumn: "1 / -1" }} />
          <div><button className="btn btn-primary" disabled={busy || !name.trim() || !value}><Plus size={14} />Save secret</button></div>
        </form>
      </div>
      <div className="settings-card">
        <h3>Saved secrets</h3>
        <div className="list">
          {!items && <div className="list-empty">Loading…</div>}
          {items && items.length === 0 && <div className="list-empty">Nothing saved yet.</div>}
          {items && items.map((item) => (
            <div className="list-row" key={item.id}>
              <KeyRound size={15} className="faint" />
              <div className="meta">
                <strong className="mono">{item.name}</strong>
                <span>{projectName(item.project_id)} · updated {new Date(item.updated_at * 1000).toLocaleDateString()}</span>
              </div>
              <button className="icon-btn" aria-label={"Delete " + item.name} onClick={() => remove(item)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
