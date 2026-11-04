import { Link } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const LINE = "var(--text-3)"
const INK = "var(--text)"
const PANEL = "var(--bg-raised)"
const EDGE = "var(--line-strong)"
const GREEN = "#4ade80"

function Fork() {
  const paths = [
    "M 120 180 C 230 180, 250 70, 360 70",
    "M 120 180 C 230 180, 260 125, 360 125",
    "M 120 180 L 360 180",
    "M 120 180 C 230 180, 260 235, 360 235",
    "M 120 180 C 230 180, 250 290, 360 290",
  ]
  return (
    <g>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={i === 2 ? INK : LINE} strokeWidth={i === 2 ? 3 : 1.6} strokeOpacity={i === 2 ? 1 : 0.7} className="cv-draw" style={{ animationDelay: i * 90 + "ms" }} />
      ))}
      <circle cx="120" cy="180" r="12" fill={INK} />
      {[70, 125, 235, 290].map((y) => <circle key={y} cx="372" cy={y} r="7" fill={PANEL} stroke={LINE} strokeWidth="1.6" />)}
      <circle cx="372" cy="180" r="14" fill={GREEN} />
      <path d="M 366 180 l 5 5 l 9 -10" fill="none" stroke="#0b0e1f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="430" y="150" width="120" height="12" rx="6" fill={LINE} fillOpacity="0.35" />
      <rect x="430" y="174" width="84" height="12" rx="6" fill={LINE} fillOpacity="0.2" />
    </g>
  )
}

function Window() {
  return (
    <g>
      <rect x="70" y="40" width="500" height="280" rx="16" fill={PANEL} stroke={EDGE} />
      <line x1="70" y1="78" x2="570" y2="78" stroke={EDGE} />
      {[92, 112, 132].map((x) => <circle key={x} cx={x} cy="59" r="5" fill={LINE} fillOpacity="0.5" />)}
      <rect x="190" y="50" width="240" height="18" rx="9" fill={LINE} fillOpacity="0.18" />
      <line x1="230" y1="78" x2="230" y2="320" stroke={EDGE} />
      {[104, 132, 160, 188].map((y, i) => <rect key={y} x="90" y={y} width={i === 1 ? 110 : 90} height="12" rx="6" fill={i === 1 ? INK : LINE} fillOpacity={i === 1 ? 0.9 : 0.3} />)}
      <rect x="254" y="104" width="190" height="14" rx="7" fill={INK} fillOpacity="0.85" />
      <rect x="254" y="132" width="270" height="10" rx="5" fill={LINE} fillOpacity="0.35" />
      <rect x="254" y="152" width="230" height="10" rx="5" fill={LINE} fillOpacity="0.25" />
      <rect x="254" y="190" width="270" height="100" rx="10" fill="none" stroke={EDGE} />
      <rect x="270" y="208" width="120" height="9" rx="4.5" fill={GREEN} fillOpacity="0.85" />
      <rect x="270" y="228" width="190" height="9" rx="4.5" fill={LINE} fillOpacity="0.3" />
      <rect x="270" y="248" width="150" height="9" rx="4.5" fill={LINE} fillOpacity="0.3" />
    </g>
  )
}

function Decide() {
  return (
    <g>
      <rect x="60" y="150" width="110" height="60" rx="14" fill={PANEL} stroke={EDGE} />
      <rect x="78" y="174" width="74" height="10" rx="5" fill={LINE} fillOpacity="0.4" />
      <path d="M 170 180 L 250 180" stroke={LINE} strokeWidth="1.6" className="cv-draw" />
      <path d="M 250 180 L 300 130 L 350 180 L 300 230 Z" fill={PANEL} stroke={INK} strokeWidth="2" />
      <path d="M 350 180 C 400 180, 410 80, 470 80" fill="none" stroke={LINE} strokeWidth="1.6" className="cv-draw" />
      <path d="M 350 180 L 470 180" fill="none" stroke={INK} strokeWidth="2.4" className="cv-draw" />
      <path d="M 350 180 C 400 180, 410 280, 470 280" fill="none" stroke={LINE} strokeWidth="1.6" className="cv-draw" />
      {[80, 280].map((y) => <rect key={y} x="470" y={y - 20} width="100" height="40" rx="12" fill={PANEL} stroke={EDGE} />)}
      <rect x="470" y="160" width="100" height="40" rx="12" fill={INK} />
      <circle cx="490" cy="180" r="6" fill={GREEN} />
      <rect x="504" y="175" width="50" height="9" rx="4.5" fill="var(--bg)" fillOpacity="0.7" />
    </g>
  )
}

function Tools() {
  const tiles = []
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      tiles.push({ x: 90 + col * 90, y: 60 + row * 90, key: row * 5 + col })
    }
  }
  return (
    <g>
      {tiles.map((tile) => {
        const live = tile.key === 7
        return (
          <g key={tile.key}>
            <rect x={tile.x} y={tile.y} width="70" height="70" rx="14" fill={live ? INK : PANEL} stroke={live ? INK : EDGE} strokeDasharray={tile.key === 12 ? "5 5" : undefined} />
            {tile.key === 12 ? null : <rect x={tile.x + 16} y={tile.y + 20} width="38" height="8" rx="4" fill={live ? "var(--bg)" : LINE} fillOpacity={live ? 0.8 : 0.35} />}
            {tile.key === 12 ? null : <rect x={tile.x + 16} y={tile.y + 38} width="24" height="8" rx="4" fill={live ? "var(--bg)" : LINE} fillOpacity={live ? 0.5 : 0.2} />}
          </g>
        )
      })}
      <circle cx="420" cy="175" r="9" fill={GREEN} />
      <text x="396" y="212" fill={LINE} fontSize="14" fontFamily="monospace">+</text>
    </g>
  )
}

function Merge() {
  const ys = [50, 110, 170, 230, 290]
  return (
    <g>
      {ys.map((y, i) => (
        <g key={y}>
          <circle cx="90" cy={y + 10} r="9" fill={PANEL} stroke={LINE} strokeWidth="1.6" />
          <path d={"M 99 " + (y + 10) + " C 250 " + (y + 10) + ", 300 180, 440 180"} fill="none" stroke={LINE} strokeWidth="1.5" strokeOpacity="0.6" className="cv-draw" style={{ animationDelay: i * 80 + "ms" }} />
        </g>
      ))}
      <circle cx="450" cy="180" r="26" fill={INK} />
      <path d="M 438 181 l 9 9 l 17 -19" fill="none" stroke="var(--bg)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="500" y="170" width="70" height="10" rx="5" fill={LINE} fillOpacity="0.35" />
    </g>
  )
}

const ARTS = { fork: Fork, window: Window, decide: Decide, tools: Tools, merge: Merge }
const ART_NAMES = ["fork", "window", "decide", "tools", "merge"]

function pick(seed) {
  let value = 0
  const text = String(seed || "forkwise")
  for (let i = 0; i < text.length; i += 1) value = (value * 31 + text.charCodeAt(i)) % 9973
  return ART_NAMES[value % ART_NAMES.length]
}

export function Cover({ seed, art, label }) {
  const name = art && ARTS[art] ? art : pick(seed)
  const Art = ARTS[name]
  return (
    <div className="cover">
      <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <Art />
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
