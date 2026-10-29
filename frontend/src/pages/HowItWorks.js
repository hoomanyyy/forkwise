import React from "react"
import { Link, useNavigate } from "react-router-dom"
import { FaFileUpload, FaRobot, FaShieldAlt, FaCalculator, FaGavel, FaChartLine, FaExclamationTriangle } from "react-icons/fa"
import SiteLayout, { PageHero, SectionHead } from "../components/site/SiteLayout"
import Seo from "../components/Seo"

const STEPS = [
    {
        icon: FaFileUpload,
        title: "You upload data and ask a question",
        text: "Upload one or more CSV, Excel or JSON files and describe them. Several files are joined on a common column (for example country and year) or stacked. Then write your question, the outcome (Y) and the main variable (X) in your own words.",
        extra: "Question  Do people in richer countries live longer?\nY         life expectancy\nX         GDP per person"
    },
    {
        icon: FaRobot,
        title: "Many AI analysts plan the analysis",
        text: "First the AI matches your words to columns. Then each analyst gets a short summary of the data: column names, smallest, average and largest values, and how many cells are empty. Analysts never see your full rows. Each one chooses controls, an outlier rule and a missing-value rule, and explains why. Three models (Llama 3.3 70B, Llama 3.1 8B, Mistral Small 3.1) and five analyst styles make them really different."
    },
    {
        icon: FaShieldAlt,
        title: "Python checks every AI answer",
        text: "AI models make mistakes, so no answer is trusted directly. Python removes columns that do not exist, columns that are not numbers, and the outcome or main variable if the AI put them in the controls. It also removes controls whose name contains the outcome, because they often leak it."
    },
    {
        icon: FaCalculator,
        title: "Python runs the regression",
        text: "For each analyst, Python cleans the data with that analyst's choices and runs a linear regression with statsmodels. The effect is how much Y changes when X goes up by one standard deviation. Analyses with fewer than 30 rows are ignored.",
        extra: "Y = a + b · X + c1 · control1 + c2 · control2 + ..."
    },
    {
        icon: FaGavel,
        title: "The judge gives a verdict",
        text: "The judge counts how many analysts found the same direction, and how many found a real effect (p below 0.05). Then it applies four written rules: no effect, robust, fragile or choice dependent."
    },
    {
        icon: FaChartLine,
        title: "You see why",
        text: "The result page shows a specification curve with every analyst's choices, your data with six fitted formulas ranked by adjusted R², the columns that move with the outcome, and every analyst's reason. Every chart can be downloaded."
    }
]

export default function HowItWorks() {
    const navigate = useNavigate()
    return (
        <SiteLayout>
            <Seo
                title="How It Works: AI Multiverse Analysis in 6 Steps | Forkwise"
                description="How Forkwise turns one question into many analyses: AI analysts plan, Python runs every regression, and a judge says if the result is robust or fragile."
                path="/how-it-works"
            />
            <PageHero
                eyebrow="How it works"
                title="From your file to a verdict in six steps"
                lead="The AI decides how to analyze. Python does every calculation. That way every number on the result page can be checked and repeated. Scientists call this a multiverse or specification curve analysis."
            >
                <button className="fw-btn fw-btn-primary fw-btn-lg" onClick={() => navigate("/register")}>Try it free</button>
                <Link to="/docs/verdicts" className="fw-btn fw-btn-ghost fw-btn-lg">Read the verdict rules</Link>
            </PageHero>

            <section className="mk-section-tight">
                <div className="mk-wrap">
                    <div className="mk-pipe" style={{ marginBottom: 40 }}>
                        <div><b>Your data</b><span>files are joined</span></div>
                        <div><b>AI analysts</b><span>3 models, 5 styles</span></div>
                        <div><b>Python</b><span>checks and calculates</span></div>
                        <div><b>Judge</b><span>gives a verdict</span></div>
                    </div>
                    <div style={{ display: "grid", gap: 14 }}>
                        {STEPS.map((s, index) => (
                            <section key={s.title} className="mk-card" style={{ gridTemplateColumns: "auto minmax(0, 1fr)", gap: 22, padding: 28 }}>
                                <span className="mk-card-icon"><s.icon /></span>
                                <div style={{ display: "grid", gap: 10 }}>
                                    <span className="fw-eyebrow">Step {index + 1}</span>
                                    <h2 className="mk-h3" style={{ fontSize: 22 }}>{s.title}</h2>
                                    <p style={{ fontSize: 15.5, maxWidth: "72ch" }}>{s.text}</p>
                                    {s.extra && <pre className="prose-code" style={{ margin: 0 }}>{s.extra}</pre>}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead eyebrow="The verdict rules" title="Checked in this order" />
                    <div className="verdicts">
                        <div className="verdict verdict-none"><span className="fw-badge fw-badge-no_effect">no effect</span><p>20% or fewer found a real effect. Checked first.</p></div>
                        <div className="verdict verdict-robust"><span className="fw-badge fw-badge-robust">robust</span><p>At least 90% agree on the direction and at least 80% found a real effect.</p></div>
                        <div className="verdict verdict-fragile"><span className="fw-badge fw-badge-fragile">fragile</span><p>At least 85% agree on the direction and at least 30% found a real effect.</p></div>
                        <div className="verdict verdict-choice"><span className="fw-badge fw-badge-choice_dependent">choice dependent</span><p>Anything else. The answer changes with the choices made.</p></div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap mk-narrow">
                    <div className="prose-box" style={{ borderColor: "rgba(251,191,36,0.3)" }}>
                        <h2 className="mk-h3" style={{ display: "flex", gap: 10, alignItems: "center" }}><FaExclamationTriangle style={{ color: "var(--amber)" }} /> What the tool cannot do</h2>
                        <ul className="mk-checks" style={{ gap: 10 }}>
                            <li>It finds relationships, not causes. A robust result is still not proof that X causes Y.</li>
                            <li>The leakage check only looks at column names. A column like total greenhouse gas contains CO2 but does not have "co2" in its name.</li>
                            <li>Every analysis uses linear regression today. Outcomes that are only 0 or 1, or are counts, would need other models.</li>
                            <li>If no column matches your words, the AI may pick the closest one. Always check the Y and X names on the result page.</li>
                        </ul>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
