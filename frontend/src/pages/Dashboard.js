import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Dashboard.css"
import Logo from "../images/logo.svg"
import Seo from "../components/Seo"
import { Link, useNavigate } from "react-router-dom"
import { sendAuthRequestWithWebsocket, getHistory, getMe, Logout } from "../api"
import { FaChartBar, FaCheckCircle, FaExclamationTriangle, FaSyncAlt, FaSearch, FaPlus, FaReceipt } from "react-icons/fa"

function formatDate(text) {
    if (!text) {
        return "-"
    }
    const date = new Date(text)
    return date.toLocaleDateString() + " · " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function countFiles(filename) {
    if (!filename) {
        return 0
    }
    return filename.split(", ").length
}

function greeting() {
    const hour = new Date().getHours()
    if (hour < 12) {
        return "Good morning"
    }
    if (hour < 18) {
        return "Good afternoon"
    }
    return "Good evening"
}

function percent(part, total) {
    if (total === 0) {
        return 0
    }
    return (part / total) * 100
}

export default function Home() {
    const navigate = useNavigate()
    const [name, setName] = useState("")
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState("all")
    const [usage, setUsage] = useState(null)

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (res) => {
            if (res.Message === true) {
                setName(res.name)
            } else {
                navigate("/auth/login")
            }
        })
    }, [navigate])

    useEffect(() => {
        async function loadHistory() {
            try {
                const data = await getHistory()
                if (data.Message === true) {
                    setHistory(data.data)
                }
            } catch (e) {
                console.log("Could not load history")
            }
            setLoading(false)
        }
        async function loadPlan() {
            const data = await getMe()
            if (data.Message === true) {
                setUsage(data.usage)
            }
        }
        loadHistory()
        loadPlan()
    }, [])

    async function HandleLogout() {
        await Logout()
        navigate("/auth/login")
    }

    const totalRuns = history.length
    const robustRuns = history.filter((run) => run.verdict === "robust").length
    const fragileRuns = history.filter((run) => run.verdict === "fragile").length
    const choiceRuns = history.filter((run) => run.verdict === "choice_dependent").length
    const noEffectRuns = history.filter((run) => run.verdict === "no_effect").length
    const runningRuns = history.filter((run) => run.status === "running").length
    const failedRuns = history.filter((run) => run.status === "failed").length

    const shown = history.filter((run) => {
        if (!run.question.toLowerCase().includes(search.toLowerCase())) {
            return false
        }
        if (filter === "all") {
            return true
        }
        if (filter === "running" || filter === "failed") {
            return run.status === filter
        }
        return run.verdict === filter
    })

    let initial = "?"
    if (name) {
        initial = name.charAt(0).toUpperCase()
    }

    return (
        <div className="DashPage">
            <Seo title="Dashboard | Forkwise" noindex />
            <nav className="DashNav">
                <Link to="/" className="DashBrand">
                    <img src={Logo} alt="Logo" className="DashLogo" />
                    <span>Forkwise</span>
                </Link>
                <div className="DashNavRight">
                    <Link to="/" className="DashNavLink">Home</Link>
                    <Link to="/plans" className="DashNavLink">Plans</Link>
                    <Link to="/about" className="DashNavLink">About</Link>
                    <Link to="/invoices" className="DashNavLink DashBilling">
                        <FaReceipt /> Billing
                    </Link>
                    <div className="DashUser">
                        <span className="DashAvatar">{initial}</span>
                        <span className="DashUserName">{name}</span>
                    </div>
                    <button className="btn DashLogout" onClick={HandleLogout}>Log out</button>
                </div>
            </nav>

            <main className="DashBody">
                <section className="DashHero">
                    <div>
                        <p className="DashEyebrow">Dashboard</p>
                        <h2 className="DashTitle">{greeting()}, <span className="DashName">{name}</span></h2>
                        <p className="DashLead">Upload your data, ask one question, and let many AI analysts test how strong the answer really is.</p>
                        {usage && (
                            <div className="DashPlan">
                                <span className="DashPlanName">{usage.unlimited ? "Admin" : usage.plan.plan_type} plan</span>
                                <span className="DashMuted">
                                    {usage.unlimited ? "No daily limit" : usage.used + " of " + usage.limit + " analyses used today"}
                                </span>
                                {!usage.unlimited && usage.plan.plan_type !== "Premium" && (
                                    <Link to="/plans" className="DashUpgrade">Upgrade</Link>
                                )}
                            </div>
                        )}
                    </div>
                    <button className="btn DashNewButton" onClick={() => navigate("/chat")}><FaPlus /> New analysis</button>
                </section>

                <section className="DashStats">
                    <div className="DashStat">
                        <span className="DashStatIcon IconPurple"><FaChartBar /></span>
                        <div>
                            <p className="DashStatLabel">Total runs</p>
                            <p className="DashStatNumber">{totalRuns}</p>
                        </div>
                    </div>
                    <div className="DashStat">
                        <span className="DashStatIcon IconGreen"><FaCheckCircle /></span>
                        <div>
                            <p className="DashStatLabel">Robust findings</p>
                            <p className="DashStatNumber">{robustRuns}</p>
                        </div>
                    </div>
                    <div className="DashStat">
                        <span className="DashStatIcon IconAmber"><FaExclamationTriangle /></span>
                        <div>
                            <p className="DashStatLabel">Fragile or choice dependent</p>
                            <p className="DashStatNumber">{fragileRuns + choiceRuns}</p>
                        </div>
                    </div>
                    <div className="DashStat">
                        <span className="DashStatIcon IconBlue"><FaSyncAlt /></span>
                        <div>
                            <p className="DashStatLabel">Running now</p>
                            <p className="DashStatNumber">{runningRuns}</p>
                        </div>
                    </div>
                </section>

                {totalRuns > 0 && (
                    <section className="DashCard">
                        <div className="DashCardTop">
                            <h6 className="DashCardTitle">How strong are your findings?</h6>
                            <span className="DashMuted">{totalRuns} runs</span>
                        </div>
                        <div className="SplitBar">
                            <span className="SplitGreen" style={{ width: percent(robustRuns, totalRuns) + "%" }}></span>
                            <span className="SplitAmber" style={{ width: percent(fragileRuns, totalRuns) + "%" }}></span>
                            <span className="SplitRed" style={{ width: percent(choiceRuns, totalRuns) + "%" }}></span>
                            <span className="SplitPurple" style={{ width: percent(noEffectRuns, totalRuns) + "%" }}></span>
                            <span className="SplitBlue" style={{ width: percent(runningRuns, totalRuns) + "%" }}></span>
                            <span className="SplitGray" style={{ width: percent(failedRuns, totalRuns) + "%" }}></span>
                        </div>
                        <div className="SplitLegend">
                            <span><i className="SplitGreen"></i>Robust {robustRuns}</span>
                            <span><i className="SplitAmber"></i>Fragile {fragileRuns}</span>
                            <span><i className="SplitRed"></i>Choice dependent {choiceRuns}</span>
                            <span><i className="SplitPurple"></i>No effect {noEffectRuns}</span>
                            <span><i className="SplitBlue"></i>Running {runningRuns}</span>
                            <span><i className="SplitGray"></i>Failed {failedRuns}</span>
                        </div>
                    </section>
                )}

                <section className="DashCard">
                    <div className="DashCardTop">
                        <h6 className="DashCardTitle">Recent runs</h6>
                        <div className="DashSearch">
                            <FaSearch />
                            <input placeholder="Search questions" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="DashFilters">
                        <button className={filter === "all" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("all")}>All</button>
                        <button className={filter === "robust" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("robust")}>Robust</button>
                        <button className={filter === "fragile" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("fragile")}>Fragile</button>
                        <button className={filter === "choice_dependent" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("choice_dependent")}>Choice dependent</button>
                        <button className={filter === "no_effect" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("no_effect")}>No effect</button>
                        <button className={filter === "running" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("running")}>Running</button>
                        <button className={filter === "failed" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("failed")}>Failed</button>
                    </div>

                    {loading ? (
                        <p className="DashMuted">Loading...</p>
                    ) : totalRuns === 0 ? (
                        <div className="DashEmpty">
                            <p className="DashEmptyTitle">Start your first analysis</p>
                            <p className="DashMuted">Upload a data file and ask a question. The results will show up here.</p>
                            <button className="btn DashNewButton" onClick={() => navigate("/chat")}><FaPlus /> New analysis</button>
                        </div>
                    ) : shown.length === 0 ? (
                        <p className="DashMuted DashNoMatch">No runs match your search.</p>
                    ) : (
                        <div className="DashList">
                            {shown.map((run) => (
                                <div className="DashRow" key={run.id} onClick={() => navigate(`/runs/${run.id}`)}>
                                    <span className="DashRowId">#{run.id}</span>
                                    <div className="DashRowMain">
                                        <p className="DashRowQuestion">{run.question}</p>
                                        <p className="DashRowMeta">{countFiles(run.filename)} file(s) · {formatDate(run.created_at)}</p>
                                    </div>
                                    <span className={"DashBadge Badge-" + (run.verdict ? run.verdict : run.status)}>
                                        {run.verdict ? run.verdict.replaceAll("_", " ") : run.status}
                                    </span>
                                    <span className="DashArrow">›</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}