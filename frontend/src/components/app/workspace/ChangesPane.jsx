import { useEffect, useMemo, useState } from "react"
import { DiffEditor } from "@monaco-editor/react"
import { ChevronRight, FileDiff, Folder, RefreshCw, Undo2 } from "lucide-react"
import "./monaco"
import { languageOf } from "./monaco"
import { api } from "../../../lib/api"
import { useConfirm } from "../../ui/Modal"
import { useStore } from "../../../lib/store"

const LABELS = { A: "new", M: "edited", D: "deleted", R: "renamed" }

function groupByFolder(files) {
  const groups = {}
  for (const file of files) {
    const parts = file.path.split("/")
    const name = parts.pop()
    const folder = parts.join("/") || "."
    if (!groups[folder]) groups[folder] = []
    groups[folder].push({ ...file, name })
  }
  return Object.keys(groups).sort().map((folder) => ({ folder, files: groups[folder] }))
}

export default function ChangesPane({ wid, since, refreshKey, theme, onOpenFile }) {
  const confirm = useConfirm()
  const { toast } = useStore()
  const [files, setFiles] = useState([])
  const [current, setCurrent] = useState(null)
  const [diff, setDiff] = useState(null)
  const [error, setError] = useState("")
  const [shut, setShut] = useState({})
  const [sideBySide, setSideBySide] = useState(false)

  async function load() {
    if (!since) return
    try {
      const data = await api.get("/api/ws/" + wid + "/changes?since=" + since)
      setFiles(data.files)
      setError("")
      if (data.files.length > 0 && !current) open(data.files[0].path)
      if (current && data.files.every((item) => item.path !== current)) {
        setCurrent(null)
        setDiff(null)
      }
    } catch (problem) {
      setError(problem.message)
    }
  }

  useEffect(() => {
    load()
  }, [wid, since, refreshKey])

  async function open(path) {
    setCurrent(path)
    try {
      const data = await api.get("/api/ws/" + wid + "/diff?since=" + since + "&path=" + encodeURIComponent(path))
      setDiff(data)
    } catch (problem) {
      setDiff(null)
    }
  }

  async function revert(file) {
    const sure = await confirm({ title: "Undo changes to " + file.path + "?", text: file.status === "A" ? "This file was created in the last task. It will be deleted." : "The file goes back to how it was before the last task.", confirmLabel: "Undo", danger: true })
    if (!sure) return
    try {
      await api.post("/api/ws/" + wid + "/revert", { since, path: file.path })
      toast("Reverted " + file.path, "ok")
      setDiff(null)
      setCurrent(null)
      load()
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  const groups = useMemo(() => groupByFolder(files), [files])
  const added = files.reduce((sum, item) => sum + (item.added || 0), 0)
  const removed = files.reduce((sum, item) => sum + (item.removed || 0), 0)
  const currentFile = files.find((item) => item.path === current)

  if (!since) return <div className="empty-small center">Changes appear here after Forkwise edits files.</div>

  return (
    <div className="files-pane">
      <div className="files-tree">
        <div className="pane-toolbar">
          <span className="small">{files.length} {files.length === 1 ? "file" : "files"}</span>
          <span className="tool-diffstat"><span className="add">+{added}</span><span className="del">−{removed}</span></span>
          <span className="tool-spacer" />
          <button className="icon-btn tiny" title="Refresh" onClick={load}><RefreshCw size={13} /></button>
        </div>
        <div className="tree-scroll">
          {error && <div className="empty-small">{error}</div>}
          {files.length === 0 && !error && <div className="empty-small">Nothing changed in the last task.</div>}
          {groups.map((group) => (
            <div key={group.folder}>
              <button type="button" className="tree-row" onClick={() => setShut({ ...shut, [group.folder]: !shut[group.folder] })}>
                <ChevronRight size={13} className={"tree-chev" + (shut[group.folder] ? "" : " open")} />
                <Folder size={13} />
                <span className="change-name">{group.folder}</span>
              </button>
              {!shut[group.folder] && group.files.map((file) => (
                <button key={file.path} type="button" className={"tree-row file change" + (current === file.path ? " selected" : "")} style={{ paddingLeft: 30 }} onClick={() => open(file.path)}>
                  <FileDiff size={13} />
                  <span className="change-name">{file.name}</span>
                  <span className={"change-tag " + file.status}>{LABELS[file.status] || file.status}</span>
                  {!file.binary && <span className="tool-diffstat"><span className="add">+{file.added}</span><span className="del">−{file.removed}</span></span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="files-editor">
        {!diff && <div className="empty-small center">Pick a file to compare before and after.</div>}
        {diff && (
          <>
            <div className="pane-toolbar">
              <span className="mono small">{diff.path}</span>
              <span className="tool-spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => setSideBySide(!sideBySide)}>{sideBySide ? "Inline" : "Side by side"}</button>
              {!diff.deleted && onOpenFile && <button className="btn btn-ghost btn-sm" onClick={() => onOpenFile(diff.path)}>Open</button>}
              {currentFile && <button className="btn btn-ghost btn-sm" onClick={() => revert(currentFile)}><Undo2 size={12} />Undo</button>}
            </div>
            <div className="editor-host">
              <DiffEditor
                key={diff.path + sideBySide}
                keepCurrentOriginalModel
                keepCurrentModifiedModel
                original={diff.before}
                modified={diff.after}
                language={languageOf(diff.path)}
                theme={theme === "light" ? "vs" : "forkwise-dark"}
                options={{ readOnly: true, renderSideBySide: sideBySide, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, fontFamily: "JetBrains Mono Variable, monospace" }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
