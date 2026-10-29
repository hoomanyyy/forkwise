import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaDollarSign, FaCheckCircle, FaClock, FaCalendarAlt, FaArrowUp, FaReceipt } from "react-icons/fa"
import AppLayout from "../components/app/AppLayout"
import { getInvoices, getMe } from "../api"
import { formatDate } from "../components/app/runTools"

function statusText(status) {
    if (status === "finished") {
        return "Paid"
    }
    if (status === "partially_paid") {
        return "Partially paid"
    }
    if (status === "failed") {
        return "Failed"
    }
    return "Not paid"
}

function planEndText(usage) {
    if (usage.unlimited) {
        return "Admin account, no limits."
    }
    if (usage.plan.plan_expires_at) {
        return "Active until " + new Date(usage.plan.plan_expires_at).toLocaleDateString() + "."
    }
    if (Number(usage.plan.price) === 0) {
        return "Free forever. Upgrade to get more analysts, export and chat."
    }
    return "No end date."
}

function daysLeft(usage) {
    if (!usage || !usage.plan.plan_expires_at) {
        return "-"
    }
    const left = new Date(usage.plan.plan_expires_at) - new Date()
    return Math.max(0, Math.ceil(left / (1000 * 60 * 60 * 24)))
}

function Billing() {
    const navigate = useNavigate()
    const [invoices, setInvoices] = useState([])
    const [usage, setUsage] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("all")

    useEffect(() => {
        async function load() {
            const me = await getMe()
            if (me.Message === "login") {
                navigate("/auth/login")
                return
            }
            if (me.Message === true) {
                setUsage(me.usage)
            }
            try {
                const data = await getInvoices()
                if (data.Message === true) {
                    setInvoices(data.rows)
                }
            } catch (e) {
                setInvoices([])
            }
            setLoading(false)
        }
        load()
    }, [navigate])

    const paid = invoices.filter((i) => i.status === "finished")
    const notPaid = invoices.filter((i) => i.status !== "finished")
    let totalPaid = 0
    for (const i of paid) {
        totalPaid = totalPaid + Number(i.price)
    }
    let shown = invoices
    if (filter === "paid") {
        shown = paid
    }
    if (filter === "notpaid") {
        shown = notPaid
    }
    const canUpgrade = usage && !usage.unlimited && usage.plan.plan_type !== "Premium"

    return (
        <>
            <section className="ax-welcome">
                <div>
                    <span className="fw-eyebrow">Current plan</span>
                    <h1 style={{ marginTop: 6 }}>{usage ? (usage.unlimited ? "Admin" : usage.plan.plan_type) + " plan" : "Your plan"}</h1>
                    {usage && <p>{planEndText(usage)}</p>}
                    {usage && !usage.unlimited && (
                        <div style={{ marginTop: 12, maxWidth: 360, display: "grid", gap: 6 }}>
                            <span className="fw-muted" style={{ fontSize: 13 }}>{usage.used} of {usage.limit} analyses used today</span>
                            <div className="ap-meter"><span style={{ width: Math.min(100, (usage.used / usage.limit) * 100) + "%" }}></span></div>
                        </div>
                    )}
                </div>
                {canUpgrade && (
                    <button className="fw-btn fw-btn-primary" onClick={() => navigate("/pricing")}><FaArrowUp /> Upgrade</button>
                )}
            </section>

            <div className="ax-stats">
                <div className="ax-stat"><div className="ax-stat-top">Total paid <FaDollarSign /></div><b>${totalPaid}</b></div>
                <div className="ax-stat"><div className="ax-stat-top">Paid invoices <FaCheckCircle style={{ color: "var(--green)" }} /></div><b>{paid.length}</b></div>
                <div className="ax-stat"><div className="ax-stat-top">Not paid <FaClock style={{ color: "var(--amber)" }} /></div><b>{notPaid.length}</b></div>
                <div className="ax-stat"><div className="ax-stat-top">Days left <FaCalendarAlt style={{ color: "var(--cyan)" }} /></div><b>{daysLeft(usage)}</b></div>
            </div>

            <section className="ax-card">
                <div className="ax-toolbar">
                    <div className="fw-chips">
                        <button className={filter === "all" ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setFilter("all")}>All</button>
                        <button className={filter === "paid" ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setFilter("paid")}>Paid</button>
                        <button className={filter === "notpaid" ? "fw-chip fw-chip-on" : "fw-chip"} onClick={() => setFilter("notpaid")}>Not paid</button>
                    </div>
                    <span className="fw-muted" style={{ fontSize: 13 }}>{invoices.length} invoices</span>
                </div>
                {loading ? (
                    <div style={{ padding: 20, display: "grid", gap: 10 }}>
                        <div className="fw-skeleton" style={{ height: 44 }}></div>
                        <div className="fw-skeleton" style={{ height: 44 }}></div>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="fw-empty">
                        <span className="fw-empty-icon"><FaReceipt /></span>
                        <h3>No invoices yet</h3>
                        <p>When you buy a plan, your invoices will show up here.</p>
                        <button className="fw-btn fw-btn-primary" onClick={() => navigate("/pricing")}>See plans</button>
                    </div>
                ) : shown.length === 0 ? (
                    <div className="fw-empty"><p>No invoices in this list.</p></div>
                ) : (
                    <div>
                        {shown.map((invoice) => (
                            <div className="bl-row" key={invoice.id}>
                                <span className="bl-icon"><FaReceipt /></span>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ color: "#fff", fontWeight: 500 }}>{invoice.plan_type} plan · 30 days</p>
                                    <p className="fw-muted" style={{ fontSize: 13 }}>Invoice #{invoice.id} · {formatDate(invoice.created_at)}</p>
                                </div>
                                <span className="fw-mono" style={{ color: "#fff" }}>${Number(invoice.price)}</span>
                                <span className={"fw-badge fw-badge-" + invoice.status}>{statusText(invoice.status)}</span>
                                {invoice.status === "waiting" ? (
                                    <button className="fw-btn fw-btn-ghost fw-btn-sm" onClick={() => navigate("/pricing")}>Pay again</button>
                                ) : <span></span>}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <p className="fw-muted" style={{ fontSize: 13 }}>Payments are handled by NOWPayments in cryptocurrency. A plan becomes active a few minutes after the payment is confirmed.</p>
        </>
    )
}

export default function Invoices() {
    return (
        <AppLayout title="Billing" crumbs={[{ label: "Billing" }]}>
            <Billing />
        </AppLayout>
    )
}
