import React from "react"
import { Link } from "react-router-dom"
import { FaEyeSlash, FaTrashAlt, FaLock, FaKey, FaCalculator, FaShieldAlt, FaServer, FaExclamationTriangle } from "react-icons/fa"
import SiteLayout, { PageHero, SectionHead } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"

const ITEMS = [
    { icon: FaEyeSlash, title: "The AI sees a summary, not your rows", text: "Analysts receive column names, smallest, average and largest values, the share of empty cells and up to three example values from text columns. Never the full table." },
    { icon: FaTrashAlt, title: "Uploaded files are deleted", text: "Python reads your files on our server and deletes them right after the run. We keep your question, the file names, the analyst results and a random sample of up to 1000 rows for the charts." },
    { icon: FaLock, title: "Passwords are hashed", text: "Your password is stored only as a bcrypt hash. Nobody, including us, can read it." },
    { icon: FaKey, title: "Verified sign-up", text: "New accounts confirm their email with an 8 digit code. Password resets use a code sent to the same email." },
    { icon: FaCalculator, title: "No AI-made numbers", text: "The language models only plan. Every number comes from Python, so the same choices always give the same results." },
    { icon: FaShieldAlt, title: "Checked AI output", text: "Columns that do not exist, text columns and controls that leak the outcome are removed before any calculation." },
    { icon: FaTrashAlt, title: "Deletion on request", text: "Write to us from your account email and we delete your account or your analyses." },
    { icon: FaServer, title: "Where it runs", text: "The website is hosted on Vercel. The API runs on our own server behind nginx with HTTPS. The AI models run on Cloudflare Workers AI." }
]

export default function Security() {
    return (
        <SiteLayout>
            <Seo title="Security and Data at Forkwise" description="What the Forkwise AI analysts can see, what we keep, how passwords are stored and where everything runs." path="/security" />
            <PageHero eyebrow="Security and data" title="Your data, handled with care" lead="Forkwise is built so the AI needs as little of your data as possible, and so every number can be checked." />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    <div className="mk-grid-4">
                        {ITEMS.map((item) => (
                            <div key={item.title} className="mk-card">
                                <span className="mk-card-icon"><item.icon /></span>
                                <h3 className="mk-h3">{item.title}</h3>
                                <p>{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section className="mk-section mk-section-line">
                <div className="mk-wrap">
                    <SectionHead eyebrow="Your part" title="Keep personal data out of your files" />
                    <div className="mk-panel" style={{ borderColor: "rgba(251,191,36,0.35)" }}>
                        <h3 className="mk-h3" style={{ display: "flex", gap: 10, alignItems: "center" }}><FaExclamationTriangle style={{ color: "var(--amber)" }} /> Please do not upload personal data</h3>
                        <p className="fw-muted">Do not upload names, addresses, phone numbers, health records or other private information about real people. Remove those columns before you upload, or use public datasets.</p>
                    </div>
                    <p className="fw-muted" style={{ marginTop: 18, fontSize: 14 }}>
                        Read the full <Link to="/privacy">privacy page</Link>. To report a security problem, write to <a href="mailto:info@forkwiseai.com">info@forkwiseai.com</a>.
                    </p>
                </div>
            </section>
        </SiteLayout>
    )
}
