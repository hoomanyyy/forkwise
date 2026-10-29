import React from "react"
import { Link } from "react-router-dom"
import SiteLayout, { PageHero } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"

function SpecDemo() {
    const effects = [-0.05, 0.08, 0.15, 0.22, 0.27, 0.31, 0.35, 0.38, 0.41, 0.44, 0.48, 0.52, 0.56, 0.61]
    const rows = ["sleep", "attendance", "age", "drop outliers", "fill missing"]
    const width = 520
    function y(v) {
        return 110 - v * 150
    }
    return (
        <svg viewBox={"0 0 " + width + " 230"} role="img" aria-label="Example specification curve">
            <line x1="90" x2={width - 10} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.25)" />
            <line x1="90" x2={width - 10} y1={y(0.37)} y2={y(0.37)} stroke="#3fb6f5" strokeDasharray="5 5" />
            {effects.map((e, i) => (
                <circle key={i} cx={104 + i * 29} cy={y(e)} r="6" fill={e > 0.2 ? "#34d399" : "#4b5078"} />
            ))}
            {rows.map((r, row) => (
                <g key={r}>
                    <text x="82" y={146 + row * 18} fill="#7f84a8" fontSize="10.5" textAnchor="end" fontFamily="Geist, sans-serif">{r}</text>
                    {effects.map((e, i) => (
                        <circle key={i} cx={104 + i * 29} cy={142 + row * 18} r="4" fill={(i * (row + 2)) % 3 === 0 ? "#9d90ff" : "rgba(255,255,255,0.1)"} />
                    ))}
                </g>
            ))}
        </svg>
    )
}

const SECTIONS = [
    {
        eyebrow: "01 · The verdict",
        title: "One word, with the rule behind it",
        text: "Robust, fragile, choice dependent or no effect, next to the share of analysts that agree on the direction and the share that found a real effect. The rule that produced the verdict is printed under it.",
        demo: (
            <div style={{ display: "grid", gap: 12 }}>
                <span className="fw-eyebrow">Verdict</span>
                <span style={{ fontSize: 34, fontWeight: 600, color: "var(--green)", letterSpacing: "-0.03em" }}>Robust</span>
                <p className="fw-muted">Almost all analysts found the same direction, and most of them found a real effect.</p>
                <p className="fw-mono fw-muted" style={{ fontSize: 12 }}>Rule: at least 90% agree on the direction and at least 80% found p below 0.05.</p>
            </div>
        )
    },
    {
        eyebrow: "02 · Specification curve",
        title: "See which choice moves the answer",
        text: "One dot per analyst, sorted by effect. Green dots are significant. The grid underneath shows which controls and rules each analyst used, so you can see which choices go with bigger or smaller effects.",
        demo: <SpecDemo />
    },
    {
        eyebrow: "03 · Data explorer",
        title: "Your real data, six fitted formulas",
        text: "Scatter or line chart of any two columns, with linear, quadratic, cubic, logarithmic, power and exponential fits ranked by adjusted R². Switch axes, use a log scale, draw notes on the chart and download it.",
        demo: (
            <div style={{ display: "grid", gap: 10 }}>
                {[["Logarithmic", 92, true], ["Power", 84, false], ["Quadratic", 71, false], ["Linear", 58, false]].map((r) => (
                    <div key={r[0]} style={{ display: "grid", gridTemplateColumns: "110px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
                        <span style={{ color: r[2] ? "#fff" : "var(--text-2)", fontSize: 14 }}>{r[0]}</span>
                        <span style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <span style={{ display: "block", height: "100%", width: r[1] + "%", borderRadius: 999, background: r[2] ? "var(--green)" : "var(--accent)" }}></span>
                        </span>
                    </div>
                ))}
                <span className="fw-mono fw-muted" style={{ fontSize: 12 }}>ranked by adjusted R² · illustration</span>
            </div>
        )
    },
    {
        eyebrow: "04 · Analyst table",
        title: "Every choice, every number, every reason",
        text: "For each analyst: the controls, outlier rule, missing-value rule, effect, p value, rows used and a written reason. Export it as CSV on plans with export.",
        demo: (
            <div className="fw-table-wrap">
                <table className="fw-table">
                    <thead><tr><th>#</th><th>Controls</th><th>Effect</th><th>p</th></tr></thead>
                    <tbody>
                        <tr><td className="fw-mono">1</td><td className="fw-mono fw-muted">sleep, age</td><td className="fw-mono" style={{ color: "var(--green)" }}>0.41</td><td className="fw-mono">0.003</td></tr>
                        <tr><td className="fw-mono">2</td><td className="fw-mono fw-muted">none</td><td className="fw-mono" style={{ color: "var(--green)" }}>0.56</td><td className="fw-mono">&lt; 0.001</td></tr>
                        <tr><td className="fw-mono">3</td><td className="fw-mono fw-muted">attendance</td><td className="fw-mono" style={{ color: "var(--green)" }}>0.38</td><td className="fw-mono">0.011</td></tr>
                    </tbody>
                </table>
            </div>
        )
    }
]

export default function ProductResults() {
    return (
        <SiteLayout>
            <Seo
                title="Forkwise Results: Verdict, Specification Curve and Data Explorer"
                description="A tour of the Forkwise result page: the verdict and its rule, the specification curve, the data explorer with six fitted formulas and the full analyst table."
                path="/product/results"
            />
            <PageHero eyebrow="Results and charts" title="A result page you can defend" lead="Every run ends in the same report. Here is what is on it, and why each part is there. The charts below are illustrations." />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap" style={{ display: "grid", gap: 18 }}>
                    {SECTIONS.map((s, i) => (
                        <div key={s.title} className="mk-card" style={{ padding: 0, overflow: "hidden" }}>
                            <div className="mk-split" style={{ gap: 0, alignItems: "stretch" }}>
                                <div style={{ padding: 32, display: "grid", gap: 12, alignContent: "center", order: i % 2 === 0 ? 0 : 1 }}>
                                    <span className="fw-eyebrow">{s.eyebrow}</span>
                                    <h2 className="mk-h3" style={{ fontSize: 26, letterSpacing: "-0.03em" }}>{s.title}</h2>
                                    <p style={{ fontSize: 15.5 }}>{s.text}</p>
                                </div>
                                <div style={{ padding: 28, background: "#0d1027", borderLeft: "1px solid var(--line)", display: "grid", alignContent: "center", minWidth: 0 }}>
                                    {s.demo}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                        <Link to="/register" className="fw-btn fw-btn-primary fw-btn-lg">Get your own result</Link>
                        <Link to="/docs/reading-results" className="fw-btn fw-btn-ghost fw-btn-lg">Read the guide</Link>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
