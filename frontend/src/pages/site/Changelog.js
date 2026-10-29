import React from "react"
import SiteLayout, { PageHero } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"

// written from the project's commit history
const ENTRIES = [
    {
        date: "29 October 2026",
        title: "A new Forkwise: platform redesign",
        tags: ["Design", "App"],
        items: [
            "A new look across the whole website and app",
            "New app menu with Overview, Runs, Assistant, Datasets, Templates, Usage, Billing and Settings",
            "Assistant view: chat with any finished run in a full-screen chat",
            "Search everything with Ctrl K",
            "New pages: documentation, use cases, solutions, glossary, research, status and security"
        ]
    },
    {
        date: "26 October 2026",
        title: "Plans and invoices",
        tags: ["Billing"],
        items: [
            "Free, Pro and Premium plans with daily limits",
            "Payments through NOWPayments",
            "Billing page with every invoice and its status"
        ]
    },
    {
        date: "24 October 2026",
        title: "Chat with your analysis",
        tags: ["AI"],
        items: [
            "Ask AI on the result page: an assistant that explains a finished run",
            "Each chat keeps its history per run"
        ]
    },
    {
        date: "22 October 2026",
        title: "Analyst reasons and the new domain",
        tags: ["Results"],
        items: [
            "Every analyst now explains its choices, shown in the analyst table",
            "Better system prompt for the analysts",
            "Forkwise moved to forkwiseai.com"
        ]
    },
    {
        date: "21 October 2026",
        title: "Android update and announcements",
        tags: ["Mobile"],
        items: [
            "Updated Android app",
            "Email announcements to users from the admin panel"
        ]
    },
    {
        date: "16 October 2026",
        title: "Android app, daily limits and password reset",
        tags: ["Mobile", "Account"],
        items: [
            "First Android app and download page",
            "Daily analysis limits",
            "Forgot password with an email code"
        ]
    },
    {
        date: "15 October 2026",
        title: "Email verification",
        tags: ["Account"],
        items: [
            "8 digit email code when you sign up",
            "Welcome email",
            "Contact details and better search engine pages"
        ]
    },
    {
        date: "13 October 2026",
        title: "Learn guides and examples",
        tags: ["Learn"],
        items: [
            "Guides about multiverse analysis and specification curves",
            "Coffee and heart risk worked example with free data",
            "Faster first page load and a sitemap"
        ]
    },
    {
        date: "12 October 2026",
        title: "Forkwise launches",
        tags: ["Launch"],
        items: [
            "Many AI analysts, one honest answer",
            "Upload data, ask one question, get a verdict"
        ]
    }
]

export default function Changelog() {
    return (
        <SiteLayout>
            <Seo title="Forkwise Changelog" description="Everything we shipped in Forkwise, from launch to today." path="/changelog" />
            <PageHero narrow eyebrow="Changelog" title="What we shipped" lead="New features and fixes, newest first." />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap mk-narrow">
                    <div className="cl">
                        {ENTRIES.map((e) => (
                            <article key={e.date + e.title} className="cl-entry">
                                <p className="cl-date">{e.date}</p>
                                <div className="cl-body">
                                    <div className="cl-tags">
                                        {e.tags.map((t) => <span key={t} className="fw-badge fw-badge-accent fw-badge-plain">{t}</span>)}
                                    </div>
                                    <h2 className="mk-h3" style={{ fontSize: 22 }}>{e.title}</h2>
                                    <ul>{e.items.map((item) => <li key={item}>{item}</li>)}</ul>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
