import React, { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaUsers, FaChartBar, FaEnvelope, FaExclamationTriangle, FaTrash, FaSearch, FaBroom, FaReply, FaShieldAlt, FaSyncAlt, FaPaperPlane } from "react-icons/fa"
import AppLayout from "../components/app/AppLayout"
import { adminGet, adminDelete, sendAuthRequestWithWebsocket, sendEmailRequest } from "../api"
import { formatDate, stateLabel } from "../components/app/runTools"

function dayText(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return date.getFullYear() + "-" + month + "-" + day
}

function runLabel(run) {
    if (run.status === "complete" && run.verdict) {
        return run.verdict
    }
    return run.status
}

function Admin() {
    const navigate = useNavigate()
    const [status, setStatus] = useState("loading")
    const [myId, setMyId] = useState(null)
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [runs, setRuns] = useState([])
    const [messages, setMessages] = useState([])
    const [tab, setTab] = useState("runs")
    const [search, setSearch] = useState("")
    const [confirm, setConfirm] = useState(null)
    const [notice, setNotice] = useState("")
    const [working, setWorking] = useState(false)
    const [emailBody, setEmailBody] = useState("")
    const [sendingEmail, setSendingEmail] = useState(false)
    const [subject, setSubject] = useState("")

    const loadAll = useCallback(async () => {
        try {
            const s = await adminGet("stats")
            if (s.Message === "login") {
                navigate("/auth/login")
                return
            }
            if (s.Message === "forbidden") {
                setStatus("forbidden")
                return
            }
            if (s.Message !== true) {
                setStatus("error")
                return
            }
            setStats(s)
            const u = await adminGet("users")
            if (u.Message === true) {
                setUsers(u.data)
            }
            const r = await adminGet("runs")
            if (r.Message === true) {
                setRuns(r.data)
            }
            const m = await adminGet("messages")
            if (m.Message === true) {
                setMessages(m.data)
            }
            setStatus("ok")
        } catch (e) {
            setStatus("error")
        }
    }, [navigate])

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (res) => {
            if (res.Message === true) {
                setMyId(res.user_id)
            }
        })
        loadAll()
    }, [loadAll])

    useEffect(() => {
        if (notice === "") {
            return
        }
        const timer = setTimeout(() => setNotice(""), 3000)
        return () => clearTimeout(timer)
    }, [notice])

    function closeModal() {
        if (!working) {
            setConfirm(null)
        }
    }

    async function handleSendEmail(e) {
        e.preventDefault()
        if (!subject.trim() || !emailBody.trim()) {
            setNotice("Please fill in the subject and the message.")
            return
        }
        setSendingEmail(true)
        const response = await sendEmailRequest(subject, "hello@forkwise.online", emailBody)
        setSendingEmail(false)
        if (response === true) {
            setSubject("")
            setEmailBody("")
            setNotice("Email sent successfully.")
        } else {
            setNotice("The email was not sent. Please try again.")
        }
    }

    async function confirmDelete() {
        setWorking(true)
        try {
            const result = await adminDelete(confirm.name, confirm.id)
            if (result.Message === true) {
                if (result.deleted !== undefined) {
                    setNotice(result.deleted + " runs were deleted.")
                } else {
                    setNotice("Deleted.")
                }
                await loadAll()
            } else {
                setNotice(result.error ? result.error : "Could not delete it.")
            }
        } catch (e) {
            setNotice("Could not connect to the server.")
        }
        setWorking(false)
        setConfirm(null)
    }

    if (status === "loading") {
        return <div className="fw-skeleton" style={{ height: 300 }}></div>
    }

    if (status === "forbidden" || status === "error") {
        return (
            <div className="ax-card fw-empty">
                <span className="fw-empty-icon"><FaShieldAlt /></span>
                <h3>{status === "forbidden" ? "Admins only" : "Something went wrong"}</h3>
                <p>{status === "forbidden" ? "Your account does not have access to this page." : "Could not load the admin data. Is the server running?"}</p>
                <button className="fw-btn fw-btn-ghost" onClick={() => navigate("/dashboard")}>Back to overview</button>
            </div>
        )
    }

    const days = []
    let biggestDay = 1
    for (let i = 13; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const text = dayText(date)
        let total = 0
        for (const d of stats.per_day) {
            if (d.day === text) {
                total = d.total
            }
        }
        if (total > biggestDay) {
            biggestDay = total
        }
        days.push({ text: text, label: date.getDate(), total: total })
    }

    const finished = stats.robust + stats.fragile + stats.choice_dependent + stats.no_effect
    function share(value) {
        if (finished === 0) {
            return 0
        }
        return (value / finished) * 100
    }

    const word = search.trim().toLowerCase()
    const shownRuns = runs.filter((r) => (r.id + " " + r.question + " " + r.username + " " + r.status + " " + r.verdict).toLowerCase().includes(word))
    const shownUsers = users.filter((u) => (u.name + " " + u.last_name + " " + u.username + " " + u.email).toLowerCase().includes(word))
    const shownMessages = messages.filter((m) => (m.name + " " + m.email + " " + m.topic + " " + m.message).toLowerCase().includes(word))

    return (
        <>
            <div className="ap-page-head">
                <div>
                    <h1 className="ap-title">Admin panel</h1>
                    <p className="ap-sub">Users, runs and messages in one place.</p>
                </div>
                <div className="ap-page-actions">
                    <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={loadAll}><FaSyncAlt /> Refresh</button>
                    <button
                        className="fw-btn fw-btn-danger fw-btn-sm"
                        disabled={stats.failed + stats.running === 0}
                        onClick={() => setConfirm({
                            title: "Clean failed runs?",
                            text: "This deletes every failed run, and every run that is still running after one hour. Their analyst results are deleted too.",
                            name: "failed-runs"
                        })}
                    >
                        <FaBroom /> Clean failed runs
                    </button>
                </div>
            </div>

            <div className="ax-stats">
                <div className="ax-stat"><div className="ax-stat-top">Users <FaUsers /></div><b>{stats.users}</b></div>
                <div className="ax-stat"><div className="ax-stat-top">Runs <FaChartBar /></div><b>{stats.runs}</b></div>
                <div className="ax-stat"><div className="ax-stat-top">Failed or stuck <FaExclamationTriangle style={{ color: "var(--red)" }} /></div><b>{stats.failed + stats.running}</b></div>
                <div className="ax-stat"><div className="ax-stat-top">Messages <FaEnvelope /></div><b>{stats.messages}</b></div>
            </div>

            <div className="ax-grid-half">
                <section className="ax-card ax-card-pad">
                    <h2 style={{ fontSize: 15, fontWeight: 600 }}>Runs in the last 14 days</h2>
                    <div className="ax-bars">
                        {days.map((d) => (
                            <div key={d.text} className="ax-bar-col" title={d.text + ": " + d.total + " runs"}>
                                <b>{d.total > 0 ? d.total : ""}</b>
                                <div className={d.total > 0 ? "ax-bar" : "ax-bar ax-bar-empty"} style={{ height: d.total > 0 ? (d.total / biggestDay) * 100 + "%" : "2px" }}></div>
                                <small>{d.label}</small>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="ax-card ax-card-pad">
                    <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Verdicts of finished runs</h2>
                    <div className="ax-split">
                        <span className="c-robust" style={{ width: share(stats.robust) + "%" }}></span>
                        <span className="c-fragile" style={{ width: share(stats.fragile) + "%" }}></span>
                        <span className="c-choice" style={{ width: share(stats.choice_dependent) + "%" }}></span>
                        <span className="c-none" style={{ width: share(stats.no_effect) + "%" }}></span>
                    </div>
                    <div className="ax-legend">
                        <div><i className="ax-dot c-robust"></i>Robust<b>{stats.robust}</b></div>
                        <div><i className="ax-dot c-fragile"></i>Fragile<b>{stats.fragile}</b></div>
                        <div><i className="ax-dot c-choice"></i>Choice dependent<b>{stats.choice_dependent}</b></div>
                        <div><i className="ax-dot c-none"></i>No effect<b>{stats.no_effect}</b></div>
                        <div><i className="ax-dot c-running"></i>Running now<b>{stats.running}</b></div>
                    </div>
                </section>
            </div>

            <section className="ax-card">
                <div className="ax-toolbar" style={{ paddingTop: 0, paddingBottom: 0 }}>
                    <div className="ax-tabs" style={{ borderBottom: "none" }}>
                        <button className={tab === "runs" ? "ax-tab ax-tab-on" : "ax-tab"} onClick={() => setTab("runs")}>Runs <span>{runs.length}</span></button>
                        <button className={tab === "users" ? "ax-tab ax-tab-on" : "ax-tab"} onClick={() => setTab("users")}>Users <span>{users.length}</span></button>
                        <button className={tab === "messages" ? "ax-tab ax-tab-on" : "ax-tab"} onClick={() => setTab("messages")}>Messages <span>{messages.length}</span></button>
                        <button className={tab === "email" ? "ax-tab ax-tab-on" : "ax-tab"} onClick={() => setTab("email")}>Email users</button>
                    </div>
                    {tab !== "email" && (
                        <div className="fw-input-icon ax-search" style={{ padding: "10px 0" }}>
                            <FaSearch />
                            <input className="fw-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search" />
                        </div>
                    )}
                </div>

                {tab === "runs" && (
                    <div style={{ overflowX: "auto", borderTop: "1px solid var(--line)" }}>
                        <table className="fw-table">
                            <thead>
                                <tr><th>#</th><th>Question</th><th>User</th><th>Result</th><th>Analysts</th><th>Date</th><th></th></tr>
                            </thead>
                            <tbody>
                                {shownRuns.map((r) => (
                                    <tr key={r.id}>
                                        <td className="fw-muted fw-mono">{r.id}</td>
                                        <td style={{ maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.question}>{r.question}</td>
                                        <td>{r.username ? r.username : <span className="fw-muted">deleted</span>}</td>
                                        <td><span className={"fw-badge fw-badge-" + runLabel(r)}>{stateLabel(runLabel(r))}</span></td>
                                        <td className="fw-muted">{r.analysts === null ? "-" : r.analysts}</td>
                                        <td className="fw-muted" style={{ whiteSpace: "nowrap" }}>{formatDate(r.created_at)}</td>
                                        <td style={{ textAlign: "right" }}>
                                            <button className="fw-icon-btn" aria-label={"Delete run " + r.id} onClick={() => setConfirm({ title: "Delete run #" + r.id + "?", text: "\"" + r.question + "\" and all its analyst results will be deleted.", name: "runs", id: r.id })}><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {shownRuns.length === 0 && <div className="fw-empty"><p>No runs found.</p></div>}
                    </div>
                )}

                {tab === "users" && (
                    <div style={{ overflowX: "auto", borderTop: "1px solid var(--line)" }}>
                        <table className="fw-table">
                            <thead>
                                <tr><th>User</th><th>Username</th><th>Email</th><th>Runs</th><th>Role</th><th></th></tr>
                            </thead>
                            <tbody>
                                {shownUsers.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="ad-person">
                                                <span className="ap-avatar">{u.name ? u.name.charAt(0).toUpperCase() : "?"}</span>
                                                <span>{u.name} {u.last_name}</span>
                                            </div>
                                        </td>
                                        <td className="fw-muted">{u.username}</td>
                                        <td className="fw-muted">{u.email}</td>
                                        <td>{u.runs}</td>
                                        <td>{u.is_admin ? <span className="fw-badge fw-badge-accent fw-badge-plain">admin</span> : <span className="fw-muted">user</span>}</td>
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                className="fw-icon-btn"
                                                aria-label={"Delete user " + u.username}
                                                disabled={u.id === myId}
                                                title={u.id === myId ? "You cannot delete yourself" : "Delete user"}
                                                onClick={() => setConfirm({ title: "Delete " + u.username + "?", text: "The account and all " + u.runs + " of its runs will be deleted. This cannot be undone.", name: "users", id: u.id })}
                                            >
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {shownUsers.length === 0 && <div className="fw-empty"><p>No users found.</p></div>}
                    </div>
                )}

                {tab === "messages" && (
                    <div style={{ borderTop: "1px solid var(--line)" }}>
                        {shownMessages.map((m) => (
                            <div key={m.id} className="ad-msg">
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                    <div className="ad-person">
                                        <span className="ap-avatar">{m.name ? m.name.charAt(0).toUpperCase() : "?"}</span>
                                        <div>
                                            <p style={{ color: "#fff", fontWeight: 500 }}>{m.name}</p>
                                            <p className="fw-muted" style={{ fontSize: 12.5 }}>{m.email} · {formatDate(m.created_at)}</p>
                                        </div>
                                    </div>
                                    <span className="fw-badge fw-badge-accent fw-badge-plain">{m.topic}</span>
                                </div>
                                <p style={{ color: "var(--text-2)", whiteSpace: "pre-wrap" }}>{m.message}</p>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <a className="fw-btn fw-btn-ghost fw-btn-sm" href={"mailto:" + m.email}><FaReply /> Reply</a>
                                    <button className="fw-btn fw-btn-danger fw-btn-sm" onClick={() => setConfirm({ title: "Delete this message?", text: "The message from " + m.name + " will be deleted.", name: "messages", id: m.id })}><FaTrash /> Delete</button>
                                </div>
                            </div>
                        ))}
                        {shownMessages.length === 0 && <div className="fw-empty"><p>No messages found.</p></div>}
                    </div>
                )}

                {tab === "email" && (
                    <form onSubmit={handleSendEmail} style={{ padding: 22, display: "grid", gap: 14, borderTop: "1px solid var(--line)" }}>
                        <div className="fw-alert fw-alert-info" style={{ fontSize: 13.5 }}>This sends one email to every registered user. Check the text twice before you send it.</div>
                        <label className="fw-field">
                            <span className="fw-label">Subject</span>
                            <input className="fw-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is new in Forkwise" />
                        </label>
                        <label className="fw-field">
                            <span className="fw-label">Message (HTML is allowed)</span>
                            <textarea className="fw-textarea" rows="8" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Write your message" />
                        </label>
                        <div>
                            <button type="submit" className="fw-btn fw-btn-primary" disabled={sendingEmail}><FaPaperPlane /> {sendingEmail ? "Sending..." : "Send to all users"}</button>
                        </div>
                    </form>
                )}
            </section>

            {confirm !== null && (
                <div className="ax-modal-back" onClick={closeModal}>
                    <div className="ax-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={confirm.title}>
                        <h3>{confirm.title}</h3>
                        <p>{confirm.text}</p>
                        <div className="ax-modal-actions">
                            <button className="fw-btn fw-btn-ghost" disabled={working} onClick={closeModal}>Cancel</button>
                            <button className="fw-btn fw-btn-danger" disabled={working} onClick={confirmDelete}>{working ? "Deleting..." : "Delete"}</button>
                        </div>
                    </div>
                </div>
            )}

            {notice !== "" && <div className="ax-toast">{notice}</div>}
        </>
    )
}

export default function AdminDashboard() {
    return (
        <AppLayout title="Admin" crumbs={[{ label: "Admin panel" }]} noHead wide>
            <Admin />
        </AppLayout>
    )
}
