import { useEffect, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { FolderKanban, MessageSquare, Plus, Trash2, Brain } from "lucide-react"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { Modal, useConfirm } from "../../components/ui/Modal"

function timeAgo(seconds) {
  const diff = Date.now() / 1000 - seconds
  if (diff < 60) return "just now"
  if (diff < 3600) return Math.floor(diff / 60) + " min ago"
  if (diff < 86400) return Math.floor(diff / 3600) + " h ago"
  return Math.floor(diff / 86400) + " days ago"
}

export function NewProjectModal({ open, onClose }) {
  const { loadProjects, toast } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName("")
      setDescription("")
      setBusy(false)
    }
  }, [open])

  async function create(event) {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      const data = await api.post("/api/projects", { name, description })
      await loadProjects()
      onClose()
      navigate("/app/projects/" + data.project.id)
    } catch (problem) {
      toast(problem.message, "error")
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New project" description="A project keeps one set of files, instructions and memories for many chats.">
      <form className="modal-form" onSubmit={create}>
        <div className="field"><label htmlFor="np-name">Name</label><input id="np-name" className="input" dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder="Online shop" maxLength={80} /></div>
        <div className="field"><label htmlFor="np-desc">What is it about? <span className="faint">(optional)</span></label><input id="np-desc" className="input" dir="auto" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A store with products, a cart and checkout" /></div>
        <div className="modal-footer inline">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name.trim() || busy}>{busy ? "Creating" : "Create project"}</button>
        </div>
      </form>
    </Modal>
  )
}

export function Projects() {
  const { projects, loadProjects } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(params.get("new") === "1")

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  function closeCreate() {
    setCreating(false)
    if (params.get("new")) setParams({}, { replace: true })
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="muted">A project keeps one set of files, instructions and memories for many chats.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} />New project</button>
      </div>
      <NewProjectModal open={creating} onClose={closeCreate} />
      {projects.length === 0 && !creating && (
        <div className="empty-big">
          <FolderKanban size={30} />
          <h3>No projects yet</h3>
          <p className="muted">Create one for each website, app or long job, so every chat in it shares the same files.</p>
        </div>
      )}
      <div className="project-grid">
        {projects.map((project) => (
          <Link key={project.id} to={"/app/projects/" + project.id} className="project-card">
            <FolderKanban size={18} />
            <strong dir="auto">{project.name}</strong>
            <span className="muted small" dir="auto">{project.description || "No description"}</span>
            <span className="faint small">{project.chats} chats, updated {timeAgo(project.updated_at)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Project() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { loadProjects, toast } = useStore()
  const confirm = useConfirm()
  const [data, setData] = useState(null)
  const [instructions, setInstructions] = useState("")
  const [saved, setSaved] = useState(true)

  async function load() {
    try {
      const result = await api.get("/api/projects/" + projectId)
      setData(result)
      setInstructions(result.project.instructions || "")
    } catch (problem) {
      setData({ missing: true })
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  async function save() {
    await api.patch("/api/projects/" + projectId, { instructions })
    setSaved(true)
    toast("Instructions saved", "ok")
  }

  async function remove() {
    const sure = await confirm({ title: "Delete this project?", text: "All its chats and all its files will be removed for good.", confirmLabel: "Delete project", danger: true })
    if (!sure) return
    await api.del("/api/projects/" + projectId)
    await loadProjects()
    navigate("/app/projects")
  }

  if (!data) return <div className="page" />
  if (data.missing) return <div className="page"><h1>Project not found</h1></div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/app/projects" className="faint small">Projects</Link>
          <h1 dir="auto">{data.project.name}</h1>
          {data.project.description && <p className="muted" dir="auto">{data.project.description}</p>}
        </div>
        <div className="row-actions">
          <button className="btn btn-danger" onClick={remove}><Trash2 size={15} />Delete</button>
          <button className="btn btn-primary" onClick={() => navigate("/app?project=" + projectId)}><Plus size={16} />New chat here</button>
        </div>
      </div>
      <div className="project-layout">
        <div>
          <h3 className="section-title">Chats</h3>
          {data.chats.length === 0 && <div className="empty-small">No chats in this project yet.</div>}
          <div className="list">
            {data.chats.map((chat) => (
              <Link key={chat.id} to={"/app/c/" + chat.id} className="list-row">
                <MessageSquare size={15} />
                <span dir="auto">{chat.title}</span>
                <span className="tool-spacer" />
                <span className="faint small">{timeAgo(chat.updated_at)}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="panel-card">
          <h3 className="section-title">Instructions</h3>
          <p className="muted small">Forkwise follows these in every chat of this project. For example the brand colors, the stack, or the tone of the copy.</p>
          <textarea className="textarea" dir="auto" rows={9} value={instructions} onChange={(e) => { setInstructions(e.target.value); setSaved(false) }} placeholder="Use the RHINOREL brand: black and orange. All copy in British English." />
          <div className="row-actions"><button className="btn btn-primary btn-sm" disabled={saved} onClick={save}>Save instructions</button></div>
          {data.memories.length > 0 && (
            <>
              <h3 className="section-title"><Brain size={15} />Project memories</h3>
              <ul className="memory-list">
                {data.memories.map((memory) => <li key={memory.id} dir="auto">{memory.content}</li>)}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
