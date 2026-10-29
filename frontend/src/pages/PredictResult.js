import React, { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { FaDownload, FaLock, FaComments, FaFileAlt } from "react-icons/fa"
import AppLayout from "../components/app/AppLayout"
import "../styles/Result.css"
import { getRun, getMe, downloadRunCsv } from "../api"
import { shortName } from "../components/chartTools"
import DataExplorer from "../components/DataExplorer"
import CorrelationChart from "../components/CorrelationChart"
import SpecCurve from "../components/SpecCurve"
import RunChat from "../components/RunChat"
import { formatDate, fileList, stateLabel, VERDICT_TEXT } from "../components/app/runTools"

function formatP(p) {
    if (p === null) {
        return "-"
    }
    if (p < 0.001) {
        return "< 0.001"
    }
    return p.toFixed(3)
}

function verdictMessage(verdict) {
    if (VERDICT_TEXT[verdict]) {
        return VERDICT_TEXT[verdict]
    }
    return "There were not enough valid analysts to decide."
}

function verdictRule(verdict) {
    if (verdict === "robust") {
        return "Rule: at least 90% agree on the direction and at least 80% found p below 0.05."
    }
    if (verdict === "fragile") {
        return "Rule: at least 85% agree on the direction and at least 30% found p below 0.05."
    }
    if (verdict === "no_effect") {
        return "Rule: 20% or fewer analysts found p below 0.05."
    }
    if (verdict === "choice_dependent") {
        return "Rule: the result did not meet the robust, fragile or no effect rules."
    }
    return ""
}

function Result() {
    const navigate = useNavigate()
    const { id } = useParams()
    const [run, setRun] = useState(null)
    const [analysts, setAnalysts] = useState([])
    const [error, setError] = useState("")
    const [openReason, setOpenReason] = useState(null)
    const [canExport, setCanExport] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState("")

    useEffect(() => {
        async function load() {
            try {
                const data = await getRun(id)
                if (data.Message === "login") {
                    navigate("/auth/login")
                } else if (data.Message === true) {
                    setRun(data.run)
                    setAnalysts(data.analysts)
                } else {
                    setError("This analysis was not found.")
                }
            } catch (e) {
                setError("Could not connect to the server.")
            }
        }
        load()
    }, [id, navigate])

    useEffect(() => {
        async function loadPlan() {
            const data = await getMe()
            if (data.Message === true) {
                setCanExport(data.usage.unlimited || data.usage.plan.can_export)
            }
        }
        loadPlan()
    }, [])

    async function HandleExport() {
        setExportError("")
        setExporting(true)
        const result = await downloadRunCsv(id)
        setExporting(false)
        if (result.upgrade) {
            navigate("/pricing")
        } else if (!result.ok) {
            setExportError(result.error)
        }
    }

    if (error !== "") {
        return (
            <div className="ax-card fw-empty">
                <h3>{error}</h3>
                <p>Check the run number, or go back to your runs.</p>
                <Link to="/runs" className="fw-btn fw-btn-ghost">All runs</Link>
            </div>
        )
    }

    if (run === null) {
        return (
            <div style={{ display: "grid", gap: 16 }}>
                <div className="fw-skeleton" style={{ height: 190 }}></div>
                <div className="fw-skeleton" style={{ height: 90 }}></div>
                <div className="fw-skeleton" style={{ height: 420 }}></div>
            </div>
        )
    }

    const effects = analysts.filter((a) => a.effect !== null).map((a) => a.effect)
    const files = fileList(run.filename)
    const chart = run.chart

    let smallest = null
    let largest = null
    if (effects.length > 0) {
        smallest = Math.min(...effects)
        largest = Math.max(...effects)
    }

    let spread = "-"
    if (smallest !== null && smallest > 0) {
        spread = (largest / smallest).toFixed(1) + "×"
    }

    let biggestSize = 0
    for (const e of effects) {
        if (Math.abs(e) > biggestSize) {
            biggestSize = Math.abs(e)
        }
    }
    if (biggestSize === 0) {
        biggestSize = 1
    }

    const verdictClass = run.verdict ? "rs-verdict rs-verdict-" + run.verdict : "rs-verdict"
    const agree = Number(run.agree) || 0
    const significant = Number(run.significant) || 0

    return (
        <>
            <section className="ax-card rs-hero">
                <div className="rs-hero-main">
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="fw-eyebrow">Run #{run.id}</span>
                        <span className={"fw-badge fw-badge-" + (run.status === "complete" ? "accent" : run.status)}>{run.status}</span>
                        {run.created_at && <span className="fw-muted" style={{ fontSize: 13 }}>{formatDate(run.created_at)}</span>}
                    </div>
                    <h1>{run.question}</h1>
                    <div className="rs-vars">
                        <div className="rs-var">
                            <span className="rs-var-tag rs-var-y">Y</span>
                            <div>
                                <small>Outcome</small>
                                <b title={run.outcome}>{run.outcome}</b>
                            </div>
                        </div>
                        <div className="rs-var">
                            <span className="rs-var-tag rs-var-x">X</span>
                            <div>
                                <small>Main variable</small>
                                <b title={run.main_variable}>{run.main_variable}</b>
                            </div>
                        </div>
                    </div>
                    <div className="rs-files">
                        {files.map((f) => (
                            <span className="fw-badge fw-badge-plain" key={f} title={f}><FaFileAlt style={{ fontSize: 10 }} /> {f}</span>
                        ))}
                    </div>
                </div>
                <div className={verdictClass}>
                    <span className="fw-eyebrow">Verdict</span>
                    <span className="rs-verdict-word">{run.verdict ? stateLabel(run.verdict) : run.status === "running" ? "Running" : "-"}</span>
                    <p>{run.status === "running" ? "The analysts are still working. Refresh this page in a minute." : verdictMessage(run.verdict)}</p>
                    {verdictRule(run.verdict) !== "" && <p className="fw-mono" style={{ fontSize: 12, color: "var(--muted)" }}>{verdictRule(run.verdict)}</p>}
                </div>
            </section>

            <div className="rs-stats">
                <div className="ax-stat">
                    <div className="ax-stat-top">Analysts</div>
                    <b>{run.analysts}</b>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Same direction</div>
                    <b>{run.agree}%</b>
                    <div className="rs-meter"><span style={{ width: Math.min(100, agree) + "%", background: "var(--green)" }}></span></div>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Significant</div>
                    <b>{run.significant}%</b>
                    <div className="rs-meter"><span style={{ width: Math.min(100, significant) + "%" }}></span></div>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Middle effect</div>
                    <b>{run.middle_effect}</b>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Effect range</div>
                    <b style={{ fontSize: 20 }}>{smallest === null ? "-" : smallest.toFixed(2) + " – " + largest.toFixed(2)}</b>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Largest ÷ smallest</div>
                    <b>{spread}</b>
                </div>
            </div>

            <div className="rs-section-title"><h2>Specification curve and correlations</h2></div>
            <div className="ChartGrid">
                <SpecCurve analysts={analysts} middleEffect={run.middle_effect} runId={run.id} canExport={canExport} />
                {chart && chart.columns && (
                    <CorrelationChart chart={chart} outcome={run.outcome} runId={run.id} canExport={canExport} />
                )}
            </div>

            <div className="rs-section-title"><h2>Your data</h2></div>
            {chart && chart.columns ? (
                <DataExplorer
                    chart={chart}
                    outcome={run.outcome}
                    mainVariable={run.main_variable}
                    middleEffect={run.middle_effect}
                    runId={run.id}
                    canExport={canExport}
                />
            ) : (
                <section className="ax-card ax-card-pad">
                    <p className="fw-muted">This run has no saved data. Run the analysis again to see charts of your data.</p>
                </section>
            )}

            <div className="rs-section-title">
                <h2>What each analyst chose</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="fw-muted" style={{ fontSize: 13 }}>{analysts.length} analysts</span>
                    {canExport ? (
                        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={HandleExport} disabled={exporting}>
                            <FaDownload /> {exporting ? "Exporting..." : "Export CSV"}
                        </button>
                    ) : (
                        <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => navigate("/pricing")}>
                            <FaLock /> Export CSV (Pro)
                        </button>
                    )}
                </div>
            </div>

            {exportError !== "" && <div className="fw-alert fw-alert-error">{exportError}</div>}

            <div className="fw-table-wrap" style={{ background: "var(--surface)" }}>
                <table className="fw-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Controls</th>
                            <th>Outliers</th>
                            <th>Missing</th>
                            <th>Effect</th>
                            <th>p value</th>
                            <th>Reason</th>
                            <th style={{ textAlign: "right" }}>Rows</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analysts.map((a) => (
                            <tr key={a.analyst_number}>
                                <td><span className="AnalystNumber">{a.analyst_number}</span></td>
                                <td>
                                    {a.covariates.length === 0 ? (
                                        <span className="fw-muted">None</span>
                                    ) : (
                                        <div className="ChipList">
                                            {a.covariates.map((c) => (
                                                <span className="ControlChip" key={c} title={c}>{shortName(c, 24)}</span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td><span className="ChoiceText" title={a.outliers}>{a.outliers === null ? "-" : a.outliers}</span></td>
                                <td><span className="ChoiceText" title={a.missing}>{a.missing === null ? "-" : a.missing}</span></td>
                                <td>
                                    {a.effect === null ? (
                                        <span className="fw-muted">-</span>
                                    ) : (
                                        <div className="EffectCell">
                                            <span className={a.effect >= 0 ? "EffectNumber EffectPlus" : "EffectNumber EffectMinus"}>{Number(a.effect).toFixed(3)}</span>
                                            <span className="EffectTrack">
                                                <span className="EffectZero"></span>
                                                <span
                                                    className={a.effect >= 0 ? "EffectBar EffectBarPlus" : "EffectBar EffectBarMinus"}
                                                    style={{ width: (Math.abs(a.effect) / biggestSize) * 50 + "%" }}
                                                ></span>
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <span className={a.p_value !== null && a.p_value < 0.05 ? "PPill PGood" : "PPill PWeak"}>{formatP(a.p_value)}</span>
                                </td>
                                <td>
                                    {a.reason ? (
                                        <button className="fw-btn fw-btn-quiet fw-btn-sm" onClick={() => setOpenReason(openReason === a.analyst_number ? null : a.analyst_number)}>
                                            {openReason === a.analyst_number ? "Hide" : "Show"}
                                        </button>
                                    ) : (
                                        <span className="fw-muted">—</span>
                                    )}
                                </td>
                                <td style={{ textAlign: "right" }} className="fw-muted fw-mono">{a.rows_used === null ? "-" : a.rows_used.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {openReason !== null && (
                <div className="ax-card ax-card-pad" style={{ display: "grid", gap: 6 }}>
                    <span className="fw-eyebrow">Analyst #{openReason}: why this choice?</span>
                    <p style={{ color: "var(--text-2)", whiteSpace: "pre-wrap" }}>
                        {analysts.find((a) => a.analyst_number === openReason)?.reason || "No reason provided."}
                    </p>
                </div>
            )}

            <div className="Legend">
                <span><span className="LegendDot EffectPlusBg"></span>Positive effect</span>
                <span><span className="LegendDot EffectMinusBg"></span>Negative effect</span>
                <span><span className="LegendDot DotSignificantBg"></span>p below 0.05 means the effect is probably real</span>
            </div>

            {run.status === "complete" && <RunChat runId={run.id} />}
        </>
    )
}

export default function PredictResult() {
    const { id } = useParams()
    const navigate = useNavigate()
    return (
        <AppLayout
            wide
            title={"Run #" + id}
            noHead
            crumbs={[{ label: "Runs", to: "/runs" }, { label: "Run #" + id }]}
        >
            <div className="ap-page-head">
                <div>
                    <h1 className="ap-title">Analysis result</h1>
                    <p className="ap-sub">Every number below was calculated in Python from the analysts' choices.</p>
                </div>
                <div className="ap-page-actions">
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => navigate("/assistant/" + id)}><FaComments /> Open in Assistant</button>
                </div>
            </div>
            <Result />
        </AppLayout>
    )
}
