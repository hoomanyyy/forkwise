import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Site.css"
import { Link, useNavigate } from "react-router-dom"
import { FaRobot, FaCalculator, FaShieldAlt, FaChartLine, FaArrowRight } from "react-icons/fa"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import Seo from "../components/Seo"
import { sendAuthRequestWithWebsocket } from "../api"

export default function Landing() {
    const navigate = useNavigate()
    const [loggedIn, setLoggedIn] = useState(false)

    useEffect(() => {
        sendAuthRequestWithWebsocket({ type: "whoami" }, (res) => {
            if (res.Message === true) {
                setLoggedIn(true)
            }
        })
    }, [])

    function startNow() {
        if (loggedIn) {
            navigate("/chat")
        } else {
            navigate("/register")
        }
    }

    const effects = [1.47, 1.47, 1.47, 1.47, 1.47, 1.51, 1.53, 2.70, 5.21, 5.21]

    const teams = []
    for (let i = 0; i < 29; i++) {
        teams.push(i)
    }

    return (
        <div className="SitePage">
            <Seo
                title="Forkwise: Many AI Analysts, One Honest Answer"
                description="Upload your data and ask one question. Forkwise sends it to many AI analysts, runs every analysis in Python and tells you if your finding is robust or fragile."
                path="/"
            />
            <Navbar />

            <main>
                <header className="LandingHero">
                    <div className="LandingText">
                        <span className="HeroTag">Built for A-ISPC 2026</span>
                        <h1 className="LandingTitle">One question. <span className="HeroAccent">Many AI analysts.</span> How strong is your answer?</h1>
                        <p className="HeroLead">
                            Give the same data to different scientists and they often get different answers.
                            Our tool sends your data to many AI analysts at once, runs every analysis in Python,
                            and tells you if your result is robust or only depends on the choices someone made.
                        </p>
                        <div className="HeroButtons">
                            <button className="btn MainButton" onClick={startNow}>{loggedIn ? "New analysis" : "Start for free"}</button>
                            <button className="btn GhostLink" onClick={() => navigate("/how-it-works")}>How it works</button>
                        </div>
                    </div>

                    <div className="HeroCard">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="CardLabel">Example result</span>
                            <span className="RobustPill">robust</span>
                        </div>
                        <p className="CardQuestion">Do people in richer countries live longer?</p>
                        <svg viewBox="0 0 320 170" className="HeroChart">
                            <line x1="20" x2="310" y1="150" y2="150" className="HeroAxis" />
                            <line x1="20" x2="310" y1={150 - 1.49 * 24} y2={150 - 1.49 * 24} className="HeroMiddle" />
                            {effects.map((e, index) => (
                                <circle key={index} cx={34 + index * 30} cy={150 - e * 24} r="7" className="HeroDot" />
                            ))}
                        </svg>
                        <div className="HeroStats">
                            <div><b>10</b><span>analysts</span></div>
                            <div><b>100%</b><span>same direction</span></div>
                            <div><b>3.6×</b><span>size spread</span></div>
                        </div>
                    </div>
                </header>

                <section className="LandingBand">
                    <div className="LandingBandItem">
                        <b>3</b>
                        <span>different AI models</span>
                    </div>
                    <div className="LandingBandItem">
                        <b>5</b>
                        <span>analyst personalities</span>
                    </div>
                    <div className="LandingBandItem">
                        <b>0</b>
                        <span>numbers calculated by the AI</span>
                    </div>
                    <div className="LandingBandItem">
                        <b>6</b>
                        <span>formulas fitted to your data</span>
                    </div>
                </section>

                <section className="Section">
                    <div className="LandingWhy">
                        <div>
                            <p className="SectionTag">Why it matters</p>
                            <h2 className="SectionTitle">29 teams. Same data. Different answers.</h2>
                            <p className="LandingWhyText">
                                In 2018, 29 research teams got the same football data and one question: do referees give
                                more red cards to players with darker skin? 20 teams found a clear effect and 9 did not.
                                Nobody cheated. They just made different reasonable choices.
                            </p>
                            <p className="LandingWhyText">
                                Most studies only show one of these paths. Our tool shows many of them, for any dataset,
                                in a few minutes.
                            </p>
                            <Link to="/about" className="LandingMore">Read the full story <FaArrowRight /></Link>
                        </div>
                        <div className="LandingTeams">
                            <div className="LandingTeamsGrid">
                                {teams.map((index) => (
                                    <span key={index} className={index < 20 ? "LandingTeam LandingTeamYes" : "LandingTeam LandingTeamNo"}></span>
                                ))}
                            </div>
                            <div className="LandingTeamsLegend">
                                <span><i className="LandingTeam LandingTeamYes"></i>20 found an effect</span>
                                <span><i className="LandingTeam LandingTeamNo"></i>9 did not</span>
                            </div>
                            <p className="LandingSource">Silberzahn et al., 2018</p>
                        </div>
                    </div>
                </section>

                <section className="Section">
                    <p className="SectionTag">How it works</p>
                    <h2 className="SectionTitle">Three steps, no code</h2>
                    <div className="StepGrid">
                        <div className="StepCard">
                            <span className="StepNumber">1</span>
                            <h3>Upload your data</h3>
                            <p>CSV, Excel or JSON. Several files are joined automatically on a common column like country and year.</p>
                        </div>
                        <div className="StepCard">
                            <span className="StepNumber">2</span>
                            <h3>Ask one question</h3>
                            <p>Write it in your own words. The AI finds the right columns for the outcome and the main variable.</p>
                        </div>
                        <div className="StepCard">
                            <span className="StepNumber">3</span>
                            <h3>Get a verdict</h3>
                            <p>Many AI analysts choose their own method. Python does the math, and a judge compares all the answers.</p>
                        </div>
                    </div>
                    <Link to="/how-it-works" className="LandingMore">See all six steps <FaArrowRight /></Link>
                </section>

                <section className="Section">
                    <p className="SectionTag">Built to be trusted</p>
                    <h2 className="SectionTitle">The AI plans. Python checks and calculates.</h2>
                    <div className="LandingTrust">
                        <div className="LandingTrustCard">
                            <FaRobot className="LandingTrustIcon" />
                            <h3>Many minds</h3>
                            <p>Llama 3.3 70B, Llama 3.1 8B and Mistral Small 3.1 plan the analysis in different ways.</p>
                        </div>
                        <div className="LandingTrustCard">
                            <FaShieldAlt className="LandingTrustIcon" />
                            <h3>Every answer checked</h3>
                            <p>Wrong columns and columns that leak the outcome are removed before any calculation.</p>
                        </div>
                        <div className="LandingTrustCard">
                            <FaCalculator className="LandingTrustIcon" />
                            <h3>Real statistics</h3>
                            <p>pandas and statsmodels run every regression, so each number can be repeated.</p>
                        </div>
                        <div className="LandingTrustCard">
                            <FaChartLine className="LandingTrustIcon" />
                            <h3>See the why</h3>
                            <p>A specification curve shows which choice moved the result, next to your real data.</p>
                        </div>
                    </div>
                </section>

                <section className="Section">
                    <p className="SectionTag">What you get</p>
                    <h2 className="SectionTitle">A clear verdict, not just one number</h2>
                    <div className="VerdictGrid">
                        <div className="VerdictCard VerdictGreen">
                            <h3>Robust</h3>
                            <p>Almost every analyst found the same direction and a real effect.</p>
                        </div>
                        <div className="VerdictCard VerdictAmber">
                            <h3>Fragile</h3>
                            <p>Same direction, but many analysts could not show the effect is real.</p>
                        </div>
                        <div className="VerdictCard VerdictRed">
                            <h3>Choice dependent</h3>
                            <p>The answer changes with the method. Be careful before you trust it.</p>
                        </div>
                        <div className="VerdictCard VerdictPurple">
                            <h3>No effect</h3>
                            <p>Almost no analyst found a real effect. The link is not in the data.</p>
                        </div>
                    </div>
                    <div className="FeatureRow">
                        <span>Specification curve</span>
                        <span>Linear and non-linear fits</span>
                        <span>Correlation chart</span>
                        <span>Draw on charts</span>
                        <span>Download PNG and CSV</span>
                    </div>
                </section>

                <section className="CallBox">
                    <h2>Is your finding really strong?</h2>
                    <p>Find out in a few minutes with your own data.</p>
                    <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <button className="btn MainButton" onClick={startNow}>{loggedIn ? "New analysis" : "Create an account"}</button>
                        <button className="btn GhostLink" onClick={() => navigate("/faq")}>Read the FAQ</button>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}