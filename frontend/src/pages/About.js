import React from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"

export default function About() {
    const navigate = useNavigate()

    return (
        <div className="SitePage">
            <Seo
                title="About Forkwise: Why One Analysis Is Not Enough"
                description="29 research teams analysed the same data and got different answers. Forkwise shows this problem for any dataset by letting many AI analysts test one question."
                path="/about"
            />
            <Navbar />

            <main className="AboutBody">
                <p className="SectionTag">About the project</p>
                <h1 className="AboutTitle">Why one analysis is not enough</h1>
                <p className="AboutLead">
                    In 2018, 29 teams of scientists got the same football data and the same question:
                    do referees give more red cards to players with darker skin? The teams chose different
                    methods and got different answers. Our project asks: can AI show this problem for any
                    dataset, in a few minutes?
                </p>

                <section className="AboutCard">
                    <h2>The problem</h2>
                    <p>
                        Every analysis has many small choices: which columns to control for, what to do with
                        outliers, how to handle missing values. Each choice is reasonable, but together they can
                        change the result. A single study only shows one of these paths.
                    </p>
                </section>

                <section className="AboutCard">
                    <h2>Our solution</h2>
                    <div className="PipeRow">
                        <div className="PipeStep"><b>Your data</b><span>files are joined</span></div>
                        <span className="PipeArrow">→</span>
                        <div className="PipeStep"><b>AI analysts</b><span>3 models, 5 styles</span></div>
                        <span className="PipeArrow">→</span>
                        <div className="PipeStep"><b>Python</b><span>does the math</span></div>
                        <span className="PipeArrow">→</span>
                        <div className="PipeStep"><b>Judge</b><span>gives a verdict</span></div>
                    </div>
                    <p>
                        The AI only decides how to analyze. It never calculates the numbers itself, so every
                        result can be checked and repeated. We also check the AI answers for mistakes, like
                        controlling for a column that is part of the outcome.
                    </p>
                </section>

                <section className="AboutCard">
                    <h2>What we found</h2>
                    <p>
                        With data from 173 countries, all AI analysts agreed that richer countries live longer.
                        But the size of the effect changed by 3.6 times, only because some analysts also
                        controlled for infant mortality. The best formula was logarithmic: every time income
                        doubles, life expectancy grows by about 3.5 years.
                    </p>
                </section>

                <section className="AboutCard">
                    <h2>Related research</h2>
                    <p>
                        Two research groups tested a similar idea in 2026: Carnegie Mellon University
                        ("Many AI Analysts, One Dataset") and Stanford University ("The Agentic Garden of
                        Forking Paths"). Our results agree with theirs. Our goal is different: a free tool
                        that anyone can use without writing code.
                    </p>
                </section>

                <section className="AboutCard">
                    <h2>Built with</h2>
                    <div className="FeatureRow">
                        <span>React</span>
                        <span>FastAPI</span>
                        <span>MySQL</span>
                        <span>pandas and statsmodels</span>
                        <span>Llama 3.3 70B</span>
                        <span>Llama 3.1 8B</span>
                        <span>Mistral Small 3.1</span>
                    </div>
                </section>

                <div className="text-center mt-4 d-flex justify-content-center gap-2 flex-wrap">
                    <button className="btn MainButton" onClick={() => navigate("/register")}>Try it yourself</button>
                    <button className="btn GhostLink" onClick={() => navigate("/how-it-works")}>See every step</button>
                </div>
            </main>

            <Footer />
        </div>
    )
}