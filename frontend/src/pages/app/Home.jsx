import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Globe, LayoutTemplate, Sparkles, FileSpreadsheet } from "lucide-react"
import Composer from "../../components/app/Composer"
import { LogoMark } from "../../components/ui/Logo"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { TEMPLATES } from "../../content/catalog"

const IDEAS = [
  { icon: LayoutTemplate, title: "Build a landing page", text: "Build a modern landing page for a specialty coffee shop in Tehran with a menu, gallery and contact form, then show it to me." },
  { icon: Globe, title: "Check a live price", text: "What is the US dollar to Iranian rial rate right now? Give me the sources." },
  { icon: FileSpreadsheet, title: "Analyse a spreadsheet", text: "I will attach a CSV. Clean it, find the main trends and make a chart dashboard I can open." },
  { icon: Sparkles, title: "Teach yourself a skill", text: "Make yourself a permanent tool that converts any currency using a free public API, test it, and tell me how to use it." },
]

function greeting(name) {
  const hour = new Date().getHours()
  const first = (name || "").split(" ")[0]
  let part = "Good evening"
  if (hour < 12) part = "Good morning"
  else if (hour < 18) part = "Good afternoon"
  return first ? part + ", " + first : part
}

export default function Home() {
  const { user, models, addChat, toast, projects } = useStore()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const projectId = params.get("project") || ""
  const project = projects.find((item) => item.id === projectId)
  const [mode, setMode] = useState("auto")
  const settings = (user && user.settings) || {}
  const [model, setModel] = useState(settings.model || (models[0] && models[0].key) || "")
  const [seed, setSeed] = useState(null)
  const pending = useRef(null)

  useEffect(() => {
    const template = TEMPLATES.find((item) => item.slug === params.get("template"))
    if (template) setSeed({ value: template.prompt })
    else if (params.get("prompt")) setSeed({ value: params.get("prompt") })
  }, [params])

  async function ensureChat() {
    if (pending.current) return pending.current
    pending.current = api.post("/api/chats", { project_id: projectId, model, mode }).then((data) => {
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
        <h1 className="home-title">{greeting(user && user.name)}</h1>
        <p className="home-sub">{project ? "New chat in " + project.name + ". It shares the project's files and notes." : "Ask a question, or describe something to build. Forkwise has its own computer to do the work."}</p>
        <Composer
          big
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
          {IDEAS.map((idea) => {
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
    </div>
  )
}
