import React from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Learn.css"
import { Link } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo, { SITE_URL } from "../components/Seo"

const pageUrl = SITE_URL + "/learn/specification-curve"

const articleSchema = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Article",
            "@id": pageUrl + "#article",
            "headline": "How to Read a Specification Curve, Step by Step",
            "description": "A specification curve shows the result of every reasonable analysis in one chart. Learn how to read the dots, the choice panel and the middle line.",
            "url": pageUrl,
            "mainEntityOfPage": pageUrl,
            "image": SITE_URL + "/og-image.png",
            "datePublished": "2026-10-13",
            "dateModified": "2026-10-13",
            "inLanguage": "en",
            "author": { "@type": "Organization", "name": "Forkwise", "url": SITE_URL + "/" },
            "publisher": { "@id": SITE_URL + "/#organization" },
            "about": ["Specification curve analysis", "Robustness check", "Data visualization"]
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" },
                { "@type": "ListItem", "position": 2, "name": "Learn", "item": SITE_URL + "/learn" },
                { "@type": "ListItem", "position": 3, "name": "Specification curve", "item": pageUrl }
            ]
        }
    ]
}

export default function LearnSpecCurve() {
    return (
        <div className="SitePage">
            <Seo
                title="How to Read a Specification Curve, Step by Step | Forkwise"
                description="A specification curve shows every reasonable analysis in one chart. Learn to read the dots, the choice panel and the middle line, with a real example."
                path="/learn/specification-curve"
                schema={articleSchema}
            />
            <Navbar />

            <main className="LearnBody">
                <nav className="LearnCrumbs" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <Link to="/learn">Learn</Link>
                    <span>/</span>
                    <span>Specification curve</span>
                </nav>

                <article>
                    <h1 className="LearnTitle">How to read a specification curve</h1>
                    <p className="LearnLead">
                        A specification curve is one chart that shows the result of every reasonable analysis of the same
                        question. Each dot is one analysis. In ten seconds it tells you if a finding is solid or if it
                        depends on one lucky choice.
                    </p>
                    <p className="LearnMeta">4 minute read · Updated 13 October 2026</p>

                    <h2>What is a "specification"?</h2>
                    <p>
                        A specification is one complete recipe for an analysis: which control variables you use, what you do
                        with outliers and how you handle missing values. Change one ingredient and you get a new
                        specification. If you have not read it yet, start with <Link to="/learn/multiverse-analysis">what is a multiverse analysis</Link>.
                    </p>

                    <h2>The two parts of the chart</h2>
                    <h3>1. The top panel: one dot per analysis</h3>
                    <ul>
                        <li><strong>Sorted from smallest to biggest effect.</strong> That is why the dots form a curve.</li>
                        <li><strong>The height of a dot</strong> is the effect of X on Y found by that analysis.</li>
                        <li><strong>The zero line</strong> means no effect. Dots above are positive, dots below are negative.</li>
                        <li><strong>The color</strong> shows if the effect is significant (p below 0.05) or not.</li>
                        <li><strong>The middle line</strong> is the median effect, the typical answer.</li>
                    </ul>

                    <h3>2. The bottom panel: the choices behind each dot</h3>
                    <p>
                        Under each dot there is a column of marks. A filled mark means that analysis used that choice, for
                        example "controlled for income" or "dropped outliers". Read across a row to see where a choice was
                        used. If all the filled marks of one row sit on one side of the curve, that choice is moving the result.
                    </p>

                    <div className="LearnKey">
                        <p>
                            The most useful question to ask: which row in the bottom panel lines up with the jump in the curve?
                            That row is the choice your answer depends on.
                        </p>
                    </div>

                    <h2>Four patterns you will see</h2>
                    <div className="LearnTableWrap">
                        <table className="LearnTable">
                            <thead>
                                <tr><th>What the curve looks like</th><th>What it means</th><th>Forkwise verdict</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Flat, all dots on one side of zero, almost all significant</td><td>The finding survives every reasonable choice</td><td className="LearnGood">Robust</td></tr>
                                <tr><td>All dots on one side, but many not significant</td><td>The direction is clear, the evidence is weak</td><td>Fragile</td></tr>
                                <tr><td>Dots on both sides of zero, or a big jump</td><td>One choice changes the answer</td><td className="LearnBad">Choice dependent</td></tr>
                                <tr><td>Dots close to zero, almost none significant</td><td>No real effect in this data</td><td>No effect</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h2>A real example</h2>
                    <p>
                        In one of our runs with data from 173 countries, every AI analyst found that richer countries have
                        longer life expectancy. All the dots were above zero. But the curve had a clear step: the effect was
                        about 3.6 times bigger in the analyses that did not control for infant mortality. Infant mortality
                        is part of how life expectancy is calculated, so controlling for it hides part of the real effect.
                        The specification curve made that visible in one look.
                    </p>
                    <p>
                        Another worked example, with data you can download, is the <Link to="/examples/coffee-and-heart-risk">coffee and heart risk example</Link>.
                    </p>

                    <h2>Common mistakes</h2>
                    <ul>
                        <li><strong>Only looking at the middle line.</strong> The spread of the dots is the point of the chart.</li>
                        <li><strong>Counting significant dots as votes.</strong> 60 analyses that all use one bad control are not 60 independent proofs.</li>
                        <li><strong>Reading it as cause and effect.</strong> A robust curve shows the link survives the choices, not that X causes Y.</li>
                    </ul>

                    <h2>Sources</h2>
                    <ul className="LearnSources">
                        <li>Simonsohn, U., Simmons, J. P. and Nelson, L. D. (2020). Specification curve analysis. <em>Nature Human Behaviour</em>.</li>
                        <li>Steegen, S., Tuerlinckx, F., Gelman, A. and Vanpaemel, W. (2016). Increasing transparency through a multiverse analysis. <em>Perspectives on Psychological Science</em>.</li>
                    </ul>
                </article>

                <div className="LearnNext">
                    <Link to="/learn/multiverse-analysis"><span>Previous guide</span>What is a multiverse analysis?</Link>
                    <Link to="/examples/coffee-and-heart-risk"><span>Example</span>Does coffee raise heart risk?</Link>
                </div>

                <div className="LearnCta">
                    <h2>Make a specification curve for your data</h2>
                    <p>Forkwise draws it for you, with the choices of every AI analyst below each dot.</p>
                    <div className="LearnButtons">
                        <Link to="/register" className="btn MainButton">Start for free</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
