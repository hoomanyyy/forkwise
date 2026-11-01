import { useEffect, useRef, useState } from "react"
import { ArrowUp, ChevronDown, Hand, Loader2, Paperclip, Square, X, Zap, Map as MapIcon, FileText, Check } from "lucide-react"
import { upload, rawUrl } from "../../lib/api"

export const MODES = [
  { key: "auto", label: "Auto", icon: Zap, hint: "Works on its own from start to finish" },
  { key: "ask", label: "Ask first", icon: Hand, hint: "Asks before it changes files or runs commands" },
  { key: "plan", label: "Plan", icon: MapIcon, hint: "Researches and writes a plan, builds after you approve" },
]

const COMMANDS = [
  { cmd: "/plan", desc: "Switch to plan mode" },
  { cmd: "/auto", desc: "Switch to auto mode" },
  { cmd: "/ask", desc: "Ask before changes" },
  { cmd: "/init", desc: "Write FORKWISE.md notes for this project" },
  { cmd: "/compact", desc: "Summarize the chat to free up context" },
  { cmd: "/new", desc: "Start a new chat" },
  { cmd: "/memory", desc: "See what Forkwise remembers" },
  { cmd: "/abilities", desc: "Tools and skills Forkwise made" },
]

function Popover({ open, onClose, children, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    function click(event) {
      if (ref.current && !ref.current.contains(event.target)) onClose()
    }
    function key(event) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", click)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("mousedown", click)
      document.removeEventListener("keydown", key)
    }
  }, [open, onClose])
  if (!open) return null
  return <div ref={ref} className={"popover " + (className || "")}>{children}</div>
}

function ContextRing({ context }) {
  if (!context || !context.limit || context.tokens / context.limit < 0.25) return null
  const share = Math.min(1, context.tokens / context.limit)
  const radius = 8
  const length = 2 * Math.PI * radius
  return (
    <span className="context-ring" title={"Context used: " + Math.round(share * 100) + "% of " + Math.round(context.limit / 1000) + "k tokens"}>
      <svg width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r={radius} fill="none" stroke="var(--line-strong)" strokeWidth="2.5" />
        <circle cx="11" cy="11" r={radius} fill="none" stroke={share > 0.7 ? "var(--amber)" : "var(--iris)"} strokeWidth="2.5" strokeDasharray={length} strokeDashoffset={length * (1 - share)} strokeLinecap="round" transform="rotate(-90 11 11)" />
      </svg>
    </span>
  )
}

export default function Composer({ onSend, onStop, running, mode, onMode, model, onModel, models, getWorkspace, context, initialText, onCommand, placeholder, big }) {
  const [text, setText] = useState("")
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [modeOpen, setModeOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [wid, setWid] = useState(null)
  const [error, setError] = useState("")
  const [commandIndex, setCommandIndex] = useState(0)
  const area = useRef(null)
  const picker = useRef(null)

  useEffect(() => {
    if (initialText && initialText.value !== undefined) {
      setText(initialText.value)
      setTimeout(() => area.current && area.current.focus(), 30)
    }
  }, [initialText])

  useEffect(() => {
    const box = area.current
    if (!box) return
    box.style.height = "0px"
    box.style.height = Math.min(box.scrollHeight, 320) + "px"
  }, [text])

  const commands = text.startsWith("/") && !text.includes(" ") ? COMMANDS.filter((item) => item.cmd.startsWith(text.toLowerCase())) : []

  async function addFiles(list) {
    if (!list || list.length === 0) return
    setUploading(true)
    setError("")
    try {
      const id = wid || (await getWorkspace())
      setWid(id)
      const data = await upload(id, list)
      setFiles((old) => [...old, ...data.files])
    } catch (problem) {
      setError(problem.message)
    }
    setUploading(false)
  }

  function runCommand(cmd) {
    setText("")
    if (onCommand) onCommand(cmd)
  }

  function submit() {
    const value = text.trim()
    if (commands.length > 0 && value.startsWith("/")) {
      runCommand(commands[Math.min(commandIndex, commands.length - 1)].cmd)
      return
    }
    if (!value && files.length === 0) return
    if (uploading) return
    onSend(value, files)
    setText("")
    setFiles([])
  }

  function onKey(event) {
    if (commands.length > 0) {
      if (event.key === "ArrowDown") { event.preventDefault(); setCommandIndex((commandIndex + 1) % commands.length); return }
      if (event.key === "ArrowUp") { event.preventDefault(); setCommandIndex((commandIndex - 1 + commands.length) % commands.length); return }
      if (event.key === "Tab") { event.preventDefault(); setText(commands[commandIndex % commands.length].cmd); return }
    }
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault()
      const index = MODES.findIndex((item) => item.key === mode)
      onMode(MODES[(index + 1) % MODES.length].key)
      return
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  function onPaste(event) {
    const pasted = []
    for (const item of event.clipboardData.items) {
      if (item.kind === "file") {
        const file = item.getAsFile()
        if (file) pasted.push(file)
      }
    }
    if (pasted.length > 0) {
      event.preventDefault()
      addFiles(pasted)
    }
  }

  function onDrop(event) {
    event.preventDefault()
    addFiles(Array.from(event.dataTransfer.files || []))
  }

  const current = MODES.find((item) => item.key === mode) || MODES[0]
  const ModeIcon = current.icon
  const currentModel = models.find((item) => item.key === model) || models[0]
  const canSend = (text.trim() || files.length > 0) && !uploading

  return (
    <div className={"composer" + (big ? " big" : "") + (mode === "plan" ? " plan" : "")} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      {commands.length > 0 && (
        <div className="command-menu">
          {commands.map((item, index) => (
            <button key={item.cmd} type="button" className={index === commandIndex % commands.length ? "active" : ""} onMouseDown={(e) => { e.preventDefault(); runCommand(item.cmd) }}>
              <span className="mono">{item.cmd}</span><span className="faint">{item.desc}</span>
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="composer-files">
          {files.map((file) => (
            <span key={file.path} className="composer-file">
              {file.kind === "image" ? <img src={rawUrl(wid, file.path)} alt="" /> : <FileText size={14} />}
              <span>{file.name}</span>
              <button type="button" aria-label="Remove file" onClick={() => setFiles(files.filter((item) => item.path !== file.path))}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <textarea
        ref={area}
        dir="auto"
        rows={1}
        value={text}
        placeholder={placeholder || (running ? "Add a message — Forkwise reads it at the next step" : "Ask anything, or describe what to build")}
        onChange={(e) => { setText(e.target.value); setCommandIndex(0) }}
        onKeyDown={onKey}
        onPaste={onPaste}
        autoFocus
      />
      {error && <div className="composer-error">{error}</div>}
      <div className="composer-bar">
        <button type="button" className="icon-btn" title="Attach files" onClick={() => picker.current.click()}>
          {uploading ? <Loader2 size={17} className="spin" /> : <Paperclip size={17} />}
        </button>
        <input ref={picker} type="file" multiple hidden onChange={(e) => { addFiles(Array.from(e.target.files)); e.target.value = "" }} />
        <div className="pop-anchor">
          <button type="button" className={"mode-pill mode-" + mode} onClick={() => setModeOpen(!modeOpen)} title="Shift+Tab to switch">
            <ModeIcon size={14} />{current.label}<ChevronDown size={13} />
          </button>
          <Popover open={modeOpen} onClose={() => setModeOpen(false)} className="up">
            {MODES.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.key} type="button" className={"pop-item" + (item.key === mode ? " active" : "")} onClick={() => { onMode(item.key); setModeOpen(false) }}>
                  <Icon size={16} />
                  <span><strong>{item.label}</strong><small>{item.hint}</small></span>
                  {item.key === mode && <Check size={14} />}
                </button>
              )
            })}
          </Popover>
        </div>
        <span className="composer-spacer" />
        <ContextRing context={context} />
        {models.length > 0 && (
          <div className="pop-anchor">
            <button type="button" className="model-pill" onClick={() => setModelOpen(!modelOpen)}>
              {currentModel ? currentModel.label : "Model"}<ChevronDown size={13} />
            </button>
            <Popover open={modelOpen} onClose={() => setModelOpen(false)} className="up right">
              {models.map((item) => (
                <button key={item.key} type="button" className={"pop-item" + (item.key === (currentModel && currentModel.key) ? " active" : "")} onClick={() => { onModel(item.key); setModelOpen(false) }}>
                  <span><strong>{item.label}</strong><small>{Math.round(item.context / 1000)}k context{item.vision ? ", sees images" : ""}</small></span>
                  {currentModel && item.key === currentModel.key && <Check size={14} />}
                </button>
              ))}
            </Popover>
          </div>
        )}
        {running && !canSend ? (
          <button type="button" className="send stop" onClick={onStop} title="Stop"><Square size={14} fill="currentColor" /></button>
        ) : (
          <button type="button" className="send" disabled={!canSend} onClick={submit} title="Send"><ArrowUp size={18} /></button>
        )}
      </div>
    </div>
  )
}
