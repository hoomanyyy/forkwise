import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Result.css"
import Logo from "../images/logo.svg"
import Seo from "../components/Seo"
import { useNavigate, useParams } from "react-router-dom"
import { getRun } from "../api"
import { shortName } from "../components/chartTools"
import DataExplorer from "../components/DataExplorer"
import CorrelationChart from "../components/CorrelationChart"
import SpecCurve from "../components/SpecCurve"

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
    if (verdict === "robust") {
        return "Almost all analysts found the same direction, and most of them found a real effect."
    }
    if (verdict === "fragile") {
        return "Analysts agree on the direction, but many of them could not show the effect is real."
    }
    if (verdict === "choice_dependent") {
        return "The answer changes depending on the choices each analyst made."
    }
    if (verdict === "no_effect") {
        return "Almost no analyst found a real effect. With these choices, the data does not support this link."
    }
    return "There were not enough valid analysts to decide."
}

export default function PredictResult() {
    const navigate = useNavigate()
    const { id } = useParams()
    const [run, setRun] = useState(null)
    const [analysts, setAnalysts] = useState([])
    const [error, setError] = useState("")
    const [openReason, setOpenReason] = useState(null)

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

    if (error !== "") {
        return (
            <div className="ResultPage">
                <Seo title="Analysis result | Forkwise" noindex />
                <div className="ResultError">{error}</div>
            </div>
        )
    }

    if (run === null) {
        return (
            <div className="ResultPage">
                <Seo title="Analysis result | Forkwise" noindex />
                <p className="Muted">Loading...</p>
            </div>
        )
    }

    const effects = analysts.filter((a) => a.effect !== null).map((a) => a.effect)
    const files = run.filename ? run.filename.split(", ") : []
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

    return (
        <div className="ResultPage">
            <Seo title="Analysis result | Forkwise" noindex />
            <header className="ResultHeader">
                <div className="d-flex align-items-center gap-3">
                    <img src={Logo} alt="Logo" className="ResultLogo" />
                    <div>
                        <p className="Eyebrow mb-0">Analysis result</p>
                        <h5 className="ResultTitle mb-0">Run #{run.id}</h5>
                    </div>
                </div>
                <button className="btn ResultBack" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
            </header>

            <div className="ResultBody">
                <section className="ResultCard SummaryCard">
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <p className="Eyebrow mb-0">Research question</p>
                            <span className="StatusPill">{run.status}</span>
                        </div>
                        <h3 className="Question">{run.question}</h3>
                        <div className="VariableRow">
                            <div className="Variable">
                                <span className="VariableTag TagY">Y</span>
                                <div>
                                    <p className="Muted small mb-0">Outcome</p>
                                    <p className="VariableName" title={run.outcome}>{run.outcome}</p>
                                </div>
                            </div>
                            <div className="Variable">
                                <span className="VariableTag TagX">X</span>
                                <div>
                                    <p className="Muted small mb-0">Main variable</p>
                                    <p className="VariableName" title={run.main_variable}>{run.main_variable}</p>
                                </div>
                            </div>
                        </div>
                        <div className="FileRow">
                            {files.map((f) => (
                                <span className="FileChip" key={f} title={f}>{f}</span>
                            ))}
                        </div>
                    </div>
                    <div className="SummaryRight">
                        <p className="Eyebrow">Verdict</p>
                        <span className={"VerdictBadge Verdict-" + run.verdict}>{run.verdict ? run.verdict.replaceAll("_", " ") : "-"}</span>
                        <p className="VerdictText">{verdictMessage(run.verdict)}</p>
                    </div>
                </section>

                <section className="StatGrid">
                    <div className="StatBox">
                        <p className="StatLabel">Analysts</p>
                        <p className="StatNumber">{run.analysts}</p>
                    </div>
                    <div className="StatBox">
                        <p className="StatLabel">Same direction</p>
                        <p className="StatNumber">{run.agree}%</p>
                    </div>
                    <div className="StatBox">
                        <p className="StatLabel">Significant</p>
                        <p className="StatNumber">{run.significant}%</p>
                    </div>
                    <div className="StatBox">
                        <p className="StatLabel">Middle effect</p>
                        <p className="StatNumber">{run.middle_effect}</p>
                    </div>
                    <div className="StatBox">
                        <p className="StatLabel">Effect range</p>
                        <p className="StatNumber">{smallest === null ? "-" : smallest.toFixed(2) + " – " + largest.toFixed(2)}</p>
                    </div>
                    <div className="StatBox">
                        <p className="StatLabel">Largest ÷ smallest</p>
                        <p className="StatNumber">{spread}</p>
                    </div>
                </section>

                {chart && chart.columns ? (
                    <DataExplorer
                        chart={chart}
                        outcome={run.outcome}
                        mainVariable={run.main_variable}
                        middleEffect={run.middle_effect}
                        runId={run.id}
                    />
                ) : (
                    <section className="ResultCard">
                        <p className="Eyebrow">Data explorer</p>
                        <p className="Muted mb-0">This run has no saved data. Run the analysis again to see charts of your data.</p>
                    </section>
                )}

                <div className="ChartGrid">
                    <SpecCurve analysts={analysts} middleEffect={run.middle_effect} runId={run.id} />
                    {chart && chart.columns && (
                        <CorrelationChart chart={chart} outcome={run.outcome} runId={run.id} />
                    )}
                </div>
<section className="ResultCard">
    <div className="CardTop">
        <div>
            <p className="Eyebrow mb-1">Analyst choices</p>
            <p className="ResultCardTitle">What each analyst chose</p>
        </div>
        <span className="TableCount">{analysts.length} analysts</span>
    </div>

    <div className="AnalystTableWrap">
        <table className="AnalystTable">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Controls</th>
                    <th>Outliers</th>
                    <th>Missing</th>
                    <th>Effect</th>
                    <th>p value</th>
                    <th>Reason</th>
                    <th className="AlignRight">Rows</th>
                </tr>
            </thead>
            <tbody>
                {analysts.map((a) => (
                    <tr key={a.analyst_number}>
                        <td>
                            <span className="AnalystNumber">{a.analyst_number}</span>
                        </td>
                        <td>
                            {a.covariates.length === 0 ? (
                                <span className="Muted">None</span>
                            ) : (
                                <div className="ChipList">
                                    {a.covariates.map((c) => (
                                        <span className="ControlChip" key={c} title={c}>
                                            {shortName(c, 24)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </td>
                        <td>
                            <span className="ChoiceText" title={a.outliers}>
                                {a.outliers === null ? "-" : a.outliers}
                            </span>
                        </td>
                        <td>
                            <span className="ChoiceText" title={a.missing}>
                                {a.missing === null ? "-" : a.missing}
                            </span>
                        </td>
                        <td>
                            {a.effect === null ? (
                                <span className="Muted">-</span>
                            ) : (
                                <div className="EffectCell">
                                    <span className={a.effect >= 0 ? "EffectNumber EffectPlus" : "EffectNumber EffectMinus"}>
                                        {Number(a.effect).toFixed(3)}
                                    </span>
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
                            <span className={a.p_value !== null && a.p_value < 0.05 ? "PPill PGood" : "PPill PWeak"}>
                                {formatP(a.p_value)}
                            </span>
                        </td>
                        <td>
                            {a.reason ? (
                                <button
                                    className="btn btn-sm ReasonToggle"
                                    onClick={() =>
                                        setOpenReason(
                                            openReason === a.analyst_number ? null : a.analyst_number
                                        )
                                    }
                                >
                                    {openReason === a.analyst_number ? "Hide" : "Show"}
                                </button>
                            ) : (
                                <span className="Muted">—</span>
                            )}
                        </td>
                        <td className="AlignRight Muted">
                            {a.rows_used === null ? "-" : a.rows_used.toLocaleString()}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>

    {openReason !== null && (
        <div className="ReasonBox mt-3">
            <p className="Eyebrow mb-1">
                Analyst #{openReason} — Why this choice?
            </p>
            <p className="ReasonText">
                {analysts.find((a) => a.analyst_number === openReason)?.reason || "No reason provided."}
            </p>
        </div>
    )}

    <div className="Legend">
        <span><span className="LegendDot EffectPlusBg"></span>Positive effect</span>
        <span><span className="LegendDot EffectMinusBg"></span>Negative effect</span>
        <span><span className="LegendDot DotSignificantBg"></span>p below 0.05 means the effect is probably real</span>
    </div>
</section>

            </div>
        </div>
    )
}
