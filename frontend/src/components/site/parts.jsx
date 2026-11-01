import { useEffect, useRef, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import SiteHeader from "./SiteHeader"
import SiteFooter from "./SiteFooter"
import { LogoMark } from "../ui/Logo"

export function usePageTitle(title, description) {
  useEffect(() => {
    document.title = title ? title + " — Forkwise" : "Forkwise — the AI engineer with its own computer"
    if (description) {
      const tag = document.querySelector('meta[name="description"]')
      if (tag) tag.setAttribute("content", description)
    }
  }, [title, description])
}

export function SiteLayout() {
  const location = useLocation()
  useEffect(() => {
    document.documentElement.dataset.theme = "light"
  }, [])
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0)
  }, [location.pathname, location.hash])
  return (
    <div className="site">
      <SiteHeader />
      <main className="site-main"><Outlet /></main>
      <SiteFooter />
    </div>
  )
}

export function PageHero({ kicker, title, lead, actions, art, align, tone }) {
  return (
    <section className={"page-hero" + (align === "center" ? " center" : "") + (tone ? " " + tone : "")}>
      <div className="page-hero-inner">
        <div className="page-hero-copy">
          {kicker && <div className="kicker"><span className="kicker-node" />{kicker}</div>}
          <h1 className="display">{title}</h1>
          {lead && <p className="lead">{lead}</p>}
          {actions && <div className="hero-actions">{actions}</div>}
        </div>
        {art && <div className="page-hero-art">{art}</div>}
      </div>
    </section>
  )
}

export function Section({ id, title, intro, children, tone, wide, className }) {
  return (
    <section id={id} className={"section" + (tone ? " " + tone : "") + (className ? " " + className : "")}>
      <div className={"section-inner" + (wide ? " wide" : "")}>
        {(title || intro) && (
          <div className="section-head">
            {title && <h2 className="display">{title}</h2>}
            {intro && <p>{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

export function CtaBand({ title, text, primary, secondary }) {
  return (
    <section className="cta-band band-dark">
      <BranchField quiet />
      <div className="cta-inner">
        <LogoMark size={52} />
        <h2 className="display">{title || "Start with one sentence."}</h2>
        <p>{text || "Free to start. No card needed. Your first project can be live in a few minutes."}</p>
        <div className="hero-actions">
          <Link to={(primary && primary.to) || "/register"} className="btn btn-brand btn-lg">{(primary && primary.label) || "Start building free"}</Link>
          <Link to={(secondary && secondary.to) || "/contact"} className="btn btn-ghost btn-lg">{(secondary && secondary.label) || "Talk to us"}</Link>
        </div>
      </div>
    </section>
  )
}

export function Reveal({ children, className, delay }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || !("IntersectionObserver" in window)) {
      setShown(true)
      return undefined
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      }
    }, { threshold: 0.18 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={"reveal" + (shown ? " in" : "") + (className ? " " + className : "")} style={delay ? { transitionDelay: delay + "ms" } : undefined}>{children}</div>
}

export function Frame({ src, alt, url, className, children }) {
  return (
    <figure className={"frame" + (className ? " " + className : "")}>
      <div className="frame-bar">
        <span /><span /><span />
        <div className="frame-url mono">{url || "forkwiseai.com/app"}</div>
      </div>
      {src ? <img src={src} alt={alt || ""} loading="lazy" /> : children}
    </figure>
  )
}

function branchPaths(count, width, height, seed) {
  const paths = []
  let value = seed
  function random() {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
  const rootY = height * 0.5
  for (let i = 0; i < count; i += 1) {
    const endY = height * (0.08 + random() * 0.84)
    const startX = random() * width * 0.2
    const midX = width * (0.3 + random() * 0.25)
    const endX = width * (0.72 + random() * 0.26)
    const d = "M" + startX.toFixed(0) + " " + rootY.toFixed(0) + " C " + midX.toFixed(0) + " " + rootY.toFixed(0) + ", " + (midX + 40).toFixed(0) + " " + endY.toFixed(0) + ", " + endX.toFixed(0) + " " + endY.toFixed(0)
    paths.push({ d, x: endX, y: endY, verify: i === 0, delay: (i * 0.22).toFixed(2) })
  }
  return paths
}

export function BranchField({ quiet, count }) {
  const width = 1200
  const height = 520
  const paths = branchPaths(count || (quiet ? 9 : 14), width, height, quiet ? 7 : 21)
  return (
    <svg className={"branch-field" + (quiet ? " quiet" : "")} viewBox={"0 0 " + width + " " + height} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="bf-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8b7bff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#8b7bff" />
          <stop offset="1" stopColor="#1fa2ec" />
        </linearGradient>
      </defs>
      {paths.map((path, index) => (
        <g key={index}>
          <path d={path.d} className="bf-line" stroke="url(#bf-grad)" style={{ animationDelay: path.delay + "s" }} pathLength="1" />
          <circle cx={path.x} cy={path.y} r={path.verify ? 9 : 4.5} className={"bf-node" + (path.verify ? " verify" : "")} style={{ animationDelay: (Number(path.delay) + 1.1).toFixed(2) + "s" }} />
        </g>
      ))}
    </svg>
  )
}

export function Steps({ items }) {
  return (
    <ol className="steps">
      {items.map((item, index) => (
        <li key={item.title} className="step">
          <span className="step-node">{index + 1}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function FeatureGrid({ items, columns }) {
  return (
    <div className={"feature-grid cols-" + (columns || 3)}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div className="feature" key={item.title}>
            {Icon && <span className="feature-icon"><Icon size={19} /></span>}
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            {item.to && <Link to={item.to} className="text-link">{item.link || "Learn more"}</Link>}
          </div>
        )
      })}
    </div>
  )
}

export function SplitFeature({ title, text, points, image, alt, reverse, url, children }) {
  return (
    <div className={"split" + (reverse ? " reverse" : "")}>
      <div className="split-copy">
        <h3 className="display">{title}</h3>
        <p>{text}</p>
        {points && (
          <ul className="ticks">
            {points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        )}
      </div>
      <div className="split-art">
        {image ? <Frame src={image} alt={alt} url={url} /> : children}
      </div>
    </div>
  )
}
