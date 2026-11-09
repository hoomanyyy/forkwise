import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, BookOpen, Bot, Chrome, Code2, Cpu, Laptop, Menu, Newspaper, Rocket, Search, Sparkles, Wrench, X, Zap } from "lucide-react"
import { Prose, headings } from "../../components/site/Cover"
import { DOCS, DOC_GROUPS } from "../../content/docs"
import { LEGAL, POSTS, RELEASES } from "../../content/posts"
import { Cta, PageHero, Reveal, usePage } from "../ui"

const GROUP_ICONS = [Rocket, Bot, Sparkles, Laptop, Wrench, Code2]

function allDocs() {
  const list = []
  DOC_GROUPS.forEach((group) => group.slugs.forEach((slug) => {
    if (DOCS[slug]) list.push({ slug: slug, group: group.title, title: DOCS[slug].title, summary: DOCS[slug].summary })
  }))
  return list
}

function DocsNav({ current }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const needle = query.trim().toLowerCase()
  return (
    <aside className={"mk-docs-side" + (open ? " open" : "")}>
      <button type="button" className="mk-docs-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{current ? DOCS[current].title : "All guides"}{open ? <X size={18} /> : <Menu size={18} />}</button>
      <div className="mk-docs-nav">
        <label className="mk-docs-search"><Search size={15} /><input placeholder="Search the docs" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        {DOC_GROUPS.map((group) => {
          const items = group.slugs.filter((slug) => DOCS[slug] && (!needle || (DOCS[slug].title + " " + DOCS[slug].summary + " " + DOCS[slug].body).toLowerCase().includes(needle)))
          if (items.length === 0) return null
          return (
            <div className="mk-docs-group" key={group.title}>
              <div>{group.title}</div>
              {items.map((slug) => <Link key={slug} to={"/docs/" + slug} className={slug === current ? "on" : ""} onClick={() => setOpen(false)}>{DOCS[slug].title}</Link>)}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export function Docs() {
  usePage("Docs", "Guides for every part of Forkwise: the agent, projects, skills, the desktop app, Forkwise for Chrome and the API.")
  return (
    <>
      <PageHero kicker="Documentation" title="Learn Forkwise" lead="Short, practical guides for every feature, from your first message to the API." />
      <div className="mk-wrap" style={{ paddingBottom: 96 }}>
        <div className="mk-docs-home">
          {DOC_GROUPS.map((group, index) => {
            const Icon = GROUP_ICONS[index % GROUP_ICONS.length]
            return (
              <Reveal index={index % 3} className="mk-doc-card" key={group.title}>
                <span className="mk-tile"><Icon size={17} /></span>
                <h3>{group.title}</h3>
                <ul>{group.slugs.filter((slug) => DOCS[slug]).map((slug) => <li key={slug}><Link to={"/docs/" + slug}>{DOCS[slug].title}</Link></li>)}</ul>
              </Reveal>
            )
          })}
        </div>
      </div>
    </>
  )
}

export function DocPage() {
  const { slug } = useParams()
  const page = DOCS[slug]
  usePage(page ? page.title : "Docs", page ? page.summary : "")
  if (!page) return <Navigate to="/docs" replace />
  const list = allDocs()
  const index = list.findIndex((item) => item.slug === slug)
  const prev = index > 0 ? list[index - 1] : null
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null
  const toc = headings(page.body)
  return (
    <div className="mk-wrap mk-docs">
      <DocsNav current={slug} />
      <article className="mk-doc">
        <div className="mk-crumbs"><Link to="/docs">Docs</Link><span>/</span><span>{list[index] ? list[index].group : ""}</span></div>
        <h1>{page.title}</h1>
        <p className="summary">{page.summary}</p>
        <Prose text={page.body} />
        <div className="mk-pager">
          {prev && <Link to={"/docs/" + prev.slug}><small>Previous</small><b><ArrowLeft size={14} style={{ verticalAlign: -2 }} /> {prev.title}</b></Link>}
          {next && <Link to={"/docs/" + next.slug} className="next"><small>Next</small><b>{next.title} <ArrowRight size={14} style={{ verticalAlign: -2 }} /></b></Link>}
        </div>
      </article>
      <nav className="mk-toc" aria-label="On this page">
        {toc.length > 0 && <div>On this page</div>}
        {toc.map((item) => <a key={item.id} href={"#" + item.id}>{item.title}</a>)}
      </nav>
    </div>
  )
}

const ART = [
  ["#7c5cff", "#2fd4f0", "#ff7a52"],
  ["#4f8bff", "#3ee0a1", "#8b6cff"],
  ["#ff5b7a", "#ffc04d", "#7c5cff"],
  ["#2fd4f0", "#7c5cff", "#3ee0a1"],
  ["#ff8a4c", "#8b6cff", "#2fd4f0"],
]
const ART_ICONS = { Product: Rocket, Guide: BookOpen, Engineering: Cpu, Company: Newspaper, Release: Zap, Browser: Chrome }

function seedOf(text) {
  let value = 0
  for (let i = 0; i < text.length; i++) value = (value * 31 + text.charCodeAt(i)) % 9973
  return value
}

export function Art({ post }) {
  const seed = seedOf(post.slug)
  const colors = ART[seed % ART.length]
  const Icon = ART_ICONS[post.tag] || Sparkles
  return (
    <div className="mk-art" style={{ background: "linear-gradient(135deg, #0f1230, #1a1f4a)" }}>
      <div className="lines" />
      <div className="blob" style={{ width: "60%", height: "90%", left: (seed % 30) + "%", top: "-20%", background: colors[0] }} />
      <div className="blob" style={{ width: "50%", height: "80%", right: (seed % 20) + "%", bottom: "-30%", background: colors[1] }} />
      <div className="blob" style={{ width: "30%", height: "50%", left: "35%", top: "30%", background: colors[2], opacity: 0.6 }} />
      <div className="glyph"><Icon size={56} strokeWidth={1.4} /></div>
    </div>
  )
}

export function Blog() {
  usePage("Blog", "Product news, guides and engineering notes from the Forkwise team.")
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
        <p className="mk-lead" style={{ margin: 0 }}>{post.summary}</p>
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
  usePage("Changelog", "Every Forkwise release, newest first.")
  const labels = { new: "New", better: "Improved", fixed: "Fixed" }
  return (
    <>
      <PageHero kicker="Changelog" title="What's new in Forkwise" lead="Every release, newest first." />
      <div className="mk-wrap" style={{ paddingBottom: 96 }}>
        <div className="mk-timeline">
          {RELEASES.map((release, index) => (
            <Reveal index={0} className="mk-release" key={release.version}>
              <div className="mk-release-date"><b className={index === 0 ? "mk-grad" : ""}>{release.version}</b><span>{release.date}</span></div>
              <div className="mk-release-card">
                <h3>{release.title}</h3>
                <ul>{release.items.map((item) => <li key={item[1]}><span className={"mk-pill " + item[0]}>{labels[item[0]]}</span><span>{item[1]}</span></li>)}</ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <div className="mk" style={{ background: "transparent", minHeight: 0 }}><Cta /></div>
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
        <nav className="mk-toc" style={{ display: "block" }}>
          <div>On this page</div>
          {toc.map((item) => <a key={item.id} href={"#" + item.id}>{item.title}</a>)}
          <div style={{ marginTop: 20 }}>Legal</div>
          <Link to="/privacy" style={{ display: "block", padding: "5px 0 5px 12px" }}>Privacy policy</Link>
          <Link to="/terms" style={{ display: "block", padding: "5px 0 5px 12px" }}>Terms of service</Link>
        </nav>
        <article><Prose text={page.body} /></article>
      </div>
    </>
  )
}
