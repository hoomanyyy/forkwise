import React from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Learn.css"
import { Link } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo, { SITE_URL } from "../components/Seo"

const learnSchema = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "CollectionPage",
            "@id": SITE_URL + "/learn#page",
            "url": SITE_URL + "/learn",
            "name": "Learn: Multiverse Analysis and Robust Results",
            "description": "Simple guides about multiverse analysis, specification curves and why one data analysis is not enough, with a worked example.",
            "isPartOf": { "@id": SITE_URL + "/#website" },
            "hasPart": [
                { "@type": "Article", "url": SITE_URL + "/learn/multiverse-analysis", "name": "What is a multiverse analysis?" },
                { "@type": "Article", "url": SITE_URL + "/learn/specification-curve", "name": "How to read a specification curve" },
                { "@type": "Article", "url": SITE_URL + "/examples/coffee-and-heart-risk", "name": "Does coffee raise heart risk? A hidden variable example" }
            ]
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" },
                { "@type": "ListItem", "position": 2, "name": "Learn", "item": SITE_URL + "/learn" }
            ]
        }
    ]
}

export default function Learn() {
    return (
        <div className="SitePage">
            <Seo
                title="Learn Multiverse Analysis and Specification Curves | Forkwise"
                description="Simple guides about multiverse analysis, specification curves and why one data analysis is not enough, with a worked example you can try yourself."
                path="/learn"
                schema={learnSchema}
            />
            <Navbar />

            <main className="LearnBody LearnWide">
                <nav className="LearnCrumbs" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <span>Learn</span>
                </nav>

                <h1 className="LearnTitle">Learn: why one analysis is not enough</h1>
                <p className="LearnLead">
                    Short and simple guides about the ideas behind Forkwise. No math degree needed.
                </p>
                <p className="LearnMeta">3 guides · about 5 minutes each</p>

                <div className="LearnCards">
                    <Link to="/learn/multiverse-analysis" className="LearnCard">
                        <span className="LearnCardTag">Guide</span>
                        <h2>What is a multiverse analysis?</h2>
                        <p>One dataset can give many answers. Learn what a multiverse analysis is, why scientists use it and how to run one without code.</p>
                        <span className="LearnCardMore">Read the guide →</span>
                    </Link>
                    <Link to="/learn/specification-curve" className="LearnCard">
                        <span className="LearnCardTag">Guide</span>
                        <h2>How to read a specification curve</h2>
                        <p>The specification curve shows every analysis in one chart. Learn to read the dots, the choices below them and the middle line.</p>
                        <span className="LearnCardMore">Read the guide →</span>
                    </Link>
                    <Link to="/examples/coffee-and-heart-risk" className="LearnCard">
                        <span className="LearnCardTag">Example</span>
                        <h2>Does coffee raise heart risk?</h2>
                        <p>A worked example with a hidden variable trap. Download the data and see how the answer changes with one choice.</p>
                        <span className="LearnCardMore">See the example →</span>
                    </Link>
                </div>

                <div className="LearnCta">
                    <h2>Try it on your own data</h2>
                    <p>Upload a CSV, Excel or JSON file and ask one question. It is free.</p>
                    <div className="LearnButtons">
                        <Link to="/register" className="btn MainButton">Start for free</Link>
                        <Link to="/how-it-works" className="btn GhostLink">How it works</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
