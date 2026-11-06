import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUp, ChevronDown, ChevronRight, Hand, Loader2, Paperclip, Plus, Square, X, Zap, Map as MapIcon, FileText, Check, Sparkles, Github, Mail, Monitor, Brain, Search, ChevronLeft } from "lucide-react"
import { api, upload, rawUrl } from "../../lib/api"
import { groupModels, readRecent, rememberModel, vendorInfo, vendorOf } from "../../lib/vendors"

let skillCache = null

export function loadSkills(force) {
  if (skillCache && !force) return Promise.resolve(skillCache)
  return api.get("/api/skills").then((data) => {
    const list = []
    for (const item of data.skills || []) {
      if (item.enabled) list.push({ name: item.name, title: item.name, description: item.description || "", category: "Your skills" })
    }
    for (const item of data.builtin || []) list.push(item)
    skillCache = list
    return list
  }).catch(() => [])
}

function VendorBadge({ vendor }) {
  const info = vendorInfo(vendor)
  return <span className="vendor-badge" style={{ "--vendor": info.color }}>{info.label.charAt(0)}</span>
}

function modelMeta(item) {
  const parts = []
  if (item.context) parts.push(item.context >= 1000000 ? Math.round(item.context / 100000) / 10 + "M context" : Math.round(item.context / 1000) + "k context")
  if (item.vision) parts.push("sees images")
  return parts.join(" · ")
}

function ModelMenu({ models, current, onPick, effort, chooseEffort }) {
  const [query, setQuery] = useState("")
  const [vendor, setVendor] = useState("all")
  const groups = groupModels(models)
  const needle = query.trim().toLowerCase()
  const recent = readRecent().map((key) => models.find((item) => item.key === key)).filter(Boolean)
  function matches(item) {
    if (vendor !== "all" && vendorOf(item) !== vendor) return false
    if (!needle) return true
    return (item.label + " " + item.key + " " + vendorInfo(vendorOf(item)).label).toLowerCase().includes(needle)
  }
  function row(item, keyPrefix) {
    const on = current && item.key === current.key
    return (
      <button key={keyPrefix + item.key} type="button" className={"pop-item model-item" + (on ? " active" : "")} onClick={() => onPick(item.key)}>
        <VendorBadge vendor={vendorOf(item)} />
        <span><strong>{item.label}</strong><small>{modelMeta(item)}</small></span>
        {on && <Check size={14} />}
      </button>
    )
  }
  const shown = groups.map((group) => ({ vendor: group.vendor, items: group.items.filter(matches) })).filter((group) => group.items.length > 0)
  return (
    <>
      {models.length > 4 && (
        <label className="pop-search"><Search size={13} /><input autoFocus placeholder="Search models" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      )}
      {groups.length > 1 && (
        <div className="vendor-tabs">
          <button type="button" className={vendor === "all" ? "on" : ""} onClick={() => setVendor("all")}>All</button>
          {groups.map((group) => (
            <button key={group.vendor.key} type="button" className={vendor === group.vendor.key ? "on" : ""} onClick={() => setVendor(group.vendor.key)}>
              <VendorBadge vendor={group.vendor.key} />{group.vendor.label}
            </button>
          ))}
        </div>
      )}
      <div className="model-scroll">
        {!needle && vendor === "all" && recent.length > 0 && models.length > 4 && (
          <>
            <div className="pop-label">Recent</div>
            {recent.map((item) => row(item, "r-"))}
          </>
        )}
        {shown.map((group) => (
          <div key={group.vendor.key}>
            {groups.length > 1 && <div className="pop-label">{group.vendor.label}</div>}
            {group.items.map((item) => row(item, ""))}
          </div>
        ))}
        {shown.length === 0 && <div className="pop-empty">No model matches.</div>}
      </div>
      <div className="pop-sep" />
      <div className="pop-label"><Brain size={12} /> Thinking level</div>
      <div className="effort-row">
        {EFFORTS.map((item) => (
          <button key={item.key || "auto"} type="button" className={"effort-opt" + (effort === item.key ? " on" : "")} title={item.hint} onClick={() => chooseEffort(item.key)}>{item.label}</button>
        ))}
      </div>
      <div className="pop-note">{(EFFORTS.find((item) => item.key === effort) || EFFORTS[0]).hint}. Not every model supports it.</div>
    </>
  )
}

function SkillMenu({ skills, picked, onToggle, onBack }) {
  const [query, setQuery] = useState("")
  const needle = query.trim().toLowerCase()
  const list = skills.filter((item) => !needle || (item.name + " " + (item.title || "") + " " + item.description + " " + item.category).toLowerCase().includes(needle))
  let category = ""
  return (
    <>
      <div className="pop-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Back"><ChevronLeft size={15} /></button>
        <strong>Add a skill</strong>
      </div>
      <label className="pop-search"><Search size={13} /><input autoFocus placeholder="Search skills" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <div className="skill-scroll">
        {list.length === 0 && <div className="pop-empty">{skills.length === 0 ? "Loading skills…" : "No skill matches."}</div>}
        {list.map((item) => {
          const head = item.category !== category ? item.category : ""
          category = item.category
          const on = picked.includes(item.name)
          return (
            <div key={item.name}>
              {head && <div className="pop-label">{head}</div>}
              <button type="button" className={"pop-item" + (on ? " active" : "")} onClick={() => onToggle(item.name)}>
                <Sparkles size={15} /><span><strong>{item.title || item.name}</strong><small>{item.description}</small></span>
                {on && <Check size={14} />}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

export const MODES = [
  { key: "auto", label: "Auto", icon: Zap, hint: "Works on its own from start to finish" },
  { key: "ask", label: "Ask first", icon: Hand, hint: "Asks before it changes files or runs commands" },
  { key: "plan", label: "Plan", icon: MapIcon, hint: "Researches and writes a plan, builds after you approve" },
]

export const EFFORTS = [
  { key: "", label: "Auto", hint: "The model decides how long to think" },
  { key: "low", label: "Low", hint: "Fast answers, little thinking" },
  { key: "medium", label: "Medium", hint: "Balanced for most work" },
  { key: "high", label: "High", hint: "Thinks longest, best for hard bugs" },
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
  const [plusOpen, setPlusOpen] = useState(false)
  const [plusView, setPlusView] = useState("main")
  const [skillList, setSkillList] = useState([])
  const [picked, setPicked] = useState([])
  const [effort, setEffort] = useState(() => {
    try { return localStorage.getItem("fw-effort") || "" } catch (e) { return "" }
  })
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

  useEffect(() => {
    loadSkills().then(setSkillList)
  }, [])

  useEffect(() => {
    if (plusOpen) loadSkills(true).then(setSkillList)
    else setPlusView("main")
  }, [plusOpen])

  function chooseEffort(value) {
    setEffort(value)
    try { localStorage.setItem("fw-effort", value) } catch (e) {}
  }

  function togglePicked(name) {
    setPicked((old) => (old.includes(name) ? old.filter((item) => item !== name) : [...old, name].slice(0, 5)))
  }

  const slashing = text.startsWith("/") && !text.includes(" ")
  const commands = slashing ? COMMANDS.filter((item) => item.cmd.startsWith(text.toLowerCase())) : []
  const slashSkills = slashing ? skillList.filter((item) => ("/" + item.name).startsWith(text.toLowerCase()) || (text.length > 2 && (item.title || "").toLowerCase().includes(text.slice(1).toLowerCase()))).slice(0, 8) : []
  const slashItems = [...commands.map((item) => ({ kind: "cmd", key: item.cmd, item: item })), ...slashSkills.map((item) => ({ kind: "skill", key: "s-" + item.name, item: item }))]

  function pickSlash(entry) {
    if (entry.kind === "cmd") {
      runCommand(entry.item.cmd)
      return
    }
    setText("")
    if (!picked.includes(entry.item.name)) togglePicked(entry.item.name)
    setTimeout(() => area.current && area.current.focus(), 10)
  }

  function skillTitle(name) {
    const found = skillList.find((item) => item.name === name)
    return found ? found.title || found.name : name
  }

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
    if (slashItems.length > 0 && value.startsWith("/")) {
      pickSlash(slashItems[Math.min(commandIndex, slashItems.length - 1)])
      return
    }
    if (!value && files.length === 0) return
    if (uploading) return
    onSend(value, files, { effort: effort, skills: picked })
    setText("")
    setFiles([])
    setPicked([])
  }

  function onKey(event) {
    if (slashItems.length > 0) {
      if (event.key === "ArrowDown") { event.preventDefault(); setCommandIndex((commandIndex + 1) % slashItems.length); return }
      if (event.key === "ArrowUp") { event.preventDefault(); setCommandIndex((commandIndex - 1 + slashItems.length) % slashItems.length); return }
      if (event.key === "Tab") { event.preventDefault(); pickSlash(slashItems[commandIndex % slashItems.length]); return }
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
      {slashItems.length > 0 && (
        <div className="command-menu">
          {slashItems.map((entry, index) => {
            const head = index === 0 || slashItems[index - 1].kind !== entry.kind ? (entry.kind === "cmd" ? "Commands" : "Skills") : ""
            return (
              <div key={entry.key}>
                {head && <div className="command-head">{head}</div>}
                <button type="button" className={index === commandIndex % slashItems.length ? "active" : ""} onMouseDown={(e) => { e.preventDefault(); pickSlash(entry) }}>
                  {entry.kind === "cmd" ? <span className="mono">{entry.item.cmd}</span> : <span className="command-skill"><Sparkles size={13} />{entry.item.title || entry.item.name}</span>}
                  <span className="faint">{entry.kind === "cmd" ? entry.item.desc : entry.item.description}</span>
                </button>
              </div>
            )
          })}
        </div>
      )}
      {picked.length > 0 && (
        <div className="composer-skills">
          {picked.map((name) => (
            <span key={name} className="composer-skill" title="The agent loads this skill first">
              <Sparkles size={12} /><span>{skillTitle(name)}</span>
              <button type="button" aria-label="Remove skill" onClick={() => togglePicked(name)}><X size={11} /></button>
            </span>
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
        <div className="pop-anchor">
          <button type="button" className={"icon-btn plus-btn" + (plusOpen ? " on" : "")} title="Add files, skills and connectors" onClick={() => setPlusOpen(!plusOpen)}>
            {uploading ? <Loader2 size={17} className="spin" /> : <Plus size={18} />}
          </button>
          <Popover open={plusOpen} onClose={() => setPlusOpen(false)} className={"up plus-menu" + (plusView === "skills" ? " skills-view" : "")}>
            {plusView === "skills" ? (
              <SkillMenu skills={skillList} picked={picked} onToggle={togglePicked} onBack={() => setPlusView("main")} />
            ) : (<>
            <button type="button" className="pop-item" onClick={() => { setPlusOpen(false); picker.current.click() }}>
              <Paperclip size={16} /><span><strong>Add files or photos</strong></span>
            </button>
            <button type="button" className="pop-item" onClick={() => setPlusView("skills")}>
              <Sparkles size={16} /><span><strong>Add a skill</strong><small>{skillList.length ? skillList.length + " expert playbooks, or type /" : "Expert playbooks for the task"}</small></span><ChevronRight size={14} />
            </button>
            <Link to="/app/settings/abilities" className="pop-item" onClick={() => setPlusOpen(false)}>
              <Plus size={16} /><span><strong>Manage skills</strong></span><ChevronRight size={14} />
            </Link>
            <div className="pop-sep" />
            <div className="pop-label">Connect</div>
            <Link to="/app/settings/connections" className="pop-item" onClick={() => setPlusOpen(false)}><Github size={16} /><span><strong>GitHub</strong></span><ChevronRight size={14} /></Link>
            <Link to="/app/settings/connections" className="pop-item" onClick={() => setPlusOpen(false)}><Mail size={16} /><span><strong>Gmail and Google</strong></span><ChevronRight size={14} /></Link>
            <Link to="/app/settings/computer" className="pop-item" onClick={() => setPlusOpen(false)}><Monitor size={16} /><span><strong>Your computer</strong></span><ChevronRight size={14} /></Link>
            <div className="pop-sep" />
            <div className="pop-label">Mode</div>
            {MODES.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.key} type="button" className={"pop-item" + (item.key === mode ? " active" : "")} onClick={() => { onMode(item.key); setPlusOpen(false) }}>
                  <Icon size={16} /><span><strong>{item.label}</strong><small>{item.hint}</small></span>
                  {item.key === mode && <Check size={14} />}
                </button>
              )
            })}
            </>)}
          </Popover>
        </div>
        <input ref={picker} type="file" multiple hidden onChange={(e) => { addFiles(Array.from(e.target.files)); e.target.value = "" }} />
        {mode !== "auto" && (
          <button type="button" className={"mode-pill mode-" + mode} onClick={() => onMode("auto")} title="Click to go back to Auto">
            <ModeIcon size={14} />{current.label}<X size={12} />
          </button>
        )}
        <span className="composer-spacer" />
        <ContextRing context={context} />
        {models.length > 0 && (
          <div className="pop-anchor">
            <button type="button" className="model-pill" onClick={() => setModelOpen(!modelOpen)}>
              {currentModel && <VendorBadge vendor={vendorOf(currentModel)} />}{currentModel ? currentModel.label : "Model"}{effort ? <span className="model-effort">{effort.charAt(0).toUpperCase() + effort.slice(1)}</span> : null}<ChevronDown size={13} />
            </button>
            <Popover open={modelOpen} onClose={() => setModelOpen(false)} className="up right model-menu">
              <ModelMenu models={models} current={currentModel} effort={effort} chooseEffort={chooseEffort} onPick={(key) => { rememberModel(key); onModel(key); setModelOpen(false) }} />
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
