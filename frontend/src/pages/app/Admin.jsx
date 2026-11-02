import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { Activity, CircleDollarSign, Crown, Mail, MessageSquare, Search, Shield, Trash2, Users } from "lucide-react"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "payments", label: "Payments" },
  { key: "messages", label: "Messages" },
  { key: "system", label: "System" },
]

function number(value) {
  return Number(value || 0).toLocaleString("en-US")
}

function money(value) {
  return "$" + Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function date(seconds) {
  if (!seconds) return "-"
  return new Date(seconds * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function Overview() {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.get("/api/admin/overview").then(setData).catch(() => setData({ error: true }))
  }, [])
  if (!data) return <div className="admin-skeleton"><span className="skel h20 w30" /><span className="skel h20 w20" /></div>
  if (data.error) return <p className="muted">Could not load the overview.</p>
  const peak = Math.max(1, ...data.days.map((day) => day.tokens))
  return (
    <>
      <div className="kpis">
        <div className="kpi"><Users size={16} /><span>Users</span><b>{number(data.users)}</b><small>{number(data.new_week)} new in 7 days</small></div>
        <div className="kpi"><Crown size={16} /><span>Paying users</span><b>{number(data.paid_users)}</b><small>with an active plan</small></div>
        <div className="kpi"><CircleDollarSign size={16} /><span>Revenue, 30 days</span><b>{money(data.revenue_month)}</b><small>{money(data.revenue)} all time</small></div>
        <div className="kpi"><Activity size={16} /><span>Tasks today</span><b>{number(data.tasks_today)}</b><small>{number(data.tokens_today)} tokens</small></div>
        <div className="kpi"><MessageSquare size={16} /><span>Chats</span><b>{number(data.chats)}</b><small>all time</small></div>
      </div>
      <div className="panel-card">
        <div className="panel-head"><h3>Token usage, last 14 days</h3><span className="faint small">Peak {number(peak)}</span></div>
        <div className="bars" role="img" aria-label="Tokens per day for the last 14 days">
          {data.days.map((day) => (
            <div key={day.day} className="bar-col" title={day.day + ": " + number(day.tokens) + " tokens, " + day.runs + " tasks"}>
              <span className="bar" style={{ height: Math.max(3, (day.tokens / peak) * 100) + "%" }} />
              <small>{day.day.slice(8)}</small>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function UserRow({ row, me, onChanged }) {
  const { toast } = useStore()
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState(row.plan === "free" ? "pro" : row.plan)
  const [days, setDays] = useState(30)

  async function send(body, message) {
    try {
      await api.post("/api/admin/users/" + row.id, body)
      toast(message, "ok")
      setOpen(false)
      onChanged()
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  async function remove() {
    if (!window.confirm("Delete " + row.email + " and everything they made? This cannot be undone.")) return
    try {
      await api.del("/api/admin/users/" + row.id)
      toast("User deleted", "ok")
      onChanged()
    } catch (problem) {
      toast(problem.message, "error")
    }
  }

  return (
    <>
      <tr>
        <td>
          <div className="who"><span className="avatar-s">{(row.name || row.email).charAt(0).toUpperCase()}</span><div><strong>{row.name || "-"}</strong>{row.is_admin && <span className="chip accent">admin</span>}<div className="muted small">{row.email}</div></div></div>
        </td>
        <td><span className={"chip plan-" + row.plan}>{row.plan.charAt(0).toUpperCase() + row.plan.slice(1)}</span>{row.plan !== "free" && <div className="faint small">until {date(row.plan_until)}</div>}</td>
        <td>{number(row.runs)}</td>
        <td>{number(row.tokens)}</td>
        <td className="faint">{date(row.created_at)}</td>
        <td className="faint">{row.last_day || "-"}</td>
        <td className="actions-cell"><button className="btn btn-soft btn-sm" onClick={() => setOpen(!open)}>{open ? "Close" : "Manage"}</button></td>
      </tr>
      {open && (
        <tr className="manage-row">
          <td colSpan={7}>
            <div className="manage">
              <div className="manage-group">
                <label>Plan</label>
                <select className="select" value={plan} onChange={(e) => setPlan(e.target.value)}>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                  <option value="free">Free</option>
                </select>
                {plan !== "free" && (
                  <select className="select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => send({ plan: plan, days: days }, "Plan updated")}>Apply</button>
              </div>
              <div className="manage-group">
                <button className="btn btn-ghost btn-sm" disabled={row.id === me} onClick={() => send({ is_admin: row.is_admin ? 0 : 1 }, row.is_admin ? "Admin removed" : "Admin added")}><Shield size={14} />{row.is_admin ? "Remove admin" : "Make admin"}</button>
                <button className="btn btn-danger btn-sm" disabled={row.id === me} onClick={remove}><Trash2 size={14} />Delete user</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function UsersTab({ me }) {
  const [rows, setRows] = useState(null)
  const [query, setQuery] = useState("")

  async function load(text) {
    try {
      const data = await api.get("/api/admin/users?q=" + encodeURIComponent(text))
      setRows(data.users)
    } catch (problem) {
      setRows([])
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => load(query), 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="panel-card">
      <div className="panel-head">
        <h3>Users{rows ? " (" + rows.length + ")" : ""}</h3>
        <div className="search-field"><Search size={15} /><input className="input" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>User</th><th>Plan</th><th>Tasks</th><th>Tokens</th><th>Joined</th><th>Last active</th><th /></tr></thead>
          <tbody>
            {rows === null && <tr><td colSpan={7}><span className="skel h20 w30" /></td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={7} className="empty-small">No users found.</td></tr>}
            {rows && rows.map((row) => <UserRow key={row.id} row={row} me={me} onChanged={() => load(query)} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PaymentsTab() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    api.get("/api/admin/payments").then((data) => setRows(data.payments)).catch(() => setRows([]))
  }, [])
  return (
    <div className="panel-card">
      <div className="panel-head"><h3>Payments</h3><span className="faint small">Confirmed automatically by NOWPayments</span></div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Date</th><th>User</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {rows === null && <tr><td colSpan={5}><span className="skel h20 w30" /></td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={5} className="empty-small">No payments yet.</td></tr>}
            {rows && rows.map((row) => (
              <tr key={row.id}>
                <td className="faint">{date(row.created_at)}</td>
                <td>{row.email || "deleted user"}</td>
                <td>{row.plan.charAt(0).toUpperCase() + row.plan.slice(1)} {row.period === "year" ? "yearly" : "monthly"}</td>
                <td>{money(row.amount)}</td>
                <td><span className={"chip " + (row.status === "paid" ? "ok" : "")}>{row.status === "paid" ? "Paid" : row.status === "created" ? "Not paid" : row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MessagesTab() {
  const [messages, setMessages] = useState(null)

  async function load() {
    try {
      const box = await api.get("/api/admin/messages")
      setMessages(box.messages)
    } catch (problem) {
      setMessages([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handled(id) {
    await api.post("/api/admin/messages/" + id)
    load()
  }

  return (
    <div className="panel-card">
      <div className="panel-head"><h3><Mail size={15} /> Contact messages</h3></div>
      {messages && messages.length === 0 && <div className="empty-small">No messages yet.</div>}
      <div className="list">
        {(messages || []).map((item) => (
          <div key={item.id} className={"message-row" + (item.handled ? " handled" : "")}>
            <div className="message-head">
              <strong>{item.name}</strong><a href={"mailto:" + item.email} className="muted small">{item.email}</a><span className="chip">{item.topic}</span>
              <span className="tool-spacer" />
              <span className="faint small">{new Date(item.created_at * 1000).toLocaleString("en-GB")}</span>
              {!item.handled && <button className="btn btn-soft btn-sm" onClick={() => handled(item.id)}>Mark done</button>}
            </div>
            <p dir="auto">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemTab() {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState(null)
  useEffect(() => {
    api.get("/api/admin/stats").then(setStats).catch(() => setStats({ models: [] }))
    api.get("/api/status").then(setStatus).catch(() => setStatus(null))
  }, [])
  const rows = status ? [["API", status.api], ["Database", status.database], ["AI models", status.models], ["Sandbox image", status.sandbox], ["Email", status.email]] : []
  return (
    <div className="admin-grid">
      <div className="panel-card">
        <div className="panel-head"><h3>Services</h3></div>
        <div className="list">
          {rows.map((row) => (
            <div key={row[0]} className="list-row"><span className={"dot " + (row[1] ? "ok" : "bad")} /><span>{row[0]}</span><span className="tool-spacer" /><span className="faint small">{row[1] ? "Running" : "Not set up"}</span></div>
          ))}
        </div>
      </div>
      <div className="panel-card">
        <div className="panel-head"><h3>Models</h3></div>
        <div className="list">
          {stats && stats.models.map((model) => <div key={model.key} className="list-row"><span className="mono small">{model.label}</span><span className="tool-spacer" /><span className="faint small">{Math.round(model.context / 1000)}k context</span></div>)}
        </div>
      </div>
    </div>
  )
}

export function Admin() {
  const { user } = useStore()
  const [tab, setTab] = useState("overview")
  if (!user.is_admin) return <Navigate to="/app" replace />
  return (
    <div className="page wide-page">
      <div className="page-head"><div><h1>Admin</h1><p className="muted">Users, revenue, messages and system health.</p></div></div>
      <div className="tabs" role="tablist">
        {TABS.map((item) => <button key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>{item.label}</button>)}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "users" && <UsersTab me={user.id} />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "system" && <SystemTab />}
    </div>
  )
}
