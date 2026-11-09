import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react"
import { api, API } from "../../../lib/api"
import { useStore } from "../../../lib/store"
import { useConfirm } from "../../../components/ui/Modal"

function when(stamp) {
  if (!stamp) return "never used"
  return "used " + new Date(stamp * 1000).toLocaleDateString()
}

export default function ApiKeys() {
  const { toast } = useStore()
  const confirm = useConfirm()
  const [items, setItems] = useState(null)
  const [name, setName] = useState("")
  const [fresh, setFresh] = useState("")
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const base = API || window.location.origin

  function load() {
    api.get("/api/keys").then((data) => setItems(data.keys)).catch((problem) => toast(problem.message, "error"))
  }

  useEffect(() => {
    load()
  }, [])

  async function create(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const data = await api.post("/api/keys", { name: name.trim() })
      setFresh(data.key)
      setCopied(false)
      setName("")
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
    setBusy(false)
  }

  async function remove(item) {
    const sure = await confirm({ title: "Revoke " + item.name + "?", text: "Programs that use this key stop working at once. This cannot be undone.", confirmLabel: "Revoke", danger: true })
    if (!sure) return
    await api.del("/api/keys/" + item.id).catch((problem) => toast(problem.message, "error"))
    load()
  }

  function copy() {
    navigator.clipboard.writeText(fresh)
    setCopied(true)
  }

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <h3>API keys</h3>
        <p className="muted small">Use Forkwise from your own code, scripts and servers: start chats, send tasks and stream the agent's work. A key acts as your account, so keep it secret and never put it in a website or app that others can download. <Link to="/docs/api">Read the API guide</Link>.</p>
        <form onSubmit={create} className="pair-row">
          <input className="input" placeholder="Name, for example Build server" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <button className="btn btn-primary" disabled={busy}><Plus size={14} />Create key</button>
        </form>
        {fresh && (
          <div className="key-fresh">
            <strong>Copy your new key now. It is shown only once.</strong>
            <div className="key-box">
              <code className="mono">{fresh}</code>
              <button type="button" className={"icon-btn" + (copied ? " done" : "")} onClick={copy} aria-label="Copy key" title={copied ? "Copied" : "Copy"}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
            </div>
            <pre className="key-example mono">{"curl " + base + "/api/chats \\\n  -H \"Authorization: Bearer " + fresh.slice(0, 12) + "...\""}</pre>
          </div>
        )}
      </div>
      <div className="settings-card">
        <h3>Your keys</h3>
        <div className="list">
          {!items && <div className="list-empty">Loading…</div>}
          {items && items.length === 0 && <div className="list-empty">No keys yet.</div>}
          {items && items.map((item) => (
            <div className="list-row" key={item.id}>
              <KeyRound size={15} className="faint" />
              <div className="meta">
                <strong>{item.name}</strong>
                <span className="mono">{item.hint}</span>
                <span>created {new Date(item.created_at * 1000).toLocaleDateString()} · {when(item.last_used_at)}</span>
              </div>
              <button className="icon-btn" aria-label={"Revoke " + item.name} title="Revoke" onClick={() => remove(item)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="settings-card">
        <h3>What a key can do</h3>
        <ul className="small muted key-rules">
          <li>Everything you do in chats: create and list chats, send messages, stream events, stop runs and answer questions.</li>
          <li>It cannot see or change your password, email, billing, other keys or account settings.</li>
          <li>Usage counts against your plan, the same as the app.</li>
        </ul>
      </div>
    </div>
  )
}
