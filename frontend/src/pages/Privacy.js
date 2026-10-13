import React from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Pages.css"
import { Link } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"

export default function Privacy() {
    return (
        <div className="SitePage">
            <Seo
                title="Privacy: How Forkwise Handles Your Data"
                description="What Forkwise saves, what the AI models can see, and how to delete your data. Passwords are hashed and the AI only gets a summary of your columns."
                path="/privacy"
            />
            <Navbar />

            <main className="PageBody PageNarrow">
                <div className="PageHead">
                    <p className="SectionTag">Privacy</p>
                    <h1 className="PageTitle">How we handle your data</h1>
                    <p className="PageLead">This is a student project. We keep only what the tool needs to work.</p>
                </div>

                <section className="PrivacyCard">
                    <h2>Your account</h2>
                    <p>
                        We save your first name, last name, username and email. Your password is never saved as text. We save
                        only a bcrypt hash of it, so even we cannot read it. When you log in, a session cookie remembers
                        who you are.
                    </p>
                </section>

                <section className="PrivacyCard">
                    <h2>Your files</h2>
                    <p>
                        The files you upload are read by Python on our server and deleted right after. For each analysis we
                        save your question, the file names, the results of every analyst and a random sample of up to 1000
                        rows, so you can see the charts again later.
                    </p>
                </section>

                <section className="PrivacyCard">
                    <h2>What the AI sees</h2>
                    <p>
                        The AI models run on Cloudflare Workers AI. They receive your question, your notes, your file
                        descriptions and a summary of each column: its name, smallest, average and largest value, the share
                        of empty cells, and up to three example values from text columns. They do not receive your full rows.
                    </p>
                </section>

                <section className="PrivacyCard PrivacyWarn">
                    <h2>Please do not upload personal data</h2>
                    <p>
                        Do not upload files with names, addresses, phone numbers, health records or other private
                        information about real people. Public datasets, like the ones from Our World in Data or Gapminder,
                        work best.
                    </p>
                </section>

                <section className="PrivacyCard">
                    <h2>Delete your data</h2>
                    <p>
                        If you want your account or your analyses removed, send us a message on the <Link to="/contact">contact page</Link>.
                    </p>
                </section>
            </main>

            <Footer />
        </div>
    )
}