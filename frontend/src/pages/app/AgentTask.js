import React, { useEffect, useRef, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { FaCheck, FaTimes, FaDownload, FaRedo, FaCopy, FaShieldAlt, FaExclamationTriangle, FaQuestion, FaBug } from "react-icons/fa"
import AppLayout from "../../components/app/AppLayout"
import { getAgentTask, runAgentAgain, downloadAgentPatch } from "../../api"
import { formatDate } from "../../components/app/runTools"
import { VERDICT_TEXT, statusBadge, repoName } from "./Agent"
import "../../styles/agent.css"

const VERDICT_INFO = {
    verified: { icon: FaShieldAlt, color: "var(--green)", soft: "var(--green-soft)" },
    fragile: { icon: FaExclamationTriangle, color: "var(--amber)", soft: "var(--amber-soft)" },
    choice_dependent: { icon: FaQuestion, color: "var(--red)", soft: "var(--red-soft)" },
    failing: { icon: FaBug, color: "var(--muted)", soft: "rgba(255,255,255,0.05)" }
}

function DiffView({ diff }) {
    if (!diff) {
        return <p className="fw-muted" style={{ padding: 16 }}>No changes.</p>
    }
    const lines = diff.split("\n").slice(0, 3000)
    return (
        <pre className="ag-diff">
            {lines.map((line, i) => {
                let cls = "ag-diff-plain"
                if (line.startsWith("diff --git")) {
                    cls = "ag-diff-file"
                } else if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("index ") || line.startsWith("new file")) {
                    cls = "ag-diff-plain fw-muted"
                } else if (line.startsWith("+")) {
                    cls = "ag-diff-add"
                } else if (line.startsWith("-")) {
                    cls = "ag-diff-del"
                } else if (line.startsWith("@@")) {
                    cls = "ag-diff-hunk"
                }
                return <div key={i} className={cls}>{line || " "}</div>
            })}
        </pre>
    )
}

function Matrix({ forks, checks }) {
    if (checks.length === 0) {
        return <p className="fw-muted" style={{ fontSize: 14 }}>No cross checks were run. This happens when fewer than two forks passed their own tests, or the forks did not write tests.</p>
    }
    const numbers = forks.map((f) => f.fork_no)

    function cell(from, to) {
        if (from === to) {
            return <td key={to} className="ag-cell-none">—</td>
        }
        const check = checks.find((c) => c.tests_from === from && c.code_of === to)
        if (!check) {
            return <td key={to} className="ag-cell-none">·</td>
        }
        return check.passed
            ? <td key={to} className="ag-cell-ok"><FaCheck /></td>
            : <td key={to} className="ag-cell-bad" title={check.output || ""}><FaTimes /></td>
    }

    return (
        <div style={{ overflowX: "auto" }}>
            <table className="ag-matrix">
                <thead>
                    <tr>
                        <th>Tests of ↓ / code of →</th>
                        {numbers.map((n) => <th key={n}>Fork {n}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {numbers.map((from) => (
                        <tr key={from}>
                            <th>Fork {from}</th>
                            {numbers.map((to) => cell(from, to))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function VerdictCard({ task, onAgain }) {
    const [answer, setAnswer] = useState("")
    const [sending, setSending] = useState(false)
    const [message, setMessage] = useState("")
    const [copied, setCopied] = useState(false)

    if (task.status === "failed") {
        return (
            <section className="ax-card ax-card-pad">
                <div className="fw-alert fw-alert-error">The task could not run: {task.error || "unknown error"}</div>
                <div className="ag-actions">
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => onAgain("", setMessage)}><FaRedo /> Run it again</button>
                </div>
                {message && <p className="fw-hint" style={{ marginTop: 8 }}>{message}</p>}
            </section>
        )
    }
    if (task.status !== "done") {
        return null
    }

    const info = VERDICT_INFO[task.verdict] || VERDICT_INFO.failing
    const Icon = info.icon

    async function again() {
        setSending(true)
        await onAgain(answer, setMessage)
        setSending(false)
    }

    function copyCommand() {
        navigator.clipboard.writeText("git apply forkwise-task-" + task.id + ".patch")
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <section className="ax-card ax-card-pad">
            <div className="ag-verdict">
                <span className="ag-verdict-icon" style={{ background: info.soft, color: info.color }}><Icon /></span>
                <div>
                    <div className="ag-verdict-title">{VERDICT_TEXT[task.verdict]}</div>
                    <p>{task.summary}</p>
                    {task.chosen_fork && <p className="fw-muted" style={{ fontSize: 13, marginTop: 6 }}>Patch taken from fork {task.chosen_fork}.</p>}
                </div>
            </div>

            {task.question && (
                <div className="ag-question">
                    <b>Forkwise needs your choice</b>
                    <p>{task.question}</p>
                    <textarea className="fw-textarea" rows={2} placeholder="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
                    <button className="fw-btn fw-btn-primary fw-btn-sm" style={{ justifySelf: "start" }} disabled={sending || answer.trim() === ""} onClick={again}>
                        {sending ? <span className="fw-spinner"></span> : <><FaRedo /> Run again with my answer</>}
                    </button>
                </div>
            )}

            <div className="ag-actions">
                {task.patch && <button className="fw-btn fw-btn-primary fw-btn-sm" onClick={() => downloadAgentPatch(task.id)}><FaDownload /> Download patch</button>}
                {task.patch && <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={copyCommand}><FaCopy /> {copied ? "Copied" : "Copy git apply command"}</button>}
                {!task.question && <button className="fw-btn fw-btn-quiet fw-btn-sm" onClick={() => onAgain("", setMessage)}><FaRedo /> Run again</button>}
            </div>
            {message && <p className="fw-hint" style={{ marginTop: 8 }}>{message}</p>}
        </section>
    )
}

export default function AgentTask() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [task, setTask] = useState(null)
    const [forks, setForks] = useState([])
    const [checks, setChecks] = useState([])
    const [events, setEvents] = useState([])
    const [missing, setMissing] = useState(false)
    const [logFilter, setLogFilter] = useState("all")
    const [openDiff, setOpenDiff] = useState(null)
    const lastEvent = useRef(0)
    const logBox = useRef(null)

    useEffect(() => {
        let stopped = false
        let timer = null
        lastEvent.current = 0
        setEvents([])

        async function load() {
            const data = await getAgentTask(id, lastEvent.current)
            if (stopped) {
                return
            }
            if (data.Message === "login") {
                navigate("/auth/login")
                return
            }
            if (data.Message !== true) {
                if (!data.Error) {
                    setMissing(true)
                    return
                }
            } else {
                setTask(data.task)
                setForks(data.forks)
                setChecks(data.checks)
                if (data.events.length > 0) {
                    lastEvent.current = data.events[data.events.length - 1].id
                    setEvents((old) => [...old, ...data.events])
                }
                if (data.task.status === "done" || data.task.status === "failed") {
                    return
                }
            }
            timer = setTimeout(load, 2000)
        }
        load()

        return () => {
            stopped = true
            clearTimeout(timer)
        }
    }, [id, navigate])

    useEffect(() => {
        if (logBox.current) {
            logBox.current.scrollTop = logBox.current.scrollHeight
        }
    }, [events, logFilter])

    async function again(answer, setMessage) {
        const result = await runAgentAgain(id, answer)
        if (result.Message === true) {
            navigate("/agent/" + result.id)
        } else {
            setMessage(result.error || "Could not start the task again.")
        }
    }

    if (missing) {
        return (
            <AppLayout title="Agent task" crumbs={[{ label: "Agent", to: "/agent" }, { label: "#" + id }]}>
                <div className="fw-empty"><p>This task was not found.</p><Link to="/agent" className="fw-btn fw-btn-ghost">Back to the Agent</Link></div>
            </AppLayout>
        )
    }
    if (task === null) {
        return (
            <AppLayout title="Agent task" crumbs={[{ label: "Agent", to: "/agent" }, { label: "#" + id }]}>
                <div style={{ display: "grid", gap: 14 }}>
                    {[1, 2, 3].map((i) => <div key={i} className="fw-skeleton" style={{ height: 110 }}></div>)}
                </div>
            </AppLayout>
        )
    }

    const shownEvents = events.filter((e) => logFilter === "all" || String(e.fork_no) === logFilter)
    const chosen = forks.find((f) => f.fork_no === task.chosen_fork)

    return (
        <AppLayout title={"Agent task #" + task.id} crumbs={[{ label: "Agent", to: "/agent" }, { label: "#" + task.id }]}>
            <div className="ag-head">
                {statusBadge(task)}
                <a href={task.repo_url} target="_blank" rel="noopener noreferrer">{repoName(task.repo_url)}</a>
                {task.branch && <span className="fw-mono">@{task.branch}</span>}
                <span>· {task.forks} forks · {formatDate(task.created_at)}</span>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
                <section className="ax-card ax-card-pad">
                    <p className="fw-eyebrow" style={{ marginBottom: 8 }}>Task</p>
                    <p className="ag-task-text">{task.task}</p>
                </section>

                <VerdictCard task={task} onAgain={again} />

                <section className="ax-card">
                    <div className="ax-card-head"><h2>Forks</h2><p>Independent agents, each in its own sandbox</p></div>
                    <div className="ax-card-pad" style={{ paddingTop: 0 }}>
                        {forks.length === 0 && <p className="fw-muted" style={{ fontSize: 14 }}>Waiting for a worker to pick up the task...</p>}
                        <div className="ag-forks">
                            {forks.map((f) => (
                                <div key={f.fork_no} className={f.fork_no === task.chosen_fork ? "ag-fork ag-fork-chosen" : "ag-fork"}>
                                    <div className="ag-fork-top">
                                        <b>Fork {f.fork_no}</b>
                                        {f.fork_no === task.chosen_fork && <span className="fw-badge fw-badge-accent fw-badge-plain">Chosen</span>}
                                        <span className={"fw-badge ag-badge-" + f.status}>{f.status}</span>
                                    </div>
                                    <p className="ag-fork-style">{f.style}</p>
                                    {f.summary && <p className="ag-fork-summary">{f.summary}</p>}
                                    <div className="ag-fork-meta">
                                        {f.tests_ok !== null && <span className={f.tests_ok ? "ag-ok" : "ag-bad"}>{f.tests_ok ? "tests passed" : "tests failed"}</span>}
                                        <span>{f.steps} steps</span>
                                        <span>{(f.tokens || 0).toLocaleString()} tokens</span>
                                    </div>
                                    {f.diff && (
                                        <button className="fw-btn fw-btn-quiet fw-btn-sm" style={{ justifySelf: "start" }} onClick={() => setOpenDiff(openDiff === f.fork_no ? null : f.fork_no)}>
                                            {openDiff === f.fork_no ? "Hide changes" : "Show changes"}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {openDiff !== null && (
                        <div style={{ borderTop: "1px solid var(--line)" }}>
                            <p className="fw-muted" style={{ padding: "12px 16px 0", fontSize: 13 }}>Changes of fork {openDiff}</p>
                            <DiffView diff={(forks.find((f) => f.fork_no === openDiff) || {}).diff} />
                        </div>
                    )}
                </section>

                {task.status === "done" && (
                    <section className="ax-card">
                        <div className="ax-card-head"><h2>Cross check</h2><p>The tests of each fork, run on the code of every other fork</p></div>
                        <div className="ax-card-pad" style={{ paddingTop: 0 }}>
                            <Matrix forks={forks} checks={checks} />
                        </div>
                    </section>
                )}

                {chosen && chosen.diff && openDiff === null && (
                    <section className="ax-card">
                        <div className="ax-card-head"><h2>The patch</h2><p>From fork {chosen.fork_no}</p></div>
                        <DiffView diff={chosen.diff} />
                    </section>
                )}

                <section className="ax-card">
                    <div className="ax-toolbar">
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Live log</h2>
                        <div className="fw-chips">
                            <button className={logFilter === "all" ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setLogFilter("all")}>All</button>
                            <button className={logFilter === "0" ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setLogFilter("0")}>Task</button>
                            {forks.map((f) => (
                                <button key={f.fork_no} className={logFilter === String(f.fork_no) ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setLogFilter(String(f.fork_no))}>Fork {f.fork_no}</button>
                            ))}
                        </div>
                    </div>
                    <div className="ag-log" ref={logBox}>
                        {shownEvents.length === 0 && <div className="ag-log-text fw-muted">Nothing yet.</div>}
                        {shownEvents.map((e) => (
                            <div key={e.id} className={"ag-log-line ag-log-" + e.kind}>
                                <span className="ag-log-who">{e.fork_no === 0 ? "task" : "fork " + e.fork_no}</span>
                                <span className="ag-log-text">{e.text}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </AppLayout>
    )
}
