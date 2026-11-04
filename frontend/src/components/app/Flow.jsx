import { useState } from "react"
import { AlertTriangle, Brain, Check, ChevronRight, Loader2, X } from "lucide-react"
import Markdown from "./Markdown"
import ToolCall, { describe } from "./ToolCall"

export const CATEGORY = {
  read_file: "explore", list_dir: "explore", glob: "explore", grep: "explore", web_search: "explore", web_fetch: "explore",
  use_skill: "explore", memory: "explore", job_output: "explore",
  write_file: "edit", edit_file: "edit", multi_edit: "edit", create_tool: "edit", save_skill: "edit",
  bash: "run", kill_job: "run", preview: "run",
  browser: "browse", screenshot: "browse",
  computer: "computer",
  github: "github", gmail: "gmail", google_api: "google",
  task: "agent",
}

const STANDALONE = ["exit_plan_mode", "ask_user", "show_file", "generate_image", "todo_write"]

export function categoryOf(name) {
  if (CATEGORY[name]) return CATEGORY[name]
  if (name && name.startsWith("mcp__")) return "connector"
  if (name && name.startsWith("my_")) return "ability"
  return "other"
}

function parse(raw) {
  if (!raw) return {}
  if (typeof raw === "object") return raw
  try {
    return JSON.parse(raw)
  } catch (problem) {
    return {}
  }
}

function plural(count, one, many) {
  return count + " " + (count === 1 ? one : many)
}

function groupTitle(group, results) {
  const calls = group.calls
  const n = calls.length
  if (group.category === "explore") return "Explored " + plural(n, "item", "items")
  if (group.category === "edit") {
    const files = {}
    for (const call of calls) files[parse(call.function.arguments).path || call.id] = true
    return "Edited " + plural(Object.keys(files).length, "file", "files")
  }
  if (group.category === "run") return "Ran " + plural(n, "command", "commands")
  if (group.category === "browse") return "Browsed " + plural(n, "page", "pages")
  if (group.category === "computer") return "Used your computer, " + plural(n, "action", "actions")
  if (group.category === "github") return "GitHub, " + plural(n, "step", "steps")
  if (group.category === "gmail") return "Gmail, " + plural(n, "step", "steps")
  if (group.category === "google") return "Google, " + plural(n, "request", "requests")
  if (group.category === "connector") return "Connected apps, " + plural(n, "call", "calls")
  if (group.category === "ability") return "Used " + plural(n, "ability", "abilities")
  return "Used " + plural(n, "tool", "tools")
}

function groupHint(group) {
  const names = []
  for (const call of group.calls) {
    const info = describe(call.function.name, parse(call.function.arguments), {})
    if (info.target && names.indexOf(info.target) === -1) names.push(info.target)
    if (names.length >= 3) break
  }
  const more = group.calls.length - names.length
  const text = names.join(", ")
  return more > 0 && names.length >= 3 ? text + " +" + more : text
}

export function buildFlow(items) {
  const nodes = []
  let pendingThought = ""
  let key = 0

  function flushThought() {
    if (pendingThought.trim()) nodes.push({ type: "thought", text: pendingThought, key: "th" + key++ })
    pendingThought = ""
  }

  for (const item of items) {
    if (item.role === "summary") {
      flushThought()
      nodes.push({ type: "note", key: "n" + item.id })
      continue
    }
    if (item.role !== "assistant") continue
    if (item.reasoning && item.reasoning.trim()) pendingThought = pendingThought ? pendingThought + "\n\n" + item.reasoning : item.reasoning
    if (item.content && item.content.trim()) {
      flushThought()
      nodes.push({ type: "say", text: item.content, key: "s" + item.id })
    }
    const calls = item.tool_calls || []
    const regular = calls.filter((call) => STANDALONE.indexOf(call.function.name) === -1 && call.function.name !== "task")
    const parallel = regular.length > 1
    for (const call of calls) {
      const name = call.function.name
      if (STANDALONE.indexOf(name) !== -1) {
        flushThought()
        nodes.push({ type: "block", call, key: "b" + call.id })
        continue
      }
      if (name === "task") {
        const thought = pendingThought
        pendingThought = ""
        nodes.push({ type: "agent", call, thought, key: "a" + call.id })
        continue
      }
      const category = categoryOf(name)
      const last = nodes[nodes.length - 1]
      if (last && last.type === "group" && last.category === category) {
        last.calls.push(call)
        if (parallel) last.parallel = true
        if (pendingThought) {
          last.thoughts.push(pendingThought)
          pendingThought = ""
        }
      } else {
        const group = { type: "group", category, calls: [call], thoughts: [], parallel, key: "g" + call.id }
        if (pendingThought) {
          group.thoughts.push(pendingThought)
          pendingThought = ""
        }
        nodes.push(group)
      }
    }
  }
  flushThought()
  return nodes
}

function Dot({ status }) {
  if (status === "running") return <span className="flow-dot running"><Loader2 size={11} className="spin" /></span>
  if (status === "failed") return <span className="flow-dot failed"><X size={10} /></span>
  if (status === "waiting") return <span className="flow-dot waiting">!</span>
  if (status === "done") return <span className="flow-dot done"><Check size={10} /></span>
  return <span className="flow-dot" />
}

function Thought({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flow-node thought">
      <Dot status="idle" />
      <div className="flow-body">
        <button type="button" className="flow-head quiet" onClick={() => setOpen(!open)}>
          <Brain size={13} /><span>Thought process</span>
          <ChevronRight size={13} className={"flow-chev" + (open ? " open" : "")} />
        </button>
        {open && <div className="flow-thought-text" dir="auto">{text}</div>}
      </div>
    </div>
  )
}

function statusOf(calls, results, live, waiting) {
  let running = false
  let failed = false
  let waits = false
  for (const call of calls) {
    const result = results[call.id]
    if (waiting[call.id]) waits = true
    if (!result && live.tools[call.id] && live.tools[call.id].status === "running") running = true
    if (result && result.meta && result.meta.ok === false) failed = true
  }
  if (waits) return "waiting"
  if (running) return "running"
  if (failed) return "failed"
  return "done"
}

function diffTotals(calls, results) {
  let added = 0
  let removed = 0
  let any = false
  for (const call of calls) {
    const result = results[call.id]
    if (result && result.meta && result.meta.added !== undefined) {
      added += result.meta.added
      removed += result.meta.removed || 0
      any = true
    }
  }
  return any ? { added, removed } : null
}

function Group({ group, results, ctx }) {
  const status = statusOf(group.calls, results, ctx.live, ctx.live.waiting)
  const forceOpen = status === "running" || status === "waiting" || status === "failed"
  const [open, setOpen] = useState(false)
  const expanded = open || forceOpen
  const totals = diffTotals(group.calls, results)
  const single = group.calls.length === 1
  return (
    <div className={"flow-node group cat-" + group.category + " " + status}>
      <Dot status={status} />
      <div className="flow-body">
        {single && !group.thoughts.length ? (
          <FlowCall call={group.calls[0]} results={results} ctx={ctx} />
        ) : (
          <>
            <button type="button" className="flow-head" onClick={() => setOpen(!expanded)}>
              <span className="flow-title">{groupTitle(group, results)}</span>
              {!expanded && <span className="flow-hint" dir="auto">{groupHint(group)}</span>}
              {totals && <span className="tool-diffstat"><span className="add">+{totals.added}</span><span className="del">−{totals.removed}</span></span>}
              {group.parallel && <span className="badge">parallel</span>}
              <ChevronRight size={13} className={"flow-chev" + (expanded ? " open" : "")} />
            </button>
            {expanded && (
              <div className={"flow-children" + (group.parallel ? " branches" : "")}>
                {group.thoughts.map((text, index) => <div key={index} className="flow-thought-text" dir="auto">{text}</div>)}
                {group.calls.map((call) => (
                  <div className="flow-branch" key={call.id}><FlowCall call={call} results={results} ctx={ctx} /></div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FlowCall({ call, results, ctx }) {
  const live = ctx.live
  return (
    <ToolCall
      call={call}
      result={results[call.id]}
      live={live.tools[call.id]}
      waiting={live.waiting[call.id]}
      subs={live.subs[call.id]}
      wid={ctx.wid}
      respond={ctx.respond}
      onPreview={ctx.onPreview}
      planActive={call.id === ctx.lastPlanId && !live.running && ctx.chat && ctx.chat.mode === "plan"}
      onApprovePlan={ctx.onApprovePlan}
      onRevisePlan={ctx.onRevisePlan}
    />
  )
}

export default function Flow({ nodes, results, ctx }) {
  return (
    <div className="flow">
      {nodes.map((node) => {
        if (node.type === "note") return <div key={node.key} className="flow-note">Earlier messages were summarized to save space.</div>
        if (node.type === "say") return <div key={node.key} className="flow-say"><Markdown text={node.text} /></div>
        if (node.type === "thought") return <Thought key={node.key} text={node.text} />
        if (node.type === "block") return <div key={node.key} className="flow-block"><FlowCall call={node.call} results={results} ctx={ctx} /></div>
        if (node.type === "agent") {
          const status = statusOf([node.call], results, ctx.live, ctx.live.waiting)
          return (
            <div key={node.key} className={"flow-node agent " + status}>
              <Dot status={status} />
              <div className="flow-body"><FlowCall call={node.call} results={results} ctx={ctx} /></div>
            </div>
          )
        }
        return <Group key={node.key} group={node} results={results} ctx={ctx} />
      })}
    </div>
  )
}

export function FlowError({ text }) {
  return <div className="notice error"><AlertTriangle size={14} /><span>{text}</span></div>
}
