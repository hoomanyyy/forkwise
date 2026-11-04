import { useEffect, useRef, useState } from "react"
import {
  BookOpen, Bot, Brain, Camera, Check, ChevronRight, Download, FilePen, FilePlus, FileText, FolderTree, Globe,
  ListChecks, Loader2, MessageCircleQuestion, MonitorPlay, Plug, Search, ShieldQuestion, Sparkles, Square,
  TerminalSquare, Wrench, X, ExternalLink, FileSearch, Laptop, MousePointerClick, Github, Mail, Clipboard, ImageIcon,
  Keyboard, AppWindow, Move, Clock
} from "lucide-react"
import Markdown from "./Markdown"
import { rawUrl } from "../../lib/api"

const SHOT_TOOLS = ["screenshot", "browser", "computer"]

function parseArgs(raw) {
  if (!raw) return {}
  if (typeof raw === "object") return raw
  try {
    return JSON.parse(raw)
  } catch (problem) {
    return {}
  }
}

export function partialField(raw, field) {
  const found = new RegExp('"' + field + '"\\s*:\\s*"').exec(raw || "")
  if (!found) return ""
  let rest = raw.slice(found.index + found[0].length)
  let out = ""
  let i = 0
  while (i < rest.length) {
    const ch = rest[i]
    if (ch === "\\") {
      const next = rest[i + 1]
      if (next === undefined) break
      if (next === "n") out += "\n"
      else if (next === "t") out += "\t"
      else if (next === "r") out += ""
      else if (next === "u") {
        const hex = rest.slice(i + 2, i + 6)
        if (hex.length < 4) break
        out += String.fromCharCode(parseInt(hex, 16))
        i += 4
      } else out += next
      i += 2
      continue
    }
    if (ch === '"') break
    out += ch
    i += 1
  }
  return out
}

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch (problem) {
    return url
  }
}

function shortPath(path) {
  if (!path) return ""
  const clean = String(path).replace(/^\/workspace\//, "")
  return clean.length > 60 ? "…" + clean.slice(-58) : clean
}

export function describe(name, args, meta) {
  const m = meta || {}
  if (name === "read_file") return { icon: FileText, verb: "Read", target: shortPath(args.path) }
  if (name === "write_file") return { icon: FilePlus, verb: m.created === false ? "Rewrote" : "Wrote", target: shortPath(args.path), diff: m }
  if (name === "edit_file" || name === "multi_edit") return { icon: FilePen, verb: "Edited", target: shortPath(args.path), diff: m }
  if (name === "list_dir") return { icon: FolderTree, verb: "Looked through", target: shortPath(args.path) || "the project" }
  if (name === "glob") return { icon: FileSearch, verb: "Found files", target: args.pattern }
  if (name === "grep") return { icon: Search, verb: "Searched code for", target: args.pattern }
  if (name === "bash") return { icon: TerminalSquare, verb: args.run_in_background ? "Started" : "Ran", target: args.description || args.command, code: !args.description }
  if (name === "job_output") return { icon: TerminalSquare, verb: "Checked", target: args.job_id }
  if (name === "kill_job") return { icon: Square, verb: "Stopped", target: args.job_id }
  if (name === "preview") return { icon: MonitorPlay, verb: "Opened the live preview", target: "port " + args.port }
  if (name === "screenshot") return { icon: Camera, verb: "Looked at", target: args.url }
  if (name === "browser") {
    const a = args.action || "screenshot"
    if (a === "open") return { icon: Globe, verb: args.new_tab ? "Opened a new tab" : "Opened", target: args.url }
    if (a === "click") return { icon: MousePointerClick, verb: "Clicked", target: args.text || (args.ref ? "#" + args.ref : args.selector) || "" }
    if (a === "type") return { icon: MousePointerClick, verb: "Typed", target: args.input || "" }
    return { icon: Globe, verb: "Browser", target: a }
  }
  if (name === "computer") {
    const a = args.action || "info"
    if (a === "shell") return { icon: Laptop, verb: "Ran on your computer", target: args.command, code: true }
    if (a === "open") return { icon: Laptop, verb: "Opened on your computer", target: args.target }
    if (a === "screenshot") return { icon: Laptop, verb: "Looked at your screen", target: "" }
    if (a === "type") return { icon: Keyboard, verb: "Typed", target: (args.text || "").slice(0, 60) }
    if (a === "key") return { icon: Keyboard, verb: "Pressed", target: args.keys }
    if (a === "click") return { icon: MousePointerClick, verb: args.double ? "Double-clicked" : "Clicked", target: args.x + ", " + args.y }
    if (a === "move") return { icon: Move, verb: "Moved the mouse", target: args.x + ", " + args.y }
    if (a === "drag") return { icon: Move, verb: "Dragged", target: args.x + ", " + args.y + " to " + args.x2 + ", " + args.y2 }
    if (a === "scroll") return { icon: MousePointerClick, verb: "Scrolled", target: String(args.amount || "") }
    if (a === "windows") return { icon: AppWindow, verb: "Listed open windows", target: "" }
    if (a === "focus") return { icon: AppWindow, verb: "Switched to", target: args.target }
    if (a === "wait") return { icon: Clock, verb: "Waited", target: (args.amount || 1) + " s" }
    if (a === "clipboard_get") return { icon: Clipboard, verb: "Read the clipboard", target: "" }
    if (a === "clipboard_set") return { icon: Clipboard, verb: "Copied to the clipboard", target: (args.text || "").slice(0, 60) }
    if (a === "list_dir") return { icon: FolderTree, verb: "Looked through", target: args.path }
    if (a === "read_file") return { icon: FileText, verb: "Read from your computer", target: args.path }
    if (a === "write_file") return { icon: FilePlus, verb: "Wrote on your computer", target: args.path }
    if (a === "wallpaper") return { icon: ImageIcon, verb: "Changed the wallpaper", target: args.source || args.path }
    if (a === "chrome") {
      const words = { start: "Started the browser window", tabs: "Listed browser tabs", new_tab: "Opened a new tab", switch_tab: "Switched tab", close_tab: "Closed a tab", goto: "Opened", read: "Read the page", html: "Read the page source", elements: "Looked at the page controls", click: "Clicked on the page", type: "Typed on the page", press: "Pressed", scroll: "Scrolled the page", back: "Went back", forward: "Went forward", reload: "Reloaded", eval: "Ran a script in the page", screenshot: "Took a browser screenshot" }
      return { icon: Laptop, verb: words[args.op] || "Browser on your computer", target: args.url || args.keys || (args.text || "").slice(0, 60) || (args.ref !== undefined ? "element " + args.ref : "") }
    }
    if (a === "ui_elements") return { icon: AppWindow, verb: "Read the controls of the window in front", target: args.target || "" }
    return { icon: Laptop, verb: "Your computer", target: a }
  }
  if (name === "github") {
    const a = args.action || "whoami"
    const words = { whoami: "Checked the account", repos: "Listed repositories", repo: "Opened repository", issues: "Listed issues of", pulls: "Listed pull requests of", get_file: "Read from GitHub", search: "Searched GitHub for", create_issue: "Opened an issue in", create_pr: "Opened a pull request in", comment: "Commented on", clone: "Cloned", push: "Pushed", api_get: "GitHub API", api_post: "GitHub API" }
    return { icon: Github, verb: words[a] || "GitHub", target: args.repo || args.query || args.path || "" }
  }
  if (name === "gmail") {
    const a = args.action || "search"
    const words = { search: "Searched mail for", read: "Read an email", draft: "Saved a draft to", send: "Sent an email to", labels: "Listed labels" }
    return { icon: Mail, verb: words[a] || "Gmail", target: args.to || args.query || args.subject || "" }
  }
  if (name === "google_api") return { icon: Globe, verb: "Google", target: args.url || args.path || "" }
  if (name === "web_search") return { icon: Globe, verb: "Searched the web for", target: args.query }
  if (name === "web_fetch") return { icon: Globe, verb: "Read", target: host(args.url || "") }
  if (name === "todo_write") return { icon: ListChecks, verb: "Updated the plan", target: "" }
  if (name === "memory") return { icon: Brain, verb: args.action === "delete" ? "Forgot" : args.action === "list" ? "Checked memory" : "Remembered", target: args.content || "" }
  if (name === "ask_user") return { icon: MessageCircleQuestion, verb: "Asked you", target: args.question }
  if (name === "task") return { icon: Bot, verb: "Helper agent", target: args.description }
  if (name === "show_file") return { icon: Download, verb: "Shared", target: shortPath(args.path) }
  if (name === "generate_image") return { icon: Camera, verb: "Created an image", target: (args.prompt || "").slice(0, 80) }
  if (name === "create_tool") return { icon: Sparkles, verb: "Learned a new ability", target: "my_" + (args.name || "") }
  if (name === "save_skill") return { icon: BookOpen, verb: "Saved a skill", target: args.name }
  if (name === "use_skill") return { icon: BookOpen, verb: "Used the skill", target: args.name }
  if (name === "exit_plan_mode") return { icon: ListChecks, verb: "Wrote a plan", target: "" }
  if (name && name.startsWith("my_")) return { icon: Wrench, verb: "Used", target: name }
  if (name && name.startsWith("mcp__")) {
    const parts = name.split("__")
    return { icon: Plug, verb: parts[1], target: parts.slice(2).join(" ") }
  }
  return { icon: Wrench, verb: name || "Tool", target: "" }
}

function DiffView({ diff }) {
  if (!diff) return null
  const lines = diff.split("\n").filter((line) => !line.startsWith("---") && !line.startsWith("+++"))
  return (
    <div className="diff" dir="ltr">
      {lines.slice(0, 400).map((line, index) => {
        let kind = ""
        if (line.startsWith("+")) kind = "add"
        else if (line.startsWith("-")) kind = "del"
        else if (line.startsWith("@@")) kind = "hunk"
        return <div key={index} className={"diff-line " + kind}>{line || " "}</div>
      })}
      {lines.length > 400 && <div className="diff-line hunk">{lines.length - 400} more lines</div>}
    </div>
  )
}

function LivePre({ text, follow }) {
  const ref = useRef(null)
  useEffect(() => {
    if (follow && ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [text, follow])
  return <pre ref={ref} className="tool-pre" dir="ltr">{text}</pre>
}

function Sources({ sources }) {
  if (!sources || sources.length === 0) return null
  return (
    <div className="sources">
      {sources.slice(0, 8).map((item, index) => (
        <a key={index} className="source" href={item.url} target="_blank" rel="noreferrer noopener">
          <img alt="" src={"https://www.google.com/s2/favicons?sz=32&domain=" + host(item.url)} />
          <span>{item.title || host(item.url)}</span>
        </a>
      ))}
    </div>
  )
}

function SubEvents({ events }) {
  if (!events || events.length === 0) return <div className="faint small">Starting…</div>
  return (
    <div className="sub-events">
      {events.filter((e) => e.kind !== "start").map((event, index) => (
        <div key={index} className={"sub-event " + event.kind}>
          {event.kind === "tool" && <><TerminalSquare size={13} /><span className="mono">{event.name}</span><span className="faint">{event.args}</span></>}
          {event.kind === "text" && <span>{event.text.slice(0, 400)}</span>}
          {event.kind === "end" && <><Check size={13} /><span>{event.text}</span></>}
        </div>
      ))}
    </div>
  )
}

export function FileCard({ wid, meta }) {
  const url = rawUrl(wid, meta.file)
  return (
    <div className="file-card">
      {meta.kind === "image" && <img src={url} alt={meta.file} />}
      {meta.kind === "video" && <video src={url} controls />}
      {meta.kind === "audio" && <audio src={url} controls />}
      <div className="file-card-row">
        <FileText size={18} />
        <div className="file-card-name">
          <strong>{meta.file.split("/").pop()}</strong>
          <span className="faint">{meta.caption || formatSize(meta.size)}</span>
        </div>
        {(meta.kind === "pdf" || meta.kind === "html") && <a className="btn btn-soft btn-sm" href={url} target="_blank" rel="noreferrer">Open</a>}
        <a className="btn btn-soft btn-sm" href={rawUrl(wid, meta.file, true)}><Download size={14} />Download</a>
      </div>
    </div>
  )
}

export function formatSize(size) {
  if (!size && size !== 0) return ""
  if (size < 1024) return size + " B"
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB"
  return (size / 1024 / 1024).toFixed(1) + " MB"
}

function approvalText(name, args) {
  if (name === "computer") {
    const info = describe(name, args || {}, {})
    return info.verb + (info.target ? ": " + info.target : "")
  }
  if (name === "gmail") return describe(name, args || {}, {}).verb + " " + ((args && (args.to || args.subject)) || "")
  if (name === "github") return describe(name, args || {}, {}).verb + " " + ((args && (args.repo || args.branch)) || "")
  if (name === "bash") return (args && args.command) || ""
  return ""
}

function Approval({ waiting, respond }) {
  const [note, setNote] = useState("")
  const args = waiting.args || {}
  const detail = approvalText(waiting.name, args)
  const sensitive = waiting.always === false
  const body = args.body || args.content || args.text || ""
  return (
    <div className={"approval" + (sensitive ? " sensitive" : "")}>
      <div className="approval-title"><ShieldQuestion size={16} />{sensitive ? "This needs your approval every time" : "Forkwise wants to do this. Allow it?"}</div>
      {detail && <pre className="approval-detail" dir="auto">{detail}</pre>}
      {body && waiting.name !== "computer" && <pre className="approval-detail muted" dir="auto">{String(body).slice(0, 800)}</pre>}
      <div className="approval-actions">
        <button className="btn btn-primary btn-sm" onClick={() => respond(waiting.id, "allow")}>Allow once</button>
        {!sensitive && <button className="btn btn-soft btn-sm" onClick={() => respond(waiting.id, "always")}>Always allow this in this chat</button>}
        <input className="input approval-note" placeholder="Or tell it what to do instead" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") respond(waiting.id, note || "deny") }} />
        <button className="btn btn-danger btn-sm" onClick={() => respond(waiting.id, note || "deny")}>Deny</button>
      </div>
    </div>
  )
}

function Question({ waiting, respond, answer }) {
  const [text, setText] = useState("")
  if (!waiting) {
    return (
      <div className="question done">
        <div className="question-text" dir="auto">{answer ? "You answered: " + answer : "No answer was given."}</div>
      </div>
    )
  }
  return (
    <div className="question">
      <div className="question-text" dir="auto">{waiting.question}</div>
      <div className="question-options">
        {(waiting.options || []).map((option) => (
          <button key={option} className="btn btn-soft btn-sm" dir="auto" onClick={() => respond(waiting.id, option)}>{option}</button>
        ))}
      </div>
      <div className="question-free">
        <input className="input" dir="auto" placeholder="Type your answer" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) respond(waiting.id, text.trim()) }} />
        <button className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={() => respond(waiting.id, text.trim())}>Send</button>
      </div>
    </div>
  )
}

export function PlanCard({ plan, active, onApprove, onRevise }) {
  return (
    <div className="plan-card">
      <div className="plan-head"><ListChecks size={16} />Plan ready for review</div>
      <div className="plan-body"><Markdown text={plan} /></div>
      {active && (
        <div className="plan-actions">
          <button className="btn btn-primary btn-sm" onClick={onApprove}>Approve and build</button>
          <button className="btn btn-ghost btn-sm" onClick={onRevise}>Keep planning</button>
        </div>
      )}
    </div>
  )
}

export default function ToolCall({ call, result, live, waiting, subs, wid, respond, onPreview, planActive, onApprovePlan, onRevisePlan }) {
  const name = call.function.name
  const args = parseArgs(call.function.arguments)
  const meta = (result && result.meta) || {}
  const running = !result && live && live.status === "running"
  const failed = result && meta.ok === false
  const info = describe(name, args, meta)
  const Icon = info.icon
  const autoOpen = name === "task" || (name === "bash" && running)
  const [open, setOpen] = useState(false)
  const expanded = open || (autoOpen && running)

  if (name === "exit_plan_mode") {
    return <PlanCard plan={args.plan || ""} active={planActive} onApprove={onApprovePlan} onRevise={onRevisePlan} />
  }
  if (name === "ask_user") {
    return (
      <div className="tool-block">
        <Question waiting={waiting} respond={respond} answer={meta.answer} />
      </div>
    )
  }
  if ((name === "show_file" || name === "generate_image") && result && meta.file) {
    return <FileCard wid={wid} meta={meta} />
  }

  let body = null
  if (name === "bash") {
    const output = running ? (live && live.output) || "" : (result && result.content) || ""
    body = <LivePre text={"$ " + (args.command || "") + "\n" + output} follow={running} />
  } else if ((name === "write_file" || name === "edit_file" || name === "multi_edit") && meta.diff) {
    body = <DiffView diff={meta.diff} />
  } else if (SHOT_TOOLS.includes(name) && meta.image) {
    body = (
      <div className="shot">
        <a href={rawUrl(wid, meta.image)} target="_blank" rel="noreferrer"><img src={rawUrl(wid, meta.image)} alt="Screenshot" /></a>
        <LivePre text={(result && result.content) || ""} />
      </div>
    )
  } else if (name === "web_search" && meta.sources) {
    body = <Sources sources={meta.sources} />
  } else if (name === "task") {
    body = (
      <div>
        <SubEvents events={subs} />
        {result && <div className="sub-report"><Markdown text={result.content} /></div>}
      </div>
    )
  } else if (name === "create_tool") {
    body = (
      <div>
        <div className="small muted">{args.description}</div>
        <LivePre text={args.code || ""} />
        {result && <LivePre text={result.content} />}
      </div>
    )
  } else if (name === "todo_write") {
    body = <TodoList todos={args.todos || []} />
  } else if (result) {
    body = <LivePre text={result.content || ""} />
  }

  const showImage = SHOT_TOOLS.includes(name) && meta.image && !expanded
  const statusIcon = running ? <Loader2 size={14} className="spin" /> : failed ? <X size={14} /> : result ? <Check size={14} /> : <Loader2 size={14} className="spin" />

  return (
    <div className={"tool" + (running ? " running" : "") + (failed ? " failed" : "") + (name === "create_tool" ? " ability" : "") + (expanded ? " open" : "")}>
      <button type="button" className="tool-head" onClick={() => setOpen(!expanded)}>
        <span className="tool-icon"><Icon size={15} /></span>
        <span className="tool-verb">{info.verb}</span>
        {info.target && <span className={"tool-target" + (info.code || name === "grep" || name === "glob" ? " mono" : "")} dir="auto">{info.target}</span>}
        {info.diff && info.diff.added !== undefined && (
          <span className="tool-diffstat"><span className="add">+{info.diff.added}</span><span className="del">−{info.diff.removed}</span></span>
        )}
        <span className="tool-spacer" />
        <span className={"tool-status" + (failed ? " bad" : "")}>{statusIcon}</span>
        <ChevronRight size={14} className="tool-chevron" />
      </button>
      {waiting && waiting.kind === "approval" && <Approval waiting={waiting} respond={respond} />}
      {name === "preview" && meta.url && (
        <div className="tool-inline">
          <button className="btn btn-soft btn-sm" onClick={() => onPreview && onPreview(meta.url)}><MonitorPlay size={14} />Show preview</button>
          <a className="btn btn-ghost btn-sm" href={meta.url} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open in new tab</a>
        </div>
      )}
      {showImage && (
        <button className="shot-thumb" onClick={() => setOpen(true)}><img src={rawUrl(wid, meta.image)} alt="Screenshot" /></button>
      )}
      {expanded && body && <div className="tool-body">{body}</div>}
    </div>
  )
}

export function TodoList({ todos }) {
  return (
    <ul className="todo-list">
      {todos.map((item, index) => (
        <li key={index} className={item.status}>
          <span className="todo-box">{item.status === "completed" ? <Check size={11} /> : item.status === "in_progress" ? <span className="todo-dot" /> : null}</span>
          <span dir="auto">{item.content}</span>
        </li>
      ))}
    </ul>
  )
}

export function DraftCall({ draft }) {
  const name = draft.name || ""
  const path = partialField(draft.args, "path")
  const info = describe(name, { path, command: partialField(draft.args, "command"), description: partialField(draft.args, "description"), query: partialField(draft.args, "query"), url: partialField(draft.args, "url"), name: partialField(draft.args, "name"), question: partialField(draft.args, "question"), content: partialField(draft.args, "content") }, {})
  const Icon = info.icon
  const writing = name === "write_file" || name === "create_tool"
  const content = writing ? partialField(draft.args, name === "create_tool" ? "code" : "content") : ""
  return (
    <div className="tool running open draft">
      <div className="tool-head">
        <span className="tool-icon"><Icon size={15} /></span>
        <span className="tool-verb">{writing ? "Writing" : info.verb}</span>
        {info.target && <span className="tool-target" dir="auto">{info.target}</span>}
        <span className="tool-spacer" />
        <span className="tool-status"><Loader2 size={14} className="spin" /></span>
      </div>
      {writing && content && (
        <div className="tool-body"><LivePre text={content.split("\n").slice(-18).join("\n")} follow /></div>
      )}
    </div>
  )
}
