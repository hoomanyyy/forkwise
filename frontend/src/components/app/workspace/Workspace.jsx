import { lazy, Suspense } from "react"
import { Activity, FileDiff, FolderTree, Globe, Laptop, ListChecks, MonitorPlay, SquareTerminal, X, Loader2 } from "lucide-react"
import PreviewPane from "./PreviewPane"

const FilesPane = lazy(() => import("./FilesPane"))
const ChangesPane = lazy(() => import("./ChangesPane"))
const TerminalPane = lazy(() => import("./TerminalPane"))
const ActivityPane = lazy(() => import("./ActivityPane"))
const BrowserPane = lazy(() => import("./BrowserPane"))
const ComputerPane = lazy(() => import("./ComputerPane"))
const PlanPane = lazy(() => import("./PlanPane"))

const TABS = [
  { key: "activity", label: "Activity", icon: Activity },
  { key: "preview", label: "Preview", icon: MonitorPlay },
  { key: "browser", label: "Browser", icon: Globe },
  { key: "computer", label: "Computer", icon: Laptop },
  { key: "files", label: "Files", icon: FolderTree },
  { key: "changes", label: "Changes", icon: FileDiff },
  { key: "terminal", label: "Terminal", icon: SquareTerminal },
  { key: "plan", label: "Plan", icon: ListChecks },
]

export default function Workspace({ wid, tab, setTab, onClose, preview, refreshKey, checkpoint, changes, theme, openPath, messages, todos, running, onOpenFile }) {
  return (
    <aside className="workspace">
      <div className="workspace-tabs" role="tablist">
        {TABS.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} title={item.label} className={"ws-tab" + (tab === item.key ? " active" : "")} onClick={() => setTab(item.key)}>
              <Icon size={14} />
              <span>{item.label}</span>
              {item.key === "changes" && changes && changes.length > 0 && <span className="ws-badge">{changes.length}</span>}
              {item.key === "preview" && preview && <span className="live-dot" />}
              {item.key === "plan" && todos && todos.length > 0 && <span className="ws-badge">{todos.filter((entry) => entry.status === "completed").length}/{todos.length}</span>}
            </button>
          )
        })}
        <span className="tool-spacer" />
        <button className="icon-btn tiny" title="Close panel" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="workspace-body">
        <Suspense fallback={<div className="empty-small center"><Loader2 size={16} className="spin" /></div>}>
          {tab === "activity" && <ActivityPane messages={messages || []} running={running} onOpenFile={onOpenFile} />}
          {tab === "preview" && <PreviewPane preview={preview} refreshKey={refreshKey} />}
          {tab === "browser" && <BrowserPane wid={wid} messages={messages || []} />}
          {tab === "computer" && <ComputerPane wid={wid} messages={messages || []} />}
          {tab === "files" && <FilesPane wid={wid} refreshKey={refreshKey} theme={theme} openPath={openPath} />}
          {tab === "changes" && <ChangesPane wid={wid} since={checkpoint} refreshKey={refreshKey} theme={theme} onOpenFile={onOpenFile} />}
          {tab === "terminal" && <TerminalPane wid={wid} theme={theme} />}
          {tab === "plan" && <PlanPane wid={wid} todos={todos || []} refreshKey={refreshKey} />}
        </Suspense>
      </div>
    </aside>
  )
}
