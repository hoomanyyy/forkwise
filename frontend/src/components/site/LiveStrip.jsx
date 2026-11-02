import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../../lib/api"

function formatDate(text) {
  const parts = text.split("-")
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}

function format(value) {
  return Number(value).toLocaleString("en-US")
}

export default function LiveStrip() {
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    Promise.all([api.get("/api/status"), api.get("/api/public/stats"), api.get("/api/status/history?days=30")]).then((results) => {
      if (alive) setState({ loading: false, status: results[0], stats: results[1], history: results[2] })
    }).catch(() => {
      if (alive) setState({ loading: false, down: true })
    })
    return () => {
      alive = false
    }
  }, [])

  if (state.loading) {
    return <div className="live-strip loading" aria-busy="true"><span className="skel w30 h20" /><span className="skel w20 h20" /><span className="skel w20 h20" /></div>
  }

  if (state.down) {
    return (
      <div className="live-strip">
        <Link to="/status" className="live-item"><span className="live-dot down" /><strong>Status</strong><span>Cannot reach the API right now</span></Link>
      </div>
    )
  }

  const healthy = state.status.api && state.status.database && state.status.models
  const stats = state.stats
  const uptime = state.history && state.history.uptime
  const items = []
  items.push(
    <Link key="status" to="/status" className="live-item">
      <span className={"live-dot " + (healthy ? "ok" : "warn")} />
      <strong>{healthy ? "Operational" : "Limited"}</strong>
      <span>{uptime !== null && uptime !== undefined ? (uptime * 100).toFixed(2) + "% uptime, 30 days" : "Status page"}</span>
    </Link>
  )
  if (stats.tasks >= 10) {
    items.push(<div key="tasks" className="live-item"><strong>{format(stats.tasks)}</strong><span>tasks finished</span></div>)
  }
  if (stats.chats >= 10) {
    items.push(<div key="chats" className="live-item"><strong>{format(stats.chats)}</strong><span>chats started</span></div>)
  }
  items.push(<div key="models" className="live-item"><strong>{stats.models}</strong><span>{stats.models === 1 ? "model" : "models"} to choose from</span></div>)
  items.push(
    <Link key="release" to="/changelog" className="live-item">
      <strong>Version {stats.release.version}</strong>
      <span>released {formatDate(stats.release.date)}</span>
    </Link>
  )
  return <div className="live-strip">{items}</div>
}
