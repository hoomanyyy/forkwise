import React from "react"
import { Link, useParams } from "react-router-dom"
import { FaCheck, FaArrowRight } from "react-icons/fa"
import SiteLayout, { PageHero, SectionHead } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"
import NotFound from "../NotFound"
import SOLUTIONS from "../../data/solutions"

export default function Solution() {
    const { slug } = useParams()
    const solution = SOLUTIONS.find((s) => s.slug === slug)
    if (!solution) {
        return <NotFound />
    }
    const others = SOLUTIONS.filter((s) => s.slug !== slug)

    return (
        <SiteLayout>
            <Seo
                title={"Forkwise for " + solution.name + ": " + solution.title}
                description={solution.lead}
                path={"/solutions/" + solution.slug}
            />
            <PageHero eyebrow={"Forkwise for " + solution.name.toLowerCase()} title={solution.title} lead={solution.lead}>
                <Link to="/register" className="fw-btn fw-btn-primary fw-btn-lg">Start free</Link>
                <Link to="/use-cases" className="fw-btn fw-btn-ghost fw-btn-lg">Browse use cases</Link>
            </PageHero>

            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    <div className="mk-split" style={{ alignItems: "start" }}>
                        <div className="mk-panel">
                            <p className="fw-eyebrow">Why it helps</p>
                            <ul className="mk-checks">
                                {solution.points.map((p) => <li key={p}><FaCheck /> {p}</li>)}
                            </ul>
                        </div>
                        <div className="mk-panel" style={{ background: "#0e1229" }}>
                            <p className="fw-eyebrow">Questions you could test</p>
                            {solution.examples.map((ex) => (
                                <div className="at-q" key={ex.q}>
                                    <p>{ex.q}</p>
                                    <span className="fw-mono fw-muted" style={{ fontSize: 12.5 }}>Y: {ex.y} · X: {ex.x}</span>
                                    <Link
                                        to={"/chat?q=" + encodeURIComponent(ex.q) + "&y=" + encodeURIComponent(ex.y) + "&x=" + encodeURIComponent(ex.x)}
                                        className="mk-card-more"
                                        style={{ fontSize: 13 }}
                                    >
                                        Use this question <FaArrowRight style={{ fontSize: 10 }} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <SectionHead eyebrow="Your workflow" title="Three steps to a verdict you can use" />
                    <div className="steps">
                        {solution.steps.map((s, i) => (
                            <div className="step" key={s.title}>
                                <span className="step-num">0{i + 1}</span>
                                <h3 className="mk-h3">{s.title}</h3>
                                <p>{s.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead eyebrow="Also built for" title="Other teams using the same method" />
                    <div className="mk-grid-3">
                        {others.map((s) => (
                            <Link key={s.slug} to={"/solutions/" + s.slug} className="mk-card">
                                <span className="mk-card-icon"><s.icon /></span>
                                <h3 className="mk-h3">{s.name}</h3>
                                <p>{s.short}</p>
                                <span className="mk-card-more">Learn more <FaArrowRight style={{ fontSize: 11 }} /></span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
