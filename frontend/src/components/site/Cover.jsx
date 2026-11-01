import { useId } from "react"
import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function seeded(text) {
  let value = 0
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) % 233280
  return function next() {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

export function Cover({ seed, colors, label }) {
  const id = useId().replace(/:/g, "")
  const random = seeded(seed || "forkwise")
  const first = (colors && colors[0]) || "#6e5cff"
  const second = (colors && colors[1]) || "#1fa2ec"
  const lines = []
  const rootY = 100 + random() * 120
  for (let i = 0; i < 7; i += 1) {
    const endY = 30 + random() * 300
    const midX = 220 + random() * 140
    lines.push({ d: "M -10 " + rootY.toFixed(0) + " C " + midX.toFixed(0) + " " + rootY.toFixed(0) + ", " + (midX + 60).toFixed(0) + " " + endY.toFixed(0) + ", 640 " + endY.toFixed(0), y: endY })
  }
  return (
    <div className="cover">
      <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={"c" + id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={first} />
            <stop offset="1" stopColor={second} />
          </linearGradient>
          <radialGradient id={"r" + id} cx="0.8" cy="0.1" r="0.9">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="640" height="360" fill={"url(#c" + id + ")"} />
        <rect width="640" height="360" fill={"url(#r" + id + ")"} />
        {lines.map((line, index) => (
          <g key={index}>
            <path d={line.d} fill="none" stroke="#ffffff" strokeOpacity={index === 0 ? 0.9 : 0.28} strokeWidth={index === 0 ? 3 : 1.6} />
            <circle cx="560" cy={line.y} r={index === 0 ? 9 : 4} fill={index === 0 ? "#4ade80" : "#ffffff"} fillOpacity={index === 0 ? 1 : 0.6} transform={"translate(" + (index * 9) + " 0)"} />
          </g>
        ))}
      </svg>
      {label && <span className="cover-label">{label}</span>}
    </div>
  )
}

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function textOf(node) {
  if (node == null) return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (node.props) return textOf(node.props.children)
  return ""
}

function Heading({ children }) {
  return <h2 id={slug(textOf(children))}>{children}</h2>
}

function SmartLink({ href, children }) {
  if (href && href.startsWith("/")) return <Link to={href}>{children}</Link>
  return <a href={href} target="_blank" rel="noreferrer">{children}</a>
}

const PROSE = { h2: Heading, a: SmartLink }

export function Prose({ text }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE}>{text}</ReactMarkdown>
    </div>
  )
}

export function headings(text) {
  const found = []
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      const title = line.slice(3).trim()
      found.push({ title, id: slug(title) })
    }
  }
  return found
}
