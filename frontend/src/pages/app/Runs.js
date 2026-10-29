import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaSearch, FaPlus, FaFlask } from "react-icons/fa"
import AppLayout from "../../components/app/AppLayout"
import { getHistory } from "../../api"
import { formatDate, fileList, runState, stateLabel, countRuns } from "../../components/app/runTools"

const FILTERS = [
    { value: "all", label: "All" },
    { value: "robust", label: "Robust" },
    { value: "fragile", label: "Fragile" },
    { value: "choice_dependent", label: "Choice dependent" },
    { value: "no_effect", label: "No effect" },
    { value: "running", label: "Running" },
    { value: "failed", label: "Failed" }
]

const PAGE_SIZE = 15

export default function Runs() {
    const navigate = useNavigate()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState("all")
    const [sort, setSort] = useState("new")
    const [page, setPage] = useState(1)

    useEffect(() => {
        async function load() {
            try {
                const data = await getHistory()
                if (data.Message === true) {
                    setHistory(data.data)
                }
            } catch (e) {
                setHistory([])
            }
            setLoading(false)
        }
        load()
    }, [])

    useEffect(() => {
        setPage(1)
    }, [search, filter, sort])

    const count = countRuns(history)
    const word = search.trim().toLowerCase()

    let shown = history.filter((run) => {
        const text = (run.question + " " + run.id + " " + (run.filename || "")).toLowerCase()
        if (!text.includes(word)) {
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

    shown = [...shown].sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime()
        const timeB = new Date(b.created_at || 0).getTime()
        if (sort === "old") {
            return timeA - timeB
        }
        if (sort === "question") {
            return a.question.localeCompare(b.question)
        }
        return timeB - timeA
    })

    const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
    const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    function filterCount(value) {
        if (value === "all") {
            return count.total
        }
        return count[value]
    }

    return (
        <AppLayout
            title="Runs"
            crumbs={[{ label: "Runs" }]}
            actions={<button className="fw-btn fw-btn-primary fw-btn-sm" onClick={() => navigate("/chat")}><FaPlus /> New analysis</button>}
        >
            <p className="ap-sub" style={{ marginTop: -14 }}>Every analysis you started, with its verdict.</p>

            <section className="ax-card">
                <div className="ax-toolbar">
                    <div className="fw-chips">
                        {FILTERS.map((f) => (
                            <button key={f.value} className={filter === f.value ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setFilter(f.value)}>
                                {f.label} <span className="fw-muted fw-mono" style={{ fontSize: 11, marginLeft: 4 }}>{filterCount(f.value)}</span>
                            </button>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div className="fw-input-icon ax-search">
                            <FaSearch />
                            <input className="fw-input" placeholder="Search question, file or #" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search runs" />
                        </div>
                        <select className="fw-select" style={{ width: 150, height: 36, paddingTop: 6, paddingBottom: 6 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort runs">
                            <option value="new">Newest first</option>
                            <option value="old">Oldest first</option>
                            <option value="question">Question A to Z</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: 20, display: "grid", gap: 10 }}>
                        {[1, 2, 3, 4].map((i) => <div key={i} className="fw-skeleton" style={{ height: 40 }}></div>)}
                    </div>
                ) : history.length === 0 ? (
                    <div className="fw-empty">
                        <span className="fw-empty-icon"><FaFlask /></span>
                        <h3>No runs yet</h3>
                        <p>Your analyses will show up here with their verdicts.</p>
                        <button className="fw-btn fw-btn-primary" onClick={() => navigate("/chat")}><FaPlus /> New analysis</button>
                    </div>
                ) : shown.length === 0 ? (
                    <div className="fw-empty"><p>No runs match your search.</p></div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table className="fw-table fw-table-click">
                            <thead>
                                <tr>
                                    <th>Run</th>
                                    <th>Question</th>
                                    <th>Files</th>
                                    <th>Result</th>
                                    <th>Started</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map((run) => (
                                    <tr key={run.id} onClick={() => navigate("/runs/" + run.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") navigate("/runs/" + run.id) }}>
                                        <td className="fw-mono fw-muted">#{run.id}</td>
                                        <td style={{ maxWidth: 460 }}>
                                            <span style={{ display: "block", color: "#fff", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{run.question}</span>
                                        </td>
                                        <td className="fw-muted" style={{ whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }} title={run.filename}>
                                            {fileList(run.filename).join(", ")}
                                        </td>
                                        <td><span className={"fw-badge fw-badge-" + runState(run)}>{stateLabel(runState(run))}</span></td>
                                        <td className="fw-muted" style={{ whiteSpace: "nowrap" }}>{formatDate(run.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pages > 1 && (
                    <div className="ax-toolbar" style={{ borderTop: "1px solid var(--line)", borderBottom: "none" }}>
                        <span className="fw-muted" style={{ fontSize: 13 }}>Page {page} of {pages} · {shown.length} runs</span>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
                            <button className="fw-btn fw-btn-ghost fw-btn-sm" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</button>
                        </div>
                    </div>
                )}
            </section>
        </AppLayout>
    )
}
