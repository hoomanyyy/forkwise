import React, { useState, useEffect } from "react"
import { FiUploadCloud, FiFileText, FiX, FiCoffee, FiCpu, FiBookOpen } from "react-icons/fi"
import { TopBar } from "../components/Parts"
import { startAnalysis } from "../api"
import { tap } from "../native"
import "../styles/New.css"

const EXPECTATIONS = [
    { value: "increase", label: "It increases" },
    { value: "decrease", label: "It decreases" },
    { value: "none", label: "No effect" },
    { value: "unknown", label: "I don't know" }
]

const MISSING = [
    { value: "empty", label: "Empty cell" },
    { value: "NA", label: "NA" },
    { value: "0", label: "0" },
    { value: "-1", label: "-1" },
    { value: "-999", label: "-999" }
]

const ANALYSTS = ["10", "25", "50", "100"]

const SAMPLES = {
    coffee: {
        file: "coffee-heart.csv",
        rowMeaning: "One adult person",
        description: "Health survey of 500 adults aged 30 to 75. It has daily coffee cups, cigarettes per day, weekly exercise hours, BMI and a heart risk score.",
        question: "Does drinking more coffee increase heart risk?",
        outcome: "heart risk score",
        mainVariable: "coffee cups per day",
        expectation: "increase"
    },
    study: {
        file: "study-hours.csv",
        rowMeaning: "One student",
        description: "400 students with age, weekly study hours, sleep hours, attendance percent and exam score. A few study hour values are impossible typing mistakes.",
        question: "Do students who study more get higher exam scores?",
        outcome: "exam score",
        mainVariable: "study hours per week",
        expectation: "increase"
    }
}

const TIPS = [
    "Each AI analyst is choosing its own control variables...",
    "Some analysts remove outliers, some keep them...",
    "Python is running a regression for every analyst...",
    "The judge is counting how many analysts agree...",
    "Almost there. Good results take a minute..."
]

export default function NewPage({ usage, example, onExampleUsed, onFinished, onUsageChange, onRunningChange }) {
    const [step, setStep] = useState(1)
    const [file, setFile] = useState(null)
    const [rowMeaning, setRowMeaning] = useState("")
    const [description, setDescription] = useState("")
    const [missing, setMissing] = useState("empty")
    const [question, setQuestion] = useState("")
    const [outcome, setOutcome] = useState("")
    const [mainVariable, setMainVariable] = useState("")
    const [expectation, setExpectation] = useState("")
    const [analysts, setAnalysts] = useState("10")
    const [error, setError] = useState("")
    const [running, setRunning] = useState(false)
    const [tip, setTip] = useState(0)

    useEffect(() => {
        if (!example) {
            return
        }
        loadExample("coffee")
        onExampleUsed()
    }, [example])

    useEffect(() => {
        if (!running) {
            return
        }
        const timer = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 4000)
        return () => clearInterval(timer)
    }, [running])

    async function loadExample(name) {
        setError("")
        const sample = SAMPLES[name]
        try {
            const response = await fetch("./examples/" + sample.file)
            const blob = await response.blob()
            setFile(new File([blob], sample.file, { type: "text/csv" }))
            setRowMeaning(sample.rowMeaning)
            setDescription(sample.description)
            setMissing("empty")
            setQuestion(sample.question)
            setOutcome(sample.outcome)
            setMainVariable(sample.mainVariable)
            setExpectation(sample.expectation)
            setAnalysts("10")
            setStep(1)
        } catch (e) {
            setError("Could not load the example file.")
        }
    }

    function pickFile(e) {
        const chosen = e.target.files && e.target.files[0]
        e.target.value = ""
        if (!chosen) {
            return
        }
        const name = chosen.name.toLowerCase()
        if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".json")) {
            setError("Please choose a CSV, Excel or JSON file.")
            return
        }
        if (chosen.size > 20 * 1024 * 1024) {
            setError("The file is bigger than 20 MB.")
            return
        }
        setError("")
        setFile(chosen)
    }

    function next() {
        setError("")
        if (step === 1 && !file) {
            setError("Please choose a data file first.")
            return
        }
        if (step === 2 && (rowMeaning.trim() === "" || description.trim() === "")) {
            setError("Please write what one row means and a short description.")
            return
        }
        tap()
        setStep(step + 1)
    }

    async function run() {
        setError("")
        if (question.trim() === "" || outcome.trim() === "" || mainVariable.trim() === "") {
            setError("Please write the question, the outcome and the main variable.")
            return
        }
        if (outcome.trim().toLowerCase() === mainVariable.trim().toLowerCase()) {
            setError("The outcome and the main variable cannot be the same.")
            return
        }
        if (expectation === "") {
            setError("Please choose what you expect.")
            return
        }

        const details = {}
        details[file.name] = {
            role: "main",
            rowMeaning: rowMeaning.trim(),
            description: description.trim(),
            source: "",
            period: "",
            missing: missing
        }

        const formData = new FormData()
        formData.append("files", file)
        formData.append("fileDetails", JSON.stringify(details))
        formData.append("relation", "single")
        formData.append("joinColumn", "")
        formData.append("question", question.trim())
        formData.append("outcome", outcome.trim())
        formData.append("mainVariable", mainVariable.trim())
        formData.append("expectation", expectation)
        formData.append("analysts", analysts)
        formData.append("notes", "")

        tap()
        setTip(0)
        setRunning(true)
        onRunningChange(true)
        const result = await startAnalysis(formData)
        setRunning(false)
        onRunningChange(false)
        onUsageChange()

        if (result.Message === true) {
            setStep(1)
            setFile(null)
            setRowMeaning("")
            setDescription("")
            setQuestion("")
            setOutcome("")
            setMainVariable("")
            setExpectation("")
            onFinished(result.row_id)
        } else if (result.Error) {
            setError("Could not connect to the server. Check your internet and try again.")
        } else if (result.Message !== "login") {
            setError(result.error || "The analysis did not finish. Please try again.")
        }
    }

    const noneLeft = usage && !usage.unlimited && usage.left <= 0
    let maxAnalysts = 100
    if (usage && !usage.unlimited && usage.plan && usage.plan.max_analysts) {
        maxAnalysts = Number(usage.plan.max_analysts)
    }

    if (running) {
        return (
            <div className="AppScreen NewRunning AppFadeIn">
                <div className="NewOrbit">
                    <span className="NewOrbitDot NewDot1"></span>
                    <span className="NewOrbitDot NewDot2"></span>
                    <span className="NewOrbitDot NewDot3"></span>
                    <div className="NewOrbitCore"><FiCpu /></div>
                </div>
                <h2 className="NewRunningTitle">{analysts} AI analysts are working</h2>
                <p className="NewRunningTip" key={tip}>{TIPS[tip]}</p>
                <p className="NewRunningNote">This usually takes 1 to 3 minutes. Please keep the app open.</p>
            </div>
        )
    }

    return (
        <div className="AppScreen AppScreenWithBar AppFadeIn">
            <TopBar
                title="New analysis"
                onBack={step > 1 ? () => { setError(""); setStep(step - 1) } : null}
                right={<span className="NewStepCount">{step} / 3</span>}
            />

            <div className="NewProgress">
                <span style={{ width: (step / 3) * 100 + "%" }}></span>
            </div>

            {noneLeft && (
                <div className="AppError">
                    You used all {usage.limit} analyses for today. You can still look at your old results. Come back tomorrow for new ones.
                </div>
            )}

            {step === 1 && (
                <div className="AppFadeIn" key="s1">
                    <h2 className="NewTitle">Your data</h2>
                    <p className="NewText">A CSV, Excel or JSON file with at least 30 rows and two number columns.</p>

                    {file ? (
                        <div className="NewFile">
                            <span className="NewFileIcon"><FiFileText /></span>
                            <span className="NewFileText">
                                <b>{file.name}</b>
                                <small>{(file.size / 1024).toFixed(1)} KB</small>
                            </span>
                            <button className="AppIconButton" onClick={() => setFile(null)} aria-label="Remove file"><FiX /></button>
                        </div>
                    ) : (
                        <label className="NewDrop">
                            <input type="file" accept=".csv,.xlsx,.xls,.json,text/csv,application/json,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={pickFile} />
                            <FiUploadCloud className="NewDropIcon" />
                            <b>Choose a file</b>
                            <small>From your phone or Google Drive</small>
                        </label>
                    )}

                    <p className="AppLabel" style={{ marginTop: 18 }}>Or start from a sample</p>
                    <div className="NewSamples">
                        <button onClick={() => { tap(); loadExample("coffee") }}>
                            <FiCoffee />
                            <b>Coffee and heart risk</b>
                            <small>500 adults · a hidden trap</small>
                        </button>
                        <button onClick={() => { tap(); loadExample("study") }}>
                            <FiBookOpen />
                            <b>Study hours and exams</b>
                            <small>400 students · some outliers</small>
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="AppFadeIn" key="s2">
                    <h2 className="NewTitle">About the data</h2>
                    <p className="NewText">The AI analysts only see a short summary of your columns, so tell them what the data is.</p>
                    <label className="AppField">
                        <span className="AppLabel">What does one row mean?</span>
                        <input className="AppInput" value={rowMeaning} onChange={(e) => setRowMeaning(e.target.value)} placeholder="One student" />
                    </label>
                    <label className="AppField">
                        <span className="AppLabel">Short description</span>
                        <textarea className="AppInput" rows="4" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Exam results of 400 students with study hours and sleep" />
                    </label>
                    <span className="AppLabel">Missing values are written as</span>
                    <div className="AppChips NewChipRow">
                        {MISSING.map((m) => (
                            <button key={m.value} className={missing === m.value ? "AppChip AppChipOn" : "AppChip"} onClick={() => setMissing(m.value)}>{m.label}</button>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="AppFadeIn" key="s3">
                    <h2 className="NewTitle">Your question</h2>
                    <label className="AppField">
                        <span className="AppLabel">Question</span>
                        <textarea className="AppInput" rows="2" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Does more study time raise exam scores?" />
                    </label>
                    <label className="AppField">
                        <span className="AppLabel">Outcome, what you want to explain</span>
                        <input className="AppInput" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="exam score" />
                    </label>
                    <label className="AppField">
                        <span className="AppLabel">Main variable, what may affect it</span>
                        <input className="AppInput" value={mainVariable} onChange={(e) => setMainVariable(e.target.value)} placeholder="study hours" />
                    </label>
                    <span className="AppLabel">What do you expect?</span>
                    <div className="NewGrid">
                        {EXPECTATIONS.map((x) => (
                            <button key={x.value} className={expectation === x.value ? "AppChip AppChipOn" : "AppChip"} onClick={() => setExpectation(x.value)}>{x.label}</button>
                        ))}
                    </div>
                    <span className="AppLabel">Number of AI analysts</span>
                    <div className="NewGrid NewGrid4">
                        {ANALYSTS.map((a) => (
                            <button key={a} className={analysts === a ? "AppChip AppChipOn" : "AppChip"} onClick={() => setAnalysts(a)} disabled={Number(a) > maxAnalysts}>{a}</button>
                        ))}
                    </div>
                    <p className="NewHint">More analysts give a more reliable verdict, but take longer.{maxAnalysts < 100 ? " Your plan allows up to " + maxAnalysts + "." : ""}</p>
                </div>
            )}

            {error !== "" && <div className="AppError NewErrorSpace">{error}</div>}

            <div className="NewActions">
                {step < 3 ? (
                    <button className="AppButton" onClick={next}>Continue</button>
                ) : (
                    <button className="AppButton" onClick={run} disabled={noneLeft}>
                        <FiCpu /> Start analysis
                    </button>
                )}
            </div>
        </div>
    )
}
