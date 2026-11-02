import { useEffect, useState } from "react"
import { Link, NavLink, useParams } from "react-router-dom"
import { ArrowRight, Brain, MessageSquareText, Plug, Sparkles } from "lucide-react"
import { api } from "../../lib/api"
import { Abilities, Connectors, Instructions, Memory } from "./Settings"

const ITEMS = [
  { key: "abilities", label: "Abilities", icon: Sparkles, text: "Tools and skills Forkwise made for itself. Switch any of them off.", countKey: "abilities" },
  { key: "memory", label: "Memory", icon: Brain, text: "Facts and preferences it remembers about you across chats.", countKey: "memory" },
  { key: "connectors", label: "Connectors", icon: Plug, text: "Connect other apps and data sources through MCP servers.", countKey: "connectors" },
  { key: "instructions", label: "Instructions", icon: MessageSquareText, text: "Tell it how you like answers, once, for every chat.", countKey: "" },
]

function Overview() {
  const [counts, setCounts] = useState({})

  useEffect(() => {
    async function load() {
      const result = {}
      try {
        const tools = await api.get("/api/tools")
        const skills = await api.get("/api/skills")
        result.abilities = tools.tools.length + skills.skills.length
      } catch (problem) {
        result.abilities = 0
      }
      try {
        result.memory = (await api.get("/api/memories")).memories.length
      } catch (problem) {
        result.memory = 0
      }
      try {
        result.connectors = (await api.get("/api/mcp")).servers.length
      } catch (problem) {
        result.connectors = 0
      }
      setCounts(result)
    }
    load()
  }, [])

  return (
    <div className="customize-grid">
      {ITEMS.map((item) => {
        const Icon = item.icon
        const count = item.countKey ? counts[item.countKey] : undefined
        return (
          <Link key={item.key} to={"/app/customize/" + item.key} className="customize-card">
            <span className="customize-icon"><Icon size={20} /></span>
            <strong>{item.label}</strong>
            <span className="muted small">{item.text}</span>
            <span className="customize-foot">{count !== undefined ? <span className="chip">{count} {count === 1 ? "item" : "items"}</span> : <span />}<ArrowRight size={16} /></span>
          </Link>
        )
      })}
    </div>
  )
}

export default function Customize() {
  const { tab } = useParams()
  return (
    <div className="page">
      <div className="page-head"><div><h1>Customize</h1><p className="muted">Teach Forkwise how you work. Everything here applies to all your chats.</p></div></div>
      {tab && (
        <div className="tabs" role="tablist">
          <NavLink to="/app/customize" end className="tab-link">Overview</NavLink>
          {ITEMS.map((item) => <NavLink key={item.key} to={"/app/customize/" + item.key} className={"tab-link" + (tab === item.key ? " active" : "")}>{item.label}</NavLink>)}
        </div>
      )}
      {!tab && <Overview />}
      {tab === "abilities" && <Abilities />}
      {tab === "memory" && <Memory />}
      {tab === "connectors" && <Connectors />}
      {tab === "instructions" && <Instructions />}
    </div>
  )
}
