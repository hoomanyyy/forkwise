import React, { useState } from "react"
import { Link } from "react-router-dom"
import { FaPlus, FaSearch } from "react-icons/fa"
import SiteLayout, { PageHero } from "../components/site/SiteLayout"
import Seo from "../components/Seo"

const questions = [
    {
        group: "The method",
        q: "What is a multiverse analysis?",
        a: "A multiverse analysis runs many reasonable versions of the same analysis instead of only one. Each version makes different choices, like which controls to use. If almost all versions give the same answer, the finding is robust. Forkwise does this automatically with AI analysts."
    },
    {
        group: "The method",
        q: "Does the AI calculate the results?",
        a: "No. The AI only decides how to analyze the data: which controls to use and what to do with outliers and missing values. Python with pandas and statsmodels does every calculation, so the same choices always give the same numbers."
    },
    {
        group: "The method",
        q: "Why do AI analysts give different answers?",
        a: "On purpose. We use three different AI models and five personalities, and the answers are a little random. Real scientists also make different choices, and the goal is to see whether your answer survives all of them."
    },
    {
        group: "Results",
        q: "What do robust, fragile, choice dependent and no effect mean?",
        a: "Robust: almost every analyst found the same direction and a real effect. Fragile: they agree on the direction, but many could not show the effect is real. Choice dependent: the answer changes with the choices, sometimes even the direction. No effect: almost no analyst found a real effect, so the data does not support the link."
    },
    {
        group: "Results",
        q: "If my result is robust, does X cause Y?",
        a: "Not necessarily. Robust means the relationship does not depend on the analysis choices. A hidden reason that affects both X and Y can still explain it."
    },
    {
        group: "Results",
        q: "How many analysts should I choose?",
        a: "10 is good for a quick test and takes about one minute. 25 or more gives a more reliable verdict, because one strange analyst matters less. Your plan sets the maximum."
    },
    {
        group: "Your data",
        q: "Which files can I upload?",
        a: "CSV, Excel (.xlsx or .xls) and JSON files. You can upload many files at once. If they share a column, like country and year, we join them into one table."
    },
    {
        group: "Your data",
        q: "Do I need to know the exact column names?",
        a: "No. Write the outcome and the main variable in your own words, for example \"life expectancy\". The AI finds the matching columns. Check the Y and X names on the result page to be sure it chose the right ones."
    },
    {
        group: "Your data",
        q: "Does the AI see my whole file?",
        a: "No. The AI analysts only get a summary: column names, smallest, average and largest values, how many cells are empty, and a few example words from text columns. Python works with the full data on our server."
    },
    {
        group: "Your data",
        q: "Do you keep my files?",
        a: "No. Uploaded files are read by Python and deleted right after. For each run we keep your question, the file names, every analyst's result and a random sample of up to 1000 rows so you can see the charts again."
    },
    {
        group: "Plans",
        q: "Is Forkwise free?",
        a: "Yes, there is a free plan with a daily number of analyses. Paid plans add more analysts per run, more daily analyses and Assistant messages, and CSV export."
    },
    {
        group: "Plans",
        q: "How do I pay?",
        a: "Paid plans are paid in cryptocurrency through NOWPayments and last 30 days. Your plan becomes active a few minutes after the payment is confirmed."
    }
]

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": questions.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a }
    }))
}

export default function Faq() {
    const [open, setOpen] = useState(questions[0].q)
    const [search, setSearch] = useState("")

    const word = search.trim().toLowerCase()
    const shown = questions.filter((item) => (item.q + " " + item.a).toLowerCase().includes(word))
    const groups = []
    for (const item of shown) {
        if (!groups.includes(item.group)) {
            groups.push(item.group)
        }
    }

    return (
        <SiteLayout>
            <Seo
                title="FAQ: AI Analysts, Robust Results and Your Data | Forkwise"
                description="Answers about Forkwise: what a multiverse analysis is, why AI analysts disagree, what robust and fragile mean, which files work, and what the AI can see."
                path="/faq"
                schema={faqSchema}
            />
            <PageHero narrow eyebrow="FAQ" title="Common questions" lead="Short answers about how the tool works and how to read the results.">
                <div className="fw-input-icon" style={{ width: "min(420px, 100%)" }}>
                    <FaSearch />
                    <input className="fw-input" style={{ height: 46 }} placeholder="Search questions" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search questions" />
                </div>
            </PageHero>

            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap mk-narrow" style={{ display: "grid", gap: 34 }}>
                    {shown.length === 0 && <p className="fw-muted">No question matches "{search}". <Link to="/contact">Ask us directly.</Link></p>}
                    {groups.map((group) => (
                        <div key={group} style={{ display: "grid", gap: 12 }}>
                            <p className="fw-eyebrow">{group}</p>
                            <div className="faq">
                                {shown.filter((item) => item.group === group).map((item) => (
                                    <div key={item.q} className={open === item.q ? "faq-item faq-open" : "faq-item"}>
                                        <button className="faq-q" onClick={() => setOpen(open === item.q ? "" : item.q)} aria-expanded={open === item.q}>
                                            {item.q} <FaPlus />
                                        </button>
                                        {open === item.q && <p className="faq-a">{item.a}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="mk-panel" style={{ justifyItems: "start" }}>
                        <h2 className="mk-h3">Did not find your answer?</h2>
                        <p className="fw-muted">The documentation goes deeper, or you can ask the team.</p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Link to="/docs" className="fw-btn fw-btn-ghost">Read the docs</Link>
                            <Link to="/contact" className="fw-btn fw-btn-primary">Ask us</Link>
                        </div>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
