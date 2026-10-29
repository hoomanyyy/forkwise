import React, { useState } from "react"
import { FiRefreshCw, FiSearch, FiInbox } from "react-icons/fi"
import { TopBar, RunRow } from "../components/Parts"
import { tap } from "../native"
import "../styles/History.css"

const FILTERS = [
    { id: "all", label: "All" },
    { id: "robust", label: "Robust" },
    { id: "fragile", label: "Fragile" },
    { id: "choice_dependent", label: "Choice dependent" },
    { id: "no_effect", label: "No effect" },
    { id: "failed", label: "Failed" }
]

export default function HistoryPage({ runs, loading, onRefresh, onOpenRun }) {
    const [filter, setFilter] = useState("all")
    const [search, setSearch] = useState("")

    const shown = runs.filter((r) => {
        if (filter === "failed" && r.status !== "failed") {
            return false
        }
        if (filter !== "all" && filter !== "failed" && r.verdict !== filter) {
            return false
        }
        if (search.trim() !== "" && !String(r.question).toLowerCase().includes(search.trim().toLowerCase())) {
            return false
        }
        return true
    })

    return (
        <div className="AppScreen AppScreenWithBar AppFadeIn">
            <TopBar
                title="Runs"
                right={
                    <button className={loading ? "AppIconButton HistSpin" : "AppIconButton"} onClick={() => { tap(); onRefresh() }} aria-label="Refresh">
                        <FiRefreshCw />
                    </button>
                }
            />

            <div className="HistSearch">
                <FiSearch />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your questions" />
            </div>

            <div className="AppChips HistFilters">
                {FILTERS.map((f) => (
                    <button key={f.id} className={filter === f.id ? "AppChip AppChipOn" : "AppChip"} onClick={() => { tap(); setFilter(f.id) }}>{f.label}</button>
                ))}
            </div>

            {!loading && shown.length === 0 && (
                <div className="AppEmpty">
                    <FiInbox />
                    <p>{runs.length === 0 ? "You have not run any analysis yet." : "Nothing matches this filter."}</p>
                </div>
            )}

            {shown.map((run) => (
                <RunRow key={run.id} run={run} onOpen={onOpenRun} />
            ))}
        </div>
    )
}
