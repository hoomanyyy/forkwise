import React, { useState, useEffect } from "react"
import { FiCheck, FiX, FiFileText, FiRefreshCw } from "react-icons/fi"
import { TopBar } from "../components/Parts"
import { getPlans, createInvoice, getInvoices } from "../api"
import { shortDate } from "../verdicts"
import { tap, openLink } from "../native"
import "../styles/Plans.css"

export function PlansPage({ usage, onBack, onBilling }) {
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [buying, setBuying] = useState(null)
    const [info, setInfo] = useState("")

    useEffect(() => {
        async function load() {
            const result = await getPlans()
            setLoading(false)
            if (result.Message === true) {
                setPlans(result.data || [])
            } else {
                setError("Could not load the plans. Check your internet.")
            }
        }
        load()
    }, [])

    async function buy(plan) {
        if (Number(plan.price) === 0) {
            return
        }
        tap()
        setError("")
        setInfo("")
        setBuying(plan.id)
        const result = await createInvoice(plan.id)
        setBuying(null)
        if (result.Message === true && result.invoice_url) {
            openLink(result.invoice_url)
            setInfo("The payment page opened in your browser. Your plan becomes active a few minutes after the payment is confirmed.")
        } else {
            setError(result.detail || "Could not start the payment.")
        }
    }

    const current = usage && usage.plan ? usage.plan.plan_type : ""

    return (
        <div className="AppScreen AppSlideIn">
            <TopBar title="Plans" onBack={onBack} right={<button className="AppIconButton" onClick={() => { tap(); onBilling() }} aria-label="Billing"><FiFileText /></button>} />
            <p className="PlIntro">Every plan uses the same AI analysts and the same Python calculations. Paid plans give you more of them.</p>

            {error !== "" && <div className="AppError">{error}</div>}
            {info !== "" && <div className="AppSuccess">{info}</div>}

            {loading && [1, 2, 3].map((i) => <div key={i} className="AppSkeleton" style={{ height: 220 }}></div>)}

            {plans.map((plan) => {
                const isCurrent = !usage || usage.unlimited ? false : current === plan.plan_type
                const free = Number(plan.price) === 0
                return (
                    <section key={plan.id} className={plan.is_featured ? "PlCard PlFeatured" : "PlCard"}>
                        <div className="PlTop">
                            <b>{plan.plan_type}</b>
                            {plan.is_featured && <span className="PlTag">Most popular</span>}
                            {isCurrent && <span className="PlTag PlTagNow">Your plan</span>}
                        </div>
                        <p className="PlPrice">${Number(plan.price)}<span>{free ? " forever" : " / 30 days"}</span></p>
                        <ul>
                            <li><FiCheck /> {plan.daily_limit} analyses per day</li>
                            <li><FiCheck /> Up to {plan.max_analysts} AI analysts per run</li>
                            <li><FiCheck /> {plan.daily_chat_limit} Assistant messages per day</li>
                            <li className={plan.can_export ? "" : "PlNo"}>{plan.can_export ? <FiCheck /> : <FiX />} Export results as CSV</li>
                        </ul>
                        {!free && !isCurrent && (
                            <button className={plan.is_featured ? "AppButton" : "AppButton AppButtonGhost"} onClick={() => buy(plan)} disabled={buying === plan.id}>
                                {buying === plan.id ? <span className="AppSpinner"></span> : "Buy " + plan.plan_type}
                            </button>
                        )}
                    </section>
                )
            })}

            <p className="PlNote">Payments are made in cryptocurrency through NOWPayments, on a secure page in your browser.</p>
        </div>
    )
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

function statusColor(status) {
    if (status === "finished") {
        return "#34d399"
    }
    if (status === "failed") {
        return "#f87171"
    }
    return "#fbbf24"
}

export function BillingPage({ usage, onBack, onPlans }) {
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    async function load() {
        setLoading(true)
        setError("")
        const result = await getInvoices()
        setLoading(false)
        if (result.Message === true) {
            setInvoices(result.rows || [])
        } else if (result.Error) {
            setError("Could not connect to the server.")
        }
    }

    useEffect(() => {
        load()
    }, [])

    let endText = ""
    if (usage && !usage.unlimited && usage.plan && usage.plan.plan_expires_at) {
        endText = "Active until " + new Date(usage.plan.plan_expires_at).toLocaleDateString("en-GB")
    }

    return (
        <div className="AppScreen AppSlideIn">
            <TopBar title="Billing" onBack={onBack} right={<button className="AppIconButton" onClick={load} aria-label="Refresh"><FiRefreshCw /></button>} />

            <section className="PlCard PlFeatured">
                <span className="AppEyebrow">Current plan</span>
                <p className="PlPrice" style={{ marginTop: 0 }}>{usage ? (usage.unlimited ? "Admin" : usage.plan.plan_type) : "-"}</p>
                {endText !== "" && <p className="PlIntro" style={{ margin: 0 }}>{endText}</p>}
                <button className="AppButton AppButtonGhost" style={{ marginTop: 14 }} onClick={() => { tap(); onPlans() }}>See plans</button>
            </section>

            {error !== "" && <div className="AppError">{error}</div>}

            <div className="AppSectionTitle"><span>Invoices</span></div>
            {loading && <div className="AppSkeleton" style={{ height: 64 }}></div>}
            {!loading && invoices.length === 0 && (
                <div className="AppEmpty">
                    <FiFileText />
                    <p>No invoices yet. When you buy a plan, it shows up here.</p>
                </div>
            )}
            {invoices.length > 0 && (
                <div className="AppList">
                    {invoices.map((inv) => (
                        <div key={inv.id} className="AppListItem">
                            <span className="AppListIcon"><FiFileText /></span>
                            <span className="AppListText">
                                {inv.plan_type} plan · ${Number(inv.price)}
                                <small>Invoice #{inv.id} · {shortDate(inv.created_at)}</small>
                            </span>
                            <span className="AppBadge" style={{ background: "rgba(255,255,255,0.05)", color: statusColor(inv.status) }}>
                                <span className="AppBadgeDot" style={{ background: statusColor(inv.status) }}></span>
                                {statusText(inv.status)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
