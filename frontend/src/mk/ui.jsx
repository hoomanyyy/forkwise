import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { ArrowRight, Bot, Check, ChevronDown, Chrome, Code2, Copy, Cpu, Download, Laptop, Menu, Plus, Sparkles, X, BookOpen, Newspaper, History, ShieldCheck, Briefcase, Mail } from "lucide-react"
import { useStore } from "../lib/store"
import "./mk.css"

export function usePage(title, description) {
  useEffect(() => {
    document.title = title ? title + " · Forkwise" : "Forkwise · The AI engineer that finishes the job"
    const tag = document.querySelector('meta[name="description"]')
    if (tag && description) tag.setAttribute("content", description)
  }, [title, description])
}

export function MkLogo({ size = 30, word = true }) {
  return (
    <span className="mk-logo" style={{ gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
        <defs>
          <linearGradient id="mkLogoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b6cff" />
            <stop offset="0.55" stopColor="#4f8bff" />
            <stop offset="1" stopColor="#2fd4f0" />
          </linearGradient>
        </defs>
        <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#mkLogoGrad)" />
        <g fill="none" stroke="#fff" strokeWidth="28" strokeLinecap="round">
          <path d="M150 256 C 230 256, 250 150, 352 150" opacity="0.6" />
          <path d="M150 256 L 352 256" />
          <path d="M150 256 C 230 256, 250 362, 352 362" opacity="0.6" />
        </g>
        <circle cx="150" cy="256" r="40" fill="#fff" />
        <circle cx="362" cy="150" r="30" fill="#fff" opacity="0.8" />
        <circle cx="362" cy="362" r="30" fill="#fff" opacity="0.8" />
        <circle cx="362" cy="256" r="44" fill="#3ee0a1" stroke="#fff" strokeWidth="14" />
      </svg>
      {word && <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: size * 0.62, letterSpacing: "-0.03em" }}>Forkwise</span>}
    </span>
  )
}

const PRODUCT = [
  { to: "/product", icon: Bot, tone: "", title: "The agent", text: "Builds, runs, tests and ships with its own computer" },
  { to: "/download", icon: Laptop, tone: "blue", title: "Desktop app", text: "Works in your folders and terminal, like Cursor" },
  { to: "/product#chrome", icon: Chrome, tone: "cyan", title: "Forkwise for Chrome", text: "Uses your own browser, only where you allow" },
  { to: "/product#skills", icon: Sparkles, tone: "amber", title: "Skills", text: "24 expert playbooks for real projects" },
  { to: "/developers", icon: Code2, tone: "mint", title: "API", text: "Run the agent from your own code" },
  { to: "/use-cases", icon: Briefcase, tone: "coral", title: "Use cases", text: "Apps, fixes, research, data and more" },
]

const RESOURCES = [
  { to: "/docs", icon: BookOpen, tone: "blue", title: "Documentation", text: "Guides for every feature" },
  { to: "/blog", icon: Newspaper, tone: "", title: "Blog", text: "Product news and how-tos" },
  { to: "/changelog", icon: History, tone: "mint", title: "Changelog", text: "Every release, newest first" },
  { to: "/security", icon: ShieldCheck, tone: "cyan", title: "Security", text: "How your work is protected" },
]

function DropItems({ items }) {
  return items.map((item) => {
    const Icon = item.icon
    return (
      <Link key={item.title} to={item.to}>
        <span className={"mk-tile " + item.tone}><Icon size={17} /></span>
        <span><strong>{item.title}</strong><span>{item.text}</span></span>
      </Link>
    )
  })
}

function Drop({ label, items, open, setOpen }) {
  return (
    <div className={"mk-nav-drop" + (open === label ? " open" : "")} onMouseEnter={() => setOpen(label)} onMouseLeave={() => setOpen("")}>
      <button type="button" aria-expanded={open === label} onClick={() => setOpen(open === label ? "" : label)}>{label}<ChevronDown size={14} /></button>
      {open === label && <div className="mk-drop" role="menu"><DropItems items={items} /></div>}
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
      setScrolled(window.scrollY > 8)
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
    document.body.style.overflow = mobile ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobile])

  return (
    <header className={"mk-header" + (scrolled || mobile ? " scrolled" : "")}>
      <div className="mk-wrap mk-header-in">
        <Link to="/" aria-label="Forkwise home"><MkLogo size={30} /></Link>
        <nav className="mk-nav" aria-label="Main">
          <Drop label="Product" items={PRODUCT} open={open} setOpen={setOpen} />
          <NavLink to="/use-cases">Use cases</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/docs">Docs</NavLink>
          <Drop label="Resources" items={RESOURCES} open={open} setOpen={setOpen} />
        </nav>
        <div className="mk-head-actions">
          {signed ? (
            <Link to="/app" className="mk-btn go sm">Open Forkwise<ArrowRight size={15} /></Link>
          ) : (
            <>
              <Link to="/login" className="mk-signin">Sign in</Link>
              <Link to="/register" className="mk-btn go sm">Start free</Link>
            </>
          )}
          <button type="button" className="mk-burger" aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile} onClick={() => setMobile(!mobile)}>{mobile ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {mobile && (
        <div className="mk-mobile">
          <div className="mk-mobile-group">
            <div>Product</div>
            {PRODUCT.map((item) => {
              const Icon = item.icon
              return <Link key={item.title} to={item.to}><span className={"mk-tile " + item.tone}><Icon size={16} /></span>{item.title}</Link>
            })}
          </div>
          <div className="mk-mobile-group">
            <div>Company</div>
            <Link to="/pricing">Pricing</Link>
            <Link to="/docs">Docs</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/changelog">Changelog</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div className="mk-mobile-cta">
            {!signed && <Link to="/login" className="mk-btn ghost lg">Sign in</Link>}
            <Link to={signed ? "/app" : "/register"} className="mk-btn go lg">{signed ? "Open Forkwise" : "Start free, no card"}</Link>
          </div>
        </div>
      )}
    </header>
  )
}

export function MkFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-wrap">
        <div className="mk-footer-top">
          <div className="mk-footer-brand">
            <MkLogo size={30} />
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

function useSpotlight() {
  useEffect(() => {
    function move(event) {
      const card = event.target.closest && event.target.closest(".mk-card")
      if (!card) return
      const box = card.getBoundingClientRect()
      card.style.setProperty("--mx", event.clientX - box.left + "px")
      card.style.setProperty("--my", event.clientY - box.top + "px")
    }
    document.addEventListener("pointermove", move, { passive: true })
    return () => document.removeEventListener("pointermove", move)
  }, [])
}

const PAPER = ["/docs", "/blog", "/changelog", "/privacy", "/terms"]

export function MkLayout() {
  const location = useLocation()
  const paper = PAPER.some((start) => location.pathname === start || location.pathname.startsWith(start + "/"))
  useSpotlight()
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
  return (
    <div className={"mk" + (paper ? " paper" : "")}>
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

export function Glow({ orbs = true }) {
  return (
    <>
      <div className="mk-grid-bg" />
      {orbs && <div className="mk-glow" aria-hidden="true"><div className="mk-orb a" /><div className="mk-orb b" /><div className="mk-orb c" /></div>}
    </>
  )
}

export function PageHero({ kicker, title, lead, actions, center, children }) {
  return (
    <section className={"mk-page-hero" + (center ? " center" : "")}>
      <Glow />
      <div className="mk-wrap">
        <div className="mk-page-hero-in">
          {kicker && <span className="mk-kicker">{kicker}</span>}
          <h1 className="mk-h1" style={{ fontSize: "clamp(36px, 5.4vw, 64px)" }}>{title}</h1>
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
      <img src={src} alt={alt} loading="lazy" width="1440" height="900" />
    </div>
  )
}

export function Cta({ title, text }) {
  const { user } = useStore()
  return (
    <div className="mk-wrap">
      <Reveal className="mk-cta">
        <div className="mk-grid-bg" />
        <h2 className="mk-h2">{title || <>Describe it. <span className="mk-grad">Forkwise builds it.</span></>}</h2>
        <p>{text || "Start free in under a minute. No card, no setup. Your first project can be running before your coffee is."}</p>
        <div className="mk-actions">
          <Link to={user ? "/app" : "/register"} className="mk-btn go lg">{user ? "Open Forkwise" : "Start building free"}<ArrowRight size={17} /></Link>
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

export const MAKERS = [
  ["Claude", "#d97757"],
  ["OpenAI", "#10a37f"],
  ["Gemini", "#4f8df5"],
  ["DeepSeek", "#4d6bfe"],
  ["Qwen", "#8b5cf6"],
  ["Grok", "#71717a"],
  ["Llama", "#0668e1"],
  ["Mistral", "#fa520f"],
  ["Kimi", "#16a34a"],
  ["GLM", "#2563eb"],
  ["MiniMax", "#e11d48"],
  ["NVIDIA", "#76b900"],
]

export function Makers() {
  const list = MAKERS.concat(MAKERS)
  return (
    <div className="mk-marquee" aria-label="Model makers Forkwise works with">
      <div className="mk-marquee-track">
        {list.map((item, index) => <span className="mk-maker" key={index}><i style={{ background: item[1] }}>{item[0].charAt(0)}</i>{item[0]}</span>)}
      </div>
    </div>
  )
}

export { Cpu }
