import React from "react"
import { Link } from "react-router-dom"
import SiteLayout from "../components/site/SiteLayout"
import Seo from "../components/Seo"

export default function NotFound() {
    return (
        <SiteLayout footerCta={false}>
            <Seo title="Page not found | Forkwise" description="This page does not exist." noindex />
            <section className="mk-404">
                <div className="mk-wrap" style={{ display: "grid", gap: 18, justifyItems: "center" }}>
                    <b className="fw-gradient-text">404</b>
                    <h1 className="mk-h2">This path leads nowhere</h1>
                    <p className="mk-sublead" style={{ textAlign: "center" }}>Unlike your data, this page has only one answer: it does not exist.</p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                        <Link to="/" className="fw-btn fw-btn-primary">Go home</Link>
                        <Link to="/docs" className="fw-btn fw-btn-ghost">Documentation</Link>
                        <Link to="/contact" className="fw-btn fw-btn-ghost">Contact us</Link>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
