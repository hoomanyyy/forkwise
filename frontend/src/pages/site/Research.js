import React from "react"
import { Link } from "react-router-dom"
import SiteLayout, { PageHero } from "../../components/site/SiteLayout"
import Seo from "../../components/Seo"

const PAPERS = [
    { year: "2026", title: "Many AI Analysts, One Dataset: Navigating the Agentic Data Science Multiverse", who: "Bertran, Fogliato and Wu · PNAS", text: "Thousands of autonomous AI analyst runs on three datasets gave widely different effect sizes and conclusions. The authors suggest reporting AI analyses as distributions.", url: "https://arxiv.org/abs/2602.18710" },
    { year: "2026", title: "AI Coding Agents in Social Science: Methodologically Diverse, Empirically Consistent, Interpretively Vulnerable", who: "Alizadeh, Gilardi, Mosleh and Kasneci", text: "AI coding agents matched the methodological spread of human teams. A confirmatory prompt changed their conclusions far more than their estimates.", url: "https://arxiv.org/abs/2606.11456" },
    { year: "2026", title: "Nonstandard Errors in AI Agents", who: "Gao and Xiao", text: "150 AI agents tested the same finance hypotheses on the same market data and found sizable variation, mostly from the choice of measure.", url: "https://arxiv.org/abs/2603.16744" },
    { year: "2026", title: "Same Prompt, Different Outcomes: Evaluating the Reproducibility of Data Analysis by LLMs", who: "Cui and Alexander", text: "Identical prompts gave different regression slopes, even at temperature zero. The authors recommend repeated runs and looking at the distribution.", url: "https://arxiv.org/abs/2602.14349" },
    { year: "2026", title: "Making Uncertainty Visible: Multiverse Analysis for Robust Computational Social Science", who: "Linde, Sun, Balluff, Radovanović and Chan · GESIS", text: "Case studies on how analytic choices change results in computational social science, and why failed computations should be reported.", url: "https://arxiv.org/abs/2605.19745" },
    { year: "2022", title: "Observing many researchers using the same data and hypothesis reveals a hidden universe of uncertainty", who: "Breznau et al. · PNAS", text: "73 teams tested one hypothesis on the same data with 1,253 models and reached widely different results.", url: "https://phys.org/news/2022-11-replication-crisis-reveal-hidden-universe.html" },
    { year: "2021", title: "Consensus-based guidance for conducting and reporting multi-analyst studies", who: "Aczel et al. · eLife", text: "A checklist for how studies with many analysts should be planned and reported.", url: "https://pubmed.ncbi.nlm.nih.gov/34751133/" },
    { year: "2021", title: "The influence of hidden researcher decisions in applied microeconomics", who: "Huntington-Klein et al. · Economic Inquiry", text: "Seven researchers replicated the same two studies. No two reported the same sample size, and the spread of estimates was 3 to 4 times the average standard error.", url: "https://digitalcommons.oberlin.edu/faculty_schol/4406" },
    { year: "2020", title: "Specification curve analysis", who: "Simonsohn, Simmons and Nelson · Nature Human Behaviour", text: "The method behind Forkwise's main chart: show the result of every reasonable specification at once.", url: "https://ideas.repec.org/a/nat/nathum/v4y2020i11d10.1038_s41562-020-0912-z.html" },
    { year: "2018", title: "Many analysts, one data set: Making transparent how variations in analytic choices affect results", who: "Silberzahn, Uhlmann et al.", text: "29 teams, one football dataset, one question. Odds ratios ranged from 0.89 to 2.93, and 20 of 29 teams found a significant effect.", url: "https://hub.hku.hk/bitstream/10722/258977/1/content.pdf" },
    { year: "2016", title: "Increasing transparency through a multiverse analysis", who: "Steegen, Tuerlinckx, Gelman and Vanpaemel · Perspectives on Psychological Science", text: "Introduced the multiverse analysis: run every reasonable version of an analysis and report them together." }
]

export default function Research() {
    return (
        <SiteLayout>
            <Seo title="Research Behind Forkwise: Many Analysts and Multiverse Analysis" description="The studies that showed why one analysis is not enough, from the 29 teams study to recent work on AI analysts." path="/research" />
            <PageHero narrow eyebrow="Research" title="The studies behind the method" lead="Forkwise builds on a decade of research showing that careful analysts, human or AI, reach different answers from the same data." />
            <section className="mk-section-tight" style={{ paddingTop: 0 }}>
                <div className="mk-wrap mk-narrow">
                    {PAPERS.map((p) => (
                        <article key={p.title} className="rs-item">
                            <span className="rs-year">{p.year}</span>
                            <div>
                                <h3>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: "#fff" }}>{p.title}</a> : p.title}</h3>
                                <p>{p.text}</p>
                                <small>{p.who}</small>
                            </div>
                        </article>
                    ))}
                    <p className="fw-muted" style={{ marginTop: 24, fontSize: 14 }}>
                        New to these ideas? Start with <Link to="/learn/multiverse-analysis">What is a multiverse analysis?</Link>
                    </p>
                </div>
            </section>
        </SiteLayout>
    )
}
