import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { collectCalls } from "../../../lib/activity"

const FILTERS = [
  { key: "all", label: "All" },
  { key: "edit", label: "Edits" },
  { key: "run", label: "Commands" },
  { key: "explore", label: "Reading" },
  { key: "browse", label: "Browser" },
  { key: "computer", label: "Computer" },
  { key: "agent", label: "Agents" },
]

export default function ActivityPane({ messages, running, onOpenFile }) {
  const [filter, setFilter] = useState("all")
  const calls = collectCalls(messages)
  const counts = { all: calls.length }
  for (const item of calls) counts[item.category] = (counts[item.category] || 0) + 1
  const shown = calls.filter((item) => filter === "all" || item.category === filter)
  const files = {}
  for (const item of calls) if (item.category === "edit" && item.args.path) files[item.args.path] = true
  const failed = calls.filter((item) => item.failed).length

  return (
    <div className="activity-pane">
      <div className="activity-stats">
        <div><strong>{calls.length}</strong><span>actions</span></div>
        <div><strong>{Object.keys(files).length}</strong><span>files edited</span></div>
        <div><strong>{counts.run || 0}</strong><span>commands</span></div>
        <div><strong>{failed}</strong><span>failed</span></div>
      </div>
      <div className="filter-row">
        {FILTERS.filter((item) => item.key === "all" || counts[item.key]).map((item) => (
          <button key={item.key} type="button" className={"filter-chip" + (filter === item.key ? " on" : "")} onClick={() => setFilter(item.key)}>{item.label}<small>{counts[item.key] || 0}</small></button>
        ))}
      </div>
      <div className="activity-list">
        {shown.length === 0 && <div className="empty-small">Nothing here yet. Actions appear as Forkwise works.</div>}
        {shown.map((item, index) => {
          const Icon = item.info.icon
          const openable = item.category === "edit" && item.args.path
          return (
            <button key={item.id} type="button" className={"activity-row cat-" + item.category + (item.failed ? " failed" : "")} onClick={() => openable && onOpenFile(item.args.path)} disabled={!openable}>
              <span className="activity-n">{index + 1}</span>
              <Icon size={13} />
              <span className="action-verb">{item.info.verb}</span>
              <span className={"action-target" + (item.info.code ? " mono" : "")} dir="auto">{item.info.target}</span>
              <span className="tool-spacer" />
              {item.info.diff && item.info.diff.added !== undefined && <span className="tool-diffstat"><span className="add">+{item.info.diff.added}</span><span className="del">−{item.info.diff.removed}</span></span>}
              {item.failed ? <X size={12} /> : item.done ? <Check size={12} /> : running ? <Loader2 size={12} className="spin" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
