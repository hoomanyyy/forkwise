import React, { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { FaSearch, FaArrowRight, FaRocket, FaChartLine, FaCogs } from "react-icons/fa"
import SiteLayout, { PageHero, Crumbs } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"
import NotFound from "../NotFound"
import DOCS from "../../data/docs"

function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function groupNames() {
    const groups = []
    for (const doc of DOCS) {
        if (!groups.includes(doc.group)) {
            groups.push(doc.group)
        }
    }
    return groups
}

function Block({ block }) {
    if (block.type === "h2") {
        return <h2 id={slugify(block.text)}>{block.text}</h2>
    }
    if (block.type === "p") {
        return <p>{block.text}</p>
    }
    if (block.type === "list") {
        return <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
    }
    if (block.type === "callout") {
        return <div className="prose-callout">{block.text}</div>
    }
    if (block.type === "code") {
        return <pre className="prose-code">{block.text}</pre>
    }
    if (block.type === "table") {
        return (
            <div className="prose-table">
                <table>
                    <thead><tr>{block.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                        {block.rows.map((row) => (
                            <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }
    return null
}

function DocsSide({ current }) {
    const [search, setSearch] = useState("")
    const word = search.trim().toLowerCase()
    return (
        <aside className="docs-side">
            <div className="fw-input-icon docs-search">
                <FaSearch />
                <input className="fw-input" placeholder="Search docs" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search docs" />
            </div>
            {groupNames().map((group) => {
                const items = DOCS.filter((d) => d.group === group && (d.title + " " + d.summary).toLowerCase().includes(word))
                if (items.length === 0) {
                    return null
                }
                return (
                    <div className="docs-group" key={group}>
                        <p>{group}</p>
                        {items.map((d) => (
                            <Link key={d.slug} to={"/docs/" + d.slug} className={current === d.slug ? "docs-on" : ""}>{d.title}</Link>
                        ))}
                    </div>
                )
            })}
        </aside>
    )
}

function DocsHome() {
    const icons = { "Getting started": FaRocket, "Results": FaChartLine, "Platform": FaCogs }
    return (
        <SiteLayout>
            <Seo title="Forkwise Documentation" description="Guides for every step of a Forkwise run: preparing data, writing questions, verdict rules, reading results, the Assistant, export and plans." path="/docs" />
            <PageHero eyebrow="Documentation" title="Everything about how Forkwise works" lead="Short guides for every step of a run, from your first upload to reading the specification curve." />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap" style={{ display: "grid", gap: 40 }}>
                    {groupNames().map((group) => {
                        const Icon = icons[group] || FaRocket
                        return (
                            <div key={group} style={{ display: "grid", gap: 16 }}>
                                <p className="fw-eyebrow"><Icon /> {group}</p>
                                <div className={DOCS.filter((d) => d.group === group).length === 4 ? "mk-grid-4" : "mk-grid-3"}>
                                    {DOCS.filter((d) => d.group === group).map((d) => (
                                        <Link key={d.slug} to={"/docs/" + d.slug} className="mk-card">
                                            <h3 className="mk-h3">{d.title}</h3>
                                            <p>{d.summary}</p>
                                            <span className="mk-card-more">Read <FaArrowRight style={{ fontSize: 11 }} /></span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        </SiteLayout>
    )
}

export default function Docs() {
    const { slug } = useParams()
    if (!slug) {
        return <DocsHome />
    }
    const index = DOCS.findIndex((d) => d.slug === slug)
    if (index === -1) {
        return <NotFound />
    }
    const doc = DOCS[index]
    const prev = index > 0 ? DOCS[index - 1] : null
    const next = index < DOCS.length - 1 ? DOCS[index + 1] : null
    const headings = doc.blocks.filter((b) => b.type === "h2")

    return (
        <SiteLayout footerCta={false}>
            <Seo title={doc.title + " | Forkwise Docs"} description={doc.summary} path={"/docs/" + doc.slug} />
            <div className="mk-wrap">
                <div className="docs">
                    <DocsSide current={doc.slug} />
                    <article className="prose">
                        <Crumbs items={[{ label: "Docs", to: "/docs" }, { label: doc.group }, { label: doc.title }]} />
                        <h1>{doc.title}</h1>
                        <p className="prose-lead">{doc.summary}</p>
                        {doc.blocks.map((block, i) => <Block key={i} block={block} />)}
                        <div className="prose-next">
                            {prev ? <Link to={"/docs/" + prev.slug}><small>Previous</small>{prev.title}</Link> : <span></span>}
                            {next ? <Link to={"/docs/" + next.slug} style={{ textAlign: "right" }}><small>Next</small>{next.title}</Link> : <span></span>}
                        </div>
                    </article>
                    <nav className="docs-toc" aria-label="On this page">
                        {headings.length > 0 && <p>On this page</p>}
                        {headings.map((h) => <a key={h.text} href={"#" + slugify(h.text)}>{h.text}</a>)}
                        <Link to="/contact" style={{ marginTop: 16, color: "var(--accent-2)" }}>Something unclear? Ask us</Link>
                    </nav>
                </div>
            </div>
        </SiteLayout>
    )
}
