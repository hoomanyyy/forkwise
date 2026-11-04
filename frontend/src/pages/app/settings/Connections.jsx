import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Calendar, Github, HardDrive, Mail, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react"
import { api, apiUrl } from "../../../lib/api"
import { useStore } from "../../../lib/store"
import { Modal, useConfirm } from "../../../components/ui/Modal"

const ERRORS = {
  github_off: "GitHub sign-in is not set up on this server. Add a personal access token instead.",
  google_off: "Google sign-in is not set up on this server yet. Ask the server owner to add the Google client keys.",
  link_failed: "The account could not be linked. Try again.",
  too_many: "You can link up to 20 accounts. Remove one first.",
}

const SERVICES = [
  { key: "gmail", label: "Gmail", note: "Read, draft and send email", icon: Mail },
  { key: "drive", label: "Drive", note: "Read files", icon: HardDrive },
  { key: "calendar", label: "Calendar", note: "Read and create events", icon: Calendar },
]

function AccountRow({ item, onRename, onRemove }) {
  const Icon = item.provider === "github" ? Github : Mail
  return (
    <div className="list-row">
      <span className="avatar-s">{item.avatar ? <img src={item.avatar} alt="" /> : <Icon size={14} />}</span>
      <div className="meta">
        <strong>{item.label || item.account}</strong>
        <span>
          {item.account}
          {item.services && item.services.length > 0 ? " · " + item.services.join(", ") : ""}
          {item.last_used ? " · used " + new Date(item.last_used * 1000).toLocaleDateString() : " · not used yet"}
        </span>
      </div>
      {item.needs_reconnect && <span className="badge warn"><TriangleAlert size={11} />&nbsp;Reconnect</span>}
      <button className="icon-btn" aria-label="Rename" title="Rename" onClick={() => onRename(item)}><Pencil size={14} /></button>
      <button className="icon-btn" aria-label="Remove" title="Remove" onClick={() => onRemove(item)}><Trash2 size={14} /></button>
    </div>
  )
}

export default function Connections() {
  const { toast } = useStore()
  const confirm = useConfirm()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [token, setToken] = useState("")
  const [label, setLabel] = useState("")
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState({ gmail: true, drive: false, calendar: false })
  const [editing, setEditing] = useState(null)
  const [newLabel, setNewLabel] = useState("")

  function load() {
    api.get("/api/connections").then(setData).catch((problem) => toast(problem.message, "error"))
  }

  useEffect(() => {
    load()
    if (params.get("linked")) toast("Account linked", "ok")
    if (params.get("error")) toast(ERRORS[params.get("error")] || "Could not link the account.", "error")
    if (params.get("linked") || params.get("error")) setParams({}, { replace: true })
  }, [])

  async function addToken(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await api.post("/api/connections/github", { token: token.trim(), label: label.trim() })
      setToken("")
      setLabel("")
      toast("Linked " + result.account, "ok")
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
    setBusy(false)
  }

  async function remove(item) {
    const sure = await confirm({ title: "Remove " + (item.label || item.account) + "?", text: "Forkwise loses access to this account right away. Schedules that use it will stop working.", confirmLabel: "Remove", danger: true })
    if (!sure) return
    try {
      await api.del("/api/connections/" + item.id)
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  async function saveLabel() {
    try {
      await api.patch("/api/connections/" + editing.id, { label: newLabel })
      setEditing(null)
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  function startRename(item) {
    setEditing(item)
    setNewLabel(item.label || item.account)
  }

  function googleUrl() {
    const services = SERVICES.filter((item) => picked[item.key]).map((item) => item.key)
    return apiUrl("/api/connections/google/start?services=" + (services.length ? services.join(",") : "gmail"))
  }

  const github = data ? data.connections.filter((item) => item.provider === "github") : []
  const google = data ? data.connections.filter((item) => item.provider === "google") : []
  const oauthGithub = data && data.providers.github.oauth
  const oauthGoogle = data && data.providers.google.oauth

  return (
    <div className="settings-stack">
      <div className="settings-card">
        <h3>GitHub</h3>
        <p className="muted small">Forkwise can clone private repositories, create branches, commit, open pull requests and read issues. You can link several accounts, for example a personal one and a work one, and tell it which to use.</p>
        <div className="list">
          {!data && <div className="list-empty">Loading…</div>}
          {data && github.length === 0 && <div className="list-empty">No GitHub accounts linked yet.</div>}
          {github.map((item) => <AccountRow key={item.id} item={item} onRename={startRename} onRemove={remove} />)}
        </div>
        <div className="row wrap" style={{ marginTop: 12 }}>
          {oauthGithub && <a className="btn btn-primary" href={apiUrl("/api/connections/github/start")}><Github size={15} />Sign in with GitHub</a>}
        </div>
        <form onSubmit={addToken} className="form-grid" style={{ marginTop: 12 }}>
          <input className="input" type="password" autoComplete="off" placeholder="Personal access token (ghp_… or github_pat_…)" value={token} onChange={(e) => setToken(e.target.value)} />
          <input className="input" placeholder="Label, for example Work" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
          <div><button className="btn btn-ghost" disabled={busy || token.trim().length < 20}><Plus size={14} />Add with a token</button></div>
        </form>
        <p className="faint small" style={{ marginTop: 8 }}>The token is encrypted on the server and never shown again. Give it only the permissions you want Forkwise to have, such as repo and read:user.</p>
      </div>

      <div className="settings-card">
        <h3>Google</h3>
        <p className="muted small">Link a Google account so Forkwise can read and write email drafts, search Drive and handle calendar events. Choose what it may use, then sign in. Link another account the same way.</p>
        <div className="list">
          {!data && <div className="list-empty">Loading…</div>}
          {data && google.length === 0 && <div className="list-empty">No Google accounts linked yet.</div>}
          {google.map((item) => <AccountRow key={item.id} item={item} onRename={startRename} onRemove={remove} />)}
        </div>
        <div className="service-picks">
          {SERVICES.map((item) => {
            const Icon = item.icon
            return (
              <label key={item.key} className="service-pick">
                <input type="checkbox" checked={Boolean(picked[item.key])} onChange={(e) => setPicked({ ...picked, [item.key]: e.target.checked })} />
                <Icon size={15} />
                <span><strong>{item.label}</strong><small>{item.note}</small></span>
              </label>
            )
          })}
        </div>
        <div className="row wrap">
          {oauthGoogle
            ? <a className="btn btn-primary" href={googleUrl()}><Mail size={15} />Link a Google account</a>
            : data && <span className="faint small">Google sign-in is not configured on this server yet.</span>}
        </div>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Rename account" description={editing ? editing.account : ""} size="sm" footer={<><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={saveLabel}>Save</button></>}>
        <input className="input" value={newLabel} maxLength={60} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveLabel() }} />
      </Modal>
    </div>
  )
}
