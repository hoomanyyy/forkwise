import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { Activity, FileDiff, FolderTree, Globe, Laptop, ListChecks, MonitorPlay, SquareTerminal, X, Loader2, Plus, RotateCcw } from "lucide-react"
import PreviewPane from "./PreviewPane"

const FilesPane = lazy(() => import("./FilesPane"))
const ChangesPane = lazy(() => import("./ChangesPane"))
const TerminalPane = lazy(() => import("./TerminalPane"))
const ActivityPane = lazy(() => import("./ActivityPane"))
const BrowserPane = lazy(() => import("./BrowserPane"))
const ComputerPane = lazy(() => import("./ComputerPane"))
const PlanPane = lazy(() => import("./PlanPane"))

const TABS = [
  { key: "activity", label: "Activity", icon: Activity, hint: "Every step the agent took" },
  { key: "preview", label: "Preview", icon: MonitorPlay, hint: "The app the agent is running" },
  { key: "browser", label: "Browser", icon: Globe, hint: "The agent's browser, live" },
  { key: "computer", label: "Computer", icon: Laptop, hint: "Your computer, through the desktop app" },
  { key: "files", label: "Files", icon: FolderTree, hint: "Browse and edit the project" },
  { key: "changes", label: "Changes", icon: FileDiff, hint: "What the agent changed, file by file" },
  { key: "terminal", label: "Terminal", icon: SquareTerminal, hint: "Shells in the sandbox, several at once" },
  { key: "plan", label: "Plan", icon: ListChecks, hint: "The to-do list and plan" },
]

const LOCAL_TABS = ["activity", "computer", "plan"]
const DEFAULT_CLOUD = ["activity", "preview", "changes", "terminal"]
const DEFAULT_LOCAL = ["activity", "computer", "plan"]

function storeKey(local) {
  return local ? "fw-ws-tabs-local" : "fw-ws-tabs"
}

function readTabs(local) {
  const allowed = local ? LOCAL_TABS : TABS.map((item) => item.key)
  try {
    const list = JSON.parse(localStorage.getItem(storeKey(local)) || "null")
    if (Array.isArray(list)) {
      const clean = list.filter((key) => allowed.includes(key))
      if (clean.length > 0) return clean
    }
  } catch (problem) {
    return local ? DEFAULT_LOCAL : DEFAULT_CLOUD
  }
  return local ? DEFAULT_LOCAL : DEFAULT_CLOUD
}

function saveTabs(local, list) {
  try {
    localStorage.setItem(storeKey(local), JSON.stringify(list))
  } catch (problem) {
    return
  }
}

export default function Workspace({ wid, local, tab, setTab, onClose, preview, refreshKey, checkpoint, changes, theme, openPath, messages, todos, running, onOpenFile }) {
  const [open, setOpen] = useState(() => readTabs(local))
  const [adding, setAdding] = useState(false)
  const [menuAt, setMenuAt] = useState({ top: 0, left: 0 })
  const [dragging, setDragging] = useState("")
  const addRef = useRef(null)
  const allowed = local ? LOCAL_TABS : TABS.map((item) => item.key)
  const active = !allowed.includes(tab) ? open[0] || "activity" : tab

  useEffect(() => {
    setOpen(readTabs(local))
  }, [local])

  useEffect(() => {
    if (allowed.includes(tab) && !open.includes(tab)) update([...open, tab])
  }, [tab])

  useEffect(() => {
    if (!adding) return undefined
    function click(event) {
      if (addRef.current && !addRef.current.contains(event.target)) setAdding(false)
    }
    function key(event) {
      if (event.key === "Escape") setAdding(false)
    }
    document.addEventListener("mousedown", click)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("mousedown", click)
      document.removeEventListener("keydown", key)
    }
  }, [adding])

  function update(list) {
    setOpen(list)
    saveTabs(local, list)
  }

  function addTab(key) {
    if (!open.includes(key)) update([...open, key])
    setTab(key)
    setAdding(false)
  }

  function closeTab(key, event) {
    event.stopPropagation()
    if (open.length <= 1) return
    const index = open.indexOf(key)
    const list = open.filter((item) => item !== key)
    update(list)
    if (active === key) setTab(list[Math.max(0, index - 1)])
  }

  function dropOn(key) {
    if (!dragging || dragging === key) return
    const list = open.filter((item) => item !== dragging)
    list.splice(list.indexOf(key), 0, dragging)
    update(list)
    setDragging("")
  }

  function reset() {
    const list = local ? DEFAULT_LOCAL : DEFAULT_CLOUD
    update(list)
    setTab(list[0])
    setAdding(false)
  }

  const closed = TABS.filter((item) => allowed.includes(item.key) && !open.includes(item.key))

  return (
    <aside className="workspace">
      <div className={"workspace-tabs" + (open.length > 4 ? " many" : "")} role="tablist">
        {open.map((key) => {
          const item = TABS.find((entry) => entry.key === key)
          if (!item) return null
          const Icon = item.icon
          return (
            <div
              key={item.key}
              role="tab"
              tabIndex={0}
              draggable
              aria-selected={active === item.key}
              title={item.hint}
              className={"ws-tab" + (active === item.key ? " active" : "") + (dragging === item.key ? " dragging" : "")}
              onClick={() => setTab(item.key)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setTab(item.key) }}
              onDragStart={() => setDragging(item.key)}
              onDragEnd={() => setDragging("")}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOn(item.key)}
            >
              <Icon size={14} />
              <span className="ws-label">{item.label}</span>
              {item.key === "changes" && changes && changes.length > 0 && <span className="ws-badge">{changes.length}</span>}
              {item.key === "preview" && preview && <span className="live-dot" />}
              {item.key === "plan" && todos && todos.length > 0 && <span className="ws-badge">{todos.filter((entry) => entry.status === "completed").length}/{todos.length}</span>}
              {open.length > 1 && <button type="button" className="ws-tab-x" aria-label={"Close " + item.label} onClick={(event) => closeTab(item.key, event)}><X size={11} /></button>}
            </div>
          )
        })}
        <div className="ws-add" ref={addRef}>
          <button type="button" className={"icon-btn tiny" + (adding ? " on" : "")} title="Add a tab" aria-label="Add a tab" onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            setMenuAt({ top: box.bottom + 6, left: Math.max(8, Math.min(box.left, window.innerWidth - 310)) })
            setAdding(!adding)
          }}><Plus size={15} /></button>
          {adding && (
            <div className="popover ws-add-menu" style={{ top: menuAt.top, left: menuAt.left }}>
              <div className="pop-label">Add a tab</div>
              {closed.length === 0 && <div className="pop-empty">Every tab is open.</div>}
              {closed.map((item) => {
                const Icon = item.icon
                return (
                  <button key={item.key} type="button" className="pop-item" onClick={() => addTab(item.key)}>
                    <Icon size={16} /><span><strong>{item.label}</strong><small>{item.hint}</small></span>
                  </button>
                )
              })}
              {local && <div className="pop-note">This chat runs on your computer. Open it in the desktop app for files, changes and terminals.</div>}
              <div className="pop-sep" />
              <button type="button" className="pop-item" onClick={reset}><RotateCcw size={15} /><span><strong>Reset tabs</strong></span></button>
            </div>
          )}
        </div>
        <span className="tool-spacer" />
        <button className="icon-btn tiny" title="Close panel" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="workspace-body">
        <Suspense fallback={<div className="empty-small center"><Loader2 size={16} className="spin" /></div>}>
          {active === "activity" && <ActivityPane messages={messages || []} running={running} onOpenFile={onOpenFile} />}
          {active === "preview" && <PreviewPane preview={preview} refreshKey={refreshKey} />}
          {active === "browser" && <BrowserPane wid={wid} messages={messages || []} />}
          {active === "computer" && <ComputerPane wid={wid} messages={messages || []} />}
          {active === "files" && <FilesPane wid={wid} refreshKey={refreshKey} theme={theme} openPath={openPath} />}
          {active === "changes" && <ChangesPane wid={wid} since={checkpoint} refreshKey={refreshKey} theme={theme} onOpenFile={onOpenFile} />}
          {active === "terminal" && <TerminalPane wid={wid} theme={theme} />}
          {active === "plan" && <PlanPane wid={wid} todos={todos || []} refreshKey={refreshKey} />}
        </Suspense>
      </div>
    </aside>
  )
}
