import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, NavLink, useParams } from "react-router-dom"
import { Search } from "lucide-react"
import { CtaBand, PageHero, Section, usePageTitle } from "../../components/site/parts"
import { Cover, Prose, headings } from "../../components/site/Cover"
import { DOCS, DOC_GROUPS, docOrder } from "../../content/docs"
import { POSTS, RELEASES } from "../../content/posts"

function DocsSide() {
  return (
    <aside className="docs-side">
      {DOC_GROUPS.map((group) => (
        <div key={group.title} className="docs-side-group">
          <div className="docs-side-title">{group.title}</div>
          {group.slugs.map((slug) => <NavLink key={slug} to={"/docs/" + slug}>{DOCS[slug].title}</NavLink>)}
        </div>
      ))}
    </aside>
  )
}

export function Docs() {
  usePageTitle("Documentation", "Guides for every part of Forkwise.")
  const [query, setQuery] = useState("")
  const results = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return []
    return docOrder().filter((slug) => (DOCS[slug].title + " " + DOCS[slug].body).toLowerCase().includes(text))
  }, [query])
  return (
    <>
      <PageHero
        kicker="Documentation"
        title="Learn Forkwise"
        lead="Everything from your first message to running Forkwise on your own server."
        actions={
          <div className="docs-search">
            <Search size={18} />
            <input className="input" placeholder="Search the docs" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        }
      />
      <section className="section tight">
        <div className="section-inner">
          {query.trim() && (
            <div className="list" style={{ marginBottom: 40 }}>
              {results.length === 0 && <p className="muted">No pages match "{query}".</p>}
              {results.map((slug) => (
                <Link key={slug} to={"/docs/" + slug} className="list-row"><strong>{DOCS[slug].title}</strong><span className="muted small">{DOCS[slug].summary}</span></Link>
              ))}
            </div>
          )}
          {DOC_GROUPS.map((group) => (
            <div key={group.title} style={{ marginBottom: 44 }}>
              <h2 className="display" style={{ fontSize: 22, marginBottom: 18 }}>{group.title}</h2>
              <div className="feature-grid cols-3">
                {group.slugs.map((slug) => (
                  <Link key={slug} to={"/docs/" + slug} className="feature" style={{ textDecoration: "none" }}>
                    <h3>{DOCS[slug].title}</h3>
                    <p>{DOCS[slug].summary}</p>
                    <span className="text-link">Read</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export function DocPage() {
  const { slug } = useParams()
  const doc = DOCS[slug]
  usePageTitle(doc ? doc.title + " — Docs" : "Docs", doc ? doc.summary : "")
  if (!doc) return <Navigate to="/docs" replace />
  const order = docOrder()
  const index = order.indexOf(slug)
  const previous = index > 0 ? order[index - 1] : null
  const next = index < order.length - 1 ? order[index + 1] : null
  const toc = headings(doc.body)
  return (
    <div className="docs-layout">
      <DocsSide />
      <article>
        <Link to="/docs" className="faint small" style={{ textDecoration: "none" }}>Docs</Link>
        <Prose text={"# " + doc.title + "\n\n" + doc.body} />
        <div className="doc-pager">
          {previous && <Link to={"/docs/" + previous}><small>Previous</small><strong>{DOCS[previous].title}</strong></Link>}
          {next && <Link className="next" to={"/docs/" + next}><small>Next</small><strong>{DOCS[next].title}</strong></Link>}
        </div>
      </article>
      <aside className="docs-toc">
        {toc.length > 0 && <div className="docs-toc-title">On this page</div>}
        {toc.map((item) => <a key={item.id} href={"#" + item.id}>{item.title}</a>)}
      </aside>
    </div>
  )
}

export function Blog() {
  usePageTitle("Blog", "Product news, engineering notes and guides from the Forkwise team.")
  const [first, ...rest] = POSTS
  return (
    <>
      <PageHero kicker="Blog" title="Notes from the Forkwise team" lead="Product news, how things work under the hood, and guides." />
      <section className="section tight">
        <div className="section-inner">
          <Link to={"/blog/" + first.slug} className="card" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", marginBottom: 24 }}>
            <div className="card-art" style={{ aspectRatio: "auto", minHeight: 300 }}><Cover seed={first.slug} colors={first.colors} /></div>
            <div className="card-body" style={{ padding: 36, justifyContent: "center" }}>
              <div className="card-meta"><span className="chip accent">{first.tag}</span>{first.date}</div>
              <h3 className="display" style={{ fontSize: 30, lineHeight: 1.1 }}>{first.title}</h3>
              <p style={{ flex: 0 }}>{first.summary}</p>
              <span className="text-link">Read the post</span>
            </div>
          </Link>
          <div className="card-grid">
            {rest.map((post) => (
              <Link key={post.slug} to={"/blog/" + post.slug} className="card">
                <div className="card-art"><Cover seed={post.slug} colors={post.colors} /></div>
                <div className="card-body">
                  <div className="card-meta"><span className="chip">{post.tag}</span>{post.minutes} min read</div>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}

export function BlogPost() {
  const { slug } = useParams()
  const post = POSTS.find((item) => item.slug === slug)
  usePageTitle(post ? post.title : "Blog", post ? post.summary : "")
  if (!post) return <Navigate to="/blog" replace />
  return (
    <>
      <header className="post-hero">
        <div className="card-meta"><Link to="/blog" className="chip">Blog</Link><span className="chip accent">{post.tag}</span>{post.date}, {post.minutes} min read</div>
        <h1 className="display">{post.title}</h1>
        <p className="lead">{post.summary}</p>
      </header>
      <div className="post-cover"><div className="card-art"><Cover seed={post.slug} colors={post.colors} /></div></div>
      <div className="post-body"><Prose text={post.body} /></div>
      <Section className="paper" title="Keep reading">
        <div className="card-grid">
          {POSTS.filter((item) => item.slug !== slug).slice(0, 3).map((item) => (
            <Link key={item.slug} to={"/blog/" + item.slug} className="card">
              <div className="card-art"><Cover seed={item.slug} colors={item.colors} /></div>
              <div className="card-body"><h3>{item.title}</h3></div>
            </Link>
          ))}
        </div>
      </Section>
    </>
  )
}

export function Changelog() {
  usePageTitle("Changelog", "Every Forkwise release and what changed.")
  const labels = { new: "New", better: "Improved", fixed: "Fixed" }
  return (
    <>
      <PageHero kicker="Changelog" title="What's new in Forkwise" lead="Every release, newest first." />
      <section className="section tight">
        <div className="section-inner">
          <div className="timeline">
            {RELEASES.map((release) => (
              <div key={release.version} className="release">
                <div className="release-head"><h2>{release.version}</h2><span className="chip">{release.date}</span></div>
                <strong style={{ fontSize: 18 }}>{release.title}</strong>
                <ul className="release-items">
                  {release.items.map((item) => <li key={item[1]}><span className={"release-tag " + item[0]}>{labels[item[0]]}</span><span>{item[1]}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
