import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
    FaArrowRight, FaCheck, FaTimes, FaPlus, FaHome, FaFlask, FaComments, FaDatabase, FaChartLine, FaFileUpload,
    FaRobot, FaCalculator, FaShieldAlt, FaTable, FaDownload, FaLink, FaEyeSlash
} from "react-icons/fa"
import SiteLayout, { SectionHead } from "../components/site/SiteLayout"
import Seo from "../components/Seo"
import { sendAuthRequestWithWebsocket, getPlans } from "../api"
import SOLUTIONS from "../data/solutions"

// a real run from the About page: 10 analysts, GDP per person and life expectancy in 173 countries
const HERO_EFFECTS = [1.47, 1.47, 1.47, 1.47, 1.47, 1.51, 1.53, 2.7, 5.21, 5.21]

const FAQ = [
    {
        q: "Does the AI calculate my results?",
        a: "No. The AI analysts only decide how to analyze: which controls to use and what to do with outliers and missing values. Python with pandas and statsmodels does every calculation, so the same choices always give the same numbers."
    },
    {
        q: "Does the AI see my whole file?",
        a: "No. The analysts get a summary: column names, smallest, average and largest values, how many cells are empty, and a few example words from text columns. Python works with the full data on our server."
    },
    {
        q: "Which files can I upload?",
        a: "CSV, Excel (.xlsx or .xls) and JSON. You can upload several files and join them on a common column such as country and year, or stack files that have the same columns."
    },
    {
        q: "If my result is robust, does X cause Y?",
        a: "Not necessarily. Robust means the relationship does not depend on the analysis choices. A hidden variable that affects both X and Y can still explain it."
    },
    {
        q: "Is there a free plan?",
        a: "Yes. The free plan lets you run analyses every day without a card. Paid plans add more analysts per run, more daily runs, more chat messages and CSV export."
    }
]

function HeroChart() {
    const width = 560
    const height = 190
    const top = 26
    const bottom = 30
    const max = 6
    function y(v) {
        return top + (1 - v / max) * (height - top - bottom)
    }
    const middle = 1.49
    return (
        <svg viewBox={"0 0 " + width + " " + height} role="img" aria-label="Specification curve with ten analysts, all positive">
            {[0, 2, 4, 6].map((v) => (
                <g key={v}>
                    <line x1="34" x2={width - 8} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
                    <text x="26" y={y(v) + 4} fill="#7f84a8" fontSize="11" textAnchor="end" fontFamily="Geist Mono, monospace">{v}</text>
                </g>
            ))}
            <line x1="34" x2={width - 8} y1={y(middle)} y2={y(middle)} stroke="#3fb6f5" strokeDasharray="5 5" strokeWidth="1.5" />
            <line x1="40" x2="58" y1="9" y2="9" stroke="#3fb6f5" strokeDasharray="4 3" strokeWidth="1.5" />
            <text x="64" y="13" fill="#3fb6f5" fontSize="11" fontFamily="Geist Mono, monospace">middle effect 1.49</text>
            {HERO_EFFECTS.map((e, i) => {
                const x = 60 + i * ((width - 90) / (HERO_EFFECTS.length - 1))
                return (
                    <g key={i} className="pw-dot" style={{ animationDelay: 0.5 + i * 0.18 + "s" }}>
                        <line x1={x} x2={x} y1={y(0)} y2={y(e)} stroke="rgba(124,108,255,0.35)" strokeWidth="2" />
                        <circle cx={x} cy={y(e)} r="7" fill="#7c6cff" stroke="#c9c2ff" strokeWidth="1.5" />
                    </g>
                )
            })}
            <text x="34" y={height - 8} fill="#7f84a8" fontSize="11" fontFamily="Geist Mono, monospace">analysts sorted by effect →</text>
        </svg>
    )
}

function ProductWindow() {
    return (
        <div className="pw" aria-label="Preview of a Forkwise result">
            <div className="pw-bar">
                <div className="pw-dots"><i></i><i></i><i></i></div>
                <div className="pw-url">forkwiseai.com/runs/1</div>
            </div>
            <div className="pw-body">
                <div className="pw-side" aria-hidden="true">
                    <span><FaHome /> Overview</span>
                    <span><FaPlus /> New analysis</span>
                    <span className="pw-side-on"><FaFlask /> Runs</span>
                    <span><FaComments /> Assistant</span>
                    <span><FaDatabase /> Datasets</span>
                </div>
                <div className="pw-main">
                    <div className="pw-head">
                        <div>
                            <span className="fw-eyebrow">Run · 10 AI analysts</span>
                            <p className="pw-q">Do people in richer countries live longer?</p>
                        </div>
                        <span className="pw-verdict fw-badge fw-badge-robust">robust</span>
                    </div>
                    <div className="pw-stats">
                        <div className="pw-stat"><small>Analysts</small><b>10</b></div>
                        <div className="pw-stat"><small>Same direction</small><b>100%</b></div>
                        <div className="pw-stat"><small>Countries</small><b>173</b></div>
                        <div className="pw-stat"><small>Size spread</small><b>3.6×</b></div>
                    </div>
                    <div className="pw-chart">
                        <HeroChart />
                    </div>
                </div>
            </div>
        </div>
    )
}

function SpecMini() {
    const dots = [-0.4, -0.1, 0.2, 0.5, 0.7, 0.9, 1.1, 1.2, 1.4, 1.7, 2.1, 2.4]
    return (
        <svg viewBox="0 0 300 110" aria-hidden="true">
            <line x1="0" x2="300" y1="70" y2="70" stroke="rgba(255,255,255,0.15)" />
            {dots.map((d, i) => (
                <circle key={i} cx={14 + i * 25} cy={70 - d * 22} r="5" fill={d < 0 ? "#f87171" : "#7c6cff"} />
            ))}
            {[0, 1, 2].map((row) => (
                dots.map((d, i) => (
                    <circle key={row + "-" + i} cx={14 + i * 25} cy={86 + row * 8} r="2.6" fill={(i + row) % 3 === 0 ? "#9d90ff" : "rgba(255,255,255,0.12)"} />
                ))
            ))}
        </svg>
    )
}

function FitMini() {
    const points = []
    for (let i = 0; i < 40; i++) {
        const x = 10 + i * 7
        const base = 90 - Math.log(1 + i) * 22
        const wobble = Math.sin(i * 2.3) * 8
        points.push([x, base + wobble])
    }
    let path = ""
    for (let i = 0; i < 40; i++) {
        const x = 10 + i * 7
        const yv = 90 - Math.log(1 + i) * 22
        path += (i === 0 ? "M" : "L") + x + " " + yv.toFixed(1) + " "
    }
    return (
        <svg viewBox="0 0 300 110" aria-hidden="true">
            {points.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="rgba(63,182,245,0.55)" />
            ))}
            <path d={path} fill="none" stroke="#7c6cff" strokeWidth="2.5" />
            
        </svg>
    )
}

export default function Landing() {
    const navigate = useNavigate()
    const [loggedIn, setLoggedIn] = useState(false)
    const [audience, setAudience] = useState(0)
    const [plans, setPlans] = useState([])
    const [openFaq, setOpenFaq] = useState(0)
    const [plansFailed, setPlansFailed] = useState(false)

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (res) => {
            if (res.Message === true) {
                setLoggedIn(true)
            }
        })
        async function loadPlans() {
            const response = await getPlans()
            if (response.Message === true) {
                setPlans(response.data)
            } else {
                setPlansFailed(true)
            }
        }
        loadPlans()
    }, [])

    function startNow() {
        if (loggedIn) {
            navigate("/chat")
        } else {
            navigate("/register")
        }
    }

    const teams = []
    for (let i = 0; i < 29; i++) {
        teams.push(i)
    }

    const current = SOLUTIONS[audience]

    let cheapest = null
    for (const plan of plans) {
        if (Number(plan.price) > 0 && (cheapest === null || Number(plan.price) < Number(cheapest.price))) {
            cheapest = plan
        }
    }

    return (
        <SiteLayout footerCta={false}>
            <Seo
                title="Forkwise: Many AI Analysts, One Honest Answer"
                description="Upload your data and ask one question. Forkwise sends it to many AI analysts, runs every analysis in Python and tells you if your finding is robust or fragile."
                path="/"
            />

            <section className="lh">
                <div className="mk-glow" aria-hidden="true"></div>
                <div className="mk-grid-bg" aria-hidden="true"></div>
                <div className="mk-wrap">
                    <div className="lh-top">
                        <Link to="/product/assistant" className="lh-pill">
                            <span className="fw-badge fw-badge-accent fw-badge-plain">New</span>
                            Chat with any analysis you ran <FaArrowRight style={{ fontSize: 11 }} />
                        </Link>
                        <h1 className="lh-title">
                            Is your data finding <span className="fw-gradient-text">real</span>, or just one way of looking?
                        </h1>
                        <p className="lh-lead">
                            Forkwise gives one question to 10 to 100 AI analysts. Each one picks its own reasonable method,
                            Python runs every analysis, and you get one honest verdict: robust, fragile, choice dependent or no effect.
                        </p>
                        <div className="lh-buttons">
                            <button className="fw-btn fw-btn-primary fw-btn-lg" onClick={startNow}>
                                {loggedIn ? "Start a new analysis" : "Start free"} <FaArrowRight />
                            </button>
                            <Link to="/examples/coffee-and-heart-risk" className="fw-btn fw-btn-ghost fw-btn-lg">See a worked example</Link>
                        </div>
                        <div className="lh-proof">
                            <span><FaCheck /> Free plan, no card</span>
                            <span><FaCheck /> CSV, Excel or JSON</span>
                            <span><FaCheck /> No code</span>
                            <span><FaCheck /> The AI never does the math</span>
                        </div>
                    </div>
                    <ProductWindow />
                </div>
            </section>

            <section className="lb">
                <div className="mk-wrap">
                    <p>Built on open models and standard statistics tools</p>
                    <div className="lb-row">
                        <span>Cloudflare Workers AI</span>
                        <span>Llama 3.3 70B</span>
                        <span>Llama 3.1 8B</span>
                        <span>Mistral Small 3.1</span>
                        <span>pandas</span>
                        <span>statsmodels</span>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <SectionHead
                        center
                        eyebrow="Who it is for"
                        title="Anyone who has to defend a number"
                        lead="Pick your world. The method is the same: one question, many analysts, one verdict you can explain."
                    />
                    <div className="at">
                        <div className="at-tabs" role="tablist">
                            {SOLUTIONS.map((s, index) => (
                                <button
                                    key={s.slug}
                                    role="tab"
                                    aria-selected={audience === index}
                                    className={audience === index ? "at-tab at-tab-on" : "at-tab"}
                                    onClick={() => setAudience(index)}
                                >
                                    <s.icon /> {s.name}
                                </button>
                            ))}
                        </div>
                        <div className="at-panel">
                            <div className="at-text">
                                <p className="fw-eyebrow">{current.short}</p>
                                <h3 className="mk-h2" style={{ fontSize: "clamp(24px, 2.6vw, 32px)" }}>{current.title}</h3>
                                <ul>
                                    {current.points.slice(0, 3).map((point) => (
                                        <li key={point}><FaCheck /> {point}</li>
                                    ))}
                                </ul>
                                <div>
                                    <Link to={"/solutions/" + current.slug} className="fw-btn fw-btn-ghost">
                                        Forkwise for {current.name.toLowerCase()} <FaArrowRight />
                                    </Link>
                                </div>
                            </div>
                            <div className="at-demo">
                                <p className="fw-eyebrow">Questions you could test</p>
                                {current.examples.map((ex) => (
                                    <div className="at-q" key={ex.q}>
                                        <p>{ex.q}</p>
                                        <div className="at-q-row">
                                            <span className="fw-mono fw-muted" style={{ fontSize: 12.5 }}>Y: {ex.y} · X: {ex.x}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <div className="teams">
                        <div className="teams-text">
                            <p className="fw-eyebrow">Why it matters</p>
                            <h2 className="mk-h2">29 teams. Same data. Different answers.</h2>
                            <p>
                                In 2018, 29 research teams got the same football data and one question: do referees give more red
                                cards to players with darker skin? 20 teams found a clear effect and 9 did not. Their estimates
                                ranged from 0.89 to 2.93.
                            </p>
                            <p>
                                Nobody cheated. They made different reasonable choices. Most studies only ever show you one of those
                                paths. Forkwise shows you many of them, for your own data, in minutes.
                            </p>
                            <div>
                                <Link to="/learn/multiverse-analysis" className="fw-btn fw-btn-ghost">What is a multiverse analysis? <FaArrowRight /></Link>
                            </div>
                        </div>
                        <div className="teams-box">
                            <div className="teams-grid">
                                {teams.map((index) => (
                                    <span key={index} className={index < 20 ? "teams-cell teams-yes" : "teams-cell teams-no"}></span>
                                ))}
                            </div>
                            <div className="teams-legend">
                                <span><i className="teams-yes"></i>20 found an effect</span>
                                <span><i className="teams-no"></i>9 did not</span>
                            </div>
                            <div className="teams-range">
                                <span className="fw-muted" style={{ fontSize: 13 }}>Range of estimated odds ratios</span>
                                <div className="teams-range-bar"></div>
                                <div className="teams-range-labels"><span>0.89</span><span>2.93</span></div>
                            </div>
                            <p className="fw-muted fw-mono" style={{ fontSize: 12 }}>Silberzahn, Uhlmann et al., 2018</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead eyebrow="How it works" title="Three steps. No code." lead="The AI decides how to analyze. Python does every calculation. A judge reads all the results together." />
                    <div className="steps">
                        <div className="step">
                            <span className="step-num">01 · Upload</span>
                            <h3 className="mk-h3">Bring your data</h3>
                            <p>CSV, Excel or JSON. Several files can be joined on a common column or stacked year by year.</p>
                            <div className="step-code">
                                <span><b>countries.csv</b> · 173 rows</span>
                                <span><b>health.xlsx</b> · joined on country, year</span>
                            </div>
                        </div>
                        <div className="step">
                            <span className="step-num">02 · Ask</span>
                            <h3 className="mk-h3">Ask one question</h3>
                            <p>Write it in your own words. Forkwise matches your words to the right columns and shows which ones it chose.</p>
                            <div className="step-code">
                                <span><b>Y</b> life expectancy</span>
                                <span><b>X</b> GDP per person</span>
                            </div>
                        </div>
                        <div className="step">
                            <span className="step-num">03 · Verdict</span>
                            <h3 className="mk-h3">Get an honest answer</h3>
                            <p>Every analyst's estimate, the choices behind it, and one verdict with the rule that produced it.</p>
                            <div className="step-code">
                                <span><b>100%</b> same direction</span>
                                <span><b>verdict</b> robust</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead eyebrow="The platform" title="Everything you need to trust a result" lead="One run gives you a full report, not a single number." />
                    <div className="bento">
                        <div className="bento-card bento-big">
                            <span className="mk-card-icon"><FaChartLine /></span>
                            <h3 className="mk-h3">Specification curve</h3>
                            <p>Every analyst's effect in one chart, sorted from smallest to largest, with the choices that produced each dot right underneath.</p>
                            <div className="bento-visual"><SpecMini /></div>
                        </div>
                        <div className="bento-card">
                            <span className="mk-card-icon mk-card-icon-cyan"><FaRobot /></span>
                            <h3 className="mk-h3">Many minds</h3>
                            <p>Three open models and five analyst styles, from simple to control-heavy, so the analysts really differ.</p>
                            <div className="mk-tag-row" style={{ marginTop: 8 }}>
                                <span className="mk-tag">Llama 3.3 70B</span>
                                <span className="mk-tag">Llama 3.1 8B</span>
                                <span className="mk-tag">Mistral Small 3.1</span>
                                <span className="mk-tag">5 analyst styles</span>
                            </div>
                        </div>
                        <div className="bento-card">
                            <span className="mk-card-icon mk-card-icon-green"><FaCalculator /></span>
                            <h3 className="mk-h3">Real statistics</h3>
                            <p>pandas and statsmodels run every regression. The same choices always give the same numbers.</p>
                            <div className="step-code" style={{ marginTop: 8 }}>
                                <span>Y = a + <b>b</b>·X + c₁·control₁ + …</span>
                                <span><b>b</b> per 1 SD of X · p value</span>
                                <span>rows used · fewer than 30 ignored</span>
                            </div>
                        </div>
                        <div className="bento-card bento-big">
                            <span className="mk-card-icon mk-card-icon-cyan"><FaFileUpload /></span>
                            <h3 className="mk-h3">Data explorer with six fitted formulas</h3>
                            <p>Your real data with linear, quadratic, cubic, logarithmic, power and exponential fits, ranked by adjusted R². Draw on the chart and download it.</p>
                            <div className="bento-visual"><FitMini /></div>
                        </div>
                        <div className="bento-card bento-wide">
                            <span className="mk-card-icon"><FaComments /></span>
                            <h3 className="mk-h3">Forkwise Assistant</h3>
                            <p>Ask follow-up questions about any finished run: why analysts disagree, what the result means in plain words, or a chart of each analyst's effect.</p>
                            <Link to="/product/assistant" className="mk-card-more">Meet the Assistant →</Link>
                        </div>
                        <div className="bento-card bento-wide">
                            <span className="mk-card-icon mk-card-icon-amber"><FaShieldAlt /></span>
                            <h3 className="mk-h3">Every AI answer is checked</h3>
                            <p>Columns that do not exist, text columns and controls that leak the outcome are removed before any calculation runs.</p>
                            <Link to="/security" className="mk-card-more">Security and data →</Link>
                        </div>
                        <div className="bento-card">
                            <span className="mk-card-icon"><FaTable /></span>
                            <h3 className="mk-h3">Every choice, visible</h3>
                            <p>Controls, outlier rule, missing-value rule, effect, p value, rows used and the analyst's reason.</p>
                        </div>
                        <div className="bento-card">
                            <span className="mk-card-icon mk-card-icon-green"><FaDownload /></span>
                            <h3 className="mk-h3">Export</h3>
                            <p>Download charts as PNG. Export every analyst's result as CSV on paid plans.</p>
                        </div>
                        <div className="bento-card">
                            <span className="mk-card-icon mk-card-icon-cyan"><FaLink /></span>
                            <h3 className="mk-h3">Many files</h3>
                            <p>Join files on a common column, stack files with the same columns, or add files as context.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead center eyebrow="The verdict" title="Four answers, each with a written rule" lead="The judge counts how many analysts agree on the direction and how many found a real effect (p below 0.05). No black box." />
                    <div className="verdicts">
                        <div className="verdict verdict-robust">
                            <span className="fw-badge fw-badge-robust">robust</span>
                            <p>Almost every analyst found the same direction and a real effect.</p>
                            <p className="verdict-rule">≥ 90% same direction and ≥ 80% significant</p>
                        </div>
                        <div className="verdict verdict-fragile">
                            <span className="fw-badge fw-badge-fragile">fragile</span>
                            <p>Same direction, but many analysts could not show the effect is real.</p>
                            <p className="verdict-rule">≥ 85% same direction and ≥ 30% significant</p>
                        </div>
                        <div className="verdict verdict-choice">
                            <span className="fw-badge fw-badge-choice_dependent">choice dependent</span>
                            <p>The answer changes with the method, sometimes even the direction.</p>
                            <p className="verdict-rule">anything that is not one of the other three</p>
                        </div>
                        <div className="verdict verdict-none">
                            <span className="fw-badge fw-badge-no_effect">no effect</span>
                            <p>Almost no analyst found a real effect. The data does not support the link.</p>
                            <p className="verdict-rule">≤ 20% significant (checked first)</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead eyebrow="Why not just ask a chatbot?" title="One AI answer is one path. Forkwise walks many." />
                    <div className="cmp">
                        <table>
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>One analysis, or one chatbot answer</th>
                                    <th className="cmp-us">Forkwise</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Number of analyses</td>
                                    <td><FaTimes className="cmp-no" />One set of choices</td>
                                    <td className="cmp-us"><FaCheck className="cmp-yes" />10 to 100 independent analysts</td>
                                </tr>
                                <tr>
                                    <td>Who does the math</td>
                                    <td><FaTimes className="cmp-no" />Often the language model itself</td>
                                    <td className="cmp-us"><FaCheck className="cmp-yes" />Python, pandas and statsmodels</td>
                                </tr>
                                <tr>
                                    <td>Can you see the choices?</td>
                                    <td><FaTimes className="cmp-no" />Usually hidden in the answer</td>
                                    <td className="cmp-us"><FaCheck className="cmp-yes" />Every control, outlier and missing-value rule</td>
                                </tr>
                                <tr>
                                    <td>How sure is the answer?</td>
                                    <td><FaTimes className="cmp-no" />One number, no spread</td>
                                    <td className="cmp-us"><FaCheck className="cmp-yes" />Full spread and a rule-based verdict</td>
                                </tr>
                                <tr>
                                    <td>What the model sees</td>
                                    <td><FaTimes className="cmp-no" />Often the whole file</td>
                                    <td className="cmp-us"><FaEyeSlash className="cmp-yes" />A summary of columns, not your rows</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <div className="mk-split">
                        <div style={{ display: "grid", gap: 16 }}>
                            <p className="fw-eyebrow">Pricing</p>
                            <h2 className="mk-h2">Start free. Upgrade when you need more analysts.</h2>
                            <p className="mk-sublead">
                                Every plan uses the same method. Paid plans add more analysts per run, more daily runs and chat messages,
                                and CSV export.
                                {cheapest && " Paid plans start at $" + Number(cheapest.price) + " a month."}
                            </p>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <Link to="/pricing" className="fw-btn fw-btn-primary">Compare plans</Link>
                                <button className="fw-btn fw-btn-ghost" onClick={startNow}>Start free</button>
                            </div>
                        </div>
                        <div className="mk-panel">
                            {plansFailed ? (
                                <p className="fw-muted">The plan list could not be loaded right now. You can still see every plan on the <Link to="/pricing">pricing page</Link>.</p>
                            ) : plans.length === 0 ? (
                                <>
                                    <div className="fw-skeleton" style={{ height: 56 }}></div>
                                    <div className="fw-skeleton" style={{ height: 56 }}></div>
                                    <div className="fw-skeleton" style={{ height: 56 }}></div>
                                </>
                            ) : (
                                plans.map((plan) => (
                                    <div key={plan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 4px", borderBottom: "1px solid var(--line)" }}>
                                        <div>
                                            <b style={{ color: "#fff" }}>{plan.plan_type}</b>
                                            <p className="fw-muted" style={{ fontSize: 13 }}>
                                                {plan.daily_limit} runs a day · up to {plan.max_analysts} analysts · {plan.can_export ? "CSV export" : "no export"}
                                            </p>
                                        </div>
                                        <span className="fw-mono" style={{ color: "#fff", fontSize: 18 }}>
                                            ${Number(plan.price)}<span className="fw-muted" style={{ fontSize: 12 }}>{Number(plan.price) === 0 ? "" : "/mo"}</span>
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <div className="faq-layout">
                        <div style={{ display: "grid", gap: 14 }}>
                            <p className="fw-eyebrow">FAQ</p>
                            <h2 className="mk-h2">Questions people ask first</h2>
                            <p className="fw-muted">More answers in the <Link to="/faq">full FAQ</Link> and the <Link to="/docs">documentation</Link>.</p>
                        </div>
                        <div className="faq">
                            {FAQ.map((item, index) => (
                                <div key={item.q} className={openFaq === index ? "faq-item faq-open" : "faq-item"}>
                                    <button className="faq-q" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}>
                                        {item.q} <FaPlus />
                                    </button>
                                    {openFaq === index && <p className="faq-a">{item.a}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="mk-section">
                <div className="mk-wrap">
                    <div className="mk-final">
                        <p className="fw-eyebrow">Your first verdict is free</p>
                        <h2 className="mk-h2">Before you share a finding, find out if it holds up.</h2>
                        <p>Upload a file, ask one question, and see what 10 independent analysts say.</p>
                        <div className="lh-buttons">
                            <button className="fw-btn fw-btn-light fw-btn-lg" onClick={startNow}>{loggedIn ? "New analysis" : "Create a free account"}</button>
                            <Link to="/how-it-works" className="fw-btn fw-btn-ghost fw-btn-lg">How it works</Link>
                        </div>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
