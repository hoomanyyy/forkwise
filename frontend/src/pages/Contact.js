import React, { useState } from "react"
import { Link } from "react-router-dom"
import { FaPaperPlane, FaBug, FaQuestionCircle, FaTrophy, FaCheckCircle, FaEnvelope, FaPhone, FaBook, FaSignal } from "react-icons/fa"
import SiteLayout, { PageHero } from "../components/site/SiteLayout"
import Seo, { SITE_URL } from "../components/Seo"
import { sendContact } from "../api"

const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Forkwise",
    "url": SITE_URL + "/contact",
    "mainEntity": {
        "@type": "Organization",
        "@id": SITE_URL + "/#organization",
        "name": "Forkwise",
        "email": "info@forkwiseai.com",
        "telephone": "+1-347-391-5729",
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": "info@forkwiseai.com",
            "telephone": "+1-347-391-5729",
            "availableLanguage": ["English"]
        }
    }
}

const TOPICS = [
    { value: "question", label: "Question", icon: FaQuestionCircle },
    { value: "bug", label: "Bug report", icon: FaBug },
    { value: "feedback", label: "Feedback", icon: FaPaperPlane },
    { value: "judges", label: "Competition", icon: FaTrophy }
]

export default function Contact() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [topic, setTopic] = useState("question")
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")
    const [sent, setSent] = useState(false)
    const [sending, setSending] = useState(false)

    async function HandleSubmit(e) {
        e.preventDefault()
        setError("")
        if (name.trim() === "" || email.trim() === "" || message.trim() === "") {
            setError("Please fill in your name, email and message.")
            return
        }
        if (!email.includes("@") || !email.includes(".")) {
            setError("Please write a real email address.")
            return
        }
        if (message.trim().length < 10) {
            setError("Your message is too short.")
            return
        }
        setSending(true)
        try {
            const result = await sendContact({
                name: name.trim(),
                email: email.trim(),
                topic: topic,
                message: message.trim()
            })
            if (result.Message === true) {
                setSent(true)
            } else {
                setError(result.error ? result.error : "Could not send your message.")
            }
        } catch (err) {
            setError("Could not connect to the server.")
        }
        setSending(false)
    }

    function startAgain() {
        setName("")
        setEmail("")
        setTopic("question")
        setMessage("")
        setSent(false)
    }

    return (
        <SiteLayout>
            <Seo
                title="Contact Forkwise: Email, Phone and Support"
                description="Questions, bug reports or feedback about Forkwise? Email info@forkwiseai.com, call +1 (347) 391-5729 or send the team a message."
                path="/contact"
                schema={contactSchema}
            />
            <PageHero eyebrow="Contact" title="Talk to the team" lead="A question, a bug, or an idea to make Forkwise better? Send a message and we will read it." />

            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap">
                    <div className="ct">
                        <div className="fw-card">
                            {sent ? (
                                <div className="ct-done">
                                    <FaCheckCircle />
                                    <h2 className="mk-h3" style={{ fontSize: 22 }}>Message sent</h2>
                                    <p className="fw-muted">Thank you, {name}. We will answer at {email}.</p>
                                    <button className="fw-btn fw-btn-ghost" onClick={startAgain}>Send another message</button>
                                </div>
                            ) : (
                                <form className="ct-form" onSubmit={HandleSubmit} noValidate>
                                    <div className="ct-row">
                                        <label className="fw-field">
                                            <span className="fw-label">Your name</span>
                                            <input className="fw-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sara Ahmadi" autoComplete="name" />
                                        </label>
                                        <label className="fw-field">
                                            <span className="fw-label">Email</span>
                                            <input className="fw-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sara@example.com" autoComplete="email" />
                                        </label>
                                    </div>
                                    <div className="fw-field">
                                        <span className="fw-label">What is it about?</span>
                                        <div className="ct-topics">
                                            {TOPICS.map((t) => (
                                                <button type="button" key={t.value} className={topic === t.value ? "ct-topic ct-topic-on" : "ct-topic"} onClick={() => setTopic(t.value)} aria-pressed={topic === t.value}>
                                                    <t.icon /> {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <label className="fw-field">
                                        <span className="fw-label">Message</span>
                                        <textarea className="fw-textarea" rows="7" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message here" />
                                        <small className="fw-hint" style={{ textAlign: "right" }}>{message.length} / 2000</small>
                                    </label>
                                    {error !== "" && <div className="fw-alert fw-alert-error">{error}</div>}
                                    <div>
                                        <button type="submit" className="fw-btn fw-btn-primary fw-btn-lg" disabled={sending}>
                                            <FaPaperPlane /> {sending ? "Sending..." : "Send message"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <aside className="ct-side">
                            <div className="mk-card">
                                <span className="mk-card-icon"><FaEnvelope /></span>
                                <h3 className="mk-h3">Email and phone</h3>
                                <a href="mailto:info@forkwiseai.com" style={{ display: "flex", gap: 8, alignItems: "center" }}><FaEnvelope /> info@forkwiseai.com</a>
                                <a href="tel:+13473915729" style={{ display: "flex", gap: 8, alignItems: "center" }}><FaPhone /> +1 (347) 391-5729</a>
                            </div>
                            <div className="mk-card">
                                <span className="mk-card-icon mk-card-icon-amber"><FaBug /></span>
                                <h3 className="mk-h3">Found a bug?</h3>
                                <p>Write the run number (for example Run #12), the type of file you uploaded, and what you expected to see.</p>
                            </div>
                            <div className="mk-grid-2">
                                <Link to="/docs" className="mk-card" style={{ padding: 18 }}>
                                    <FaBook style={{ color: "var(--accent-2)" }} />
                                    <b style={{ color: "#fff", fontWeight: 500 }}>Docs</b>
                                </Link>
                                <Link to="/status" className="mk-card" style={{ padding: 18 }}>
                                    <FaSignal style={{ color: "var(--green)" }} />
                                    <b style={{ color: "#fff", fontWeight: 500 }}>Status</b>
                                </Link>
                            </div>
                            <div className="mk-card">
                                <span className="mk-card-icon mk-card-icon-cyan"><FaTrophy /></span>
                                <h3 className="mk-h3">A-ISPC 2026</h3>
                                <p>Forkwise started as a student project for the A-ISPC 2026 competition. Judges are welcome to contact us with any question.</p>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
