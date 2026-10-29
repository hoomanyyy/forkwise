import React from "react"
import { useNavigate } from "react-router-dom"
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa"
import SiteLayout from "../components/site/SiteLayout"
import Seo from "../components/Seo"

export default function PaymentResult({ partial }) {
    const navigate = useNavigate()
    return (
        <SiteLayout footerCta={false} announce={false}>
            <Seo title="Payment | Forkwise" noindex />
            <section className="mk-404">
                <div className="mk-wrap" style={{ maxWidth: 560 }}>
                    <div className="mk-panel" style={{ justifyItems: "center", textAlign: "center", padding: 40 }}>
                        {partial ? (
                            <>
                                <FaExclamationTriangle style={{ fontSize: 40, color: "var(--amber)" }} />
                                <h1 className="mk-h2" style={{ fontSize: 30 }}>Payment not complete</h1>
                                <p className="fw-muted">We received less than the plan price. Please contact us with your invoice number and we will fix it.</p>
                                <button className="fw-btn fw-btn-primary" onClick={() => navigate("/contact")}>Contact us</button>
                            </>
                        ) : (
                            <>
                                <FaCheckCircle style={{ fontSize: 40, color: "var(--green)" }} />
                                <h1 className="mk-h2" style={{ fontSize: 30 }}>Thank you for your payment</h1>
                                <p className="fw-muted">Your plan will be active in a few minutes, after the payment is confirmed. You can follow it under Billing.</p>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                                    <button className="fw-btn fw-btn-primary" onClick={() => navigate("/dashboard")}>Go to overview</button>
                                    <button className="fw-btn fw-btn-ghost" onClick={() => navigate("/invoices")}>See billing</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
