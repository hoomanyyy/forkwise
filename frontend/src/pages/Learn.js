import React from "react"
import { Link } from "react-router-dom"
import { FaArrowRight, FaBook, FaSpellCheck, FaUniversity, FaFileCsv } from "react-icons/fa"
import SiteLayout, { PageHero, Crumbs } from "../components/site/SiteLayout"
import Seo, { SITE_URL } from "../components/Seo"

const learnSchema = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "CollectionPage",
            "@id": SITE_URL + "/learn#page",
            "url": SITE_URL + "/learn",
            "name": "Learn: Multiverse Analysis and Robust Results",
            "description": "Simple guides about multiverse analysis, specification curves and why one data analysis is not enough, with a worked example.",
            "isPartOf": { "@id": SITE_URL + "/#website" },
            "hasPart": [
                { "@type": "Article", "url": SITE_URL + "/learn/multiverse-analysis", "name": "What is a multiverse analysis?" },
                { "@type": "Article", "url": SITE_URL + "/learn/specification-curve", "name": "How to read a specification curve" },
                { "@type": "Article", "url": SITE_URL + "/examples/coffee-and-heart-risk", "name": "Does coffee raise heart risk? A hidden variable example" }
            ]
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" },
                { "@type": "ListItem", "position": 2, "name": "Learn", "item": SITE_URL + "/learn" }
            ]
        }
    ]
}

const GUIDES = [
    { to: "/learn/multiverse-analysis", tag: "Guide · 5 min", title: "What is a multiverse analysis?", text: "One dataset can give many answers. Learn what a multiverse analysis is, why scientists use it and how to run one without code." },
    { to: "/learn/specification-curve", tag: "Guide · 5 min", title: "How to read a specification curve", text: "The specification curve shows every analysis in one chart. Learn to read the dots, the choices below them and the middle line." },
    { to: "/examples/coffee-and-heart-risk", tag: "Worked example · 4 min", title: "Does coffee raise heart risk?", text: "A hidden variable trap. Download the data and see how one choice creates an effect that is not there." }
]

export default function Learn() {
    return (
        <SiteLayout>
            <Seo
                title="Learn Multiverse Analysis and Specification Curves | Forkwise"
                description="Simple guides about multiverse analysis, specification curves and why one data analysis is not enough, with a worked example you can try yourself."
                path="/learn"
                schema={learnSchema}
            />
            <PageHero
                eyebrow="Learn"
                title="Why one analysis is not enough"
                lead="Short, plain guides about the ideas behind Forkwise. No math degree needed."
            >
                <Crumbs items={[{ label: "Home", to: "/" }, { label: "Learn" }]} />
            </PageHero>

            <section className="mk-section-tight">
                <div className="mk-wrap">
                    <div className="mk-grid-3">
                        {GUIDES.map((g) => (
                            <Link key={g.to} to={g.to} className="mk-card" style={{ minHeight: 250 }}>
                                <span className="fw-eyebrow">{g.tag}</span>
                                <h2 className="mk-h3" style={{ fontSize: 22 }}>{g.title}</h2>
                                <p>{g.text}</p>
                                <span className="mk-card-more" style={{ marginTop: "auto" }}>Read <FaArrowRight style={{ fontSize: 11 }} /></span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <p className="fw-eyebrow" style={{ marginBottom: 16 }}>Keep going</p>
                    <div className="mk-grid-4">
                        <Link to="/glossary" className="mk-card">
                            <span className="mk-card-icon"><FaSpellCheck /></span>
                            <h3 className="mk-h3">Glossary</h3>
                            <p>p values, controls, outliers, leakage and more, in one sentence each.</p>
                        </Link>
                        <Link to="/research" className="mk-card">
                            <span className="mk-card-icon mk-card-icon-cyan"><FaUniversity /></span>
                            <h3 className="mk-h3">Research</h3>
                            <p>The studies that showed why many analysts matter.</p>
                        </Link>
                        <Link to="/docs" className="mk-card">
                            <span className="mk-card-icon mk-card-icon-green"><FaBook /></span>
                            <h3 className="mk-h3">Documentation</h3>
                            <p>How every step of a Forkwise run works.</p>
                        </Link>
                        <a href="/examples/study-hours.csv" download className="mk-card">
                            <span className="mk-card-icon mk-card-icon-amber"><FaFileCsv /></span>
                            <h3 className="mk-h3">Practice data</h3>
                            <p>Download 400 students' study hours and exam scores, and try it yourself.</p>
                        </a>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
