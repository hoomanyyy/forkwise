import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Pages.css"
import "../styles/Plans.css"
import { useNavigate } from "react-router-dom"
import { FaCheck, FaTimes } from "react-icons/fa"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"
import { getPlans , CreatePay } from "../api"

export default function Plans() {
    const navigate = useNavigate()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        async function HandlePlans() {
            const response = await getPlans()
            if (response.Message === true) {
                setPlans(response.data)
            } else {
                setError("Could not load the plans.")
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
        const data = await CreatePay(plan.id)
        if (data.Message === true) {
            window.location.href = data.invoice_url
        } else {
            setError(data.detail || "Could not start the payment.")
        }
    }

    return (
        <div className="SitePage">
            <Seo
                title="Forkwise Plans: Start Free"
                description="Start free and move up when you need more analyses. See what every Forkwise plan includes."
                path="/plans"
            />
            <Navbar />

            <main className="PageBody">
                <div className="PageHead">
                    <p className="SectionTag">Plans</p>
                    <h1 className="PageTitle">Simple plans</h1>
                    <p className="PageLead">Every plan uses the same method. The AI chooses how to analyze, and Python does the math.</p>
                </div>

                {loading && <p className="PageLead">Loading...</p>}
                {error !== "" && <p className="PageLead">{error}</p>}

                <section className="PlansGrid">
                    {plans.map((plan) => (
                        <div key={plan.id} className={plan.is_featured ? "PlanCard PlanFeatured" : "PlanCard"}>
                            <div className="PlanTop">
                                <h2 className="PlanName">{plan.plan_type}</h2>
                            </div>

                            <p className="PlanPrice">
                                ${Number(plan.price)} <span>{Number(plan.price) === 0 ? "forever" : "per month"}</span>
                            </p>

                            <ul className="PlanFeatures">
                                <li><FaCheck /> {plan.daily_limit} analyses per day</li>
                                <li><FaCheck /> Up to {plan.max_analysts} AI analysts per run</li>
                                <li><FaCheck /> {plan.daily_chat_limit} chat messages per day</li>
                                <li className={plan.can_export ? "" : "PlanNo"}>
                                    {plan.can_export ? <FaCheck /> : <FaTimes />} Export results as CSV
                                </li>
                                {(plan.information || "").split(",").filter((item) => item.trim() !== "").map((item) => (
                                    <li key={item}><FaCheck /> {item.trim()}</li>
                                ))}
                            </ul>

                            <button
                                className={plan.is_featured ? "btn MainButton PlanButton" : "btn GhostLink PlanButton"}
                                onClick={() => HandleBuy(plan)}
                            >
                                {Number(plan.price) === 0 ? "Start for free" : "Buy"}
                            </button>
                        </div>
                    ))}
                </section>
            </main>

            <Footer />
        </div>
    )
}