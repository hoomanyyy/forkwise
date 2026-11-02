import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { Check, Mail, Users, MessageSquare, Activity, Cpu } from "lucide-react"
import { useStore } from "../../lib/store"
import { api } from "../../lib/api"
import { PLANS, TEMPLATES } from "../../content/catalog"
import { Cover } from "../../components/site/Cover"

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

export function Billing() {
  const { usage, toast } = useStore()
  const [days, setDays] = useState([])
  const [limit, setLimit] = useState(0)
  const [info, setInfo] = useState(null)
  const [yearly, setYearly] = useState(false)
  const [busy, setBusy] = useState("")
  const [params] = useSearchParams()
  const justPaid = params.get("paid") === "1"

  async function loadInfo() {
    try {
      const data = await api.get("/api/billing")
      setInfo(data)
      setLimit(data.limit)
      return data
    } catch (problem) {
      return null
    }
  }

  useEffect(() => {
    api.get("/api/usage").then((data) => {
      setDays(data.days)
      setLimit(data.limit)
    }).catch(() => setDays([]))
    loadInfo()
  }, [])

  useEffect(() => {
    if (!justPaid) return undefined
    let tries = 0
    const timer = setInterval(async () => {
      tries = tries + 1
      const data = await loadInfo()
      if ((data && data.plan !== "free") || tries >= 40) clearInterval(timer)
    }, 15000)
    return () => clearInterval(timer)
  }, [justPaid])

  async function pay(plan) {
    setBusy(plan)
    try {
      const data = await api.post("/api/billing/checkout", { plan: plan, period: yearly ? "year" : "month" })
      window.location.href = data.url
    } catch (problem) {
      toast(problem.message)
      setBusy("")
    }
  }

  const today = usage ? usage.tokens_in + usage.tokens_out : 0
  const share = limit > 0 ? Math.min(100, (today / limit) * 100) : 0
  const month = days.reduce((total, day) => total + day.tokens_in + day.tokens_out, 0)
  const runs = days.reduce((total, day) => total + day.runs, 0)
  const current = info ? info.plan : "free"
  const until = info && info.plan_until > 0 && current !== "free" ? new Date(info.plan_until * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""
  const waiting = info ? info.payments.filter((row) => row.status !== "paid" && row.status !== "created" && row.status !== "expired" && row.status !== "failed") : []

  return (
    <div className="page">
      <div className="page-head"><div><h1>Plan and usage</h1><p className="muted">Your current plan and how much you have used.</p></div></div>
      {justPaid && current === "free" && <div className="notice">Thank you. Your payment is being confirmed on the network. Your plan switches on by itself when it arrives, usually within a few minutes.</div>}
      {justPaid && current !== "free" && <div className="notice ok">Payment received. Your {current.charAt(0).toUpperCase() + current.slice(1)} plan is active.</div>}
      <div className="stat-cards">
        <div className="stat-card">
          <span className="faint small">Current plan</span>
          <b>{current.charAt(0).toUpperCase() + current.slice(1)}</b>
          <span className="muted small">{until ? "Active until " + until : "Free forever"}</span>
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
      <div className="plans-head">
        <h3 className="section-title">Plans</h3>
        <div className="price-toggle" role="group" aria-label="Billing period">
          <button type="button" className={!yearly ? "active" : ""} onClick={() => setYearly(false)}>Monthly</button>
          <button type="button" className={yearly ? "active" : ""} onClick={() => setYearly(true)}>Yearly<small>save 20%</small></button>
        </div>
      </div>
      <div className="mini-plans">
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearly : plan.monthly
          const isCurrent = plan.key === current
          return (
            <div key={plan.key} className={"mini-plan" + (isCurrent ? " current" : "")}>
              <div className="mini-plan-head"><strong>{plan.name}</strong>{isCurrent && <span className="chip ok">Current</span>}</div>
              <div className="mini-plan-price">{price === null ? "Custom" : "$" + price}<small>{price === null ? "" : " / month"}</small></div>
              <ul>{plan.features.slice(0, 4).map((feature) => <li key={feature}><Check size={13} />{feature}</li>)}</ul>
              {plan.key === "teams" && <Link to="/contact?topic=Teams" className="btn btn-ghost btn-sm wide">Talk to us</Link>}
              {plan.key === "free" && <button className="btn btn-soft btn-sm wide" disabled>{isCurrent ? "Your plan" : "Included"}</button>}
              {(plan.key === "pro" || plan.key === "premium") && (
                <button className="btn btn-primary btn-sm wide" disabled={!info || !info.enabled || busy !== ""} onClick={() => pay(plan.key)} title={info && !info.enabled ? "Payments are not switched on yet" : ""}>
                  {busy === plan.key ? "Opening payment page..." : isCurrent ? "Extend with crypto" : "Pay with crypto"}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="faint small" style={{ marginTop: 16 }}>Payments are made in cryptocurrency (USDT, Bitcoin, Ethereum and more) through NOWPayments, priced in US dollars. {yearly ? "Yearly is one payment for 12 months." : "Monthly gives 30 days."} Changing plan starts the new plan right away.</p>
      {info && info.payments.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 28 }}>Payments</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {info.payments.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td>{row.plan.charAt(0).toUpperCase() + row.plan.slice(1)} {row.period === "year" ? "yearly" : "monthly"}</td>
                    <td>${row.amount}</td>
                    <td>{row.status === "paid" ? "Paid" : row.status === "created" ? "Not paid" : row.status === "amount_mismatch" ? "Amount too low" : row.status.charAt(0).toUpperCase() + row.status.slice(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {waiting.length > 0 && <p className="faint small">A payment that is confirming or sending can take a few minutes. If a payment stays unfinished for a day, write to us from the Contact page with the payment date.</p>}
        </>
      )}
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
