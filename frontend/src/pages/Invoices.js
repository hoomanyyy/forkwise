import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Dashboard.css"
import "../styles/Billing.css"
import Seo from "../components/Seo"
import Navbar from "../components/Navbar"
import { useNavigate } from "react-router-dom"
import { FaDollarSign, FaCheckCircle, FaClock, FaCalendarAlt, FaArrowUp, FaReceipt } from "react-icons/fa"
import { getInvoices, getMe } from "../api"

function formatDate(text) {
    if (!text) {
        return "-"
    }
    const date = new Date(text)
    return date.toLocaleDateString() + " · " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

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

export default function Invoices() {
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

            const data = await getInvoices()
            if (data.Message === true) {
                setInvoices(data.rows)
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
        <div className="DashPage">
            <Seo title="Billing | Forkwise" noindex />
            <Navbar />

            <main className="DashBody">
                <section className="DashHero">
                    <div>
                        <p className="DashEyebrow">Billing</p>
                        <h2 className="DashTitle">
                            {usage ? (usage.unlimited ? "Admin" : usage.plan.plan_type) + " plan" : "Your plan"}
                        </h2>
                        {usage && <p className="DashLead">{planEndText(usage)}</p>}
                        {usage && !usage.unlimited && (
                            <div className="BillingUsage">
                                <span>{usage.used} of {usage.limit} analyses used today</span>
                                <div className="BillingBar">
                                    <span style={{ width: Math.min(100, (usage.used / usage.limit) * 100) + "%" }}></span>
                                </div>
                            </div>
                        )}
                    </div>
                    {canUpgrade && (
                        <button className="btn DashNewButton" onClick={() => navigate("/plans")}>
                            <FaArrowUp /> Upgrade
                        </button>
                    )}
                </section>

                <section className="DashStats">
                    <div className="DashStat">
                        <span className="DashStatIcon IconPurple"><FaDollarSign /></span>
                        <div>
                            <p className="DashStatLabel">Total paid</p>
                            <p className="DashStatNumber">${totalPaid}</p>
                        </div>
                    </div>
                    <div className="DashStat">
                        <span className="DashStatIcon IconGreen"><FaCheckCircle /></span>
                        <div>
                            <p className="DashStatLabel">Paid invoices</p>
                            <p className="DashStatNumber">{paid.length}</p>
                        </div>
                    </div>
                    <div className="DashStat">
                        <span className="DashStatIcon IconAmber"><FaClock /></span>
                        <div>
                            <p className="DashStatLabel">Not paid</p>
                            <p className="DashStatNumber">{notPaid.length}</p>
                        </div>
                    </div>
                    <div className="DashStat">
                        <span className="DashStatIcon IconBlue"><FaCalendarAlt /></span>
                        <div>
                            <p className="DashStatLabel">Days left</p>
                            <p className="DashStatNumber">{daysLeft(usage)}</p>
                        </div>
                    </div>
                </section>

                <section className="DashCard">
                    <div className="DashCardTop">
                        <h6 className="DashCardTitle">Invoices</h6>
                        <span className="DashMuted">{invoices.length} invoices</span>
                    </div>

                    <div className="DashFilters">
                        <button className={filter === "all" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("all")}>All</button>
                        <button className={filter === "paid" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("paid")}>Paid</button>
                        <button className={filter === "notpaid" ? "DashChip DashChipOn" : "DashChip"} onClick={() => setFilter("notpaid")}>Not paid</button>
                    </div>

                    {loading ? (
                        <p className="DashMuted">Loading...</p>
                    ) : invoices.length === 0 ? (
                        <div className="DashEmpty">
                            <p className="DashEmptyTitle">No invoices yet</p>
                            <p className="DashMuted">When you buy a plan, your invoices will show up here.</p>
                            <button className="btn DashNewButton" onClick={() => navigate("/plans")}>See plans</button>
                        </div>
                    ) : shown.length === 0 ? (
                        <p className="DashMuted DashNoMatch">No invoices in this list.</p>
                    ) : (
                        <div className="DashList">
                            {shown.map((invoice) => (
                                <div className="DashRow InvoiceRow" key={invoice.id}>
                                    <span className={"InvoiceIcon InvoiceIcon-" + invoice.status}><FaReceipt /></span>
                                    <div className="DashRowMain">
                                        <p className="DashRowQuestion">{invoice.plan_type} plan · 30 days</p>
                                        <p className="DashRowMeta">Invoice #{invoice.id} · {formatDate(invoice.created_at)}</p>
                                    </div>
                                    <span className="InvoicePrice">${Number(invoice.price)}</span>
                                    <span className={"DashBadge Badge-" + invoice.status}>{statusText(invoice.status)}</span>
                                    {invoice.status === "waiting" && (
                                        <button className="InvoiceAgain" onClick={() => navigate("/plans")}>Pay again</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}