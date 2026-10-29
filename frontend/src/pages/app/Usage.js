import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { FaFlask, FaComments, FaUsers, FaDownload } from "react-icons/fa"
import AppLayout, { useMe } from "../../components/app/AppLayout"
import { getHistory } from "../../api"
import { countRuns, runsPerDay } from "../../components/app/runTools"

function percent(part, total) {
    if (!total) {
        return 0
    }
    return Math.min(100, (part / total) * 100)
}

function UsageBody() {
    const me = useMe()
    const usage = me.usage
    const [history, setHistory] = useState([])

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
        }
        load()
    }, [])

    const days = runsPerDay(history, 30)
    let biggest = 1
    let monthTotal = 0
    for (const d of days) {
        monthTotal = monthTotal + d.total
        if (d.total > biggest) {
            biggest = d.total
        }
    }
    const count = countRuns(history)

    if (!usage) {
        return <div className="fw-skeleton" style={{ height: 320 }}></div>
    }

    const plan = usage.plan
    return (
        <>
            <div className="ax-stats">
                <div className="ax-stat">
                    <div className="ax-stat-top">Analyses today <FaFlask /></div>
                    <b>{usage.unlimited ? usage.used : usage.used + " / " + usage.limit}</b>
                    {!usage.unlimited && <div className="rs-meter"><span style={{ width: percent(usage.used, usage.limit) + "%" }}></span></div>}
                    <small>{usage.unlimited ? "No daily limit" : usage.left + " left, resets every day"}</small>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Analysts per run <FaUsers /></div>
                    <b>{usage.unlimited ? "100" : plan.max_analysts}</b>
                    <small>Maximum on your plan</small>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">Chat messages a day <FaComments /></div>
                    <b>{usage.unlimited ? "∞" : plan.daily_chat_limit}</b>
                    <small>For the Assistant</small>
                </div>
                <div className="ax-stat">
                    <div className="ax-stat-top">CSV export <FaDownload /></div>
                    <b style={{ fontSize: 22 }}>{usage.unlimited || plan.can_export ? "Included" : "Not included"}</b>
                    <small>{usage.unlimited || plan.can_export ? "Export every analyst's result" : <Link to="/pricing">Upgrade to export</Link>}</small>
                </div>
            </div>

            <section className="ax-card ax-card-pad">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h2 style={{ fontSize: 15, fontWeight: 600 }}>Runs in the last 30 days</h2>
                        <p className="fw-muted" style={{ fontSize: 13 }}>{monthTotal} runs · {count.total} in total</p>
                    </div>
                </div>
                <div className="ax-bars" style={{ height: 180 }}>
                    {days.map((d, i) => (
                        <div className="ax-bar-col" key={d.key} title={d.date.toDateString() + ": " + d.total + " runs"}>
                            <b>{d.total > 0 ? d.total : ""}</b>
                            <div className={d.total > 0 ? "ax-bar" : "ax-bar ax-bar-empty"} style={{ height: d.total > 0 ? (d.total / biggest) * 100 + "%" : "2px" }}></div>
                            <small>{i % 3 === 0 ? d.label : ""}</small>
                        </div>
                    ))}
                </div>
            </section>

            <div className="ax-grid-half">
                <section className="ax-card ax-card-pad">
                    <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Your plan</h2>
                    <div className="ax-kv">
                        <div><span>Plan</span><b>{usage.unlimited ? "Admin" : plan.plan_type}</b></div>
                        <div><span>Price</span><b>{usage.unlimited ? "-" : "$" + Number(plan.price) + (Number(plan.price) === 0 ? "" : " / month")}</b></div>
                        <div><span>Analyses per day</span><b>{usage.unlimited ? "No limit" : plan.daily_limit}</b></div>
                        <div><span>Active until</span><b>{plan.plan_expires_at ? new Date(plan.plan_expires_at).toLocaleDateString() : "No end date"}</b></div>
                    </div>
                    {!usage.unlimited && plan.plan_type !== "Premium" && (
                        <Link to="/pricing" className="fw-btn fw-btn-primary fw-btn-block" style={{ marginTop: 16 }}>See higher plans</Link>
                    )}
                </section>
                <section className="ax-card ax-card-pad">
                    <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Results so far</h2>
                    <div className="ax-kv">
                        <div><span>Robust</span><b>{count.robust}</b></div>
                        <div><span>Fragile</span><b>{count.fragile}</b></div>
                        <div><span>Choice dependent</span><b>{count.choice_dependent}</b></div>
                        <div><span>No effect</span><b>{count.no_effect}</b></div>
                        <div><span>Failed</span><b>{count.failed}</b></div>
                    </div>
                </section>
            </div>
        </>
    )
}

export default function Usage() {
    return (
        <AppLayout title="Usage" crumbs={[{ label: "Usage" }]}>
            <UsageBody />
        </AppLayout>
    )
}
