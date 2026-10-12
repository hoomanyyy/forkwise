import React, { useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Pages.css"
import { Link } from "react-router-dom"
import { FaChevronDown } from "react-icons/fa"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"

const questions = [
    {
        q: "What is a multiverse analysis?",
        a: "A multiverse analysis runs many reasonable versions of the same analysis instead of only one. Each version makes different choices, like which controls to use. If almost all versions give the same answer, the finding is robust. Forkwise does this automatically with AI analysts."
    },
    {
        q: "Does the AI calculate the results?",
        a: "No. The AI only decides how to analyze the data: which controls to use and what to do with outliers and missing values. Python with pandas and statsmodels does every calculation, so the same choices always give the same numbers."
    },
    {
        q: "Which files can I upload?",
        a: "CSV, Excel (.xlsx or .xls) and JSON files. You can upload many files at once. If they share a column, like country and year, we join them into one table."
    },
    {
        q: "Do I need to know the exact column names?",
        a: "No. Write the outcome and the main variable in your own words, for example \"life expectancy\". The AI finds the matching columns. Check the Y and X names on the result page to be sure it chose the right ones."
    },
    {
        q: "Why do AI analysts give different answers?",
        a: "On purpose. We use three different AI models and five personalities, and the answers are a little random. Real scientists also make different choices, and the goal is to see whether your answer survives all of them."
    },
    {
        q: "What do robust, fragile and choice dependent mean?",
        a: "Robust: almost every analyst found the same direction and a real effect. Fragile: they agree on the direction, but many could not show the effect is real. Choice dependent: the answer changes with the choices, sometimes even the direction."
    },
    {
        q: "How many analysts should I choose?",
        a: "10 is good for a quick test and takes about one minute. 25 or more gives a more reliable verdict, because one strange analyst matters less."
    },
    {
        q: "If my result is robust, does X cause Y?",
        a: "Not necessarily. Robust means the relationship does not depend on the analysis choices. A hidden reason that affects both X and Y can still explain it."
    },
    {
        q: "Does the AI see my whole file?",
        a: "No. The AI analysts only get a summary: column names, smallest, average and largest values, how many cells are empty, and a few example words from text columns. Python works with the full data on our server."
    }
]

const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": questions.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a }
    }))
}

export default function Faq() {
    const [open, setOpen] = useState(0)

    function toggle(index) {
        if (open === index) {
            setOpen(-1)
        } else {
            setOpen(index)
        }
    }

    return (
        <div className="SitePage">
            <Seo
                title="FAQ: AI Analysts, Robust Results and Your Data | Forkwise"
                description="Answers about Forkwise: what a multiverse analysis is, why AI analysts disagree, what robust and fragile mean, which files work, and what the AI can see."
                path="/faq"
                schema={faqSchema}
            />
            <Navbar />

            <main className="PageBody PageNarrow">
                <div className="PageHead">
                    <p className="SectionTag">FAQ</p>
                    <h1 className="PageTitle">Common questions</h1>
                    <p className="PageLead">Short answers about how the tool works and how to read the results.</p>
                </div>

                <div className="FaqList">
                    {questions.map((item, index) => (
                        <div key={item.q} className={open === index ? "FaqItem FaqItemOpen" : "FaqItem"}>
                            <button className="FaqQuestion" onClick={() => toggle(index)} aria-expanded={open === index}>
                                <span>{item.q}</span>
                                <FaChevronDown className="FaqArrow" />
                            </button>
                            <p className="FaqAnswer">{item.a}</p>
                        </div>
                    ))}
                </div>

                <div className="FaqMore">
                    <p>Did not find your answer?</p>
                    <Link to="/contact" className="btn MainButton">Ask us</Link>
                </div>
            </main>

            <Footer />
        </div>
    )
}