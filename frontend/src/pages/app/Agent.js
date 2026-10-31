import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaCodeBranch, FaPlay, FaChevronRight, FaGithub } from "react-icons/fa"
import AppLayout, { useMe } from "../../components/app/AppLayout"
import { getAgentTasks, createAgentTask } from "../../api"
import { formatDate } from "../../components/app/runTools"
import "../../styles/agent.css"

export const VERDICT_TEXT = {
    verified: "Verified",
    fragile: "Fragile",
    choice_dependent: "Choice dependent",
    failing: "Failing"
}

export function statusBadge(task) {
    if (task.status === "done" && task.verdict) {
        return <span className={"fw-badge ag-badge-" + task.verdict}>{VERDICT_TEXT[task.verdict]}</span>
    }
    const names = { queued: "Queued", running: "Running", failed: "Failed", done: "Done" }
    return <span className={"fw-badge ag-badge-" + task.status}>{names[task.status] || task.status}</span>
}

export function repoName(url) {
    return (url || "").replace("https://", "").replace(/\.git$/, "")
}

const EXAMPLE = "Add a function slugify(text) to utils.py that turns a title into a URL slug, for example \"Hello World!\" becomes \"hello-world\"."

function NewTaskForm() {
    const navigate = useNavigate()
    const me = useMe()
    const isAdmin = me.usage && me.usage.unlimited
    const [repo, setRepo] = useState("")
    const [branch, setBranch] = useState("")
    const [task, setTask] = useState("")
    const [testCommand, setTestCommand] = useState("")
    const [setupCommand, setSetupCommand] = useState("")
    const [forks, setForks] = useState(3)
    const [more, setMore] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState("")

    async function send(e) {
        e.preventDefault()
        setError("")
        if (!repo.startsWith("https://")) {
            setError("Paste the https link of a public repository, for example https://github.com/user/project")
            return
        }
        if (task.trim().length < 10) {
            setError("Describe the task in a bit more detail.")
            return
        }
        setSending(true)
        const result = await createAgentTask({
            repo_url: repo.trim(),
            branch: branch.trim(),
            task: task.trim(),
            test_command: testCommand.trim(),
            setup_command: setupCommand.trim(),
            forks: forks
        })
        setSending(false)
        if (result.Message === true) {
            navigate("/agent/" + result.id)
        } else if (result.Message === "login") {
            navigate("/auth/login")
        } else {
            setError(result.error || "Something went wrong.")
        }
    }

    const forkChoices = isAdmin ? [1, 2, 3, 4, 5] : [1, 2, 3]

    return (
        <form className="ax-card ax-card-pad ag-form" onSubmit={send}>
            <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>New agent task</h2>
                <p className="fw-muted" style={{ fontSize: 13.5, marginTop: 4 }}>Several independent agents solve it, then check each other's work.</p>
            </div>

            {error !== "" && <div className="fw-alert fw-alert-error">{error}</div>}

            <div className="ag-row-2">
                <label className="fw-field">
                    <span className="fw-label">Repository link</span>
                    <div className="fw-input-icon">
                        <FaGithub />
                        <input className="fw-input" placeholder="https://github.com/user/project" value={repo} onChange={(e) => setRepo(e.target.value)} />
                    </div>
                </label>
                <label className="fw-field">
                    <span className="fw-label">Branch <em>(optional)</em></span>
                    <input className="fw-input" placeholder="main" value={branch} onChange={(e) => setBranch(e.target.value)} />
                </label>
            </div>

            <label className="fw-field">
                <span className="fw-label">What should the agent build or fix?</span>
                <textarea className="fw-textarea" rows={5} placeholder={EXAMPLE} value={task} onChange={(e) => setTask(e.target.value)} />
            </label>

            <div className="fw-field">
                <span className="fw-label">Independent agents (forks)</span>
                <div className="ag-forks-pick">
                    {forkChoices.map((n) => (
                        <button type="button" key={n} className={forks === n ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setForks(n)}>{n}</button>
                    ))}
                </div>
                <span className="fw-hint">More forks give a stronger check. One fork means no cross check.</span>
            </div>

            {!more && <button type="button" className="fw-btn fw-btn-quiet fw-btn-sm" style={{ justifySelf: "start" }} onClick={() => setMore(true)}>Show test and setup commands</button>}
            {more && (
                <div className="ag-row-2">
                    <label className="fw-field">
                        <span className="fw-label">Test command <em>(optional)</em></span>
                        <input className="fw-input fw-mono" placeholder="python -m pytest -q" value={testCommand} onChange={(e) => setTestCommand(e.target.value)} />
                    </label>
                    <label className="fw-field">
                        <span className="fw-label">Setup command <em>(optional)</em></span>
                        <input className="fw-input fw-mono" placeholder="pip install -r requirements.txt" value={setupCommand} onChange={(e) => setSetupCommand(e.target.value)} />
                    </label>
                </div>
            )}

            <button className="fw-btn fw-btn-primary" disabled={sending}>
                {sending ? <span className="fw-spinner"></span> : <><FaPlay /> Start the agents</>}
            </button>
            <p className="fw-hint" style={{ textAlign: "center" }}>Only public repositories for now. The agents work in locked sandboxes without internet.</p>
        </form>
    )
}

function HowItWorks() {
    return (
        <section className="ax-card ax-card-pad">
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 14 }}>How the Agent works</h2>
            <div className="ag-steps">
                <div className="ag-step"><div><b>Forks</b><p>Each agent gets its own copy of your code in a locked sandbox and its own working style.</p></div></div>
                <div className="ag-step"><div><b>Build and test</b><p>Every agent reads the code, makes the change, writes tests and runs them.</p></div></div>
                <div className="ag-step"><div><b>Cross check</b><p>The tests of each agent are run on the code of every other agent.</p></div></div>
                <div className="ag-step"><div><b>Verdict</b><p>Verified, fragile, choice dependent or failing. You get the best patch and a question if your task can be read in more than one way.</p></div></div>
            </div>
        </section>
    )
}

export default function Agent() {
    const navigate = useNavigate()
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const data = await getAgentTasks()
            if (data.Message === true) {
                setTasks(data.data)
            }
            setLoading(false)
        }
        load()
    }, [])

    return (
        <AppLayout title="Agent" crumbs={[{ label: "Agent" }]}>
            <p className="ap-sub" style={{ marginTop: -14 }}>A coding agent that proves its work before you merge it.</p>

            <div className="ag-hero">
                <NewTaskForm />
                <HowItWorks />
            </div>

            <section className="ax-card" style={{ marginTop: 20 }}>
                <div className="ax-card-head">
                    <h2>Your tasks</h2>
                </div>
                {loading && (
                    <div style={{ padding: 20, display: "grid", gap: 10 }}>
                        {[1, 2, 3].map((i) => <div key={i} className="fw-skeleton" style={{ height: 40 }}></div>)}
                    </div>
                )}
                {!loading && tasks.length === 0 && (
                    <div className="fw-empty">
                        <span className="fw-empty-icon"><FaCodeBranch /></span>
                        <p>No tasks yet. Start your first one above.</p>
                    </div>
                )}
                {!loading && tasks.length > 0 && (
                    <div className="ax-list">
                        {tasks.map((t) => (
                            <div key={t.id} className="ax-row" onClick={() => navigate("/agent/" + t.id)}>
                                <span className="ax-row-id">#{t.id}</span>
                                <div className="ax-row-main">
                                    <div className="ax-row-title">{t.task}</div>
                                    <div className="ax-row-meta">{repoName(t.repo_url)} · {t.forks} forks · {formatDate(t.created_at)}</div>
                                </div>
                                {statusBadge(t)}
                                <FaChevronRight className="ax-row-arrow" />
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </AppLayout>
    )
}
