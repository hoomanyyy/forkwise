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

const REVEAL = ".release, .release-items li, .card-grid .card, .feature-grid .feature, .prose > h2, .prose > p, .prose > ul, .prose > pre, .prose > table, .prose > blockquote, .docs-group, .post-hero > *, .price-card, .faq-item, .download-card"

function useReveal(path) {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return undefined
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined
    const nodes = Array.from(document.querySelectorAll(REVEAL))
    const seen = new Map()
    nodes.forEach((node) => {
      const parent = node.parentElement
      const index = seen.get(parent) || 0
      seen.set(parent, index + 1)
      node.style.setProperty("--rv-i", String(Math.min(index, 8)))
      node.setAttribute("data-rv", "0")
    })
    const watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-rv", "1")
          watcher.unobserve(entry.target)
        }
      })
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 })
    nodes.forEach((node) => watcher.observe(node))
    return () => watcher.disconnect()
  }, [path])
}

export function SiteLayout() {
  const location = useLocation()
  useReveal(location.pathname)
  useEffect(() => {
    document.documentElement.dataset.theme = "dark"
  }, [])
  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0)
  }, [location.pathname, location.hash])
  return (
    <div className="site">
      <SiteHeader />
      <main className="site-main" key={location.pathname}><Outlet /></main>
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

export function Frame({ src, alt, url, className, children, priority }) {
  return (
    <figure className={"frame" + (className ? " " + className : "")}>
      <div className="frame-bar">
        <span /><span /><span />
        <div className="frame-url mono">{url || "forkwiseai.com/app"}</div>
      </div>
      {src ? <img src={src} alt={alt || ""} width="1440" height="880" decoding="async" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} /> : children}
    </figure>
  )
}

export function BranchField() {
  return null
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
