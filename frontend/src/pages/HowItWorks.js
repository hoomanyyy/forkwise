import React from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import "../styles/Pages.css"
import { useNavigate } from "react-router-dom"
import { FaFileUpload, FaRobot, FaShieldAlt, FaCalculator, FaGavel, FaChartLine } from "react-icons/fa"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"

export default function HowItWorks() {
    const navigate = useNavigate()

    return (
        <div className="SitePage">
            <Seo
                title="How It Works: AI Multiverse Analysis in 6 Steps | Forkwise"
                description="See how Forkwise turns one question into many analyses: AI analysts plan, Python checks and runs every regression, and a judge gives a robust, fragile, choice dependent or no effect verdict."
                path="/how-it-works"
            />
            <Navbar />

            <main className="PageBody">
                <div className="PageHead">
                    <p className="SectionTag">How it works</p>
                    <h1 className="PageTitle">From your file to a verdict in six steps</h1>
                    <p className="PageLead">
                        The AI decides how to analyze. Python does every calculation. This way every number on the
                        result page can be checked and repeated. Scientists call this idea a multiverse analysis or a
                        specification curve analysis: instead of one analysis, you run many reasonable ones and compare them.
                    </p>
                </div>

                <div className="MethodList">
                    <section className="MethodStep">
                        <div className="MethodIcon"><FaFileUpload /></div>
                        <div className="MethodText">
                            <p className="MethodNumber">Step 1</p>
                            <h2>You upload data and ask a question</h2>
                            <p>
                                You upload one or more CSV, Excel or JSON files and describe them. If there are many files,
                                they are joined on a common column (for example country and year) or stacked on top of each
                                other. Then you write your question, the outcome (Y) and the main variable (X) in your own words.
                            </p>
                            <div className="MethodExample">
                                <span>Question</span> Do people in richer countries live longer?
                                <br />
                                <span>Y</span> life expectancy <span>X</span> GDP per person
                            </div>
                        </div>
                    </section>

                    <section className="MethodStep">
                        <div className="MethodIcon"><FaRobot /></div>
                        <div className="MethodText">
                            <p className="MethodNumber">Step 2</p>
                            <h2>Many AI analysts plan the analysis</h2>
                            <p>
                                First the AI finds which columns match your words. Then each analyst gets a short summary of the
                                data: column names, smallest, average and largest values, and how many cells are empty. The
                                analysts never see your full rows. Each analyst makes three choices and explains them:
                            </p>
                            <div className="MethodChoices">
                                <div><b>Controls</b><span>which other columns to keep constant</span></div>
                                <div><b>Outliers</b><span>keep them, or remove values more than 3 standard deviations away</span></div>
                                <div><b>Missing values</b><span>remove those rows, or fill them with the median</span></div>
                            </div>
                            <p>
                                To make the analysts really different, we use three models (Llama 3.3 70B, Llama 3.1 8B and
                                Mistral Small 3.1) and five personalities, for example one that likes simple analyses and one
                                that likes many controls.
                            </p>
                        </div>
                    </section>

                    <section className="MethodStep">
                        <div className="MethodIcon"><FaShieldAlt /></div>
                        <div className="MethodText">
                            <p className="MethodNumber">Step 3</p>
                            <h2>Python checks every AI answer</h2>
                            <p>
                                AI models make mistakes, so we never trust an answer directly. Python removes columns that do not
                                exist, columns that are not numbers, and the outcome or main variable if the AI put them in the
                                controls. It also removes controls whose name contains the outcome, because they are often a
                                part of the outcome. This is called data leakage.
                            </p>
                        </div>
                    </section>

                    <section className="MethodStep">
                        <div className="MethodIcon"><FaCalculator /></div>
                        <div className="MethodText">
                            <p className="MethodNumber">Step 4</p>
                            <h2>Python runs the regression</h2>
                            <p>
                                For each analyst, Python cleans the data with that analyst's choices and runs a linear regression
                                with statsmodels. The effect is how much Y changes when X goes up by one standard deviation.
                                The p value tells how likely it is to see this effect by chance. Analyses with fewer than 30
                                rows are ignored.
                            </p>
                            <div className="MethodFormula">Y = a + b · X + c₁ · control₁ + c₂ · control₂ + …</div>
                        </div>
                    </section>

                    <section className="MethodStep">
                        <div className="MethodIcon"><FaGavel /></div>
                        <div className="MethodText">
                            <p className="MethodNumber">Step 5</p>
                            <h2>The judge gives a verdict</h2>
                            <p>The judge looks at all analysts together and counts two things: how many found the same direction, and how many found a real effect (p below 0.05).</p>
                            <div className="MethodVerdicts">
                                <div className="MethodVerdict MethodPurple">
                                    <b>No effect</b>
                                    <span>20% or fewer found a real effect. The data does not support the link. This is checked first.</span>
                                </div>
                                <div className="MethodVerdict MethodGreen">
                                    <b>Robust</b>
                                    <span>At least 90% agree on the direction and at least 80% found a real effect.</span>
                                </div>
                                <div className="MethodVerdict MethodAmber">
                                    <b>Fragile</b>
                                    <span>At least 85% agree on the direction, but only 30% to 80% found a real effect.</span>
                                </div>
                                <div className="MethodVerdict MethodRed">
                                    <b>Choice dependent</b>
                                    <span>Anything else. The answer changes with the choices the analyst made.</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="MethodStep">
                        <div className="MethodIcon"><FaChartLine /></div>
                        <div className="MethodText">
                            <p className="MethodNumber">Step 6</p>
                            <h2>You see why</h2>
                            <p>
                                The result page shows a specification curve (every analyst's effect and the choices behind it),
                                your real data with six fitted formulas (linear, quadratic, cubic, logarithmic, power and
                                exponential, ranked by adjusted R²), and which columns move together with the outcome.
                                Every chart can be downloaded.
                            </p>
                        </div>
                    </section>
                </div>

                <section className="MethodLimits">
                    <h2>What the tool cannot do</h2>
                    <ul>
                        <li>It finds relationships, not causes. A robust result is still not proof that X causes Y.</li>
                        <li>The leakage check only looks at column names. A column like total greenhouse gas contains CO2 but does not have "co2" in its name.</li>
                        <li>Right now every analysis uses linear regression. Outcomes that are only 0 or 1 or are counts would need other models.</li>
                        <li>If no column matches your words, the AI may pick the closest one. Always check the Y and X names on the result page.</li>
                    </ul>
                </section>

                <div className="PageCall">
                    <h2>Try it with your own data</h2>
                    <p>It takes about one minute for every ten analysts.</p>
                    <button className="btn MainButton" onClick={() => navigate("/register")}>Create a free account</button>
                </div>
            </main>

            <Footer />
        </div>
    )
}