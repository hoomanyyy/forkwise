import React from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Pages.css"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"

export default function NotFound() {
    const navigate = useNavigate()

    return (
        <div className="SitePage">
            <Seo title="Page Not Found | Forkwise" noindex />
            <Navbar />

            <main className="LostBody">
                <p className="LostCode">404</p>
                <h1 className="PageTitle">This page does not exist</h1>
                <p className="PageLead">Even 100 analysts could not find it. Maybe the link is wrong or the page was moved.</p>
                <div className="LostButtons">
                    <button className="btn MainButton" onClick={() => navigate("/")}>Go home</button>
                    <button className="btn GhostLink" onClick={() => navigate("/dashboard")}>Open dashboard</button>
                </div>
            </main>

            <Footer />
        </div>
    )
}