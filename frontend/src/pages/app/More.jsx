import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { Check, Mail, Users, MessageSquare, Activity, Cpu } from "lucide-react"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { PLANS, TEMPLATES } from "../../content/catalog"
import { Cover } from "../../components/site/Cover"

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

export function Billing() {
  const { usage } = useStore()
  const [days, setDays] = useState([])
  const [limit, setLimit] = useState(0)

  useEffect(() => {
    api.get("/api/usage").then((data) => {
      setDays(data.days)
      setLimit(data.limit)
    }).catch(() => setDays([]))
  }, [])

  const today = usage ? usage.tokens_in + usage.tokens_out : 0
  const share = limit > 0 ? Math.min(100, (today / limit) * 100) : 0
  const month = days.reduce((total, day) => total + day.tokens_in + day.tokens_out, 0)
  const runs = days.reduce((total, day) => total + day.runs, 0)

  return (
    <div className="page">
      <div className="page-head"><div><h1>Plan and usage</h1><p className="muted">Your current plan and how much you have used.</p></div></div>
      <div className="stat-cards">
        <div className="stat-card">
          <span className="faint small">Current plan</span>
          <b>Free</b>
          <span className="muted small">Paid plans open soon</span>
        </div>
        <div className="stat-card">
          <span className="faint small">Used today</span>
          <b>{formatNumber(today)}</b>
          <span className="muted small">{limit > 0 ? "of " + formatNumber(limit) + " tokens" : "tokens, no daily limit"}</span>
          {limit > 0 && <span className="meter"><span style={{ width: share + "%" }} /></span>}
        </div>
        <div className="stat-card">
          <span className="faint small">Last 30 days</span>
          <b>{formatNumber(month)}</b>
          <span className="muted small">tokens across {runs} tasks</span>
        </div>
      </div>
      <h3 className="section-title">Plans</h3>
      <div className="mini-plans">
        {PLANS.map((plan) => (
          <div key={plan.key} className={"mini-plan" + (plan.key === "free" ? " current" : "")}>
            <div className="mini-plan-head"><strong>{plan.name}</strong>{plan.key === "free" && <span className="chip ok">Current</span>}</div>
            <div className="mini-plan-price">{plan.monthly === null ? "Custom" : "$" + plan.monthly}<small>{plan.monthly === null ? "" : " / month"}</small></div>
            <ul>{plan.features.slice(0, 4).map((feature) => <li key={feature}><Check size={13} />{feature}</li>)}</ul>
            {plan.key === "teams" ? <Link to="/contact?topic=Teams" className="btn btn-ghost btn-sm wide">Talk to us</Link> : plan.key === "free" ? <button className="btn btn-soft btn-sm wide" disabled>Your plan</button> : <button className="btn btn-primary btn-sm wide" disabled title="Payments open soon">Coming soon</button>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Admin() {
  const { user } = useStore()
  const [stats, setStats] = useState(null)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState(null)

  async function load() {
    try {
      setStats(await api.get("/api/admin/stats"))
      const box = await api.get("/api/admin/messages")
      setMessages(box.messages)
      setStatus(await api.get("/api/status"))
    } catch (problem) {
      setStats({ error: problem.message })
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (!user.is_admin) return <Navigate to="/app" replace />
  if (!stats) return <div className="page" />
  if (stats.error) return <div className="page"><p className="muted">{stats.error}</p></div>

  const usageByUser = {}
  for (const row of stats.usage) usageByUser[row.user_id] = row
  const totalTokens = stats.usage.reduce((total, row) => total + row.tokens_in + row.tokens_out, 0)

  async function handled(id) {
    await api.post("/api/admin/messages/" + id)
    load()
  }

  return (
    <div className="page wide-page">
      <div className="page-head"><div><h1>Admin</h1><p className="muted">Users, usage, messages and system health.</p></div></div>
      <div className="stat-cards four">
        <div className="stat-card"><Users size={18} /><b>{stats.users.length}</b><span className="muted small">users</span></div>
        <div className="stat-card"><MessageSquare size={18} /><b>{stats.chats}</b><span className="muted small">chats</span></div>
        <div className="stat-card"><Activity size={18} /><b>{formatNumber(totalTokens)}</b><span className="muted small">tokens used</span></div>
        <div className="stat-card"><Cpu size={18} /><b>{stats.sandbox_ready ? "Ready" : "Missing"}</b><span className="muted small">{stats.sandbox} sandbox, {stats.models.length} models</span></div>
      </div>
      <div className="admin-grid">
        <div className="panel-card">
          <h3 className="section-title">Users</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Email</th><th>Tasks</th><th>Tokens</th><th>Joined</th></tr></thead>
              <tbody>
                {stats.users.map((row) => {
                  const used = usageByUser[row.id] || { runs: 0, tokens_in: 0, tokens_out: 0 }
                  return (
                    <tr key={row.id}>
                      <td>{row.name}{row.is_admin ? <span className="chip accent" style={{ marginLeft: 8 }}>admin</span> : null}</td>
                      <td className="muted">{row.email}</td>
                      <td>{used.runs}</td>
                      <td>{formatNumber(used.tokens_in + used.tokens_out)}</td>
                      <td className="faint">{new Date(row.created_at * 1000).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel-card">
          <h3 className="section-title">System</h3>
          {status && (
            <div className="list">
              {[["API", status.api], ["Database", status.database], ["AI models", status.models], ["Sandbox image", status.sandbox], ["Email", status.email]].map((row) => (
                <div key={row[0]} className="list-row"><span className={"dot " + (row[1] ? "ok" : "bad")} /><span>{row[0]}</span><span className="tool-spacer" /><span className="faint small">{row[1] ? "OK" : "Not set up"}</span></div>
              ))}
            </div>
          )}
          <h3 className="section-title">Models</h3>
          <div className="list">
            {stats.models.map((model) => <div key={model.key} className="list-row"><span className="mono small">{model.label}</span><span className="tool-spacer" /><span className="faint small">{Math.round(model.context / 1000)}k</span></div>)}
          </div>
        </div>
      </div>
      <div className="panel-card" style={{ marginTop: 20 }}>
        <h3 className="section-title"><Mail size={15} />Contact messages</h3>
        {messages.length === 0 && <div className="empty-small">No messages yet.</div>}
        <div className="list">
          {messages.map((item) => (
            <div key={item.id} className={"message-row" + (item.handled ? " handled" : "")}>
              <div className="message-head">
                <strong>{item.name}</strong><a href={"mailto:" + item.email} className="muted small">{item.email}</a><span className="chip">{item.topic}</span>
                <span className="tool-spacer" />
                <span className="faint small">{new Date(item.created_at * 1000).toLocaleString()}</span>
                {!item.handled && <button className="btn btn-soft btn-sm" onClick={() => handled(item.id)}>Mark done</button>}
              </div>
              <p dir="auto">{item.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AppTemplates() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState("All")
  const categories = ["All", "Websites", "Data", "Automation", "Media"]
  return (
    <div className="page wide-page">
      <div className="page-head"><div><h1>Templates</h1><p className="muted">Pick one to open a new chat with it. You can change it before sending.</p></div></div>
      <div className="seg">
        {categories.map((name) => <button key={name} type="button" className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}</button>)}
      </div>
      <div className="tpl-grid">
        {TEMPLATES.filter((item) => filter === "All" || item.category === filter).map((item) => (
          <button key={item.slug} type="button" className="tpl" onClick={() => navigate("/app?template=" + item.slug)}>
            <div className="tpl-art"><Cover seed={item.slug + "t"} label={item.title} /></div>
            <div className="tpl-body"><span className="chip accent">{item.category}</span><p>{item.text}</p></div>
          </button>
        ))}
      </div>
    </div>
  )
}
