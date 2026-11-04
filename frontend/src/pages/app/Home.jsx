import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Code2, FolderKanban, FolderOpen, X, Globe, LayoutTemplate, ListChecks, MessageSquare, Palette, Plus, Sparkles, FileSpreadsheet } from "lucide-react"
import Composer from "../../components/app/Composer"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { desktopApp, ensureLinked } from "../../lib/desktop"
import { TEMPLATES } from "../../content/catalog"
import { NewProjectModal } from "./Projects"
import { CODE_IDEAS, DESIGN_GALLERY, DESIGN_IDEAS, KIND_HOME } from "../../lib/kinds"

const IDEAS = [
  { icon: LayoutTemplate, title: "Build a landing page", text: "Build a modern landing page for a specialty coffee shop in Tehran with a menu, gallery and contact form, then show it to me." },
  { icon: Globe, title: "Check a live price", text: "What is the US dollar to Iranian rial rate right now? Give me the sources." },
  { icon: FileSpreadsheet, title: "Analyse a spreadsheet", text: "I will attach a CSV. Clean it, find the main trends and make a chart dashboard I can open." },
  { icon: Sparkles, title: "Teach yourself a skill", text: "Make yourself a permanent tool that converts any currency using a free public API, test it, and tell me how to use it." },
]

function timeAgo(seconds) {
  const diff = Math.max(0, Date.now() / 1000 - seconds)
  if (diff < 60) return "Just now"
  if (diff < 3600) return Math.floor(diff / 60) + " min ago"
  if (diff < 86400) return Math.floor(diff / 3600) + " h ago"
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + " d ago"
  return new Date(seconds * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function greeting(name) {
  const hour = new Date().getHours()
  const first = (name || "").split(" ")[0]
  let part = "Good evening"
  if (hour < 12) part = "Good morning"
  else if (hour < 18) part = "Good afternoon"
  return first ? part + ", " + first : part
}

export default function Home({ kind }) {
  const section = kind || "chat"
  const copy = KIND_HOME[section]
  const { user, models, addChat, toast, projects, chats, chatsReady } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const projectId = params.get("project") || ""
  const project = projects.find((item) => item.id === projectId)
  const [mode, setMode] = useState("auto")
  const settings = (user && user.settings) || {}
  const [model, setModel] = useState(settings.model || (models[0] && models[0].key) || "")
  const [seed, setSeed] = useState(null)
  const pending = useRef(null)
  const [newProject, setNewProject] = useState(false)
  const desktop = desktopApp()
  const [folder, setFolder] = useState(null)
  const [recent, setRecent] = useState([])
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (desktop) desktop.recentFolders().then((list) => setRecent(list || [])).catch(() => {})
  }, [desktop])

  async function chooseFolder(item) {
    setPicking(true)
    try {
      const device = await ensureLinked()
      let chosen = item
      if (!chosen) chosen = await desktop.pickFolder()
      if (chosen) {
        pending.current = null
        setFolder({ path: chosen.path, name: chosen.name, device: device.id })
        setMode("ask")
      }
    } catch (problem) {
      toast(problem.message, "error")
    }
    setPicking(false)
  }

  function clearFolder() {
    pending.current = null
    setFolder(null)
    setMode("auto")
  }

  useEffect(() => {
    if (params.get("folder") && desktop) {
      navigate("/app", { replace: true })
      chooseFolder(null)
    }
  }, [params])

  useEffect(() => {
    const template = TEMPLATES.find((item) => item.slug === params.get("template"))
    if (template) setSeed({ value: template.prompt })
    else if (params.get("prompt")) setSeed({ value: params.get("prompt") })
  }, [params])

  async function ensureChat() {
    if (pending.current) return pending.current
    const body = { project_id: projectId, model, mode, kind: section }
    if (folder) {
      body.local_path = folder.path
      body.local_device = folder.device
    }
    pending.current = api.post("/api/chats", body).then((data) => {
      addChat(data.chat)
      return data.chat
    })
    return pending.current
  }

  async function getWorkspace() {
    const chat = await ensureChat()
    const data = await api.get("/api/chats/" + chat.id)
    return data.chat.workspace_id
  }

  async function send(text, files, extra) {
    try {
      const chat = await ensureChat()
      navigate("/app/c/" + chat.id, { state: { first: { text, files, mode, model, effort: extra && extra.effort, skills: extra && extra.skills } } })
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  const mine = chats.filter((item) => (item.kind || "chat") === section)
  const ideas = section === "code" ? CODE_IDEAS.map((item) => ({ ...item, icon: Code2 })) : section === "design" ? DESIGN_IDEAS.map((item) => ({ ...item, icon: Palette })) : IDEAS

  return (
    <div className="home">
      <div className="home-inner">
        <h1 className="home-title">{copy.title || greeting(user && user.name)}</h1>
        {project && <p className="home-sub">New chat in {project.name}. It shares the project's files and notes.</p>}
        {desktop && section !== "design" && (
          <div className="folder-row">
            {folder ? (
              <span className="folder-chip" title={folder.path}>
                <FolderOpen size={14} />
                <b dir="auto">{folder.name}</b>
                <span className="folder-path" dir="ltr">{folder.path}</span>
                <button type="button" className="folder-x" aria-label="Stop working in this folder" onClick={clearFolder}><X size={13} /></button>
              </span>
            ) : (
              <>
                <button type="button" className="folder-btn" disabled={picking} onClick={() => chooseFolder(null)}>
                  <FolderOpen size={14} /> Work in a folder on this computer
                </button>
                {recent.slice(0, 3).map((item) => (
                  <button key={item.path} type="button" className="folder-recent" title={item.path} disabled={picking} onClick={() => chooseFolder(item)}>{item.name}</button>
                ))}
              </>
            )}
          </div>
        )}
        <Composer
          big
          placeholder={copy.placeholder}
          onSend={send}
          running={false}
          mode={mode}
          onMode={setMode}
          model={model}
          onModel={setModel}
          models={models}
          getWorkspace={getWorkspace}
          initialText={seed}
          onCommand={(cmd) => {
            if (cmd === "/plan") setMode("plan")
            if (cmd === "/auto") setMode("auto")
            if (cmd === "/ask") setMode("ask")
            if (cmd === "/memory") navigate("/app/settings/memory")
            if (cmd === "/abilities") navigate("/app/settings/abilities")
          }}
        />
        {models.length === 0 && <div className="notice error">No AI model is set up on the server yet. Add LLM_API_KEY and LLM_MODELS to the server .env file.</div>}
        <div className="ideas">
          {ideas.map((idea) => {
            const Icon = idea.icon
            return (
              <button key={idea.title} type="button" className="idea" onClick={() => setSeed({ value: idea.text })}>
                <Icon size={15} />
                <span>{idea.title}</span>
              </button>
            )
          })}
        </div>
      </div>
      <NewProjectModal open={newProject} onClose={() => setNewProject(false)} />
      <div className="home-sections">
        {section === "code" && projects.length > 0 && (
          <section>
            <div className="home-section-head"><h2>Projects</h2><Link to="/app/projects" className="text-link small">View all</Link></div>
            <div className="recent-list">
              {projects.slice(0, 4).map((item) => (
                <button key={item.id} type="button" className="recent-row" onClick={() => navigate("/app/projects/" + item.id)}>
                  <FolderKanban size={15} />
                  <span className="recent-title" dir="auto">{item.name}</span>
                  <span className="recent-meta">{timeAgo(item.updated_at)}</span>
                </button>
              ))}
              <button type="button" className="recent-row new-row" onClick={() => setNewProject(true)}>
                <Plus size={15} /><span className="recent-title">New project</span>
              </button>
            </div>
          </section>
        )}
        {chatsReady && mine.length > 0 && (
          <section>
            <div className="home-section-head"><h2>Recent</h2></div>
            <div className="recent-list">
              {mine.slice(0, 8).map((chat) => (
                <button key={chat.id} type="button" className="recent-row" onClick={() => navigate("/app/c/" + chat.id)}>
                  {chat.mode === "plan" ? <ListChecks size={15} /> : section === "code" ? <Code2 size={15} /> : section === "design" ? <Palette size={15} /> : <MessageSquare size={15} />}
                  <span className="recent-title" dir="auto">{chat.title}</span>
                  <span className="recent-meta">{timeAgo(chat.updated_at)}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        <div className="home-footnote"><Link to="/app/templates" className="text-link small">Browse templates</Link></div>
      </div>
    </div>
  )
}
