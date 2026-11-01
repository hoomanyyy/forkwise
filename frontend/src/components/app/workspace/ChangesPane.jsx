import { useEffect, useState } from "react"
import { DiffEditor } from "@monaco-editor/react"
import { FileDiff, RefreshCw } from "lucide-react"
import "./monaco"
import { languageOf } from "./monaco"
import { api } from "../../../lib/api"

const LABELS = { A: "added", M: "changed", D: "deleted", R: "renamed" }

export default function ChangesPane({ wid, since, refreshKey, theme }) {
  const [files, setFiles] = useState([])
  const [current, setCurrent] = useState(null)
  const [diff, setDiff] = useState(null)
  const [error, setError] = useState("")

  async function load() {
    if (!since) return
    try {
      const data = await api.get("/api/ws/" + wid + "/changes?since=" + since)
      setFiles(data.files)
      setError("")
      if (data.files.length > 0 && !current) open(data.files[0].path)
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

  if (!since) return <div className="empty-small center">Changes appear here after Forkwise edits files.</div>

  return (
    <div className="files-pane">
      <div className="files-tree">
        <div className="pane-toolbar">
          <span className="faint small">Changed in the last task</span>
          <span className="tool-spacer" />
          <button className="icon-btn tiny" title="Refresh" onClick={load}><RefreshCw size={13} /></button>
        </div>
        <div className="tree-scroll">
          {error && <div className="empty-small">{error}</div>}
          {files.length === 0 && !error && <div className="empty-small">Nothing changed in the last task.</div>}
          {files.map((file) => (
            <button key={file.path} type="button" className={"tree-row file" + (current === file.path ? " selected" : "")} onClick={() => open(file.path)}>
              <FileDiff size={13} />
              <span className="change-name">{file.path}</span>
              <span className={"change-tag " + file.status}>{LABELS[file.status] || file.status}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="files-editor">
        {!diff && <div className="empty-small center">Pick a file to compare before and after.</div>}
        {diff && (
          <div className="editor-host">
            <DiffEditor
              key={diff.path}
              keepCurrentOriginalModel
              keepCurrentModifiedModel
              original={diff.before}
              modified={diff.after}
              language={languageOf(diff.path)}
              theme={theme === "light" ? "vs" : "forkwise-dark"}
              options={{ readOnly: true, renderSideBySide: false, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, fontFamily: "JetBrains Mono Variable, monospace" }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
