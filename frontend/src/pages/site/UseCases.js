import React, { useState } from "react"
import { Link } from "react-router-dom"
import { FaSearch, FaArrowRight, FaDownload } from "react-icons/fa"
import SiteLayout, { PageHero } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"
import TEMPLATES, { templateLink } from "../../data/templates"
import SOLUTIONS from "../../data/solutions"

export default function UseCases() {
    const [category, setCategory] = useState("All")
    const [search, setSearch] = useState("")

    const categories = ["All"]
    for (const t of TEMPLATES) {
        if (!categories.includes(t.category)) {
            categories.push(t.category)
        }
    }
    const word = search.trim().toLowerCase()
    const shown = TEMPLATES.filter((t) => (category === "All" || t.category === category) && (t.title + " " + t.text).toLowerCase().includes(word))

    return (
        <SiteLayout>
            <Seo
                title="Forkwise Use Cases: Questions You Can Test With Many AI Analysts"
                description="Education, health, economics, business and society: real questions you can test for robustness with Forkwise, with two free sample datasets."
                path="/use-cases"
            />
            <PageHero eyebrow="Use cases" title="Questions people test with Forkwise" lead="Any question with one outcome and one main variable in a table of numbers. Pick one to start, then upload your own data." />

            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    <div className="mk-grid-4" style={{ marginBottom: 40 }}>
                        {SOLUTIONS.map((s) => (
                            <Link key={s.slug} to={"/solutions/" + s.slug} className="mk-card" style={{ padding: 20 }}>
                                <span className="mk-card-icon"><s.icon /></span>
                                <b style={{ color: "#fff", fontWeight: 600 }}>For {s.name.toLowerCase()}</b>
                                <p style={{ fontSize: 13.5 }}>{s.short}</p>
                            </Link>
                        ))}
                    </div>

                    <div className="mk-filter-row">
                        <div className="fw-chips">
                            {categories.map((c) => (
                                <button key={c} className={category === c ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setCategory(c)}>{c}</button>
                            ))}
                        </div>
                        <div className="fw-input-icon mk-search">
                            <FaSearch />
                            <input className="fw-input" placeholder="Search use cases" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search use cases" />
                        </div>
                    </div>

                    {shown.length === 0 ? (
                        <p className="fw-muted">No use case matches your search.</p>
                    ) : (
                        <div className="mk-grid-3">
                            {shown.map((t) => (
                                <div className="uc-card" key={t.id}>
                                    <span className="fw-eyebrow">{t.category}</span>
                                    <h3>{t.title}</h3>
                                    <p className="fw-muted" style={{ fontSize: 14 }}>{t.text}</p>
                                    <div className="uc-meta">
                                        <span><b>Y</b> {t.y}</span>
                                        <span><b>X</b> {t.x}</span>
                                    </div>
                                    <div className="uc-foot">
                                        <Link to={templateLink(t)} className="mk-card-more">Use this question <FaArrowRight style={{ fontSize: 11 }} /></Link>
                                        {t.sample && <a href={t.sample} download className="fw-btn fw-btn-ghost fw-btn-sm"><FaDownload /> Sample data</a>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </SiteLayout>
    )
}
