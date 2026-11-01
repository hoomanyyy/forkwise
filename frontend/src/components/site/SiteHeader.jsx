import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import {
  BarChart3, BookOpen, Bot, Boxes, Brain, ChevronDown, Clapperboard, Code2, FileClock, Globe2, LayoutTemplate,
  Map as MapIcon, Menu, MonitorPlay, Newspaper, Scale, ShieldCheck, Activity, Users, Workflow, X
} from "lucide-react"
import { Wordmark } from "../ui/Logo"
import { useStore } from "../../lib/store"

const MENUS = [
  {
    label: "Product",
    columns: [
      {
        title: "Forkwise",
        items: [
          { to: "/product", icon: Bot, name: "Overview", text: "One chat that answers, researches and builds" },
          { to: "/product/computer", icon: MonitorPlay, name: "The computer", text: "Live preview, files, changes and a terminal" },
          { to: "/product/abilities", icon: Brain, name: "Memory and abilities", text: "Remembers you and writes its own tools" },
          { to: "/product/control", icon: MapIcon, name: "Plan and control", text: "Auto, ask first, plan, and undo anything" },
        ],
      },
    ],
    feature: { title: "New in 2.0", text: "Forkwise now builds tools for itself and keeps them for every chat.", to: "/blog/introducing-forkwise-2", cta: "Read the launch post" },
  },
  {
    label: "Solutions",
    columns: [
      {
        title: "Use cases",
        items: [
          { to: "/use-cases/websites", icon: Globe2, name: "Websites and apps", text: "From one sentence to a live site" },
          { to: "/use-cases/data", icon: BarChart3, name: "Data and reports", text: "Spreadsheets in, dashboards out" },
          { to: "/use-cases/automation", icon: Workflow, name: "Automation", text: "Bots, scrapers and scheduled jobs" },
          { to: "/use-cases/media", icon: Clapperboard, name: "Images, audio and video", text: "Convert, cut and edit files" },
        ],
      },
      {
        title: "Start faster",
        items: [
          { to: "/templates", icon: LayoutTemplate, name: "Templates", text: "Ready prompts that work well" },
          { to: "/teams", icon: Users, name: "For teams", text: "Shared projects and self-hosting" },
        ],
      },
    ],
  },
  {
    label: "Resources",
    columns: [
      {
        title: "Learn",
        items: [
          { to: "/docs", icon: BookOpen, name: "Documentation", text: "Guides for every feature" },
          { to: "/blog", icon: Newspaper, name: "Blog", text: "Product news and how-tos" },
          { to: "/changelog", icon: FileClock, name: "Changelog", text: "What changed and when" },
        ],
      },
      {
        title: "Trust",
        items: [
          { to: "/security", icon: ShieldCheck, name: "Security", text: "How your work is isolated" },
          { to: "/status", icon: Activity, name: "Status", text: "Live health of the platform" },
          { to: "/compare", icon: Scale, name: "Compare", text: "How Forkwise differs" },
        ],
      },
    ],
  },
]

function Mega({ menu, onClose }) {
  return (
    <div className="mega" onMouseLeave={onClose}>
      <div className="mega-inner">
        {menu.columns.map((column) => (
          <div className="mega-col" key={column.title}>
            <div className="mega-title">{column.title}</div>
            {column.items.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.to} to={item.to} className="mega-item" onClick={onClose}>
                  <span className="mega-icon"><Icon size={17} /></span>
                  <span><strong>{item.name}</strong><small>{item.text}</small></span>
                </Link>
              )
            })}
          </div>
        ))}
        {menu.feature && (
          <Link to={menu.feature.to} className="mega-feature" onClick={onClose}>
            <span className="mega-feature-art" aria-hidden="true"><Boxes size={22} /><Code2 size={22} /></span>
            <strong>{menu.feature.title}</strong>
            <span>{menu.feature.text}</span>
            <em>{menu.feature.cta}</em>
          </Link>
        )}
      </div>
    </div>
  )
}

export default function SiteHeader() {
  const { user } = useStore()
  const [open, setOpen] = useState(null)
  const [mobile, setMobile] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const ref = useRef(null)

  useEffect(() => {
    setOpen(null)
    setMobile(false)
  }, [location.pathname])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    function key(event) {
      if (event.key === "Escape") setOpen(null)
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])

  return (
    <header className={"site-header" + (scrolled ? " scrolled" : "") + (open !== null ? " menu-open" : "")} ref={ref}>
      <div className="site-header-inner">
        <Link to="/" className="site-logo" aria-label="Forkwise home"><Wordmark size={28} /></Link>
        <nav className="site-nav" aria-label="Main">
          {MENUS.map((menu, index) => (
            <button key={menu.label} type="button" className={"site-nav-item" + (open === index ? " active" : "")} onMouseEnter={() => setOpen(index)} onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index}>
              {menu.label}<ChevronDown size={14} />
            </button>
          ))}
          <NavLink to="/pricing" className="site-nav-item" onMouseEnter={() => setOpen(null)}>Pricing</NavLink>
          <NavLink to="/docs" className="site-nav-item" onMouseEnter={() => setOpen(null)}>Docs</NavLink>
        </nav>
        <div className="site-actions">
          {user ? (
            <Link to="/app" className="btn btn-primary btn-sm">Open Forkwise</Link>
          ) : (
            <>
              <Link to="/login" className="site-signin">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Start free<span className="btn-node" /></Link>
            </>
          )}
          <button className="icon-btn site-burger" aria-label="Menu" onClick={() => setMobile(!mobile)}>{mobile ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open !== null && <Mega menu={MENUS[open]} onClose={() => setOpen(null)} />}
      {mobile && (
        <div className="mobile-menu">
          {MENUS.map((menu) => (
            <div key={menu.label} className="mobile-group">
              <div className="mega-title">{menu.label}</div>
              {menu.columns.map((column) => column.items.map((item) => (
                <Link key={item.to} to={item.to}>{item.name}</Link>
              )))}
            </div>
          ))}
          <div className="mobile-group">
            <Link to="/pricing">Pricing</Link>
            <Link to="/docs">Docs</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="mobile-cta">
            {!user && <Link to="/login" className="btn btn-ghost wide">Sign in</Link>}
            <Link to={user ? "/app" : "/register"} className="btn btn-primary wide">{user ? "Open Forkwise" : "Start free"}</Link>
          </div>
        </div>
      )}
    </header>
  )
}
