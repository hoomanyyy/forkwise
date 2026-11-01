import { lazy, Suspense } from "react"
import { FileDiff, FolderTree, MonitorPlay, SquareTerminal, X, Loader2 } from "lucide-react"
import PreviewPane from "./PreviewPane"

const FilesPane = lazy(() => import("./FilesPane"))
const ChangesPane = lazy(() => import("./ChangesPane"))
const TerminalPane = lazy(() => import("./TerminalPane"))

const TABS = [
  { key: "preview", label: "Preview", icon: MonitorPlay },
  { key: "files", label: "Files", icon: FolderTree },
  { key: "changes", label: "Changes", icon: FileDiff },
  { key: "terminal", label: "Terminal", icon: SquareTerminal },
]

export default function Workspace({ wid, tab, setTab, onClose, preview, refreshKey, checkpoint, changes, theme, openPath }) {
  return (
    <aside className="workspace">
      <div className="workspace-tabs">
        {TABS.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.key} type="button" className={"ws-tab" + (tab === item.key ? " active" : "")} onClick={() => setTab(item.key)}>
              <Icon size={14} />
              <span>{item.label}</span>
              {item.key === "changes" && changes && changes.length > 0 && <span className="ws-badge">{changes.length}</span>}
              {item.key === "preview" && preview && <span className="live-dot" />}
            </button>
          )
        })}
        <span className="tool-spacer" />
        <button className="icon-btn tiny" title="Close panel" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="workspace-body">
        <Suspense fallback={<div className="empty-small center"><Loader2 size={16} className="spin" /></div>}>
          {tab === "preview" && <PreviewPane preview={preview} refreshKey={refreshKey} />}
          {tab === "files" && <FilesPane wid={wid} refreshKey={refreshKey} theme={theme} openPath={openPath} />}
          {tab === "changes" && <ChangesPane wid={wid} since={checkpoint} refreshKey={refreshKey} theme={theme} />}
          {tab === "terminal" && <TerminalPane wid={wid} theme={theme} />}
        </Suspense>
      </div>
    </aside>
  )
}
