import React from "react"
import { Link } from "react-router-dom"
import SiteLayout from "../components/site/SiteLayout"
import "../styles/article.css"
import Seo, { SITE_URL } from "../components/Seo"

const pageUrl = SITE_URL + "/examples/coffee-and-heart-risk"

const articleSchema = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Article",
            "@id": pageUrl + "#article",
            "headline": "Does Coffee Raise Heart Risk? A Hidden Variable Example",
            "description": "A worked example of a confounding variable: coffee looks linked to heart risk until you control for smoking. See how one choice flips the answer.",
            "url": pageUrl,
            "mainEntityOfPage": pageUrl,
            "image": SITE_URL + "/og-image.png",
            "datePublished": "2026-10-13",
            "dateModified": "2026-10-13",
            "inLanguage": "en",
            "author": { "@type": "Organization", "name": "Forkwise", "url": SITE_URL + "/" },
            "publisher": { "@id": SITE_URL + "/#organization" },
            "about": ["Confounding variable", "Control variables", "Multiverse analysis"]
        },
        {
            "@type": "Dataset",
            "name": "Coffee and heart risk (simulated teaching data)",
            "description": "500 simulated adults with age, coffee cups per day, cigarettes per day, exercise hours per week, BMI and a heart risk score. Made to teach confounding variables. Coffee has no real effect on heart risk in this data.",
            "url": pageUrl,
            "license": "https://creativecommons.org/publicdomain/zero/1.0/",
            "creator": { "@type": "Organization", "name": "Forkwise", "url": SITE_URL + "/" },
            "isAccessibleForFree": true,
            "variableMeasured": ["age", "coffee_cups_per_day", "cigarettes_per_day", "exercise_hours_per_week", "bmi", "heart_risk_score"],
            "distribution": {
                "@type": "DataDownload",
                "encodingFormat": "text/csv",
                "contentUrl": SITE_URL + "/examples/coffee-heart.csv"
            }
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" },
                { "@type": "ListItem", "position": 2, "name": "Learn", "item": SITE_URL + "/learn" },
                { "@type": "ListItem", "position": 3, "name": "Coffee and heart risk", "item": pageUrl }
            ]
        }
    ]
}

export default function ExampleCoffee() {
    return (
        <SiteLayout>
            <Seo
                title="Coffee and Heart Risk: A Hidden Variable Example | Forkwise"
                description="A worked confounding example: coffee looks linked to heart risk until you control for smoking. Download the data and see how one choice flips the answer."
                path="/examples/coffee-and-heart-risk"
                schema={articleSchema}
            />

            <div className="mk-wrap mk-narrow learn">
                <nav className="LearnCrumbs" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <Link to="/learn">Learn</Link>
                    <span>/</span>
                    <span>Coffee and heart risk</span>
                </nav>

                <article>
                    <h1 className="LearnTitle">Does coffee raise heart risk? A hidden variable example</h1>
                    <p className="LearnLead">
                        In this dataset, people who drink more coffee have a higher heart risk. But coffee does nothing.
                        The real cause is hiding in another column. This example shows how one analysis choice can
                        create an effect that is not there, and how a multiverse analysis catches it.
                    </p>
                    <p className="LearnMeta">4 minute read · Updated 13 October 2026</p>

                    <h2>The data</h2>
                    <p>
                        We made a teaching dataset of <strong>500 adults</strong>. Because we made it ourselves, we know the truth:
                        heart risk depends on age, smoking, exercise and BMI, and <strong>not on coffee</strong>. But smokers in this
                        data also drink more coffee. The correlation between coffee and cigarettes is 0.60.
                    </p>
                    <div className="LearnTableWrap">
                        <table className="LearnTable">
                            <thead>
                                <tr><th>Column</th><th>Meaning</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>age</td><td>Age in years, 30 to 74</td></tr>
                                <tr><td>coffee_cups_per_day</td><td>Cups of coffee per day</td></tr>
                                <tr><td>cigarettes_per_day</td><td>Cigarettes per day, 0 for non-smokers</td></tr>
                                <tr><td>exercise_hours_per_week</td><td>Hours of exercise per week</td></tr>
                                <tr><td>bmi</td><td>Body mass index, 15 rows are empty</td></tr>
                                <tr><td>heart_risk_score</td><td>The outcome we want to explain</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        <a href="/examples/coffee-heart.csv" download>Download the data (CSV, 14 KB)</a> and try it yourself.
                    </p>

                    <h2>Five analysts, five answers</h2>
                    <p>
                        Here is what a simple regression says about coffee when you make different choices about control
                        variables. The effect is the change in heart risk score for one more cup per day.
                    </p>
                    <div className="LearnTableWrap">
                        <table className="LearnTable">
                            <thead>
                                <tr><th>Controls used</th><th>Effect of coffee</th><th>p value</th><th>Conclusion</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>None</td><td>+1.68</td><td>&lt; 0.001</td><td className="LearnBad">Coffee is dangerous</td></tr>
                                <tr><td>Age</td><td>+1.75</td><td>&lt; 0.001</td><td className="LearnBad">Coffee is dangerous</td></tr>
                                <tr><td>Cigarettes</td><td>−0.26</td><td>0.41</td><td className="LearnGood">No effect</td></tr>
                                <tr><td>Age and cigarettes</td><td>−0.07</td><td>0.76</td><td className="LearnGood">No effect</td></tr>
                                <tr><td>All four</td><td>+0.02</td><td>0.91</td><td className="LearnGood">No effect</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p>
                        The only choice that matters is <strong>whether you control for smoking</strong>. Without it, coffee takes the
                        blame for the cigarettes. Scientists call smoking a <strong>confounding variable</strong>: it affects both
                        coffee drinking and heart risk.
                    </p>

                    <h2>What Forkwise found</h2>
                    <p>
                        We uploaded the file to Forkwise and asked: "Does drinking more coffee increase heart risk?" with 10 AI
                        analysts. Every analyst controlled for cigarettes. They made different choices about outliers and
                        missing BMI values.
                    </p>
                    <div className="LearnBox">
                        <p><strong>Significant analysts:</strong> 0 out of 10</p>
                        <p><strong>Effects found:</strong> between −0.04 and +0.05 (per standard deviation of coffee)</p>
                        <p><strong>p values:</strong> between 0.82 and 0.95</p>
                        <p><strong>Verdict:</strong> No effect</p>
                    </div>
                    <p>
                        The AI analysts did not fall into the trap. But look at the table above: a single analyst who forgot
                        smoking would have reported a strong, highly significant effect. A multiverse analysis shows both
                        paths side by side, so you can see which choice the answer depends on.
                    </p>

                    <h2>What to learn from this</h2>
                    <ul>
                        <li><strong>A small p value is not proof.</strong> The first two rows have p below 0.001 and are still wrong.</li>
                        <li><strong>Ask what else could explain the link.</strong> Is there a column that affects both X and Y?</li>
                        <li><strong>Look at many analyses, not one.</strong> If the result flips when you add one control, report that.</li>
                        <li><strong>A hidden variable outside your file can still fool every analysis.</strong> If smoking was not in the data, all analysts would agree on the wrong answer.</li>
                    </ul>

                    <h2>Try a second example</h2>
                    <p>
                        <a href="/examples/study-hours.csv" download>Download the study hours data (CSV, 10 KB)</a>: 400 students with weekly
                        study hours, sleep, attendance and exam scores. Here more study really does raise scores, so the verdict
                        should be robust. Three students wrote impossible study hours on purpose. Watch how the effect size
                        changes when an analyst removes these outliers.
                    </p>
                </article>

                <div className="LearnNext">
                    <Link to="/learn/multiverse-analysis"><span>Guide</span>What is a multiverse analysis?</Link>
                    <Link to="/learn/specification-curve"><span>Guide</span>How to read a specification curve</Link>
                </div>

                <div className="LearnCta">
                    <h2>Test your own question</h2>
                    <p>Upload this file or your own data and let many AI analysts check the answer.</p>
                    <div className="LearnButtons">
                        <Link to="/register" className="fw-btn fw-btn-primary fw-btn-lg">Start for free</Link>
                    </div>
                </div>
            </div>

        </SiteLayout>
    )
}
