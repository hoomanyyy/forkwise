import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Admin.css"
import Logo from "../images/logo.svg"
import { Link, useNavigate } from "react-router-dom"
import { FaUsers, FaChartBar, FaEnvelope, FaExclamationTriangle, FaTrash, FaSearch, FaBroom, FaReply, FaShieldAlt, FaSyncAlt } from "react-icons/fa"
import { adminGet, adminDelete, sendAuthRequestWithWebsocket } from "../api"

function formatDate(text) {
    if (!text) {
        return "-"
    }
    const date = new Date(text)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function dayText(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return date.getFullYear() + "-" + month + "-" + day
}

function runLabel(run) {
    if (run.status === "complete" && run.verdict) {
        return run.verdict.replace("_", " ")
    }
    return run.status
}

function runClass(run) {
    if (run.status === "failed") {
        return "AdminPill AdminPillRed"
    }
    if (run.status === "running") {
        return "AdminPill AdminPillBlue"
    }
    if (run.verdict === "robust") {
        return "AdminPill AdminPillGreen"
    }
    if (run.verdict === "fragile") {
        return "AdminPill AdminPillAmber"
    }
    if (run.verdict === "choice_dependent") {
        return "AdminPill AdminPillRed"
    }
    return "AdminPill"
}

export default function AdminDashboard() {
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

    async function loadAll() {
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
    }

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (res) => {
            if (res.Message === true) {
                setMyId(res.user_id)
            }
        })
        loadAll()
    }, [])

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
        return (
            <div className="AdminPage">
                <p className="AdminCenter">Loading...</p>
            </div>
        )
    }

    if (status === "forbidden" || status === "error") {
        return (
            <div className="AdminPage">
                <div className="AdminBlocked">
                    <FaShieldAlt className="AdminBlockedIcon" />
                    <h2>{status === "forbidden" ? "Admins only" : "Something went wrong"}</h2>
                    <p>{status === "forbidden" ? "Your account does not have access to this page." : "Could not load the admin data. Is the server running?"}</p>
                    <button className="btn AdminButton" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
                </div>
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

    const finished = stats.robust + stats.fragile + stats.choice_dependent
    function share(value) {
        if (finished === 0) {
            return 0
        }
        return (value / finished) * 100
    }

    const word = search.trim().toLowerCase()

    const shownRuns = runs.filter((r) => {
        const text = (r.id + " " + r.question + " " + r.username + " " + r.status + " " + r.verdict).toLowerCase()
        return text.includes(word)
    })
    const shownUsers = users.filter((u) => {
        const text = (u.name + " " + u.last_name + " " + u.username + " " + u.email).toLowerCase()
        return text.includes(word)
    })
    const shownMessages = messages.filter((m) => {
        const text = (m.name + " " + m.email + " " + m.topic + " " + m.message).toLowerCase()
        return text.includes(word)
    })

    return (
        <div className="AdminPage">
            <nav className="AdminNav">
                <Link to="/" className="AdminBrand">
                    <img src={Logo} alt="Logo" className="AdminLogo" />
                    <span>Forkwise</span>
                    <span className="AdminBadge">Admin</span>
                </Link>
                <div className="AdminNavRight">
                    <button className="btn AdminGhost" onClick={loadAll}><FaSyncAlt /> Refresh</button>
                    <button className="btn AdminGhost" onClick={() => navigate("/dashboard")}>My dashboard</button>
                </div>
            </nav>

            <main className="AdminBody">
                <div className="AdminHead">
                    <div>
                        <p className="AdminEyebrow">Admin panel</p>
                        <h1 className="AdminTitle">Everything in one place</h1>
                    </div>
                    <button
                        className="btn AdminDanger"
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

                <section className="AdminStats">
                    <div className="AdminStat">
                        <span className="AdminStatIcon AdminIconPurple"><FaUsers /></span>
                        <div>
                            <p className="AdminStatLabel">Users</p>
                            <p className="AdminStatNumber">{stats.users}</p>
                        </div>
                    </div>
                    <div className="AdminStat">
                        <span className="AdminStatIcon AdminIconBlue"><FaChartBar /></span>
                        <div>
                            <p className="AdminStatLabel">Runs</p>
                            <p className="AdminStatNumber">{stats.runs}</p>
                        </div>
                    </div>
                    <div className="AdminStat">
                        <span className="AdminStatIcon AdminIconRed"><FaExclamationTriangle /></span>
                        <div>
                            <p className="AdminStatLabel">Failed or stuck</p>
                            <p className="AdminStatNumber">{stats.failed + stats.running}</p>
                        </div>
                    </div>
                    <div className="AdminStat">
                        <span className="AdminStatIcon AdminIconGreen"><FaEnvelope /></span>
                        <div>
                            <p className="AdminStatLabel">Messages</p>
                            <p className="AdminStatNumber">{stats.messages}</p>
                        </div>
                    </div>
                </section>

                <section className="AdminCharts">
                    <div className="AdminCard">
                        <p className="AdminCardTitle">Runs in the last 14 days</p>
                        <div className="AdminBars">
                            {days.map((d) => (
                                <div key={d.text} className="AdminBarBox" title={d.text + ": " + d.total + " runs"}>
                                    <span className="AdminBarNumber">{d.total > 0 ? d.total : ""}</span>
                                    <div className="AdminBar" style={{ height: (d.total / biggestDay) * 100 + "%" }}></div>
                                    <span className="AdminBarDay">{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="AdminCard">
                        <p className="AdminCardTitle">Verdicts of finished runs</p>
                        <div className="AdminSplit">
                            <span className="AdminSplitGreen" style={{ width: share(stats.robust) + "%" }}></span>
                            <span className="AdminSplitAmber" style={{ width: share(stats.fragile) + "%" }}></span>
                            <span className="AdminSplitRed" style={{ width: share(stats.choice_dependent) + "%" }}></span>
                        </div>
                        <div className="AdminSplitRows">
                            <div><i className="AdminDot AdminSplitGreen"></i>Robust<b>{stats.robust}</b></div>
                            <div><i className="AdminDot AdminSplitAmber"></i>Fragile<b>{stats.fragile}</b></div>
                            <div><i className="AdminDot AdminSplitRed"></i>Choice dependent<b>{stats.choice_dependent}</b></div>
                            <div><i className="AdminDot AdminDotBlue"></i>Running now<b>{stats.running}</b></div>
                        </div>
                    </div>
                </section>

                <section className="AdminCard">
                    <div className="AdminToolbar">
                        <div className="AdminTabs">
                            <button className={tab === "runs" ? "AdminTab AdminTabOn" : "AdminTab"} onClick={() => setTab("runs")}>Runs <span>{runs.length}</span></button>
                            <button className={tab === "users" ? "AdminTab AdminTabOn" : "AdminTab"} onClick={() => setTab("users")}>Users <span>{users.length}</span></button>
                            <button className={tab === "messages" ? "AdminTab AdminTabOn" : "AdminTab"} onClick={() => setTab("messages")}>Messages <span>{messages.length}</span></button>
                        </div>
                        <label className="AdminSearch">
                            <FaSearch />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
                        </label>
                    </div>

                    {tab === "runs" && (
                        <div className="AdminTableWrap">
                            <table className="AdminTable">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Question</th>
                                        <th>User</th>
                                        <th>Result</th>
                                        <th>Analysts</th>
                                        <th>Date</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownRuns.map((r) => (
                                        <tr key={r.id}>
                                            <td className="AdminMuted">{r.id}</td>
                                            <td className="AdminQuestion" title={r.question}>{r.question}</td>
                                            <td>{r.username ? r.username : <span className="AdminMuted">deleted</span>}</td>
                                            <td><span className={runClass(r)}>{runLabel(r)}</span></td>
                                            <td className="AdminMuted">{r.analysts === null ? "-" : r.analysts}</td>
                                            <td className="AdminMuted AdminNoWrap">{formatDate(r.created_at)}</td>
                                            <td className="AdminActions">
                                                <button
                                                    className="AdminIconButton"
                                                    aria-label="Delete run"
                                                    onClick={() => setConfirm({
                                                        title: "Delete run #" + r.id + "?",
                                                        text: "\"" + r.question + "\" and all its analyst results will be deleted.",
                                                        name: "runs",
                                                        id: r.id
                                                    })}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {shownRuns.length === 0 && <p className="AdminEmpty">No runs found.</p>}
                        </div>
                    )}

                    {tab === "users" && (
                        <div className="AdminTableWrap">
                            <table className="AdminTable">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Runs</th>
                                        <th>Role</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownUsers.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="AdminPerson">
                                                    <span className="AdminAvatar">{u.name ? u.name.charAt(0).toUpperCase() : "?"}</span>
                                                    <span>{u.name} {u.last_name}</span>
                                                </div>
                                            </td>
                                            <td className="AdminMuted">{u.username}</td>
                                            <td className="AdminMuted">{u.email}</td>
                                            <td>{u.runs}</td>
                                            <td>{u.is_admin ? <span className="AdminPill AdminPillPurple">admin</span> : <span className="AdminMuted">user</span>}</td>
                                            <td className="AdminActions">
                                                <button
                                                    className="AdminIconButton"
                                                    aria-label="Delete user"
                                                    disabled={u.id === myId}
                                                    title={u.id === myId ? "You cannot delete yourself" : "Delete user"}
                                                    onClick={() => setConfirm({
                                                        title: "Delete " + u.username + "?",
                                                        text: "The account and all " + u.runs + " of its runs will be deleted. This cannot be undone.",
                                                        name: "users",
                                                        id: u.id
                                                    })}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {shownUsers.length === 0 && <p className="AdminEmpty">No users found.</p>}
                        </div>
                    )}

                    {tab === "messages" && (
                        <div className="AdminMessages">
                            {shownMessages.map((m) => (
                                <div key={m.id} className="AdminMessage">
                                    <div className="AdminMessageTop">
                                        <div className="AdminPerson">
                                            <span className="AdminAvatar">{m.name ? m.name.charAt(0).toUpperCase() : "?"}</span>
                                            <div>
                                                <p className="AdminMessageName">{m.name}</p>
                                                <p className="AdminMuted AdminSmall">{m.email} · {formatDate(m.created_at)}</p>
                                            </div>
                                        </div>
                                        <span className="AdminPill AdminPillPurple">{m.topic}</span>
                                    </div>
                                    <p className="AdminMessageText">{m.message}</p>
                                    <div className="AdminMessageActions">
                                        <a className="btn AdminGhost" href={"mailto:" + m.email}><FaReply /> Reply</a>
                                        <button
                                            className="btn AdminGhost AdminGhostRed"
                                            onClick={() => setConfirm({
                                                title: "Delete this message?",
                                                text: "The message from " + m.name + " will be deleted.",
                                                name: "messages",
                                                id: m.id
                                            })}
                                        >
                                            <FaTrash /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {shownMessages.length === 0 && <p className="AdminEmpty">No messages found.</p>}
                        </div>
                    )}
                </section>
            </main>

            {confirm !== null && (
                <div className="AdminModalBack" onClick={closeModal}>
                    <div className="AdminModal" onClick={(e) => e.stopPropagation()}>
                        <span className="AdminModalIcon"><FaTrash /></span>
                        <h3>{confirm.title}</h3>
                        <p>{confirm.text}</p>
                        <div className="AdminModalButtons">
                            <button className="btn AdminGhost" disabled={working} onClick={closeModal}>Cancel</button>
                            <button className="btn AdminDanger" disabled={working} onClick={confirmDelete}>{working ? "Deleting..." : "Delete"}</button>
                        </div>
                    </div>
                </div>
            )}

            {notice !== "" && <div className="AdminNotice">{notice}</div>}
        </div>
    )
}