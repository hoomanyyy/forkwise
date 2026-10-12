import React, { useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Pages.css"
import { FaPaperPlane, FaBug, FaQuestionCircle, FaTrophy, FaCheckCircle } from "react-icons/fa"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"
import { sendContact } from "../api"

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
        <div className="SitePage">
            <Seo
                title="Contact the Forkwise Team"
                description="Questions, bug reports or feedback about Forkwise? Send the team a message. Judges of A-ISPC 2026 are welcome too."
                path="/contact"
            />
            <Navbar />

            <main className="PageBody">
                <div className="PageHead">
                    <p className="SectionTag">Contact</p>
                    <h1 className="PageTitle">Talk to the team</h1>
                    <p className="PageLead">A question, a bug, or an idea to make the tool better? Send us a message and we will read it.</p>
                </div>

                <div className="ContactGrid">
                    <div className="ContactCard">
                        {sent ? (
                            <div className="ContactDone">
                                <FaCheckCircle className="ContactDoneIcon" />
                                <h2>Message sent</h2>
                                <p>Thank you, {name}. We will answer at {email}.</p>
                                <button className="btn GhostLink" onClick={startAgain}>Send another message</button>
                            </div>
                        ) : (
                            <form onSubmit={HandleSubmit} noValidate>
                                <div className="ContactRow">
                                    <label className="ContactField">
                                        <span>Your name</span>
                                        <input className="ContactInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sara Ahmadi" />
                                    </label>
                                    <label className="ContactField">
                                        <span>Email</span>
                                        <input className="ContactInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sara@example.com" />
                                    </label>
                                </div>

                                <div className="ContactField">
                                    <span>What is it about?</span>
                                    <div className="ContactTopics">
                                        <button type="button" className={topic === "question" ? "ContactTopic ContactTopicOn" : "ContactTopic"} onClick={() => setTopic("question")}>
                                            <FaQuestionCircle /> Question
                                        </button>
                                        <button type="button" className={topic === "bug" ? "ContactTopic ContactTopicOn" : "ContactTopic"} onClick={() => setTopic("bug")}>
                                            <FaBug /> Bug report
                                        </button>
                                        <button type="button" className={topic === "feedback" ? "ContactTopic ContactTopicOn" : "ContactTopic"} onClick={() => setTopic("feedback")}>
                                            <FaPaperPlane /> Feedback
                                        </button>
                                        <button type="button" className={topic === "judges" ? "ContactTopic ContactTopicOn" : "ContactTopic"} onClick={() => setTopic("judges")}>
                                            <FaTrophy /> Competition
                                        </button>
                                    </div>
                                </div>

                                <label className="ContactField">
                                    <span>Message</span>
                                    <textarea
                                        className="ContactInput"
                                        rows="6"
                                        maxLength={2000}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Write your message here"
                                    />
                                    <small className="ContactCount">{message.length} / 2000</small>
                                </label>

                                {error !== "" && <div className="ContactError">{error}</div>}

                                <button type="submit" className="btn MainButton ContactSend" disabled={sending}>
                                    <FaPaperPlane /> {sending ? "Sending..." : "Send message"}
                                </button>
                            </form>
                        )}
                    </div>

                    <aside className="ContactSide">
                        <div className="ContactInfo">
                            <FaBug className="ContactInfoIcon" />
                            <div>
                                <h3>Found a bug?</h3>
                                <p>Write the run number (for example Run #12), the type of file you uploaded, and what you expected to see.</p>
                            </div>
                        </div>
                        <div className="ContactInfo">
                            <FaQuestionCircle className="ContactInfoIcon" />
                            <div>
                                <h3>Have a question?</h3>
                                <p>Many answers are already on the FAQ page, like which files work and what each verdict means.</p>
                            </div>
                        </div>
                        <div className="ContactInfo">
                            <FaTrophy className="ContactInfoIcon" />
                            <div>
                                <h3>A-ISPC 2026</h3>
                                <p>This tool is a student project for the A-ISPC 2026 competition. Judges are welcome to contact us with any question.</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    )
}