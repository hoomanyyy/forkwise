import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Wordmark } from "../ui/Logo"
import { api } from "../../lib/api"

const GROUPS = [
  { title: "Product", links: [["Overview", "/product"], ["The computer", "/product/computer"], ["Memory and abilities", "/product/abilities"], ["Plan and control", "/product/control"], ["Pricing", "/pricing"]] },
  { title: "Solutions", links: [["Websites and apps", "/use-cases/websites"], ["Data and reports", "/use-cases/data"], ["Automation", "/use-cases/automation"], ["Media files", "/use-cases/media"], ["Templates", "/templates"], ["For teams", "/teams"]] },
  { title: "Resources", links: [["Documentation", "/docs"], ["Blog", "/blog"], ["Changelog", "/changelog"], ["Compare", "/compare"], ["FAQ", "/faq"], ["Status", "/status"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Brand", "/brand"], ["Security", "/security"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
]

function StatusPill() {
  const [state, setState] = useState("checking")
  useEffect(() => {
    let alive = true
    api.get("/api/status").then((data) => {
      if (!alive) return
      setState(data.api && data.database && data.models ? "ok" : "partial")
    }).catch(() => alive && setState("down"))
    return () => {
      alive = false
    }
  }, [])
  const text = { checking: "Checking status", ok: "All systems normal", partial: "Some services limited", down: "API unreachable" }[state]
  return <Link to="/status" className={"status-pill " + state}><span />{text}</Link>
}

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Wordmark size={30} />
          <p>The AI engineer with its own computer. Ask it anything, or tell it what to build.</p>
          <StatusPill />
        </div>
        {GROUPS.map((group) => (
          <div className="footer-col" key={group.title}>
            <div className="footer-title">{group.title}</div>
            {group.links.map((link) => <Link key={link[1]} to={link[1]}>{link[0]}</Link>)}
          </div>
        ))}
      </div>
      <div className="site-footer-base">
        <span>© {new Date().getFullYear()} Forkwise AI</span>
        <span className="footer-spacer" />
        <a href="https://x.com/forkwiseai" target="_blank" rel="noreferrer">X</a>
        <a href="https://instagram.com/forkwiseai" target="_blank" rel="noreferrer">Instagram</a>
        <a href="https://www.youtube.com/@Forkwise" target="_blank" rel="noreferrer">YouTube</a>
        <a href="https://github.com/hoomanyyy/forkwise" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </footer>
  )
}
