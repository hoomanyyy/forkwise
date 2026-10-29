import React from "react"
import { Link } from "react-router-dom"
import { FaCheck, FaTimes } from "react-icons/fa"
import SiteLayout, { PageHero, SectionHead } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"

const ROWS = [
    ["How many analyses", "One", "One per chat answer", "10 to 100 independent analysts"],
    ["Who calculates", "You, in code or a spreadsheet", "Often the language model itself", "Python with pandas and statsmodels"],
    ["Choices visible", "Only if you write them down", "Usually hidden in the text", "Every control and rule, per analyst"],
    ["Spread of results", "No", "No", "Full spread and a specification curve"],
    ["Verdict", "Your own judgment", "A confident paragraph", "Rule-based: robust, fragile, choice dependent, no effect"],
    ["Same input, same numbers", "Yes", "Not always", "Yes, the math is deterministic"],
    ["Code needed", "Often", "No", "No"]
]

export default function Compare() {
    return (
        <SiteLayout>
            <Seo
                title="Forkwise vs One Analysis vs Asking a Chatbot"
                description="Why one analysis, or one chatbot answer, is not enough to trust a data finding, and how Forkwise compares."
                path="/compare"
            />
            <PageHero
                eyebrow="Compare"
                title="One answer is one path. You need the map."
                lead="A single analysis, whether you run it yourself or ask a chatbot, shows one set of choices. Forkwise shows what happens across many reasonable sets of choices."
            />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    <div className="cmp">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>One analysis by hand</th>
                                    <th>Asking one chatbot</th>
                                    <th className="cmp-us">Forkwise</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ROWS.map((r) => (
                                    <tr key={r[0]}>
                                        <td>{r[0]}</td>
                                        <td>{r[1]}</td>
                                        <td>{r[2]}</td>
                                        <td className="cmp-us"><FaCheck className="cmp-yes" />{r[3]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <SectionHead eyebrow="When to use what" title="Pick the right tool for the job" />
                    <div className="mk-grid-3">
                        <div className="mk-card">
                            <h3 className="mk-h3">Explore with a chatbot</h3>
                            <p>Great for ideas, cleaning steps and first looks at a table. Do not trust a single number it gives you without checking it.</p>
                        </div>
                        <div className="mk-card">
                            <h3 className="mk-h3">Model by hand</h3>
                            <p>Best when you know exactly which model you need and can defend every choice in it.</p>
                        </div>
                        <div className="mk-card" style={{ borderColor: "rgba(124,108,255,0.5)" }}>
                            <h3 className="mk-h3">Test with Forkwise</h3>
                            <p>Use it before you share a finding, to see whether it survives the choices other careful people might make.</p>
                        </div>
                    </div>
                    <div className="mk-panel" style={{ marginTop: 16 }}>
                        <h3 className="mk-h3"><FaTimes style={{ color: "var(--red)", marginRight: 8 }} />What Forkwise does not replace</h3>
                        <p className="fw-muted">Forkwise does not prove cause and effect, and it uses linear regression for every analysis today. For binary outcomes, counts or experiments with special designs, talk to a statistician as well.</p>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
                        <Link to="/register" className="fw-btn fw-btn-primary fw-btn-lg">Try Forkwise free</Link>
                        <Link to="/learn/multiverse-analysis" className="fw-btn fw-btn-ghost fw-btn-lg">Why many analyses?</Link>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
