import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Clock, Code2, FolderKanban, Globe, LayoutTemplate, ListChecks, MessageSquare, Palette, Plus, Sparkles, FileSpreadsheet, Zap } from "lucide-react"
import Composer from "../../components/app/Composer"
import { LogoMark } from "../../components/ui/Logo"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { TEMPLATES } from "../../content/catalog"
import { Cover } from "../../components/site/Cover"
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
  const { user, models, addChat, toast, projects, chats, chatsReady, usage } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const projectId = params.get("project") || ""
  const project = projects.find((item) => item.id === projectId)
  const [mode, setMode] = useState("auto")
  const settings = (user && user.settings) || {}
  const [model, setModel] = useState(settings.model || (models[0] && models[0].key) || "")
  const [seed, setSeed] = useState(null)
  const pending = useRef(null)
  const [billing, setBilling] = useState(null)
  const [newProject, setNewProject] = useState(false)

  useEffect(() => {
    api.get("/api/billing").then(setBilling).catch(() => setBilling(null))
  }, [])

  useEffect(() => {
    const template = TEMPLATES.find((item) => item.slug === params.get("template"))
    if (template) setSeed({ value: template.prompt })
    else if (params.get("prompt")) setSeed({ value: params.get("prompt") })
  }, [params])

  async function ensureChat() {
    if (pending.current) return pending.current
    pending.current = api.post("/api/chats", { project_id: projectId, model, mode, kind: section }).then((data) => {
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

  async function send(text, files) {
    try {
      const chat = await ensureChat()
      navigate("/app/c/" + chat.id, { state: { first: { text, files, mode, model } } })
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-mark"><LogoMark size={54} draw /></div>
        <h1 className="home-title">{copy.title || greeting(user && user.name)}</h1>
        <p className="home-sub">{project ? "New chat in " + project.name + ". It shares the project's files and notes." : copy.sub}</p>
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
          {(section === "code" ? CODE_IDEAS.map((item) => ({ ...item, icon: Code2 })) : section === "design" ? DESIGN_IDEAS.map((item) => ({ ...item, icon: Palette })) : IDEAS).map((idea) => {
            const Icon = idea.icon
            return (
              <button key={idea.title} type="button" className="idea" onClick={() => setSeed({ value: idea.text })}>
                <Icon size={16} />
                <span>{idea.title}</span>
              </button>
            )
          })}
        </div>
      </div>
      <NewProjectModal open={newProject} onClose={() => setNewProject(false)} />
      <div className="home-sections">
        {section === "chat" && billing && (
          <div className="home-usage">
            <span className={"chip plan-" + billing.plan}><Zap size={13} />{billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)} plan</span>
            {billing.limit > 0 && usage ? (
              <>
                <span className="meter"><span style={{ width: Math.min(100, ((usage.tokens_in + usage.tokens_out) / billing.limit) * 100) + "%" }} /></span>
                <span className="muted small">{Math.round(Math.min(100, ((usage.tokens_in + usage.tokens_out) / billing.limit) * 100))}% of today's usage</span>
              </>
            ) : <span className="muted small">No daily limit</span>}
            <Link to="/app/billing" className="text-link small">{billing.plan === "free" ? "Upgrade" : "Manage plan"}</Link>
          </div>
        )}
        {section === "code" && (
          <section>
            <div className="home-section-head"><h2>Your projects</h2><Link to="/app/projects" className="text-link small">All projects</Link></div>
            <div className="recent-grid">
              <button type="button" className="recent-card new-card" onClick={() => setNewProject(true)}>
                <span className="recent-icon"><Plus size={16} /></span>
                <span className="recent-title">New project</span>
                <span className="recent-meta">Shared files for many chats</span>
              </button>
              {projects.slice(0, 5).map((item) => (
                <button key={item.id} type="button" className="recent-card" onClick={() => navigate("/app/projects/" + item.id)}>
                  <span className="recent-icon"><FolderKanban size={16} /></span>
                  <span className="recent-title" dir="auto">{item.name}</span>
                  <span className="recent-meta"><Clock size={12} />{timeAgo(item.updated_at)}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {chatsReady && chats.filter((item) => (item.kind || "chat") === section).length > 0 && (
          <section>
            <div className="home-section-head"><h2>Continue where you left off</h2></div>
            <div className="recent-grid">
              {chats.filter((item) => (item.kind || "chat") === section).slice(0, 6).map((chat) => (
                <button key={chat.id} type="button" className="recent-card" onClick={() => navigate("/app/c/" + chat.id)}>
                  <span className="recent-icon">{chat.mode === "plan" ? <ListChecks size={16} /> : section === "code" ? <Code2 size={16} /> : section === "design" ? <Palette size={16} /> : <MessageSquare size={16} />}</span>
                  <span className="recent-title" dir="auto">{chat.title}</span>
                  <span className="recent-meta"><Clock size={12} />{timeAgo(chat.updated_at)}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        <section>
          <div className="home-section-head"><h2>{section === "design" ? "Start from a design" : "Start from a template"}</h2>{section !== "design" && <Link to="/app/templates" className="text-link small">All templates</Link>}</div>
          <div className="template-grid">
            {(section === "design" ? DESIGN_GALLERY.slice(0, 8) : section === "code" ? TEMPLATES.filter((item) => item.category !== "Media").slice(0, 4) : TEMPLATES.slice(0, 4)).map((item) => (
              <button key={item.slug} type="button" className="template-card" onClick={() => {
                setSeed({ value: item.prompt })
                const box = document.querySelector(".home")
                if (box) box.scrollTo({ top: 0, behavior: "smooth" })
              }}>
                <div className="template-art"><Cover seed={item.slug + "t"} label={item.title} /></div>
                <strong>{item.title}</strong>
                <span className="muted small">{item.text}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
