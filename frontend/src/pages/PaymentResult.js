import React from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Pages.css"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"

export default function PaymentResult({ partial }) {
    const navigate = useNavigate()

    return (
        <div className="SitePage">
            <Seo title="Payment | Forkwise" noindex />
            <Navbar />

            <main className="PageBody">
                <div className="PageCall">
                    {partial ? (
                        <>
                            <h2>Payment not complete</h2>
                            <p>We received less than the plan price. Please contact us with your payment details and we will fix it.</p>
                            <button className="btn MainButton" onClick={() => navigate("/contact")}>Contact us</button>
                        </>
                    ) : (
                        <>
                            <h2>Thank you for your payment</h2>
                            <p>Your plan will be active in a few minutes, after the payment is confirmed.</p>
                            <button className="btn MainButton" onClick={() => navigate("/dashboard")}>Go to dashboard</button>
                        </>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    )
}