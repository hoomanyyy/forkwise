import { useEffect, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { Menu, X } from "lucide-react"
import { Wordmark } from "../ui/Logo"
import { useStore } from "../../lib/store"

const LINKS = [
  ["Product", "/product"],
  ["Pricing", "/pricing"],
  ["Docs", "/docs"],
  ["Blog", "/blog"],
  ["Changelog", "/changelog"],
  ["Download", "/download"],
]

export default function SiteHeader() {
  const { user, hint, ready } = useStore()
  const signed = Boolean(user) || (!ready && hint)
  const [mobile, setMobile] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobile(false)
  }, [location.pathname])

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-logo" aria-label="Forkwise home"><Wordmark size={26} /></Link>
        <nav className="site-nav" aria-label="Main">
          {LINKS.map((item) => <NavLink key={item[1]} to={item[1]} className="site-nav-item">{item[0]}</NavLink>)}
        </nav>
        <div className="site-actions">
          {signed ? (
            <Link to="/app" className="btn btn-primary btn-sm">Open Forkwise</Link>
          ) : (
            <>
              <Link to="/login" className="site-signin">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Start free</Link>
            </>
          )}
          <button className="icon-btn site-burger" aria-label="Menu" onClick={() => setMobile(!mobile)}>{mobile ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {mobile && (
        <div className="mobile-menu">
          <div className="mobile-group">
            {LINKS.map((item) => <Link key={item[1]} to={item[1]}>{item[0]}</Link>)}
            <Link to="/contact">Contact</Link>
          </div>
          <div className="mobile-cta">
            {!signed && <Link to="/login" className="btn btn-ghost wide">Sign in</Link>}
            <Link to={signed ? "/app" : "/register"} className="btn btn-primary wide">{signed ? "Open Forkwise" : "Start free"}</Link>
          </div>
        </div>
      )}
    </header>
  )
}
