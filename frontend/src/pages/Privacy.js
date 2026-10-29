import React from "react"
import { Link } from "react-router-dom"
import { FaUser, FaFileAlt, FaRobot, FaExclamationTriangle, FaTrash } from "react-icons/fa"
import SiteLayout, { PageHero } from "../components/site/SiteLayout"
import Seo from "../components/Seo"

const SECTIONS = [
    {
        icon: FaUser,
        title: "Your account",
        text: "We save your first name, last name, username and email. Your password is never saved as text. We save only a bcrypt hash of it, so even we cannot read it. When you log in, a session cookie remembers who you are."
    },
    {
        icon: FaFileAlt,
        title: "Your files",
        text: "The files you upload are read by Python on our server and deleted right after. For each analysis we save your question, the file names, the results of every analyst and a random sample of up to 1000 rows, so you can see the charts again later."
    },
    {
        icon: FaRobot,
        title: "What the AI sees",
        text: "The AI models run on Cloudflare Workers AI. They receive your question, your notes, your file descriptions and a summary of each column: its name, smallest, average and largest value, the share of empty cells, and up to three example values from text columns. They do not receive your full rows. When you use the Assistant, it also receives the results of that run and your earlier messages in the same chat."
    },
    {
        icon: FaExclamationTriangle,
        title: "Please do not upload personal data",
        text: "Do not upload files with names, addresses, phone numbers, health records or other private information about real people. Public datasets, like the ones from Our World in Data or Gapminder, work best.",
        warn: true
    },
    {
        icon: FaTrash,
        title: "Delete your data",
        text: "If you want your account or your analyses removed, send us a message on the contact page or write to info@forkwiseai.com from your account email."
    }
]

export default function Privacy() {
    return (
        <SiteLayout footerCta={false}>
            <Seo
                title="Privacy: How Forkwise Handles Your Data"
                description="What Forkwise saves, what the AI models can see, and how to delete your data."
                path="/privacy"
            />
            <PageHero narrow eyebrow="Privacy" title="How we handle your data" lead="We keep only what the tool needs to work. Here is exactly what that is." />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap mk-narrow" style={{ display: "grid", gap: 14 }}>
                    {SECTIONS.map((s) => (
                        <section key={s.title} className="mk-card" style={{ gridTemplateColumns: "auto minmax(0, 1fr)", gap: 18, borderColor: s.warn ? "rgba(251,191,36,0.35)" : undefined }}>
                            <span className={s.warn ? "mk-card-icon mk-card-icon-amber" : "mk-card-icon"}><s.icon /></span>
                            <div style={{ display: "grid", gap: 8 }}>
                                <h2 className="mk-h3">{s.title}</h2>
                                <p style={{ fontSize: 15.5 }}>{s.text}</p>
                            </div>
                        </section>
                    ))}
                    <p className="fw-muted" style={{ fontSize: 14 }}>
                        Questions about privacy? <Link to="/contact">Contact us</Link>. See also <Link to="/security">Security and data</Link>.
                    </p>
                </div>
            </section>
        </SiteLayout>
    )
}
