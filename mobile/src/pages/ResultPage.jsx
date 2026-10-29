import React, { useState, useEffect } from "react"
import { FiRefreshCw, FiChevronDown, FiChevronUp, FiMessageCircle } from "react-icons/fi"
import { TopBar, SpecCurve, ScatterChart, formatNumber } from "../components/Parts"
import { getRun } from "../api"
import { verdictInfo } from "../verdicts"
import { tap } from "../native"
import "../styles/Result.css"

function niceName(text) {
    return text ? String(text).replaceAll("_", " ") : "-"
}

function AnalystCard({ a }) {
    const [open, setOpen] = useState(false)
    const real = a.p_value !== null && a.p_value < 0.05
    return (
        <div className="ResAnalyst">
            <button className="ResAnalystHead" onClick={() => { tap(); setOpen(!open) }}>
                <span className="ResAnalystNo">#{a.analyst_number}</span>
                <span className="ResAnalystMain">
                    <b style={{ color: a.effect === null ? "#7f84a8" : a.effect >= 0 ? "#34d399" : "#f87171" }}>
                        {a.effect === null ? "No result" : (a.effect > 0 ? "+" : "") + formatNumber(a.effect)}
                    </b>
                    <small>{a.p_value === null ? "" : (a.p_value < 0.001 ? "p < 0.001" : "p = " + formatNumber(a.p_value)) + (real ? " · real effect" : " · not significant")}</small>
                </span>
                {open ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {open && (
                <div className="ResAnalystBody AppFadeIn">
                    <p className="ResSmallTitle">Controls</p>
                    <div className="ResTags">
                        {a.covariates.length === 0 && <span className="ResTag">none</span>}
                        {a.covariates.map((c) => <span key={c} className="ResTag">{c}</span>)}
                    </div>
                    <div className="ResPair">
                        <span>Outliers <b>{niceName(a.outliers)}</b></span>
                        <span>Missing <b>{niceName(a.missing)}</b></span>
                        <span>Rows <b>{a.rows_used === null ? "-" : a.rows_used}</b></span>
                    </div>
                    {a.reason && <p className="ResReason">"{a.reason}"</p>}
                </div>
            )}
        </div>
    )
}

export default function ResultPage({ runId, onBack, onAsk }) {
    const [run, setRun] = useState(null)
    const [analysts, setAnalysts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    async function load() {
        setLoading(true)
        setError("")
        const result = await getRun(runId)
        setLoading(false)
        if (result.Message === true) {
            setRun(result.run)
            setAnalysts(result.analysts || [])
        } else if (result.Error) {
            setError("Could not connect to the server.")
        } else {
            setError("This analysis was not found.")
        }
    }

    useEffect(() => {
        load()
    }, [runId])

    const info = run ? verdictInfo(run) : null

    return (
        <div className="AppScreen AppSlideIn">
            <TopBar
                title={"Run #" + runId}
                onBack={onBack}
                right={
                    <button className={loading ? "AppIconButton ResSpin" : "AppIconButton"} onClick={load} aria-label="Refresh">
                        <FiRefreshCw />
                    </button>
                }
            />

            {error !== "" && <div className="AppError">{error}</div>}

            {loading && !run && (
                <div className="ResLoading">
                    <span className="AppSpinner"></span>
                </div>
            )}

            {run && (
                <div className="AppFadeIn">
                    <p className="ResQuestion">{run.question}</p>
                    <div className="ResVars">
                        <span><i>Y</i>{run.outcome || "-"}</span>
                        <span><i>X</i>{run.main_variable || "-"}</span>
                    </div>

                    <section className="ResHero" style={{ background: info.soft, borderColor: info.color }}>
                        <p className="ResHeroLabel">Verdict</p>
                        <h2 className="ResHeroVerdict" style={{ color: info.color }}>{info.label}</h2>
                        <p className="ResHeroText">{info.text}</p>
                    </section>

                    {run.status === "complete" && onAsk && (
                        <button className="ResAsk" onClick={() => { tap(); onAsk(run) }}>
                            <span><FiMessageCircle /></span>
                            <span className="ResAskText">
                                <b>Ask the Assistant</b>
                                <small>Explain this result, compare analysts, draw a chart</small>
                            </span>
                        </button>
                    )}

                    {run.status === "complete" && (
                        <div className="ResStats">
                            <div><b>{run.analysts}</b><span>Analysts</span></div>
                            <div><b>{run.agree}%</b><span>Same direction</span></div>
                            <div><b>{run.significant}%</b><span>Real effect</span></div>
                            <div><b>{formatNumber(run.middle_effect)}</b><span>Middle effect</span></div>
                        </div>
                    )}

                    {analysts.length > 0 && (
                        <section className="AppCard">
                            <h3 className="ResCardTitle">Effect found by each analyst</h3>
                            <p className="ResCardText">Each dot is one AI analyst. Green means a real effect (p below 0.05).</p>
                            <SpecCurve analysts={analysts} />
                        </section>
                    )}

                    {run.chart && (
                        <section className="AppCard">
                            <h3 className="ResCardTitle">Your data</h3>
                            <p className="ResCardText">{niceName(run.outcome)} against {niceName(run.main_variable)}, with a straight line.</p>
                            <ScatterChart chart={run.chart} outcome={run.outcome} mainVariable={run.main_variable} />
                        </section>
                    )}

                    {analysts.length > 0 && (
                        <>
                            <div className="AppSectionTitle"><span>What each analyst chose</span></div>
                            {analysts.map((a) => <AnalystCard key={a.analyst_number} a={a} />)}
                        </>
                    )}

                    <p className="ResNote">Forkwise finds connections in data, not causes. A robust result is still not proof that X causes Y.</p>
                </div>
            )}
        </div>
    )
}
