import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { ChevronDown, Download, FolderKanban, ListChecks, PanelRight, ArrowDown } from "lucide-react"
import Composer from "../../components/app/Composer"
import MessageList from "../../components/app/MessageList"
import Workspace from "../../components/app/workspace/Workspace"
import { TodoList } from "../../components/app/ToolCall"
import { LogoMark } from "../../components/ui/Logo"
import { ChatSkeleton } from "../../components/ui/Skeleton"
import { useChat } from "../../lib/useChat"
import { useStore } from "../../lib/store"
import { api, apiUrl } from "../../lib/api"

const FILE_TOOLS = ["write_file", "edit_file", "multi_edit", "bash", "create_tool", "show_file", "screenshot"]
const INIT_PROMPT = "Look through this project and write a FORKWISE.md file in the project folder: what the project is, the stack, how to install and run it (exact commands and ports), the folder layout, important decisions and conventions. Keep it short and useful for future work."

function readWidth() {
  try {
    return Number(localStorage.getItem("fw-panel")) || 560
  } catch (problem) {
    return 560
  }
}

export default function Chat() {
  const { chatId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { models, patchChat, theme, toast } = useStore()
  const [panel, setPanel] = useState(false)
  const [tab, setTab] = useState("preview")
  const [refreshKey, setRefreshKey] = useState(0)
  const [width, setWidth] = useState(readWidth)
  const [seed, setSeed] = useState(null)
  const [todosOpen, setTodosOpen] = useState(true)
  const [atBottom, setAtBottom] = useState(true)
  const scroller = useRef(null)
  const sentFirst = useRef(false)
  const toolNames = useRef({})
  const widthRef = useRef(width)
  widthRef.current = width

  const { state, send, stop, respond, reload, setChat } = useChat(chatId, {
    onEvent(event) {
      if (event.type === "tool_start") toolNames.current[event.id] = event.name
      if (event.type === "preview") {
        setPanel(true)
        setTab("preview")
        setRefreshKey((value) => value + 1)
      }
      if (event.type === "tool_end" && FILE_TOOLS.indexOf(toolNames.current[event.id]) !== -1) setRefreshKey((value) => value + 1)
      if (event.type === "title") patchChat(chatId, { title: event.title })
      if (event.type === "start") patchChat(chatId, { running: true })
      if (event.type === "done") {
        patchChat(chatId, { running: false, updated_at: Date.now() / 1000 })
        setRefreshKey((value) => value + 1)
      }
      if (event.type === "capability") toast("Forkwise learned a new " + event.kind + ": " + event.name, "ok")
      if (event.type === "memory") toast("Saved to memory", "ok")
    },
  })

  useEffect(() => {
    sentFirst.current = false
    setPanel(false)
  }, [chatId])

  useEffect(() => {
    const first = location.state && location.state.first
    if (!first || sentFirst.current || state.loading || !state.chat) return
    sentFirst.current = true
    navigate(location.pathname, { replace: true, state: null })
    send(first.text, { attachments: first.files, mode: first.mode, model: first.model })
  }, [state.loading, state.chat, location.state])

  useEffect(() => {
    if (state.preview && !panel && state.messages.length > 0 && !state.loading) {
      setPanel(true)
    }
  }, [state.loading])

  useEffect(() => {
    if (atBottom && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [state.messages, state.live, atBottom])

  function onScroll() {
    const box = scroller.current
    if (!box) return
    setAtBottom(box.scrollHeight - box.scrollTop - box.clientHeight < 80)
  }

  async function setMode(mode) {
    setChat({ mode })
    try {
      await api.patch("/api/chats/" + chatId, { mode })
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  async function setModel(model) {
    setChat({ model })
    await api.patch("/api/chats/" + chatId, { model })
  }

  async function command(cmd) {
    if (cmd === "/plan") return setMode("plan")
    if (cmd === "/auto") return setMode("auto")
    if (cmd === "/ask") return setMode("ask")
    if (cmd === "/new") return navigate("/app")
    if (cmd === "/memory") return navigate("/app/settings/memory")
    if (cmd === "/abilities") return navigate("/app/settings/abilities")
    if (cmd === "/init") return send(INIT_PROMPT)
    if (cmd === "/compact") {
      try {
        const data = await api.post("/api/chats/" + chatId + "/compact")
        toast(data.ok ? "Chat summarized" : "Nothing to summarize yet")
        reload(false)
      } catch (problem) {
        toast(problem.message, "error")
      }
    }
    return null
  }

  async function rewind(message) {
    if (!window.confirm("Go back to this message? Later messages are removed and file changes made after it are undone.")) return
    try {
      const data = await api.post("/api/chats/" + chatId + "/rewind", { message_id: message.id, files: true })
      await reload(false)
      setSeed({ value: data.content })
      setRefreshKey((value) => value + 1)
      toast(data.files_restored ? "Restored files and conversation" : "Restored conversation")
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  async function approvePlan() {
    await setMode("auto")
    send("The plan is approved. Build it now, following the plan, and verify the result.", { mode: "auto" })
  }

  function revisePlan() {
    setSeed({ value: "Change the plan: " })
  }

  function openPreview() {
    setPanel(true)
    setTab("preview")
  }

  function startDrag(event) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = width
    function move(e) {
      const next = Math.max(360, Math.min(window.innerWidth - 420, startWidth + (startX - e.clientX)))
      setWidth(next)
    }
    function up() {
      document.removeEventListener("mousemove", move)
      document.removeEventListener("mouseup", up)
      document.body.classList.remove("dragging")
      try {
        localStorage.setItem("fw-panel", String(widthRef.current))
      } catch (problem) {
        return
      }
    }
    document.body.classList.add("dragging")
    document.addEventListener("mousemove", move)
    document.addEventListener("mouseup", up)
  }

  if (state.notFound) {
    return (
      <div className="center-page">
        <LogoMark size={48} plain />
        <h2>This chat does not exist</h2>
        <p className="muted">It may have been deleted.</p>
        <Link className="btn btn-primary" to="/app">Start a new chat</Link>
      </div>
    )
  }

  if (state.loading || !state.chat) {
    return <ChatSkeleton />
  }

  const chat = state.chat
  const todos = state.todos || []
  const done = todos.filter((item) => item.status === "completed").length
  const showTodos = todos.length > 0 && (state.live.running || done < todos.length)

  return (
    <div className="chat-layout">
      <section className="chat-column">
        <header className="chat-header">
          {state.project && (
            <Link to={"/app/projects/" + state.project.id} className="chip"><FolderKanban size={13} />{state.project.name}</Link>
          )}
          <h1 className="chat-name" dir="auto">{chat.title}</h1>
          <span className="tool-spacer" />
          <a className="icon-btn" title="Download all files" href={apiUrl("/api/ws/" + chat.workspace_id + "/zip")}><Download size={16} /></a>
          <button className={"icon-btn" + (panel ? " active" : "")} title="Show the computer: preview, files, changes and terminal" onClick={() => setPanel(!panel)}><PanelRight size={17} /></button>
        </header>
        <div className="chat-scroll" ref={scroller} onScroll={onScroll}>
          <div className="chat-inner">
            {state.messages.length === 0 && !state.live.running && (
              <div className="chat-empty"><LogoMark size={40} draw /><p className="muted">Send a message to start.</p></div>
            )}
            <MessageList
              state={state}
              wid={chat.workspace_id}
              respond={respond}
              onPreview={openPreview}
              onRewind={rewind}
              onApprovePlan={approvePlan}
              onRevisePlan={revisePlan}
            />
          </div>
        </div>
        <div className="chat-bottom">
          {!atBottom && (
            <button className="to-bottom" onClick={() => { scroller.current.scrollTop = scroller.current.scrollHeight }} aria-label="Scroll to the latest message"><ArrowDown size={16} /></button>
          )}
          {showTodos && (
            <div className={"todo-dock" + (todosOpen ? " open" : "")}>
              <button type="button" className="todo-dock-head" onClick={() => setTodosOpen(!todosOpen)}>
                <ListChecks size={15} />
                <span>Plan</span>
                <span className="todo-progress"><span style={{ width: (done / todos.length) * 100 + "%" }} /></span>
                <span className="faint small">{done} of {todos.length}</span>
                <ChevronDown size={14} className="todo-chev" />
              </button>
              {todosOpen && <TodoList todos={todos} />}
            </div>
          )}
          <Composer
            onSend={(text, files) => send(text, { attachments: files })}
            onStop={stop}
            running={state.live.running}
            mode={chat.mode}
            onMode={setMode}
            model={chat.model}
            onModel={setModel}
            models={models}
            getWorkspace={async () => chat.workspace_id}
            context={state.live.context}
            initialText={seed}
            onCommand={command}
          />
        </div>
      </section>
      {panel && (
        <>
          <div className="panel-handle" onMouseDown={startDrag} />
          <div className="panel-wrap" style={{ width }}>
            <Workspace
              wid={chat.workspace_id}
              tab={tab}
              setTab={setTab}
              onClose={() => setPanel(false)}
              preview={state.preview}
              refreshKey={refreshKey}
              checkpoint={state.checkpoint}
              changes={state.changes}
              theme={theme}
            />
          </div>
        </>
      )}
    </div>
  )
}
