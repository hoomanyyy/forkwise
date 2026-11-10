import { useEffect, useMemo, useRef, useState } from "react"
import { Link, Navigate, NavLink, useLocation, useNavigate, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowLeft, ArrowRight, BookOpen, Bot, Check, ChevronRight, Chrome, Code2, Copy, Cpu, Menu, Newspaper, Rocket, Search, Sparkles, X, Zap } from "lucide-react"
import { Prose, headings } from "../../components/site/Cover"
import { DOCS, DOC_GROUPS } from "../../content/docs"
import { LEGAL, POSTS, RELEASES } from "../../content/posts"
import { Cta, MkLogo, PageHero, Reveal, usePage, useSeo } from "../ui"
import { useStore } from "../../lib/store"

function allDocs() {
  const list = []
  DOC_GROUPS.forEach((group) => group.slugs.forEach((slug) => {
    if (DOCS[slug]) list.push({ slug: slug, group: group.title, title: DOCS[slug].title, summary: DOCS[slug].summary, body: DOCS[slug].body })
  }))
  return list
}

function slugOf(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function textOf(node) {
  if (node == null) return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (node.props) return textOf(node.props.children)
  return ""
}

function H2({ children }) {
  return <h2 id={slugOf(textOf(children))}>{children}</h2>
}

function H3({ children }) {
  return <h3 id={slugOf(textOf(children))}>{children}</h3>
}

function DocLink({ href, children }) {
  if (href && href.startsWith("/")) return <Link to={href}>{children}</Link>
  if (href && href.startsWith("#")) return <a href={href}>{children}</a>
  return <a href={href} target="_blank" rel="noreferrer">{children}</a>
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false)
  const child = Array.isArray(children) ? children[0] : children
  const className = child && child.props ? child.props.className || "" : ""
  const language = className.replace("language-", "") || "text"
  const code = textOf(child).replace(/\n$/, "")
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className="dx-pre">
      <div className="dx-pre-head"><span>{language}</span><button type="button" onClick={copy} aria-label="Copy code">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button></div>
      <pre>{children}</pre>
    </div>
  )
}

const DOC_PARTS = { h2: H2, h3: H3, a: DocLink, pre: CodeBlock }

function DocProse({ text }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={DOC_PARTS}>{text}</ReactMarkdown>
    </div>
  )
}

function snippet(body, needle) {
  const plain = body.replace(/[#*`>|_[\]()]/g, " ").replace(/\s+/g, " ")
  const at = plain.toLowerCase().indexOf(needle)
  if (at === -1) return ""
  const from = Math.max(0, at - 50)
  return (from > 0 ? "…" : "") + plain.slice(from, at + 90).trim() + "…"
}

function SearchDialog({ onClose }) {
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const input = useRef(null)
  const list = useMemo(allDocs, [])
  const needle = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!needle) return list.slice(0, 8).map((item) => ({ item: item, text: item.summary }))
    const found = []
    list.forEach((item) => {
      const inTitle = item.title.toLowerCase().includes(needle)
      const inSummary = item.summary.toLowerCase().includes(needle)
      const inBody = item.body.toLowerCase().includes(needle)
      if (inTitle || inSummary) found.push({ item: item, text: item.summary, rank: inTitle ? 0 : 1 })
      else if (inBody) found.push({ item: item, text: snippet(item.body, needle), rank: 2 })
    })
    found.sort((a, b) => a.rank - b.rank)
    return found.slice(0, 12)
  }, [needle, list])

  useEffect(() => {
    if (input.current) input.current.focus()
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    setActive(0)
  }, [needle])

  function go(item) {
    onClose()
    navigate("/docs/" + item.slug)
  }

  function onKey(event) {
    if (event.key === "Escape") onClose()
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive(Math.min(active + 1, results.length - 1))
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive(Math.max(active - 1, 0))
    }
    if (event.key === "Enter" && results[active]) go(results[active].item)
  }

  return (
    <div className="dx-dialog" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="dx-dialog-box" role="dialog" aria-label="Search the docs">
        <div className="dx-dialog-input">
          <Search size={17} />
          <input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKey} placeholder="Search the docs" aria-label="Search the docs" />
          <span className="dx-kbd">Esc</span>
        </div>
        <div className="dx-results">
          {results.length === 0 && <div className="dx-empty">No results for “{query}”</div>}
          {results.map((row, index) => (
            <a key={row.item.slug} href={"/docs/" + row.item.slug} className={index === active ? "on" : ""} onMouseEnter={() => setActive(index)} onClick={(event) => { event.preventDefault(); go(row.item) }}>
              <strong>{row.item.title}<small>{row.item.group}</small></strong>
              {row.text && <span>{row.text}</span>}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function DocsSide({ current, open }) {
  return (
    <aside className={"dx-side" + (open ? " open" : "")} aria-label="Docs">
      <div className="dx-group">
        <Link to="/docs" className={current === "" ? "on" : ""}>Overview</Link>
      </div>
      {DOC_GROUPS.map((group) => (
        <div className="dx-group" key={group.title}>
          <div>{group.title}</div>
          {group.slugs.filter((slug) => DOCS[slug]).map((slug) => <Link key={slug} to={"/docs/" + slug} className={slug === current ? "on" : ""}>{DOCS[slug].title}</Link>)}
        </div>
      ))}
    </aside>
  )
}

function DocsChrome({ current, wide, children }) {
  const { user } = useStore()
  const [searching, setSearching] = useState(false)
  const [menu, setMenu] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenu(false)
  }, [location.pathname])

  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearching(true)
      }
      if (event.key === "/" && !searching && document.activeElement && ["INPUT", "TEXTAREA"].indexOf(document.activeElement.tagName) === -1) {
        event.preventDefault()
        setSearching(true)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [searching])

  const mac = typeof navigator !== "undefined" && navigator.platform && navigator.platform.indexOf("Mac") !== -1
  return (
    <>
      <header className="dx-head">
        <div className="dx-head-in">
          <button type="button" className="dx-menu" aria-label={menu ? "Close menu" : "Open menu"} onClick={() => setMenu(!menu)}>{menu ? <X size={19} /> : <Menu size={19} />}</button>
          <Link to="/docs" className="dx-brand" aria-label="Forkwise docs"><MkLogo /><em>Docs</em></Link>
          <button type="button" className="dx-search-btn" onClick={() => setSearching(true)} aria-label="Search the docs"><Search size={15} /><span>Search the docs</span><i className="dx-kbd" style={{ fontStyle: "normal" }}>{mac ? "⌘K" : "Ctrl K"}</i></button>
          <nav className="dx-links">
            <NavLink to="/docs/api" className="hide-sm">API</NavLink>
            <NavLink to="/changelog" className="hide-sm">Changelog</NavLink>
            <Link to="/" className="hide-sm">Forkwise.com</Link>
            <Link to={user ? "/app" : "/register"} className="mk-btn go sm">{user ? "Open Forkwise" : "Get started"}</Link>
          </nav>
        </div>
      </header>
      <div className={"dx" + (wide ? " wide" : "")}>
        <DocsSide current={current} open={menu} />
        {children}
      </div>
      <footer className="dx-footer">
        <div className="dx-footer-in">
          <span>© {new Date().getFullYear()} Forkwise AI</span>
          <div>
            <Link to="/">Home</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/security">Security</Link>
            <Link to="/contact?topic=Support">Support</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
      {searching && <SearchDialog onClose={() => setSearching(false)} />}
    </>
  )
}

const QUICK = [
  { to: "/docs/getting-started", icon: Rocket, title: "Get started", text: "Your first project in a few minutes." },
  { to: "/docs/finishing-projects", icon: Check, title: "How projects are finished", text: "Planning, structure and the automatic review." },
  { to: "/docs/api", icon: Code2, title: "API reference", text: "Keys, endpoints and live events." },
  { to: "/docs/desktop-app", icon: Cpu, title: "Desktop app", text: "Your folders and your terminal." },
  { to: "/docs/connectors", icon: Chrome, title: "Connectors (MCP)", text: "Reach your own tools and data." },
  { to: "/docs/skills", icon: Sparkles, title: "Skills", text: "24 built in playbooks, and your own." },
]

export function Docs() {
  useSeo("/docs")
  const [searching, setSearching] = useState(false)
  return (
    <DocsChrome current="" wide>
      <main className="dx-main">
        <div className="dx-home-hero">
          <h1>Forkwise documentation</h1>
          <p>Short, practical guides for every feature, from your first message to the API.</p>
          <button type="button" className="dx-search-btn dx-big-search" onClick={() => setSearching(true)}><Search size={16} /><span>Search guides, features and API</span></button>
        </div>
        <div className="dx-quick">
          {QUICK.map((item) => {
            const Icon = item.icon
            return (
              <Link to={item.to} key={item.to}>
                <span className="mk-tile"><Icon size={16} /></span>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </Link>
            )
          })}
        </div>
        <div className="dx-sections">
          {DOC_GROUPS.map((group) => (
            <section key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.slugs.filter((slug) => DOCS[slug]).map((slug) => <li key={slug}><Link to={"/docs/" + slug}>{DOCS[slug].title}<span>{DOCS[slug].summary}</span></Link></li>)}
              </ul>
            </section>
          ))}
        </div>
      </main>
      {searching && <SearchDialog onClose={() => setSearching(false)} />}
    </DocsChrome>
  )
}

function useActiveHeading(ids) {
  const [active, setActive] = useState("")
  useEffect(() => {
    function onScroll() {
      let current = ""
      for (const id of ids) {
        const node = document.getElementById(id)
        if (node && node.getBoundingClientRect().top < 120) current = id
      }
      setActive(current || (ids.length > 0 ? ids[0] : ""))
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [ids])
  return active
}

export function DocPage() {
  const { slug } = useParams()
  const page = DOCS[slug]
  usePage(page ? page.title : "Docs", page ? page.summary : "")
  const toc = useMemo(() => (page ? headings(page.body) : []), [page])
  const ids = useMemo(() => toc.map((item) => item.id), [toc])
  const active = useActiveHeading(ids)
  if (!page) return <Navigate to="/docs" replace />
  const list = allDocs()
  const index = list.findIndex((item) => item.slug === slug)
  const prev = index > 0 ? list[index - 1] : null
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null
  return (
    <DocsChrome current={slug}>
      <main className="dx-main" key={slug}>
        <article className="dx-article">
          <div className="dx-crumbs"><Link to="/docs">Docs</Link><ChevronRight size={13} /><span>{list[index] ? list[index].group : ""}</span></div>
          <h1>{page.title}</h1>
          <p className="dx-summary">{page.summary}</p>
          <DocProse text={page.body} />
        </article>
        <div className="dx-foot">
          <div className="dx-pager">
            {prev && <Link to={"/docs/" + prev.slug}><small>Previous</small><b><ArrowLeft size={14} />{prev.title}</b></Link>}
            {next && <Link to={"/docs/" + next.slug} className="next"><small>Next</small><b>{next.title}<ArrowRight size={14} /></b></Link>}
          </div>
          <div className="dx-help">
            <span>Still stuck? A person on the team will help.</span>
            <Link to="/contact?topic=Support">Contact support</Link>
          </div>
        </div>
      </main>
      <nav className="dx-toc" aria-label="On this page">
        {toc.length > 0 && <div>On this page</div>}
        {toc.map((item) => <a key={item.id} href={"#" + item.id} className={item.id === active ? "on" : ""}>{item.title}</a>)}
      </nav>
    </DocsChrome>
  )
}

const ART_ICONS = { Product: Rocket, Guide: BookOpen, Engineering: Cpu, Company: Newspaper, Release: Zap, Browser: Chrome }

function seedOf(text) {
  let value = 0
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) % 9973
  return value
}

export function Art({ post }) {
  const seed = seedOf(post.slug)
  const Icon = ART_ICONS[post.tag] || Bot
  return (
    <div className="mk-art">
      <div className="lines" />
      <span className="dot" style={{ left: 18 + (seed % 60) + "%", top: 18 + (seed % 23) + "%" }} />
      <div className="glyph"><span><Icon size={30} strokeWidth={1.6} /></span></div>
      <span className="label">{post.tag.toLowerCase()} · {post.date}</span>
    </div>
  )
}

export function Blog() {
  useSeo("/blog")
  const [tag, setTag] = useState("All")
  const tags = ["All"].concat(Array.from(new Set(POSTS.map((post) => post.tag))))
  const shown = POSTS.filter((post) => tag === "All" || post.tag === tag)
  return (
    <>
      <PageHero kicker="Blog" title="Notes from the Forkwise team" lead="What we ship, how it works, and how to get the most out of an AI engineer." />
      <div className="mk-wrap" style={{ paddingBottom: 96 }}>
        <div className="mk-filter">{tags.map((item) => <button type="button" key={item} className={tag === item ? "on" : ""} onClick={() => setTag(item)}>{item}</button>)}</div>
        <div className="mk-posts">
          {shown.map((post, index) => (
            <Reveal index={index % 3} key={post.slug} className={"mk-post" + (index === 0 && tag === "All" ? " wide" : "")} as={Link} to={"/blog/" + post.slug}>
              <Art post={post} />
              <div className="mk-post-body">
                <div className="mk-post-meta"><span className="mk-tag">{post.tag}</span><span>{post.date}</span><span>{post.minutes} min read</span></div>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  )
}

function useProgress() {
  const [value, setValue] = useState(0)
  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setValue(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return value
}

export function BlogPost() {
  const { slug } = useParams()
  const post = POSTS.find((item) => item.slug === slug)
  usePage(post ? post.title : "Blog", post ? post.summary : "")
  const progress = useProgress()
  const more = useMemo(() => POSTS.filter((item) => item.slug !== slug).slice(0, 3), [slug])
  if (!post) return <Navigate to="/blog" replace />
  return (
    <>
      <div className="mk-progress" style={{ width: "100%", transform: "scaleX(" + progress + ")" }} />
      <header className="mk-article-head">
        <Link to="/blog" className="mk-crumbs"><ArrowLeft size={14} />All posts</Link>
        <div className="mk-post-meta" style={{ justifyContent: "center" }}><span className="mk-tag">{post.tag}</span><span>{post.date}</span><span>{post.minutes} min read</span></div>
        <h1>{post.title}</h1>
        <p className="mk-lead">{post.summary}</p>
      </header>
      <div className="mk-article-cover"><Art post={post} /></div>
      <article className="mk-article"><Prose text={post.body} /></article>
      <div className="mk-wrap" style={{ paddingBottom: 96 }}>
        <h2 className="mk-h3" style={{ marginBottom: 18 }}>Keep reading</h2>
        <div className="mk-posts">
          {more.map((item) => (
            <Link key={item.slug} to={"/blog/" + item.slug} className="mk-post">
              <Art post={item} />
              <div className="mk-post-body"><div className="mk-post-meta"><span className="mk-tag">{item.tag}</span><span>{item.date}</span></div><h3>{item.title}</h3></div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

export function Changelog() {
  useSeo("/changelog")
  const labels = { new: "New", better: "Improved", fixed: "Fixed" }
  return (
    <>
      <PageHero kicker="Changelog" title="What's new in Forkwise" lead="Every release, newest first." />
      <div className="mk-wrap" style={{ paddingBottom: 72 }}>
        <div className="mk-timeline">
          {RELEASES.map((release) => (
            <Reveal className="mk-release" key={release.version}>
              <div className="mk-release-date"><b>{release.version}</b><span>{release.date}</span></div>
              <div className="mk-release-card">
                <h3>{release.title}</h3>
                <ul>{release.items.map((item) => <li key={item[1]}><span className={"mk-pill " + item[0]}>{labels[item[0]]}</span><span>{item[1]}</span></li>)}</ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <Cta />
    </>
  )
}

export function Legal({ kind }) {
  const page = LEGAL[kind]
  usePage(page.title, "")
  const toc = headings(page.body)
  return (
    <>
      <PageHero kicker="Legal" title={page.title} lead={"Last updated " + page.updated + "."} />
      <div className="mk-wrap mk-legal">
        <nav className="mk-toc">
          <div>On this page</div>
          {toc.map((item) => <a key={item.id} href={"#" + item.id}>{item.title}</a>)}
          <div style={{ marginTop: 20 }}>Legal</div>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms of service</Link>
        </nav>
        <article><Prose text={page.body} /></article>
      </div>
    </>
  )
}
