import { useState } from "react"
import { Brain, Check, ChevronDown, Copy, FileText, History, Info, AlertTriangle } from "lucide-react"
import Markdown from "./Markdown"
import ToolCall, { DraftCall } from "./ToolCall"
import { LogoMark } from "../ui/Logo"
import { rawUrl } from "../../lib/api"

function Reasoning({ text, live }) {
  const [open, setOpen] = useState(false)
  if (!text || !text.trim()) return null
  return (
    <div className={"reasoning" + (open ? " open" : "")}>
      <button type="button" onClick={() => setOpen(!open)}>
        <Brain size={14} />
        <span>{live ? "Thinking…" : "Thought process"}</span>
        <ChevronDown size={14} />
      </button>
      {(open || live) && <div className="reasoning-text" dir="auto">{live && !open ? text.slice(-500) : text}</div>}
    </div>
  )
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="icon-btn tiny" title="Copy" onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1400) }}>
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function UserMessage({ message, wid, onRewind, canRewind }) {
  const attachments = (message.meta && message.meta.attachments) || []
  return (
    <div className="msg-user">
      <div className="msg-user-bubble">
        {attachments.length > 0 && (
          <div className="msg-attachments">
            {attachments.map((item) => (
              item.kind === "image"
                ? <img key={item.path} src={rawUrl(wid, item.path)} alt={item.name} />
                : <span key={item.path} className="chip"><FileText size={13} />{item.name || item.path}</span>
            ))}
          </div>
        )}
        {message.content && <div className="msg-user-text" dir="auto">{message.content}</div>}
      </div>
      <div className="msg-actions">
        <CopyButton text={message.content} />
        {canRewind && !message.temp && (
          <button type="button" className="icon-btn tiny" title="Go back to this message and undo the changes after it" onClick={() => onRewind(message)}>
            <History size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function buildTurns(messages) {
  const turns = []
  let current = null
  for (const message of messages) {
    if (message.role === "user") {
      current = { user: message, items: [] }
      turns.push(current)
    } else {
      if (!current) {
        current = { user: null, items: [] }
        turns.push(current)
      }
      current.items.push(message)
    }
  }
  return turns
}

export default function MessageList({ state, wid, respond, onPreview, onRewind, onApprovePlan, onRevisePlan }) {
  const { messages, live } = state
  const results = {}
  let lastPlanId = null
  for (const message of messages) {
    if (message.role === "tool") results[message.tool_call_id] = message
    if (message.role === "assistant") {
      for (const call of message.tool_calls || []) if (call.function.name === "exit_plan_mode") lastPlanId = call.id
    }
  }
  const turns = buildTurns(messages)
  const drafts = Object.keys(live.drafts).sort().map((key) => live.drafts[key])
  const showThinking = live.running && !live.text && !live.reasoning && drafts.length === 0 && Object.keys(live.waiting).length === 0 && !anyRunning(live.tools, results)

  return (
    <div className="messages">
      {turns.map((turn, index) => {
        const lastTurn = index === turns.length - 1
        return (
          <div className="turn" key={turn.user ? turn.user.id : "t" + index}>
            {turn.user && <UserMessage message={turn.user} wid={wid} onRewind={onRewind} canRewind={!live.running} />}
            <div className="msg-assistant">
              {turn.items.map((item) => {
                if (item.role === "summary") {
                  return <div key={item.id} className="divider-note"><Info size={13} />Earlier messages were summarized to save space.</div>
                }
                if (item.role !== "assistant") return null
                return (
                  <div key={item.id} className="assistant-step">
                    <Reasoning text={item.reasoning} />
                    {item.content && item.content.trim() && <Markdown text={item.content} />}
                    {(item.tool_calls || []).map((call) => (
                      <ToolCall
                        key={call.id}
                        call={call}
                        result={results[call.id]}
                        live={live.tools[call.id]}
                        waiting={live.waiting[call.id]}
                        subs={live.subs[call.id]}
                        wid={wid}
                        respond={respond}
                        onPreview={onPreview}
                        planActive={call.id === lastPlanId && !live.running && state.chat && state.chat.mode === "plan"}
                        onApprovePlan={onApprovePlan}
                        onRevisePlan={onRevisePlan}
                      />
                    ))}
                  </div>
                )
              })}
              {lastTurn && live.running && (
                <div className="assistant-step live">
                  <Reasoning text={live.reasoning} live />
                  {live.text && <Markdown text={live.text} />}
                  {drafts.map((draft, i) => <DraftCall key={i} draft={draft} />)}
                </div>
              )}
              {lastTurn && showThinking && (
                <div className="thinking">
                  <LogoMark size={22} thinking />
                  <span className="shimmer-text">{live.compacting ? "Summarizing earlier messages" : "Working"}</span>
                </div>
              )}
              {lastTurn && !live.running && lastText(turn.items) && (
                <div className="msg-actions left">
                  <CopyButton text={lastText(turn.items)} />
                </div>
              )}
            </div>
          </div>
        )
      })}
      {live.notices.map((text, index) => (
        <div key={index} className="notice"><Info size={14} /><span>{text}</span></div>
      ))}
      {live.error && (
        <div className="notice error"><AlertTriangle size={14} /><span>{live.error}</span></div>
      )}
      {live.queued.map((text, index) => (
        <div key={"q" + index} className="msg-user queued"><div className="msg-user-bubble"><div className="msg-user-text" dir="auto">{text}</div><span className="faint small">Queued — Forkwise reads it at the next step</span></div></div>
      ))}
    </div>
  )
}

function anyRunning(tools, results) {
  for (const id of Object.keys(tools)) {
    if (tools[id].status === "running" && !results[id]) return true
  }
  return false
}

function lastText(items) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i].role === "assistant" && items[i].content && items[i].content.trim()) return items[i].content
  }
  return ""
}
