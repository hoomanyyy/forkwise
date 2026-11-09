import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { ArrowRight, Bot, Check, ChevronDown, Chrome, Code2, Copy, Cpu, Download, Laptop, Menu, Plus, Sparkles, X, Briefcase } from "lucide-react"
import { useStore } from "../lib/store"
import { LogoMark } from "../components/ui/Logo"
import "./mk.css"

export function usePage(title, description) {
  useEffect(() => {
    document.title = title ? title + " · Forkwise" : "Forkwise · The AI engineer that finishes the job"
    const tag = document.querySelector('meta[name="description"]')
    if (tag && description) tag.setAttribute("content", description)
  }, [title, description])
}

export function MkLogo({ size = 26, word = true }) {
  return (
    <span className="mk-logo">
      <LogoMark size={size} />
      {word && <span style={{ fontSize: Math.round(size * 0.66) }}>Forkwise</span>}
    </span>
  )
}

const PRODUCT = [
  { to: "/product", icon: Bot, title: "The agent", text: "Plans, builds, runs and checks real projects" },
  { to: "/download", icon: Laptop, title: "Desktop app", text: "Your folders and your terminal" },
  { to: "/product#chrome", icon: Chrome, title: "Forkwise for Chrome", text: "Your own browser, only where you allow" },
  { to: "/product#skills", icon: Sparkles, title: "Skills", text: "24 expert playbooks built in" },
  { to: "/developers", icon: Code2, title: "API", text: "Run the agent from your own code" },
  { to: "/use-cases", icon: Briefcase, title: "Use cases", text: "What people build with Forkwise" },
]

function Drop({ label, items, open, setOpen }) {
  const timer = useRef(null)
  function enter() {
    clearTimeout(timer.current)
    setOpen(label)
  }
  function leave() {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(""), 140)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <div className={"mk-nav-drop" + (open === label ? " open" : "")} onMouseEnter={enter} onMouseLeave={leave}>
      <button type="button" aria-expanded={open === label} onClick={() => setOpen(open === label ? "" : label)}>{label}<ChevronDown size={14} /></button>
      {open === label && (
        <div className="mk-drop" role="menu">
          <div className="mk-drop-in">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.title} to={item.to} role="menuitem" onClick={() => setOpen("")}>
                  <span className="mk-tile"><Icon size={16} /></span>
                  <span><strong>{item.title}</strong><span>{item.text}</span></span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function MkHeader() {
  const { user, hint, ready } = useStore()
  const signed = Boolean(user) || (!ready && hint)
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [open, setOpen] = useState("")
  const location = useLocation()

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setMobile(false)
    setOpen("")
  }, [location.pathname])

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") {
        setOpen("")
        setMobile(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobile])

  return (
    <>
    <header className={"mk-header" + (scrolled || mobile ? " scrolled" : "")}>
      <div className="mk-wrap mk-header-in">
        <Link to="/" aria-label="Forkwise home"><MkLogo /></Link>
        <nav className="mk-nav" aria-label="Main">
          <Drop label="Product" items={PRODUCT} open={open} setOpen={setOpen} />
          <NavLink to="/use-cases">Use cases</NavLink>
          <NavLink to="/developers">Developers</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/docs">Docs</NavLink>
          <NavLink to="/blog">Blog</NavLink>
        </nav>
        <div className="mk-head-actions">
          {signed ? (
            <Link to="/app" className="mk-btn go sm">Open Forkwise</Link>
          ) : (
            <>
              <Link to="/login" className="mk-signin">Sign in</Link>
              <Link to="/register" className="mk-btn go sm">Get started</Link>
            </>
          )}
          <button type="button" className="mk-burger" aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile} onClick={() => setMobile(!mobile)}>{mobile ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
    </header>
      {mobile && (
        <div className="mk-mobile">
          <div className="mk-mobile-group">
            <div>Product</div>
            {PRODUCT.map((item) => {
              const Icon = item.icon
              return <Link key={item.title} to={item.to}><span className="mk-tile"><Icon size={16} /></span>{item.title}</Link>
            })}
          </div>
          <div className="mk-mobile-group">
            <div>Resources</div>
            <Link to="/pricing">Pricing</Link>
            <Link to="/docs">Docs</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/changelog">Changelog</Link>
            <Link to="/security">Security</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="mk-mobile-cta">
            {!signed && <Link to="/login" className="mk-btn ghost lg">Sign in</Link>}
            <Link to={signed ? "/app" : "/register"} className="mk-btn go lg">{signed ? "Open Forkwise" : "Get started free"}</Link>
          </div>
        </div>
      )}
    </>
  )
}

export function MkFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-wrap">
        <div className="mk-footer-top">
          <div className="mk-footer-brand">
            <MkLogo />
            <p>The AI engineer that plans, builds, runs and checks real projects, on its own computer or yours.</p>
            <span className="mk-status"><i />All systems normal</span>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><Link to="/product">Overview</Link></li>
              <li><Link to="/use-cases">Use cases</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><Link to="/download">Desktop app</Link></li>
              <li><Link to="/product#chrome">Forkwise for Chrome</Link></li>
            </ul>
          </div>
          <div>
            <h4>Developers</h4>
            <ul>
              <li><Link to="/developers">API</Link></li>
              <li><Link to="/docs/api">API reference</Link></li>
              <li><Link to="/docs/skills">Skills</Link></li>
              <li><Link to="/docs/connectors">Connectors (MCP)</Link></li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li><Link to="/docs">Documentation</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/changelog">Changelog</Link></li>
              <li><Link to="/security">Security</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="mk-footer-bottom">
          <span>© {new Date().getFullYear()} Forkwise AI. All rights reserved.</span>
          <div className="mk-social">
            <a href="https://x.com/forkwiseai" target="_blank" rel="noreferrer">X</a>
            <a href="https://instagram.com/forkwiseai" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://www.youtube.com/@Forkwise" target="_blank" rel="noreferrer">YouTube</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function MkLayout() {
  const location = useLocation()
  const docs = location.pathname === "/docs" || location.pathname.startsWith("/docs/")
  useEffect(() => {
    document.documentElement.dataset.theme = "dark"
  }, [])
  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1))
      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 60)
        return
      }
    }
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])
  if (docs) {
    return (
      <div className="mk">
        <Outlet />
      </div>
    )
  }
  return (
    <div className="mk">
      <MkHeader />
      <main key={location.pathname}><Outlet /></main>
      <MkFooter />
    </div>
  )
}

let watcher = null

function watch(node) {
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    node.setAttribute("data-mkr", "1")
    return function () {}
  }
  if (!watcher) {
    watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-mkr", "1")
          watcher.unobserve(entry.target)
        }
      })
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 })
  }
  watcher.observe(node)
  return function () {
    if (watcher) watcher.unobserve(node)
  }
}

export function Reveal({ children, index = 0, as = "div", className, style, ...rest }) {
  const Tag = as
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return undefined
    return watch(ref.current)
  }, [])
  return <Tag ref={ref} data-mkr="0" style={Object.assign({ "--mkd": index }, style || {})} className={className} {...rest}>{children}</Tag>
}

export function Glow() {
  return <div className="mk-glow" aria-hidden="true" />
}

export function PageHero({ kicker, title, lead, actions, center, children }) {
  return (
    <section className={"mk-page-hero" + (center ? " center" : "")}>
      <Glow />
      <div className="mk-wrap">
        <div className="mk-page-hero-in">
          {kicker && <span className="mk-kicker">{kicker}</span>}
          <h1 className="mk-h1">{title}</h1>
          {lead && <p className="mk-lead">{lead}</p>}
          {actions && <div className="mk-actions">{actions}</div>}
          {children}
        </div>
      </div>
    </section>
  )
}

export function SectionHead({ kicker, title, text, center }) {
  return (
    <Reveal className={"mk-section-head" + (center ? " center" : "")}>
      {kicker && <span className="mk-kicker">{kicker}</span>}
      <h2 className="mk-h2">{title}</h2>
      {text && <p className="mk-lead">{text}</p>}
    </Reveal>
  )
}

export function Frame({ src, alt, label }) {
  return (
    <div className="mk-frame">
      <div className="mk-frame-bar"><span className="mk-dots"><i /><i /><i /></span>{label}</div>
      <img src={src} alt={alt} loading="lazy" decoding="async" width="1440" height="900" />
    </div>
  )
}

export function Cta({ title, text }) {
  const { user } = useStore()
  return (
    <div className="mk-wrap">
      <Reveal className="mk-cta">
        <h2 className="mk-h2">{title || <>Describe it. <span className="mk-grad">Forkwise builds it.</span></>}</h2>
        <p>{text || "Start free in under a minute. No card and no setup."}</p>
        <div className="mk-actions">
          <Link to={user ? "/app" : "/register"} className="mk-btn go lg">{user ? "Open Forkwise" : "Get started free"}<ArrowRight size={17} /></Link>
          <Link to="/contact?topic=Sales" className="mk-btn ghost lg">Talk to us</Link>
        </div>
      </Reveal>
    </div>
  )
}

export function Faq({ items }) {
  return (
    <div className="mk-faq">
      {items.map((item, index) => (
        <Reveal as="details" index={index % 4} key={item[0]}>
          <summary>{item[0]}<Plus size={18} /></summary>
          <p>{item[1]}</p>
        </Reveal>
      ))}
    </div>
  )
}

export function CodeTabs({ tabs }) {
  const [current, setCurrent] = useState(0)
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(tabs[current].code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className="mk-code">
      <div className="mk-code-head">
        {tabs.map((tab, index) => <button type="button" key={tab.label} className={index === current ? "on" : ""} onClick={() => setCurrent(index)}>{tab.label}</button>)}
        <button type="button" className="copy" onClick={copy} aria-label="Copy code">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre><code>{tabs[current].code}</code></pre>
    </div>
  )
}

export function CheckList({ items }) {
  return (
    <ul className="mk-card-list">
      {items.map((item) => <li key={item}><Check size={15} /><span>{item}</span></li>)}
    </ul>
  )
}

export function DownloadButton({ className }) {
  const platform = navigator.userAgent.includes("Windows") ? "windows" : navigator.userAgent.includes("Mac") ? "macos" : "linux"
  const label = platform === "windows" ? "Windows" : platform === "macos" ? "macOS" : "Linux"
  return <a href={downloadUrl(platform)} className={className || "mk-btn ghost lg"}><Download size={17} />Download for {label}</a>
}

export function startLink(user, prompt) {
  if (user) return "/app?prompt=" + encodeURIComponent(prompt)
  return "/register"
}

export function rememberPrompt(user, prompt) {
  if (user) return
  try {
    localStorage.setItem("fw-pending-prompt", prompt)
  } catch (problem) {
    return
  }
}

export function downloadUrl(platform) {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
  return base + "/api/download/" + platform
}

export const MAKERS = ["Claude", "OpenAI", "Gemini", "DeepSeek", "Qwen", "Grok", "Llama", "Mistral", "Kimi", "GLM", "MiniMax", "NVIDIA"]

export function Makers() {
  const list = MAKERS.concat(MAKERS)
  return (
    <div className="mk-marquee" aria-label="Model makers Forkwise works with">
      <div className="mk-marquee-track">
        {list.map((item, index) => <span className="mk-maker" key={index} aria-hidden={index >= MAKERS.length}>{item}</span>)}
      </div>
    </div>
  )
}

export { Cpu }
