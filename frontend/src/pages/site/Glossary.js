import React from "react"
import { Link } from "react-router-dom"
import SiteLayout, { PageHero } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"

const TERMS = [
    { term: "Adjusted R²", text: "How much of the variation in Y a formula explains, with a penalty for extra parameters. Forkwise uses it to rank fitted formulas.", link: "/docs/statistics" },
    { term: "Analyst", text: "One AI model with one style that plans one analysis: which controls to use and how to treat outliers and missing values." },
    { term: "Choice dependent", text: "A verdict: the answer changes with the analysis choices, sometimes even the direction.", link: "/docs/verdicts" },
    { term: "Confounding variable", text: "A third variable that affects both X and Y and can make them look linked when they are not.", link: "/examples/coffee-and-heart-risk" },
    { term: "Control variable", text: "A column held constant in the analysis, so its influence is not mixed into the effect of X." },
    { term: "Correlation", text: "How strongly two columns move together, from -1 to +1. It does not show cause." },
    { term: "Data leakage", text: "Using a column that is really part of the outcome as a control. Forkwise removes controls whose name contains the outcome name." },
    { term: "Effect", text: "In Forkwise, how much Y changes when X goes up by one standard deviation, after the analyst's controls." },
    { term: "Fragile", text: "A verdict: analysts agree on the direction, but many could not show the effect is real.", link: "/docs/verdicts" },
    { term: "Garden of forking paths", text: "The many small decisions in an analysis, where each path can lead to a different result." },
    { term: "Many-analysts study", text: "A study where several teams analyze the same data and question, to see how much their answers differ.", link: "/research" },
    { term: "Median imputation", text: "Filling empty cells with the middle value of the column. One of the missing-value rules an analyst can choose." },
    { term: "Middle effect", text: "The median effect across all analysts in a run." },
    { term: "Multiverse analysis", text: "Running every reasonable version of an analysis and reporting all results together.", link: "/learn/multiverse-analysis" },
    { term: "No effect", text: "A verdict: 20% or fewer analysts found a real effect.", link: "/docs/verdicts" },
    { term: "OLS regression", text: "Ordinary least squares: the straight-line regression every Forkwise analysis uses today." },
    { term: "Outlier", text: "A value far from the rest. Analysts can keep outliers or remove values more than 3 standard deviations away." },
    { term: "p value", text: "How likely an effect this big would appear by chance if there were no real effect. Below 0.05 counts as a real effect in Forkwise." },
    { term: "Researcher degrees of freedom", text: "The freedom to make many reasonable analysis choices, which can change the result." },
    { term: "Robust", text: "A verdict: at least 90% of analysts agree on the direction and at least 80% found a real effect.", link: "/docs/verdicts" },
    { term: "Specification", text: "One full set of analysis choices. Each analyst produces one specification." },
    { term: "Specification curve", text: "A chart of every specification's effect, sorted, with the choices shown underneath.", link: "/learn/specification-curve" },
    { term: "Standard deviation", text: "A measure of how spread out the values of a column are." }
]

export default function Glossary() {
    const letters = []
    for (const t of TERMS) {
        const letter = t.term.charAt(0).toUpperCase()
        if (!letters.includes(letter)) {
            letters.push(letter)
        }
    }

    return (
        <SiteLayout>
            <Seo title="Data Analysis Glossary: p Value, Controls, Multiverse and More | Forkwise" description="Plain-language definitions of the terms used in Forkwise: p value, control variable, data leakage, specification curve, multiverse analysis and more." path="/glossary" />
            <PageHero narrow eyebrow="Glossary" title="Every term, in one or two sentences" lead="The words you meet on a Forkwise result page, explained without math." />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap mk-narrow">
                    <nav className="gl-letters" aria-label="Letters">
                        {letters.map((l) => <a key={l} href={"#letter-" + l}>{l}</a>)}
                    </nav>
                    <div className="gl-list">
                        {TERMS.map((t, i) => {
                            const letter = t.term.charAt(0).toUpperCase()
                            const first = i === 0 || TERMS[i - 1].term.charAt(0).toUpperCase() !== letter
                            return (
                                <div key={t.term} className="gl-term" id={first ? "letter-" + letter : undefined}>
                                    <h3>{t.term}</h3>
                                    <div>
                                        <p>{t.text}</p>
                                        {t.link && <small><Link to={t.link}>Learn more →</Link></small>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>
        </SiteLayout>
    )
}
