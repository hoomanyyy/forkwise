import React from "react"
import { Link } from "react-router-dom"
import { FaBook, FaQuestionCircle, FaEnvelope, FaSignal, FaBug, FaLightbulb, FaComments, FaPhone } from "react-icons/fa"
import AppLayout from "../../components/app/AppLayout"
import DOCS from "../../data/docs"

export default function Help() {
    return (
        <AppLayout title="Help and support" crumbs={[{ label: "Help and support" }]}>
            <p className="ap-sub" style={{ marginTop: -14 }}>Guides, answers and a direct line to the team.</p>

            <div className="ax-quick">
                <Link to="/docs"><FaBook /><b>Documentation</b><span>Every step of a run, explained</span></Link>
                <Link to="/faq"><FaQuestionCircle /><b>FAQ</b><span>Short answers to common questions</span></Link>
                <Link to="/assistant"><FaComments /><b>Assistant</b><span>Ask about a finished run</span></Link>
                <Link to="/status"><FaSignal /><b>System status</b><span>Is the API working right now?</span></Link>
            </div>

            <div className="ax-grid-2">
                <section className="ax-card">
                    <div className="ax-card-head"><div><h2>Popular guides</h2><p>From the documentation</p></div></div>
                    <div className="ax-list">
                        {DOCS.slice(0, 7).map((doc) => (
                            <Link key={doc.slug} to={"/docs/" + doc.slug} className="ax-row" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                                <div className="ax-row-main">
                                    <p className="ax-row-title">{doc.title}</p>
                                    <p className="ax-row-meta">{doc.summary}</p>
                                </div>
                                <span className="ax-row-arrow">›</span>
                            </Link>
                        ))}
                    </div>
                </section>

                <div style={{ display: "grid", gap: 18 }}>
                    <section className="ax-card ax-card-pad" style={{ display: "grid", gap: 12 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Contact the team</h2>
                        <p className="fw-muted" style={{ fontSize: 14 }}>We read every message.</p>
                        <a href="mailto:info@forkwiseai.com" className="fw-btn fw-btn-ghost fw-btn-block"><FaEnvelope /> info@forkwiseai.com</a>
                        <a href="tel:+13473915729" className="fw-btn fw-btn-ghost fw-btn-block"><FaPhone /> +1 (347) 391-5729</a>
                        <Link to="/contact" className="fw-btn fw-btn-primary fw-btn-block">Send a message</Link>
                    </section>
                    <section className="ax-card ax-card-pad" style={{ display: "grid", gap: 10 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}><FaBug style={{ color: "var(--red)", marginRight: 8 }} />Reporting a bug?</h2>
                        <p className="fw-muted" style={{ fontSize: 14 }}>Write the run number (for example Run #12), the type of file you uploaded, and what you expected to see.</p>
                    </section>
                    <section className="ax-card ax-card-pad" style={{ display: "grid", gap: 10 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}><FaLightbulb style={{ color: "var(--amber)", marginRight: 8 }} />Have an idea?</h2>
                        <p className="fw-muted" style={{ fontSize: 14 }}>Tell us what you would like Forkwise to do next.</p>
                    </section>
                </div>
            </div>
        </AppLayout>
    )
}
