import React from "react"
import { Link } from "react-router-dom"
import {
    FaFileUpload, FaRobot, FaShieldAlt, FaCalculator, FaGavel, FaChartLine, FaComments, FaTable, FaDownload,
    FaLink, FaAndroid, FaThLarge, FaHistory, FaSearch, FaArrowRight
} from "react-icons/fa"
import SiteLayout, { PageHero, SectionHead } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"

const FEATURES = [
    { icon: FaFileUpload, title: "Upload anything tabular", text: "CSV, Excel and JSON. Join files on a common column, stack them, or add them as context." },
    { icon: FaSearch, title: "Questions in plain words", text: "Write Y and X the way you think about them. Forkwise finds the matching columns." },
    { icon: FaRobot, title: "10 to 100 AI analysts", text: "Three open models and five analyst styles choose controls, outlier rules and missing-value rules." },
    { icon: FaShieldAlt, title: "Checked answers", text: "Wrong columns, text columns and controls that leak the outcome are removed before any math." },
    { icon: FaCalculator, title: "Python does the math", text: "Every regression runs in pandas and statsmodels. The AI never calculates a number." },
    { icon: FaGavel, title: "Rule-based verdict", text: "Robust, fragile, choice dependent or no effect, from written rules you can read." },
    { icon: FaChartLine, title: "Specification curve", text: "Every analyst's effect in one chart, with the choices behind each dot." },
    { icon: FaTable, title: "Full transparency", text: "Each analyst's controls, rules, effect, p value, rows used and reason." },
    { icon: FaComments, title: "Forkwise Assistant", text: "A chat that explains any finished run in plain words." },
    { icon: FaDownload, title: "Export", text: "Charts as PNG on every plan. Every analyst as CSV on plans with export." },
    { icon: FaThLarge, title: "Templates and sample data", text: "Start from ready questions and two free practice datasets." },
    { icon: FaHistory, title: "History and datasets", text: "Search every run, filter by verdict, and see which files you used." }
]

export default function Product() {
    return (
        <SiteLayout>
            <Seo
                title="The Forkwise Platform: AI Multiverse Analysis Without Code"
                description="Everything Forkwise does: many AI analysts, Python calculations, rule-based verdicts, specification curves, the Forkwise Assistant, templates and export."
                path="/product"
            />
            <PageHero
                eyebrow="Platform"
                title="One platform to test if a finding is real"
                lead="Forkwise turns one question into many independent analyses and gives you everything you need to judge the answer: a verdict, the spread, the choices and an assistant to explain it."
            >
                <Link to="/register" className="fw-btn fw-btn-primary fw-btn-lg">Start free</Link>
                <Link to="/how-it-works" className="fw-btn fw-btn-ghost fw-btn-lg">How it works</Link>
            </PageHero>

            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    <div className="mk-pipe">
                        <div><b>1 · Upload</b><span>CSV, Excel, JSON</span></div>
                        <div><b>2 · Ask</b><span>Y and X in your words</span></div>
                        <div><b>3 · Analyze</b><span>10 to 100 AI analysts</span></div>
                        <div><b>4 · Judge</b><span>one verdict, full spread</span></div>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <SectionHead eyebrow="Capabilities" title="What is inside" />
                    <div className="mk-grid-3">
                        {FEATURES.map((f) => (
                            <div className="mk-card" key={f.title}>
                                <span className="mk-card-icon"><f.icon /></span>
                                <h3 className="mk-h3">{f.title}</h3>
                                <p>{f.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead eyebrow="Explore the product" title="Go deeper" />
                    <div className="mk-grid-3">
                        <Link to="/product/results" className="mk-card">
                            <span className="mk-card-icon mk-card-icon-cyan"><FaChartLine /></span>
                            <h3 className="mk-h3">Results and charts</h3>
                            <p>A tour of the result page, chart by chart.</p>
                            <span className="mk-card-more">Open <FaArrowRight style={{ fontSize: 11 }} /></span>
                        </Link>
                        <Link to="/product/assistant" className="mk-card">
                            <span className="mk-card-icon"><FaComments /></span>
                            <h3 className="mk-h3">Forkwise Assistant</h3>
                            <p>Ask follow-up questions about any run.</p>
                            <span className="mk-card-more">Open <FaArrowRight style={{ fontSize: 11 }} /></span>
                        </Link>
                        <Link to="/download" className="mk-card">
                            <span className="mk-card-icon mk-card-icon-green"><FaAndroid /></span>
                            <h3 className="mk-h3">Android app</h3>
                            <p>Your runs and verdicts on your phone.</p>
                            <span className="mk-card-more">Open <FaArrowRight style={{ fontSize: 11 }} /></span>
                        </Link>
                        <Link to="/use-cases" className="mk-card">
                            <span className="mk-card-icon mk-card-icon-amber"><FaThLarge /></span>
                            <h3 className="mk-h3">Use cases</h3>
                            <p>Questions people test, by field.</p>
                            <span className="mk-card-more">Open <FaArrowRight style={{ fontSize: 11 }} /></span>
                        </Link>
                        <Link to="/security" className="mk-card">
                            <span className="mk-card-icon"><FaShieldAlt /></span>
                            <h3 className="mk-h3">Security and data</h3>
                            <p>What the AI sees and what we keep.</p>
                            <span className="mk-card-more">Open <FaArrowRight style={{ fontSize: 11 }} /></span>
                        </Link>
                        <Link to="/changelog" className="mk-card">
                            <span className="mk-card-icon mk-card-icon-cyan"><FaLink /></span>
                            <h3 className="mk-h3">Changelog</h3>
                            <p>Everything we shipped so far.</p>
                            <span className="mk-card-more">Open <FaArrowRight style={{ fontSize: 11 }} /></span>
                        </Link>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
