import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
    FaPlus, FaThLarge, FaComments, FaBook, FaFlask, FaCheckCircle, FaExclamationTriangle, FaSyncAlt, FaArrowRight, FaFileCsv
} from "react-icons/fa"
import AppLayout, { useMe } from "../components/app/AppLayout"
import { getHistory } from "../api"
import { greeting, timeAgo, fileList, runState, stateLabel, countRuns, runsPerDay } from "../components/app/runTools"

function percent(part, total) {
    if (total === 0) {
        return 0
    }
    return (part / total) * 100
}

function Welcome() {
    const me = useMe()
    const navigate = useNavigate()
    const usage = me.usage
    let line = "Upload your data, ask one question, and let many AI analysts test how strong the answer really is."
    if (usage && !usage.unlimited) {
        line = "You have " + usage.left + " of " + usage.limit + " analyses left today on the " + usage.plan.plan_type + " plan."
    }
    if (usage && usage.unlimited) {
        line = "Admin account: no daily limit."
    }
    return (
        <section className="ax-welcome">
            <div>
                <h1>{greeting()}{me.name ? ", " + me.name : ""}</h1>
                <p>{line}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="fw-btn fw-btn-primary" onClick={() => navigate("/chat")}><FaPlus /> New analysis</button>
                <button className="fw-btn fw-btn-ghost" onClick={() => navigate("/assistant")}><FaComments /> Ask the Assistant</button>
            </div>
        </section>
    )
}

export default function Dashboard() {
    const navigate = useNavigate()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const data = await getHistory()
                if (data.Message === true) {
                    setHistory(data.data)
                }
            } catch (e) {
                setFailed(true)
            }
            setLoading(false)
        }
        load()
    }, [])

    const count = countRuns(history)
    const finished = count.robust + count.fragile + count.choice_dependent + count.no_effect
    const days = runsPerDay(history, 14)
    let biggest = 1
    for (const d of days) {
        if (d.total > biggest) {
            biggest = d.total
        }
    }

    return (
        <AppLayout title="Overview" crumbs={[{ label: "Overview" }]} noHead>
            <Welcome />

            <div className="ax-quick">
                <Link to="/chat"><FaPlus /><b>New analysis</b><span>Upload files and ask a question</span></Link>
                <Link to="/templates"><FaThLarge /><b>Start from a template</b><span>Example questions and sample data</span></Link>
                <Link to="/assistant"><FaComments /><b>Assistant</b><span>Chat with a finished run</span></Link>
                <Link to="/docs"><FaBook /><b>Documentation</b><span>How to read every chart</span></Link>
            </div>

            <div className="ax-stats">
                <div className="ax-stat">
                    <div className="ax-stat-top">Total runs <FaFlask /></div>
                    <b>{loading ? "–" : count.total}</b>
                    <small>All analyses you started</small>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Robust findings <FaCheckCircle style={{ color: "var(--green)" }} /></div>
                    <b>{loading ? "–" : count.robust}</b>
                    <small>{finished > 0 ? Math.round(percent(count.robust, finished)) + "% of finished runs" : "No finished runs yet"}</small>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Fragile or choice dependent <FaExclamationTriangle style={{ color: "var(--amber)" }} /></div>
                    <b>{loading ? "–" : count.fragile + count.choice_dependent}</b>
                    <small>Worth a second look</small>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Running now <FaSyncAlt style={{ color: "var(--cyan)" }} /></div>
                    <b>{loading ? "–" : count.running}</b>
                    <small>{count.failed > 0 ? count.failed + " failed" : "No failed runs"}</small>
                </div>
            </div>

            <div className="ax-grid-2">
                <section className="ax-card">
                    <div className="ax-card-head">
                        <div>
                            <h2>Recent runs</h2>
                            <p>Your latest analyses</p>
                        </div>
                        <Link to="/runs" className="fw-btn fw-btn-quiet fw-btn-sm">View all <FaArrowRight /></Link>
                    </div>
                    {loading ? (
                        <div style={{ padding: 20, display: "grid", gap: 10 }}>
                            <div className="fw-skeleton" style={{ height: 44 }}></div>
                            <div className="fw-skeleton" style={{ height: 44 }}></div>
                            <div className="fw-skeleton" style={{ height: 44 }}></div>
                        </div>
                    ) : failed ? (
                        <div className="fw-empty"><p>Could not load your runs. Please refresh the page.</p></div>
                    ) : history.length === 0 ? (
                        <div className="fw-empty">
                            <span className="fw-empty-icon"><FaFlask /></span>
                            <h3>Start your first analysis</h3>
                            <p>Upload a data file and ask one question. Or try a sample file from the templates.</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                                <button className="fw-btn fw-btn-primary" onClick={() => navigate("/chat")}><FaPlus /> New analysis</button>
                                <button className="fw-btn fw-btn-ghost" onClick={() => navigate("/templates")}><FaFileCsv /> Sample data</button>
                            </div>
                        </div>
                    ) : (
                        <div className="ax-list">
                            {history.slice(0, 6).map((run) => (
                                <div className="ax-row" key={run.id} onClick={() => navigate("/runs/" + run.id)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") navigate("/runs/" + run.id) }}>
                                    <span className="ax-row-id">#{run.id}</span>
                                    <div className="ax-row-main">
                                        <p className="ax-row-title">{run.question}</p>
                                        <p className="ax-row-meta">{fileList(run.filename).length} file(s) · {timeAgo(run.created_at)}</p>
                                    </div>
                                    <span className={"fw-badge fw-badge-" + runState(run)}>{stateLabel(runState(run))}</span>
                                    <span className="ax-row-arrow">›</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <div style={{ display: "grid", gap: 18 }}>
                    <section className="ax-card ax-card-pad">
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}>How strong are your findings?</h2>
                        <p className="fw-muted" style={{ fontSize: 13, marginBottom: 14 }}>{finished} finished runs</p>
                        <div className="ax-split">
                            <span className="c-robust" style={{ width: percent(count.robust, finished) + "%" }}></span>
                            <span className="c-fragile" style={{ width: percent(count.fragile, finished) + "%" }}></span>
                            <span className="c-choice" style={{ width: percent(count.choice_dependent, finished) + "%" }}></span>
                            <span className="c-none" style={{ width: percent(count.no_effect, finished) + "%" }}></span>
                        </div>
                        <div className="ax-legend">
                            <div><i className="ax-dot c-robust"></i>Robust<b>{count.robust}</b></div>
                            <div><i className="ax-dot c-fragile"></i>Fragile<b>{count.fragile}</b></div>
                            <div><i className="ax-dot c-choice"></i>Choice dependent<b>{count.choice_dependent}</b></div>
                            <div><i className="ax-dot c-none"></i>No effect<b>{count.no_effect}</b></div>
                        </div>
                    </section>

                    <section className="ax-card ax-card-pad">
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Activity</h2>
                        <p className="fw-muted" style={{ fontSize: 13 }}>Runs started in the last 14 days</p>
                        <div className="ax-bars">
                            {days.map((d) => (
                                <div className="ax-bar-col" key={d.key} title={d.date.toDateString() + ": " + d.total + " runs"}>
                                    <b>{d.total > 0 ? d.total : ""}</b>
                                    <div className={d.total > 0 ? "ax-bar" : "ax-bar ax-bar-empty"} style={{ height: d.total > 0 ? (d.total / biggest) * 100 + "%" : "2px" }}></div>
                                    <small>{d.label}</small>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    )
}
