import { useEffect, useState } from "react"
import { FileDiff, Square } from "lucide-react"
import { describe } from "./ToolCall"

function parse(raw) {
  if (!raw) return {}
  if (typeof raw === "object") return raw
  try {
    return JSON.parse(raw)
  } catch (problem) {
    return {}
  }
}

function clock(seconds) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes + ":" + String(rest).padStart(2, "0")
}

function lastTurnCalls(messages) {
  let start = 0
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") {
      start = i + 1
      break
    }
  }
  const calls = []
  for (let i = start; i < messages.length; i += 1) {
    if (messages[i].role === "assistant") for (const call of messages[i].tool_calls || []) calls.push(call)
  }
  return calls
}

export default function RunBar({ state, onStop, onOpenChanges }) {
  const live = state.live
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!live.running) {
      setSeconds(0)
      return undefined
    }
    const began = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - began) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [live.running, live.runId])

  if (!live.running) return null

  const calls = lastTurnCalls(state.messages)
  const waiting = Object.keys(live.waiting)
  let label = live.compacting ? "Summarizing earlier messages" : "Thinking"
  const draftKeys = Object.keys(live.drafts)
  if (draftKeys.length > 0) {
    const draft = live.drafts[draftKeys[draftKeys.length - 1]]
    label = describe(draft.name || "", {}, {}).verb
  }
  const running = Object.keys(live.tools).filter((id) => live.tools[id].status === "running")
  if (running.length > 0) {
    const id = running[running.length - 1]
    const call = calls.find((item) => item.id === id)
    if (call) {
      const info = describe(call.function.name, parse(call.function.arguments), {})
      label = info.verb + (info.target ? " " + String(info.target).slice(0, 60) : "")
    }
  }
  if (waiting.length > 0) label = live.waiting[waiting[0]].kind === "approval" ? "Waiting for your approval" : "Waiting for your answer"

  const percent = live.context && live.context.limit ? Math.min(100, Math.round((live.context.tokens / live.context.limit) * 100)) : null
  const changed = state.changes ? state.changes.length : 0

  return (
    <div className={"run-bar" + (waiting.length > 0 ? " waiting" : "")} role="status">
      <span className="run-state"><span className={"run-led" + (waiting.length > 0 ? " waiting" : "")} /></span>
      <span className="run-label" dir="auto">{label}</span>
      <span className="run-meta">{calls.length} {calls.length === 1 ? "step" : "steps"}</span>
      <span className="run-meta mono">{clock(seconds)}</span>
      {changed > 0 && <button type="button" className="run-meta run-link" onClick={onOpenChanges}><FileDiff size={12} />{changed} {changed === 1 ? "file" : "files"}</button>}
      {percent !== null && (
        <span className="run-meta run-context" title={"Context used: " + percent + "%"}>
          <span className="run-meter"><span style={{ width: percent + "%" }} className={percent > 85 ? "hot" : ""} /></span>{percent}%
        </span>
      )}
      <span className="tool-spacer" />
      <button type="button" className="btn btn-ghost btn-sm" onClick={onStop}><Square size={11} />Stop</button>
    </div>
  )
}
