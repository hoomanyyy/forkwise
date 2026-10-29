import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FaCheck, FaTimes, FaPlus } from "react-icons/fa"
import SiteLayout, { PageHero } from "../components/site/SiteLayout"
import Seo from "../components/Seo"
import { getPlans, CreatePay } from "../api"

const BILLING_FAQ = [
    { q: "How do I pay?", a: "Paid plans are paid in cryptocurrency through NOWPayments. After you click Buy, you are taken to a secure payment page. Your plan becomes active a few minutes after the payment is confirmed." },
    { q: "How long does a plan last?", a: "A paid plan lasts 30 days from the day it becomes active. You can see the end date in the app under Billing." },
    { q: "What if I paid less than the price?", a: "If a payment is only partly received, contact us with your invoice number and we will fix it." },
    { q: "Do all plans use the same method?", a: "Yes. Every plan uses the same AI analysts, the same Python calculations and the same verdict rules. Paid plans give you more of them." }
]

export default function Plans() {
    const navigate = useNavigate()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [buying, setBuying] = useState(null)
    const [open, setOpen] = useState(0)

    useEffect(() => {
        async function HandlePlans() {
            const response = await getPlans()
            if (response.Message === true) {
                setPlans(response.data)
            } else {
                setError("Could not load the plans. Please refresh the page.")
            }
            setLoading(false)
        }
        HandlePlans()
    }, [])

    async function HandleBuy(plan) {
        if (Number(plan.price) === 0) {
            navigate("/register")
            return
        }
        setError("")
        setBuying(plan.id)
        const data = await CreatePay(plan.id)
        setBuying(null)
        if (data.Message === true) {
            window.location.href = data.invoice_url
        } else if (data.Message === "login") {
            navigate("/auth/login")
        } else {
            setError(data.detail || "Could not start the payment.")
        }
    }

    function extras(plan) {
        return (plan.information || "").split(",").filter((item) => item.trim() !== "").map((item) => item.trim())
    }

    return (
        <SiteLayout>
            <Seo
                title="Forkwise Pricing: Start Free"
                description="Start free and move up when you need more analyses. See what every Forkwise plan includes."
                path="/pricing"
            />
            <PageHero center eyebrow="Pricing" title="Simple plans. The same honest method." lead="Every plan uses the same AI analysts, the same Python calculations and the same verdict rules. Pay only for more of them." />

            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    {error !== "" && <div className="fw-alert fw-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                    <div className="pricing">
                        {loading && [1, 2, 3].map((i) => <div key={i} className="fw-skeleton price-skeleton"></div>)}
                        {plans.map((plan) => (
                            <div key={plan.id} className={plan.is_featured ? "price price-featured" : "price"}>
                                {plan.is_featured && <span className="price-tag fw-badge fw-badge-accent fw-badge-plain">Most popular</span>}
                                <h2 className="price-name">{plan.plan_type}</h2>
                                <div className="price-amount">
                                    <b>${Number(plan.price)}</b>
                                    <span>{Number(plan.price) === 0 ? "forever" : "per 30 days"}</span>
                                </div>
                                <button
                                    className={plan.is_featured ? "fw-btn fw-btn-primary fw-btn-lg fw-btn-block" : "fw-btn fw-btn-ghost fw-btn-lg fw-btn-block"}
                                    onClick={() => HandleBuy(plan)}
                                    disabled={buying === plan.id}
                                >
                                    {Number(plan.price) === 0 ? "Start for free" : buying === plan.id ? "Opening payment..." : "Buy " + plan.plan_type}
                                </button>
                                <ul>
                                    <li><FaCheck /> {plan.daily_limit} analyses per day</li>
                                    <li><FaCheck /> Up to {plan.max_analysts} AI analysts per run</li>
                                    <li><FaCheck /> {plan.daily_chat_limit} Assistant messages per day</li>
                                    <li className={plan.can_export ? "" : "price-no"}>
                                        {plan.can_export ? <FaCheck /> : <FaTimes />} Export results as CSV
                                    </li>
                                    {extras(plan).map((item) => (
                                        <li key={item}><FaCheck /> {item}</li>
                                    ))}
                                </ul>
                                <span></span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {plans.length > 0 && (
                <section className="mk-section">
                    <div className="mk-wrap">
                        <h2 className="mk-h2" style={{ marginBottom: 24 }}>Compare every plan</h2>
                        <div className="pt">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        {plans.map((plan) => <th key={plan.id}>{plan.plan_type}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="pt-group"><td colSpan={plans.length + 1}>Analyses</td></tr>
                                    <tr><td>Analyses per day</td>{plans.map((p) => <td key={p.id}>{p.daily_limit}</td>)}</tr>
                                    <tr><td>AI analysts per run</td>{plans.map((p) => <td key={p.id}>up to {p.max_analysts}</td>)}</tr>
                                    <tr><td>Specification curve and data explorer</td>{plans.map((p) => <td key={p.id}><FaCheck style={{ color: "var(--green)" }} /></td>)}</tr>
                                    <tr><td>Download charts as PNG</td>{plans.map((p) => <td key={p.id}><FaCheck style={{ color: "var(--green)" }} /></td>)}</tr>
                                    <tr className="pt-group"><td colSpan={plans.length + 1}>Assistant and export</td></tr>
                                    <tr><td>Assistant messages per day</td>{plans.map((p) => <td key={p.id}>{p.daily_chat_limit}</td>)}</tr>
                                    <tr><td>Export every analyst as CSV</td>{plans.map((p) => <td key={p.id}>{p.can_export ? <FaCheck style={{ color: "var(--green)" }} /> : <FaTimes style={{ color: "var(--muted)" }} />}</td>)}</tr>
                                    <tr className="pt-group"><td colSpan={plans.length + 1}>Price</td></tr>
                                    <tr><td>Per 30 days</td>{plans.map((p) => <td key={p.id}>${Number(p.price)}</td>)}</tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <div className="faq-layout">
                        <div style={{ display: "grid", gap: 14 }}>
                            <p className="fw-eyebrow">Billing questions</p>
                            <h2 className="mk-h2">Paying for Forkwise</h2>
                            <p className="fw-muted">Something else? <Link to="/contact">Contact us</Link>.</p>
                        </div>
                        <div className="faq">
                            {BILLING_FAQ.map((item, index) => (
                                <div key={item.q} className={open === index ? "faq-item faq-open" : "faq-item"}>
                                    <button className="faq-q" onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}>{item.q} <FaPlus /></button>
                                    {open === index && <p className="faq-a">{item.a}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
