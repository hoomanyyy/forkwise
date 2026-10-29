import React from "react"
import { Link, useNavigate } from "react-router-dom"
import SiteLayout, { PageHero, SectionHead } from "../components/site/SiteLayout"
import Seo from "../components/Seo"

export default function About() {
    const navigate = useNavigate()
    return (
        <SiteLayout>
            <Seo
                title="About Forkwise: Why One Analysis Is Not Enough"
                description="29 research teams analysed the same data and got different answers. Forkwise shows this problem for any dataset by letting many AI analysts test one question."
                path="/about"
            />
            <PageHero
                eyebrow="About"
                title="Why one analysis is not enough"
                lead="In 2018, 29 teams of scientists got the same football data and the same question: do referees give more red cards to players with darker skin? They chose different methods and got different answers. We asked: can AI show this problem for any dataset, in a few minutes?"
            />

            <section className="mk-section-tight">
                <div className="mk-wrap">
                    <div className="mk-stat-row">
                        <div className="mk-stat"><b>29</b><span>teams in the original study</span></div>
                        <div className="mk-stat"><b>20 / 9</b><span>found an effect / did not</span></div>
                        <div className="mk-stat"><b>3</b><span>open AI models behind the analysts</span></div>
                        <div className="mk-stat"><b>0</b><span>numbers calculated by the AI</span></div>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <div className="mk-split" style={{ alignItems: "start" }}>
                        <div style={{ display: "grid", gap: 16 }}>
                            <p className="fw-eyebrow">The problem</p>
                            <h2 className="mk-h2">Every analysis is a path through many small choices</h2>
                            <p className="mk-sublead">
                                Which columns to control for, what to do with outliers, how to handle missing values. Each choice is
                                reasonable, but together they can change the result. A single study only shows one of these paths.
                            </p>
                        </div>
                        <div style={{ display: "grid", gap: 16 }}>
                            <p className="fw-eyebrow">Our solution</p>
                            <h2 className="mk-h2">Walk many paths at once, and show all of them</h2>
                            <p className="mk-sublead">
                                Forkwise sends one question to many AI analysts. The AI only decides how to analyze. It never calculates
                                the numbers itself, so every result can be checked and repeated. Python also checks every AI answer for
                                mistakes, like controlling for a column that is part of the outcome.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead eyebrow="What we found" title="All analysts agreed. The size of the effect did not." />
                    <div className="mk-grid-2">
                        <div className="mk-card">
                            <h3 className="mk-h3">173 countries, 10 analysts</h3>
                            <p>
                                With data from 173 countries, all AI analysts agreed that people in richer countries live longer.
                                But the size of the effect changed by 3.6 times, only because some analysts also controlled for
                                infant mortality.
                            </p>
                        </div>
                        <div className="mk-card">
                            <h3 className="mk-h3">The best formula was logarithmic</h3>
                            <p>
                                Every time income doubles, life expectancy grows by about 3.5 years. A straight line would have
                                missed that the effect gets smaller as countries get richer.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <div className="mk-split" style={{ alignItems: "start" }}>
                        <div style={{ display: "grid", gap: 16 }}>
                            <p className="fw-eyebrow">Related research</p>
                            <h2 className="mk-h2">Others found the same, and our goal is different</h2>
                            <p className="mk-sublead">
                                Two research groups tested a similar idea in 2026: Carnegie Mellon University ("Many AI Analysts, One
                                Dataset") and Stanford University ("The Agentic Garden of Forking Paths"). Our results agree with
                                theirs. Our goal is different: a free tool that anyone can use without writing code.
                            </p>
                            <div><Link to="/research" className="fw-btn fw-btn-ghost">See the research list</Link></div>
                        </div>
                        <div className="mk-panel">
                            <p className="fw-eyebrow">Built with</p>
                            <div className="mk-tag-row">
                                {["React", "FastAPI", "MySQL", "pandas", "statsmodels", "Cloudflare Workers AI", "Llama 3.3 70B", "Llama 3.1 8B", "Mistral Small 3.1"].map((t) => (
                                    <span className="mk-tag" key={t}>{t}</span>
                                ))}
                            </div>
                            <p className="fw-muted" style={{ fontSize: 14 }}>Forkwise started as a student project for the A-ISPC 2026 competition.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <div className="mk-final">
                        <h2 className="mk-h2">Try it on your own data</h2>
                        <p>It takes about a minute for every ten analysts.</p>
                        <div className="lh-buttons">
                            <button className="fw-btn fw-btn-light fw-btn-lg" onClick={() => navigate("/register")}>Create a free account</button>
                            <Link to="/how-it-works" className="fw-btn fw-btn-ghost fw-btn-lg">See every step</Link>
                        </div>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
