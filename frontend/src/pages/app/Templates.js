import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaDownload, FaArrowRight, FaSearch, FaFileCsv } from "react-icons/fa"
import AppLayout from "../../components/app/AppLayout"
import TEMPLATES, { templateLink } from "../../data/templates"

export default function Templates() {
    const navigate = useNavigate()
    const [category, setCategory] = useState("All")
    const [search, setSearch] = useState("")

    const categories = ["All"]
    for (const t of TEMPLATES) {
        if (!categories.includes(t.category)) {
            categories.push(t.category)
        }
    }

    const word = search.trim().toLowerCase()
    const shown = TEMPLATES.filter((t) => {
        if (category !== "All" && t.category !== category) {
            return false
        }
        return (t.title + " " + t.text).toLowerCase().includes(word)
    })
    const samples = TEMPLATES.filter((t) => t.sample)

    return (
        <AppLayout title="Templates" crumbs={[{ label: "Templates" }]}>
            <p className="ap-sub" style={{ marginTop: -14 }}>Start from a ready question. The question, Y and X are filled in for you. You still upload your own file.</p>

            <section className="ax-card">
                <div className="ax-card-head">
                    <div>
                        <h2>Sample datasets</h2>
                        <p>Free CSV files you can download and analyze right away</p>
                    </div>
                </div>
                <div className="tp-grid" style={{ padding: 16 }}>
                    {samples.map((t) => (
                        <div className="tp-card" key={t.id} style={{ background: "var(--bg-2)" }}>
                            <span className="fw-badge fw-badge-accent fw-badge-plain" style={{ justifySelf: "start" }}><FaFileCsv /> {t.sampleName}</span>
                            <h3>{t.title}</h3>
                            <p>{t.text}</p>
                            <div className="tp-foot">
                                <a className="fw-btn fw-btn-ghost fw-btn-sm" href={t.sample} download><FaDownload /> Download CSV</a>
                                <button className="fw-btn fw-btn-primary fw-btn-sm" onClick={() => navigate(templateLink(t))}>Use template <FaArrowRight /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div className="fw-chips">
                    {categories.map((c) => (
                        <button key={c} className={category === c ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setCategory(c)}>{c}</button>
                    ))}
                </div>
                <div className="fw-input-icon ax-search">
                    <FaSearch />
                    <input className="fw-input" placeholder="Search templates" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search templates" />
                </div>
            </div>

            {shown.length === 0 ? (
                <div className="ax-card fw-empty"><p>No templates match your search.</p></div>
            ) : (
                <div className="tp-grid">
                    {shown.map((t) => (
                        <div className="tp-card" key={t.id}>
                            <span className="fw-muted fw-mono" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>{t.category}</span>
                            <h3>{t.title}</h3>
                            <p>{t.text}</p>
                            <div className="uc-meta">
                                <span><b>Y</b> {t.y}</span>
                                <span><b>X</b> {t.x}</span>
                            </div>
                            <div className="tp-foot">
                                <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => navigate(templateLink(t))}>Use template <FaArrowRight /></button>
                                {t.sample && <a className="fw-btn fw-btn-quiet fw-btn-sm" href={t.sample} download><FaDownload /> Sample</a>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AppLayout>
    )
}
