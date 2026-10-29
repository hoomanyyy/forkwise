import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FaDatabase, FaFileCsv, FaFileExcel, FaFileCode, FaFileAlt, FaSearch, FaPlus, FaChevronDown, FaChevronRight } from "react-icons/fa"
import AppLayout from "../../components/app/AppLayout"
import { getHistory } from "../../api"
import { fileList, timeAgo, runState, stateLabel } from "../../components/app/runTools"

function fileIcon(name) {
    const lower = name.toLowerCase()
    if (lower.endsWith(".csv")) {
        return <FaFileCsv style={{ color: "var(--green)" }} />
    }
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        return <FaFileExcel style={{ color: "var(--green)" }} />
    }
    if (lower.endsWith(".json")) {
        return <FaFileCode style={{ color: "var(--amber)" }} />
    }
    return <FaFileAlt />
}

function fileType(name) {
    const parts = name.split(".")
    if (parts.length < 2) {
        return "file"
    }
    return parts[parts.length - 1].toUpperCase()
}

export default function Datasets() {
    const navigate = useNavigate()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [open, setOpen] = useState("")

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

    const files = {}
    for (const run of history) {
        for (const name of fileList(run.filename)) {
            if (!files[name]) {
                files[name] = { name: name, runs: [], last: null }
            }
            files[name].runs.push(run)
            if (!files[name].last || new Date(run.created_at) > new Date(files[name].last)) {
                files[name].last = run.created_at
            }
        }
    }
    let list = Object.values(files).sort((a, b) => new Date(b.last) - new Date(a.last))
    const word = search.trim().toLowerCase()
    list = list.filter((f) => f.name.toLowerCase().includes(word))

    return (
        <AppLayout title="Datasets" crumbs={[{ label: "Datasets" }]}>
            <p className="ap-sub" style={{ marginTop: -14 }}>Every file you have analyzed, and the questions you asked about it.</p>

            <div className="fw-alert fw-alert-info" style={{ fontSize: 13.5 }}>
                Forkwise keeps the results of each run, not a library of your files. To ask a new question about a file, upload it again in New analysis.
            </div>

            <section className="ax-card">
                <div className="ax-toolbar">
                    <span className="fw-muted" style={{ fontSize: 13 }}>{list.length} files</span>
                    <div className="fw-input-icon ax-search">
                        <FaSearch />
                        <input className="fw-input" placeholder="Search file names" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search files" />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: 20, display: "grid", gap: 10 }}>
                        {[1, 2, 3].map((i) => <div key={i} className="fw-skeleton" style={{ height: 44 }}></div>)}
                    </div>
                ) : list.length === 0 ? (
                    <div className="fw-empty">
                        <span className="fw-empty-icon"><FaDatabase /></span>
                        <h3>No datasets yet</h3>
                        <p>Files appear here after you use them in an analysis.</p>
                        <button className="fw-btn fw-btn-primary" onClick={() => navigate("/chat")}><FaPlus /> New analysis</button>
                    </div>
                ) : (
                    <div className="ax-list">
                        {list.map((f) => (
                            <div key={f.name}>
                                <div className="ax-row" onClick={() => setOpen(open === f.name ? "" : f.name)} role="button" tabIndex={0} aria-expanded={open === f.name} onKeyDown={(e) => { if (e.key === "Enter") setOpen(open === f.name ? "" : f.name) }}>
                                    <span style={{ fontSize: 20 }}>{fileIcon(f.name)}</span>
                                    <div className="ax-row-main">
                                        <p className="ax-row-title">{f.name}</p>
                                        <p className="ax-row-meta">{fileType(f.name)} · used in {f.runs.length} run{f.runs.length === 1 ? "" : "s"} · last used {timeAgo(f.last)}</p>
                                    </div>
                                    <span className="fw-badge fw-badge-plain">{f.runs.length} runs</span>
                                    <span className="ax-row-arrow">{open === f.name ? <FaChevronDown /> : <FaChevronRight />}</span>
                                </div>
                                {open === f.name && (
                                    <div style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--line)", padding: "6px 20px 12px 56px", display: "grid", gap: 4 }}>
                                        {f.runs.map((run) => (
                                            <Link key={run.id} to={"/runs/" + run.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", color: "var(--text-2)", borderBottom: "1px solid var(--line)" }}>
                                                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{run.id} {run.question}</span>
                                                <span className={"fw-badge fw-badge-" + runState(run)}>{stateLabel(runState(run))}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </AppLayout>
    )
}
