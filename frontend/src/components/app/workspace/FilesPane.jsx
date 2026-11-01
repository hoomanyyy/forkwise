import { useEffect, useMemo, useState } from "react"
import Editor from "@monaco-editor/react"
import { ChevronRight, Download, File, Folder, FolderOpen, RefreshCw, Save, Trash2 } from "lucide-react"
import "./monaco"
import { languageOf } from "./monaco"
import { api, apiUrl, rawUrl } from "../../../lib/api"
import { formatSize } from "../ToolCall"

function buildTree(items) {
  const root = { name: "", path: "", type: "dir", children: [] }
  const folders = { "": root }
  for (const item of items) {
    const parts = item.path.split("/")
    const name = parts.pop()
    const parentPath = parts.join("/")
    const parent = folders[parentPath] || root
    const node = { name, path: item.path, type: item.type, size: item.size, skipped: item.skipped, children: [] }
    parent.children.push(node)
    if (item.type === "dir") folders[item.path] = node
  }
  return root
}

function TreeNode({ node, depth, open, toggle, selected, onSelect }) {
  if (node.type === "dir") {
    const isOpen = open[node.path]
    return (
      <div>
        <button type="button" className="tree-row" style={{ paddingLeft: 8 + depth * 14 }} onClick={() => toggle(node.path)}>
          <ChevronRight size={13} className={"tree-chev" + (isOpen ? " open" : "")} />
          {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
          <span className={node.skipped ? "faint" : ""}>{node.name}</span>
        </button>
        {isOpen && node.children.map((child) => (
          <TreeNode key={child.path} node={child} depth={depth + 1} open={open} toggle={toggle} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    )
  }
  return (
    <button type="button" className={"tree-row file" + (selected === node.path ? " selected" : "")} style={{ paddingLeft: 22 + depth * 14 }} onClick={() => onSelect(node.path)}>
      <File size={13} />
      <span>{node.name}</span>
    </button>
  )
}

export default function FilesPane({ wid, refreshKey, theme, openPath }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState({})
  const [selected, setSelected] = useState("")
  const [file, setFile] = useState(null)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  async function loadTree() {
    try {
      const data = await api.get("/api/ws/" + wid + "/tree")
      setItems(data.items)
    } catch (problem) {
      setItems([])
    }
  }

  useEffect(() => {
    loadTree()
  }, [wid, refreshKey])

  useEffect(() => {
    if (openPath) select(openPath)
  }, [openPath])

  async function select(path) {
    setSelected(path)
    const parts = path.split("/")
    const nextOpen = { ...open }
    for (let i = 1; i < parts.length; i += 1) nextOpen[parts.slice(0, i).join("/")] = true
    setOpen(nextOpen)
    try {
      const data = await api.get("/api/ws/" + wid + "/file?path=" + encodeURIComponent(path))
      setFile(data)
      setDraft(data.content)
    } catch (problem) {
      setFile({ path, error: problem.message })
    }
  }

  async function save() {
    if (!file || file.binary) return
    setSaving(true)
    try {
      await api.put("/api/ws/" + wid + "/file", { path: file.path, content: draft })
      setFile({ ...file, content: draft })
    } catch (problem) {
      setSaving(false)
      return
    }
    setSaving(false)
  }

  async function remove() {
    if (!file) return
    if (!window.confirm("Delete " + file.path + "?")) return
    await api.del("/api/ws/" + wid + "/file?path=" + encodeURIComponent(file.path))
    setFile(null)
    setSelected("")
    loadTree()
  }

  function toggle(path) {
    setOpen({ ...open, [path]: !open[path] })
  }

  const tree = useMemo(() => buildTree(items), [items])
  const dirty = file && !file.binary && draft !== file.content

  return (
    <div className="files-pane">
      <div className="files-tree">
        <div className="pane-toolbar">
          <span className="faint small">Project files</span>
          <span className="tool-spacer" />
          <button className="icon-btn tiny" title="Refresh" onClick={loadTree}><RefreshCw size={13} /></button>
          <a className="icon-btn tiny" title="Download everything as zip" href={apiUrl("/api/ws/" + wid + "/zip")}><Download size={13} /></a>
        </div>
        <div className="tree-scroll">
          {tree.children.length === 0 && <div className="empty-small">No files yet. Ask Forkwise to build something.</div>}
          {tree.children.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} open={open} toggle={toggle} selected={selected} onSelect={select} />
          ))}
        </div>
      </div>
      <div className="files-editor">
        {!file && <div className="empty-small center">Pick a file to view or edit it.</div>}
        {file && (
          <>
            <div className="pane-toolbar">
              <span className="mono small">{file.path}</span>
              {file.size !== undefined && <span className="faint small">{formatSize(file.size)}</span>}
              <span className="tool-spacer" />
              {dirty && <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}><Save size={13} />{saving ? "Saving" : "Save"}</button>}
              <a className="icon-btn tiny" title="Download" href={rawUrl(wid, file.path, true)}><Download size={13} /></a>
              <button className="icon-btn tiny" title="Delete" onClick={remove}><Trash2 size={13} /></button>
            </div>
            {file.error && <div className="empty-small">{file.error}</div>}
            {file.binary && file.kind === "image" && <div className="binary-view"><img src={rawUrl(wid, file.path)} alt={file.path} /></div>}
            {file.binary && file.kind === "video" && <div className="binary-view"><video src={rawUrl(wid, file.path)} controls /></div>}
            {file.binary && file.kind === "audio" && <div className="binary-view"><audio src={rawUrl(wid, file.path)} controls /></div>}
            {file.binary && ["image", "video", "audio"].indexOf(file.kind) === -1 && <div className="empty-small center">This file cannot be shown here. Download it instead.</div>}
            {!file.binary && !file.error && (
              <div className="editor-host" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save() } }}>
                <Editor
                  value={draft}
                  path={file.path}
                  language={languageOf(file.path)}
                  theme={theme === "light" ? "vs" : "forkwise-dark"}
                  onChange={(value) => setDraft(value || "")}
                  options={{ fontSize: 13, fontFamily: "JetBrains Mono Variable, monospace", minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: "on", padding: { top: 10 }, renderLineHighlight: "gutter", smoothScrolling: true }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
