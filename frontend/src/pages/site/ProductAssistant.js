import React from "react"
import { Link } from "react-router-dom"
import { FaComments, FaArrowUp, FaCheck, FaChartBar, FaLanguage, FaQuestionCircle, FaShieldAlt } from "react-icons/fa"
import SiteLayout, { PageHero, SectionHead } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"

export default function ProductAssistant() {
    return (
        <SiteLayout>
            <Seo
                title="Forkwise Assistant: Chat With Your Analysis"
                description="Ask follow-up questions about any Forkwise run. The Assistant explains verdicts, compares analysts and draws simple charts, while every number still comes from Python."
                path="/product/assistant"
            />
            <PageHero
                eyebrow="Forkwise Assistant"
                title="Ask your analysis anything"
                lead="When a run is finished, open it in the Assistant and ask follow-up questions in plain words. It reads the results of every analyst in that run and answers like a patient statistics tutor."
            >
                <Link to="/register" className="fw-btn fw-btn-primary fw-btn-lg">Try it free</Link>
                <Link to="/docs/assistant" className="fw-btn fw-btn-ghost fw-btn-lg">Read the guide</Link>
            </PageHero>

            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    <div className="pw" style={{ marginTop: 0, maxWidth: 900 }}>
                        <div className="pw-bar">
                            <div className="pw-dots"><i></i><i></i><i></i></div>
                            <div className="pw-url">forkwiseai.com/assistant/40</div>
                        </div>
                        <div style={{ padding: "28px clamp(16px, 4vw, 40px)", display: "grid", gap: 22 }}>
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <div style={{ background: "var(--surface-3)", borderRadius: "18px 18px 4px 18px", padding: "12px 16px", color: "#fff", maxWidth: "75%" }}>
                                    Explain this result in simple words
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 14 }}>
                                <span style={{ flex: "none", width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#8b7bff,#3fb6f5)", color: "#fff" }}><FaComments /></span>
                                <div style={{ display: "grid", gap: 8, color: "var(--text)", lineHeight: 1.7 }}>
                                    <p>All <strong style={{ color: "#fff" }}>25 analysts</strong> found that more study hours go together with higher exam scores.</p>
                                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                                        <li>92% of them found a real effect (p below 0.05)</li>
                                        <li>The effect is about <strong style={{ color: "#fff" }}>0.43</strong> points per standard deviation of study time</li>
                                    </ul>
                                    <p>The finding is <strong style={{ color: "var(--green)" }}>robust</strong>: it does not depend on which controls the analysts chose.</p>
                                    <p className="fw-muted" style={{ fontSize: 12.5 }}>Example conversation for illustration.</p>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 10px 16px", borderRadius: 18, border: "1px solid var(--line-2)", background: "var(--surface)" }}>
                                <span className="fw-muted" style={{ flex: 1 }}>Why do the analysts disagree?</span>
                                <span style={{ width: 36, height: 36, borderRadius: 12, background: "#fff", color: "#0b0e1f", display: "grid", placeItems: "center" }}><FaArrowUp /></span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <SectionHead eyebrow="What it does" title="A second pair of eyes on every run" />
                    <div className="mk-grid-4">
                        <div className="mk-card"><span className="mk-card-icon"><FaLanguage /></span><h3 className="mk-h3">Plain words</h3><p>Turns effects, p values and verdicts into sentences you can repeat.</p></div>
                        <div className="mk-card"><span className="mk-card-icon mk-card-icon-cyan"><FaQuestionCircle /></span><h3 className="mk-h3">Why they disagree</h3><p>Points to the choices that moved the result.</p></div>
                        <div className="mk-card"><span className="mk-card-icon mk-card-icon-green"><FaChartBar /></span><h3 className="mk-h3">Simple charts</h3><p>Draws small charts, like each analyst's effect.</p></div>
                        <div className="mk-card"><span className="mk-card-icon mk-card-icon-amber"><FaShieldAlt /></span><h3 className="mk-h3">Numbers stay fixed</h3><p>It explains results. It does not change them.</p></div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <div className="mk-split">
                        <div style={{ display: "grid", gap: 16 }}>
                            <p className="fw-eyebrow">Good to know</p>
                            <h2 className="mk-h2">Built to explain, not to guess</h2>
                            <ul className="mk-checks">
                                <li><FaCheck /> Each chat belongs to one run and keeps its history</li>
                                <li><FaCheck /> It reads that run's results and your earlier messages</li>
                                <li><FaCheck /> Daily message limits depend on your plan</li>
                                <li><FaCheck /> Available in the app, on result pages and in the Assistant view</li>
                            </ul>
                        </div>
                        <div className="mk-panel">
                            <p className="fw-eyebrow">Try asking</p>
                            {["Explain this result in simple words", "Which choice changed the result the most?", "Draw a chart of the effect of each analyst", "How should I write this finding in a report?"].map((q) => (
                                <div key={q} className="at-q"><p style={{ fontSize: 15 }}>{q}</p></div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
