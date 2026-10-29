import React from "react"
import { Link } from "react-router-dom"
import SiteNav from "./SiteNav"
import SiteFooter from "./SiteFooter"
import "../../styles/marketing.css"

export default function SiteLayout({ children, footerCta = true, announce = true }) {
    return (
        <div className="mk">
            {announce && (
                <Link to="/product/assistant" className="mk-announce">
                    <span className="fw-badge fw-badge-accent fw-badge-plain">New</span>
                    <span>Forkwise Assistant: ask follow-up questions about any analysis</span>
                    <span className="mk-announce-arrow">→</span>
                </Link>
            )}
            <SiteNav />
            <main className="mk-main">{children}</main>
            <SiteFooter cta={footerCta} />
        </div>
    )
}

export function PageHero({ eyebrow, title, lead, children, center, narrow }) {
    return (
        <section className={center ? "mk-pagehero mk-pagehero-center" : "mk-pagehero"}>
            <div className="mk-glow" aria-hidden="true"></div>
            <div className={narrow ? "mk-wrap mk-narrow" : "mk-wrap"}>
                {eyebrow && <p className="fw-eyebrow">{eyebrow}</p>}
                <h1 className="mk-h1">{title}</h1>
                {lead && <p className="mk-lead">{lead}</p>}
                {children && <div className="mk-pagehero-extra">{children}</div>}
            </div>
        </section>
    )
}

export function SectionHead({ eyebrow, title, lead, center }) {
    return (
        <div className={center ? "mk-head mk-head-center" : "mk-head"}>
            {eyebrow && <p className="fw-eyebrow">{eyebrow}</p>}
            <h2 className="mk-h2">{title}</h2>
            {lead && <p className="mk-sublead">{lead}</p>}
        </div>
    )
}

export function Crumbs({ items }) {
    return (
        <nav className="mk-crumbs" aria-label="Breadcrumb">
            {items.map((item, index) => (
                <React.Fragment key={item.label}>
                    {index > 0 && <span>/</span>}
                    {item.to ? <Link to={item.to}>{item.label}</Link> : <span className="mk-crumbs-now">{item.label}</span>}
                </React.Fragment>
            ))}
        </nav>
    )
}
