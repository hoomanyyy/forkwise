import React from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Learn.css"
import { Link } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo, { SITE_URL } from "../components/Seo"

const pageUrl = SITE_URL + "/learn/multiverse-analysis"

const articleSchema = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Article",
            "@id": pageUrl + "#article",
            "headline": "What Is a Multiverse Analysis? A Simple Guide with an Example",
            "description": "A multiverse analysis runs every reasonable version of a data analysis instead of only one. Learn why it matters, how it works and how to run one without code.",
            "url": pageUrl,
            "mainEntityOfPage": pageUrl,
            "image": SITE_URL + "/og-image.png",
            "datePublished": "2026-10-13",
            "dateModified": "2026-10-13",
            "inLanguage": "en",
            "author": { "@type": "Organization", "name": "Forkwise", "url": SITE_URL + "/" },
            "publisher": { "@id": SITE_URL + "/#organization" },
            "about": ["Multiverse analysis", "Researcher degrees of freedom", "Reproducibility"]
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" },
                { "@type": "ListItem", "position": 2, "name": "Learn", "item": SITE_URL + "/learn" },
                { "@type": "ListItem", "position": 3, "name": "Multiverse analysis", "item": pageUrl }
            ]
        }
    ]
}

export default function LearnMultiverse() {
    return (
        <div className="SitePage">
            <Seo
                title="What Is a Multiverse Analysis? A Simple Guide | Forkwise"
                description="A multiverse analysis runs every reasonable version of a data analysis instead of only one. Learn why it matters, how it works and how to run one without code."
                path="/learn/multiverse-analysis"
                schema={articleSchema}
            />
            <Navbar />

            <main className="LearnBody">
                <nav className="LearnCrumbs" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <Link to="/learn">Learn</Link>
                    <span>/</span>
                    <span>Multiverse analysis</span>
                </nav>

                <article>
                    <h1 className="LearnTitle">What is a multiverse analysis?</h1>
                    <p className="LearnLead">
                        A multiverse analysis runs every reasonable version of a data analysis instead of only one,
                        and then shows all the results together. If most versions give the same answer, you can trust
                        it more. If the answer flips, you know it depends on the choices someone made.
                    </p>
                    <p className="LearnMeta">5 minute read · Updated 13 October 2026</p>

                    <h2>One dataset, many answers</h2>
                    <p>
                        Imagine you want to know if studying more gives higher exam scores. You have a table with study
                        hours, sleep, attendance and exam scores for 400 students. Before you get an answer, you have to
                        make many small decisions:
                    </p>
                    <ul>
                        <li><strong>Control variables:</strong> should you also take sleep or attendance into account?</li>
                        <li><strong>Outliers:</strong> one student wrote 70 study hours a week. Keep the row or remove it?</li>
                        <li><strong>Missing values:</strong> delete rows with empty cells, or fill them with the middle value?</li>
                        <li><strong>The model:</strong> a straight line, a curve, or something else?</li>
                    </ul>
                    <p>
                        Every option is reasonable. Two careful people can choose differently. With only four questions
                        and two or three options each, there are already dozens of possible analyses. Scientists call this
                        the <strong>garden of forking paths</strong>, and the freedom to choose is called
                        <strong> researcher degrees of freedom</strong>.
                    </p>

                    <div className="LearnKey">
                        <p>
                            A normal study shows you one path through the garden. A multiverse analysis walks every path
                            and shows you where they lead.
                        </p>
                    </div>

                    <h2>Why it matters: the 29 teams study</h2>
                    <p>
                        In 2018, a group of researchers led by Raphael Silberzahn gave the same football dataset to 29
                        teams of scientists. Every team got the same question: do referees give more red cards to
                        players with darker skin? The teams chose different methods. Twenty found a significant effect
                        and nine did not, and the size of the effect changed a lot from team to team.
                    </p>
                    <p>
                        Nobody cheated. They just made different reasonable choices. This study showed that a single
                        published result can hide how fragile it really is.
                    </p>

                    <h2>How a multiverse analysis works</h2>
                    <ol>
                        <li><strong>List the choices.</strong> Write down every decision where more than one option is reasonable.</li>
                        <li><strong>Build every combination.</strong> Each combination of options is one "universe".</li>
                        <li><strong>Run them all.</strong> Calculate the same result, for example the effect of X on Y, in every universe.</li>
                        <li><strong>Look at all results together.</strong> Usually with a <Link to="/learn/specification-curve">specification curve</Link>, a chart with one dot per analysis.</li>
                        <li><strong>Judge the pattern.</strong> Do the results agree? Which choice moves them the most?</li>
                    </ol>
                    <p>
                        The idea was described by Sara Steegen and colleagues in 2016. A close cousin, the specification
                        curve analysis, was described by Uri Simonsohn, Joseph Simmons and Leif Nelson in 2020.
                    </p>

                    <h2>Multiverse analysis with AI analysts</h2>
                    <p>
                        Listing every reasonable choice is hard work, and it takes coding skills to run hundreds of
                        regressions. Forkwise does this for you. It sends your question to many AI analysts. Each analyst
                        picks its own control variables, outlier rule and missing value rule, like the 29 teams did. Then
                        Python runs every analysis, and a judge gives one of four verdicts:
                    </p>
                    <div className="LearnTableWrap">
                        <table className="LearnTable">
                            <thead>
                                <tr><th>Verdict</th><th>What it means</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Robust</td><td>Almost every analyst found the same direction and a real effect.</td></tr>
                                <tr><td>Fragile</td><td>They agree on the direction, but many could not show the effect is real.</td></tr>
                                <tr><td>Choice dependent</td><td>The answer changes with the choices, sometimes even the direction.</td></tr>
                                <tr><td>No effect</td><td>Almost no analyst found a real effect.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        The AI never calculates the numbers itself. It only decides how to analyze. You can read the exact
                        rules on the <Link to="/how-it-works">how it works</Link> page.
                    </p>

                    <h2>What a multiverse analysis can and cannot tell you</h2>
                    <div className="LearnBox">
                        <p><strong>It can</strong> show if a result survives many reasonable choices, and which choice changes it the most.</p>
                        <p><strong>It cannot</strong> prove that X causes Y. If a hidden variable that is not in your data drives both, every analysis can agree and still be wrong. See the <Link to="/examples/coffee-and-heart-risk">coffee example</Link> for how a missing control can fool you.</p>
                    </div>

                    <h2>Sources</h2>
                    <ul className="LearnSources">
                        <li>Silberzahn, R. et al. (2018). Many analysts, one data set. <em>Advances in Methods and Practices in Psychological Science</em>.</li>
                        <li>Steegen, S., Tuerlinckx, F., Gelman, A. and Vanpaemel, W. (2016). Increasing transparency through a multiverse analysis. <em>Perspectives on Psychological Science</em>.</li>
                        <li>Simonsohn, U., Simmons, J. P. and Nelson, L. D. (2020). Specification curve analysis. <em>Nature Human Behaviour</em>.</li>
                        <li>Gelman, A. and Loken, E. (2014). The statistical crisis in science. <em>American Scientist</em>.</li>
                    </ul>
                </article>

                <div className="LearnNext">
                    <Link to="/learn/specification-curve"><span>Next guide</span>How to read a specification curve</Link>
                    <Link to="/examples/coffee-and-heart-risk"><span>Example</span>Does coffee raise heart risk?</Link>
                </div>

                <div className="LearnCta">
                    <h2>Run a multiverse analysis on your data</h2>
                    <p>No code needed. Upload a file, ask one question and get a verdict in a few minutes.</p>
                    <div className="LearnButtons">
                        <Link to="/register" className="btn MainButton">Start for free</Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
