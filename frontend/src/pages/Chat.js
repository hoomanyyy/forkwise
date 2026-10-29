import React, { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
    FaCloudUploadAlt, FaFileAlt, FaTrash, FaCheck, FaRocket, FaArrowUp, FaArrowDown, FaMinus, FaQuestion, FaLightbulb
} from "react-icons/fa"
import AppLayout, { useMe } from "../components/app/AppLayout"
import { sendInformationsAn } from "../api"
import { readSetting } from "./app/Settings"

function fileSize(bytes) {
    if (bytes >= 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }
    return Math.max(1, Math.round(bytes / 1024)) + " KB"
}

const EXPECTATIONS = [
    { value: "increase", label: "It increases Y", icon: FaArrowUp },
    { value: "decrease", label: "It decreases Y", icon: FaArrowDown },
    { value: "none", label: "No effect", icon: FaMinus },
    { value: "unknown", label: "I don't know", icon: FaQuestion }
]

function NewAnalysis() {
    const navigate = useNavigate()
    const me = useMe()
    const [params] = useSearchParams()
    const [files, setFiles] = useState([])
    const [fileDetails, setFileDetails] = useState({})
    const [relation, setRelation] = useState("")
    const [joinColumn, setJoinColumn] = useState("")
    const [question, setQuestion] = useState(params.get("q") || "")
    const [outcome, setOutcome] = useState(params.get("y") || "")
    const [mainVariable, setMainVariable] = useState(params.get("x") || "")
    const [expectation, setExpectation] = useState("")
    const [analysts, setAnalysts] = useState(readSetting("default-analysts", "10"))
    const [notes, setNotes] = useState(params.get("notes") || "")
    const [error, setError] = useState("")
    const [sending, setSending] = useState(false)
    const [dragging, setDragging] = useState(false)

    const manyFiles = files.length > 1

    useEffect(() => {
        setError("")
    }, [files, fileDetails, relation, joinColumn, question, outcome, mainVariable, expectation])

    function addFiles(newFiles) {
        const list = [...files]
        const details = { ...fileDetails }
        for (let i = 0; i < newFiles.length; i++) {
            const exists = list.some((f) => f.name === newFiles[i].name)
            if (!exists) {
                list.push(newFiles[i])
                details[newFiles[i].name] = {
                    role: list.length === 1 ? "main" : "extra",
                    description: "",
                    rowMeaning: "",
                    source: "",
                    period: "",
                    missing: "empty"
                }
            }
        }
        setFiles(list)
        setFileDetails(details)
    }

    function chooseFiles(e) {
        addFiles(Array.from(e.target.files))
        e.target.value = ""
    }

    function dropFiles(e) {
        e.preventDefault()
        setDragging(false)
        addFiles(Array.from(e.dataTransfer.files))
    }

    function removeFile(name) {
        const details = { ...fileDetails }
        delete details[name]
        setFiles(files.filter((f) => f.name !== name))
        setFileDetails(details)
    }

    function updateDetail(name, field, value) {
        const details = { ...fileDetails }
        details[name] = { ...details[name] }
        details[name][field] = value
        setFileDetails(details)
    }

    let filesDone = files.length > 0
    let describedDone = files.length > 0
    for (const f of files) {
        const d = fileDetails[f.name]
        if (d.description.trim() === "" || d.rowMeaning.trim() === "") {
            describedDone = false
        }
    }
    if (manyFiles && (relation === "" || (relation === "join" && joinColumn.trim() === ""))) {
        describedDone = false
    }
    const questionDone = question.trim() !== "" && outcome.trim() !== "" && mainVariable.trim() !== "" && expectation !== ""
    const minutes = Math.max(1, Math.round((Number(analysts) * 6) / 60))

    let maxAnalysts = 100
    if (me.usage && !me.usage.unlimited && me.usage.plan.max_analysts) {
        maxAnalysts = Number(me.usage.plan.max_analysts)
    }

    useEffect(() => {
        if (Number(analysts) > maxAnalysts) {
            setAnalysts(String(maxAnalysts >= 50 ? 50 : maxAnalysts >= 25 ? 25 : 10))
        }
    }, [maxAnalysts, analysts])

    const showTips = readSetting("show-tips", "1") === "1"

    async function submitForm(e) {
        e.preventDefault()
        setError("")

        if (files.length === 0) {
            setError("Please upload at least one file.")
            return
        }
        for (let i = 0; i < files.length; i++) {
            const d = fileDetails[files[i].name]
            if (d.description.trim() === "" || d.rowMeaning.trim() === "") {
                setError("Please write a description and what one row means for " + files[i].name + ".")
                return
            }
        }
        if (manyFiles && relation === "") {
            setError("Please choose how the files are related.")
            return
        }
        if (manyFiles && relation === "join" && joinColumn.trim() === "") {
            setError("Please write the common column that connects the files.")
            return
        }
        if (question.trim() === "") {
            setError("Please write your research question.")
            return
        }
        if (outcome.trim() === "" || mainVariable.trim() === "") {
            setError("Please write the outcome and the main variable.")
            return
        }
        if (outcome.trim() === mainVariable.trim()) {
            setError("Outcome and main variable cannot be the same.")
            return
        }
        if (expectation === "") {
            setError("Please choose what you expect.")
            return
        }

        const formData = new FormData()
        files.forEach((file) => {
            formData.append("files", file)
        })
        formData.append("fileDetails", JSON.stringify(fileDetails))
        formData.append("relation", manyFiles ? relation : "single")
        formData.append("joinColumn", manyFiles && relation === "join" ? joinColumn : "")
        formData.append("question", question)
        formData.append("outcome", outcome)
        formData.append("mainVariable", mainVariable)
        formData.append("expectation", expectation)
        formData.append("analysts", analysts)
        formData.append("notes", notes)

        setSending(true)
        try {
            const result = await sendInformationsAn(formData)
            if (result.Message === true) {
                navigate(`/runs/${result.row_id}`)
            } else if (result.Message === "login") {
                navigate("/auth/login")
            } else {
                setError(result.error ? result.error : "The server did not return a result.")
            }
        } catch (err) {
            setError("Could not connect to the server.")
            console.log("ERROR: ", err.message)
        }
        setSending(false)
    }

    return (
        <form className="wz" onSubmit={submitForm} noValidate>
            <div className="wz-main">
                <div className="wz-steps">
                    <span className={filesDone ? "wz-step wz-step-done" : "wz-step"}><b>{filesDone ? <FaCheck /> : "1"}</b>Upload files</span>
                    <span className={describedDone ? "wz-step wz-step-done" : "wz-step"}><b>{describedDone ? <FaCheck /> : "2"}</b>Describe them</span>
                    <span className={questionDone ? "wz-step wz-step-done" : "wz-step"}><b>{questionDone ? <FaCheck /> : "3"}</b>Ask a question</span>
                    <span className="wz-step"><b>4</b>Start</span>
                </div>

                <section className="ax-card wz-section">
                    <div className="wz-section-title"><span>1</span><h2>Upload your data</h2></div>
                    <label
                        className={dragging ? "wz-drop wz-drop-on" : "wz-drop"}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={dropFiles}
                    >
                        <input type="file" multiple accept=".csv,.json,.xlsx,.xls" onChange={chooseFiles} style={{ display: "none" }} />
                        <FaCloudUploadAlt />
                        <b>Drag files here or click to choose</b>
                        <span>CSV, Excel or JSON. You can add many files.</span>
                    </label>

                    {files.map((f, index) => (
                        <div key={f.name} className="wz-file">
                            <div className="wz-file-top">
                                <span className="wz-file-icon"><FaFileAlt /></span>
                                <div className="wz-file-info">
                                    <p className="wz-file-name" title={f.name}>{f.name}</p>
                                    <p className="fw-muted" style={{ fontSize: 12.5 }}>File {index + 1} · {fileSize(f.size)}</p>
                                </div>
                                <button type="button" className="fw-icon-btn" onClick={() => removeFile(f.name)} aria-label={"Remove " + f.name}><FaTrash /></button>
                            </div>

                            <div className="wz-grid-2">
                                <label className="fw-field">
                                    <span className="fw-label">Role of this file</span>
                                    <select className="fw-select" value={fileDetails[f.name].role} onChange={(e) => updateDetail(f.name, "role", e.target.value)}>
                                        <option value="main">Main data</option>
                                        <option value="extra">Extra information</option>
                                    </select>
                                </label>
                                <label className="fw-field">
                                    <span className="fw-label">What does one row mean? *</span>
                                    <input className="fw-input" placeholder="One student" value={fileDetails[f.name].rowMeaning} onChange={(e) => updateDetail(f.name, "rowMeaning", e.target.value)} />
                                </label>
                            </div>
                            <label className="fw-field">
                                <span className="fw-label">Description of this file *</span>
                                <textarea className="fw-textarea" rows="2" placeholder="Exam results of grade 10 students in our school" value={fileDetails[f.name].description} onChange={(e) => updateDetail(f.name, "description", e.target.value)} />
                            </label>
                            <div className="wz-grid-3">
                                <label className="fw-field">
                                    <span className="fw-label">Source</span>
                                    <input className="fw-input" placeholder="School office" value={fileDetails[f.name].source} onChange={(e) => updateDetail(f.name, "source", e.target.value)} />
                                </label>
                                <label className="fw-field">
                                    <span className="fw-label">Time period</span>
                                    <input className="fw-input" placeholder="2015 to 2024" value={fileDetails[f.name].period} onChange={(e) => updateDetail(f.name, "period", e.target.value)} />
                                </label>
                                <label className="fw-field">
                                    <span className="fw-label">Missing values are</span>
                                    <select className="fw-select" value={fileDetails[f.name].missing} onChange={(e) => updateDetail(f.name, "missing", e.target.value)}>
                                        <option value="empty">Empty cell</option>
                                        <option value="NA">NA</option>
                                        <option value="0">0</option>
                                        <option value="-1">-1</option>
                                        <option value="-999">-999</option>
                                    </select>
                                </label>
                            </div>
                        </div>
                    ))}

                    {manyFiles && (
                        <div className="wz-grid-2">
                            <label className="fw-field">
                                <span className="fw-label">How are these files related? *</span>
                                <select className="fw-select" value={relation} onChange={(e) => setRelation(e.target.value)}>
                                    <option value="">Choose</option>
                                    <option value="stack">Same columns, more rows (for example one file per year)</option>
                                    <option value="join">Different columns, connected by a common column</option>
                                    <option value="separate">Separate files, use them as extra context</option>
                                </select>
                            </label>
                            {relation === "join" && (
                                <label className="fw-field">
                                    <span className="fw-label">Common column *</span>
                                    <input className="fw-input" placeholder="country, year" value={joinColumn} onChange={(e) => setJoinColumn(e.target.value)} />
                                    <small className="fw-hint">It must be in every file. For two columns, write them with a comma.</small>
                                </label>
                            )}
                        </div>
                    )}
                </section>

                <section className="ax-card wz-section">
                    <div className="wz-section-title"><span>2</span><h2>Your research question</h2></div>
                    <label className="fw-field">
                        <span className="fw-label">Question *</span>
                        <input className="fw-input" style={{ fontSize: 16, padding: "12px 14px" }} placeholder="Does study time affect exam score?" value={question} onChange={(e) => setQuestion(e.target.value)} />
                    </label>
                    <div className="wz-grid-2">
                        <label className="fw-field">
                            <span className="fw-label">Outcome (Y), what you want to explain *</span>
                            <input className="fw-input" placeholder="exam score" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
                        </label>
                        <label className="fw-field">
                            <span className="fw-label">Main variable (X), what may affect it *</span>
                            <input className="fw-input" placeholder="study hours" value={mainVariable} onChange={(e) => setMainVariable(e.target.value)} />
                        </label>
                    </div>
                    <small className="fw-hint">You can write in your own words. The AI finds the matching columns, and the result page shows which ones it chose.</small>
                    <div className="fw-field">
                        <span className="fw-label">What do you expect? * <em>choose before you see the results</em></span>
                        <div className="wz-expect">
                            {EXPECTATIONS.map((item) => (
                                <button type="button" key={item.value} className={expectation === item.value ? "wz-expect-on" : ""} onClick={() => setExpectation(item.value)} aria-pressed={expectation === item.value}>
                                    <item.icon /> {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="ax-card wz-section">
                    <div className="wz-section-title"><span>3</span><h2>Extra notes <em>optional</em></h2></div>
                    <textarea className="fw-textarea" rows="3" placeholder="Anything else the AI analysts should know" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </section>
            </div>

            <aside className="wz-side">
                <div className="ax-card wz-summary">
                    <p className="fw-eyebrow">Your analysis</p>
                    <div className="wz-sum-row"><span>Files</span><b>{files.length}</b></div>
                    <div className="wz-sum-row"><span>Question</span><b>{question.trim() === "" ? "-" : question}</b></div>
                    <div className="wz-sum-row"><span>Y</span><b className="fw-mono">{outcome.trim() === "" ? "-" : outcome}</b></div>
                    <div className="wz-sum-row"><span>X</span><b className="fw-mono">{mainVariable.trim() === "" ? "-" : mainVariable}</b></div>

                    <div className="fw-field">
                        <span className="fw-label">Number of AI analysts</span>
                        <div className="wz-analysts">
                            {["10", "25", "50", "100"].map((n) => (
                                <button
                                    type="button"
                                    key={n}
                                    className={analysts === n ? "wz-analysts-on" : ""}
                                    onClick={() => setAnalysts(n)}
                                    disabled={Number(n) > maxAnalysts}
                                    title={Number(n) > maxAnalysts ? "Your plan allows up to " + maxAnalysts + " analysts" : n + " analysts"}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <small className="fw-hint">
                            More analysts give a more reliable verdict. About {minutes} min.
                            {maxAnalysts < 100 && <> Need more? <Link to="/pricing">Upgrade your plan</Link>.</>}
                        </small>
                    </div>

                    {error !== "" && <div className="fw-alert fw-alert-error">{error}</div>}

                    <button type="submit" className="fw-btn fw-btn-primary fw-btn-lg fw-btn-block" disabled={sending}>
                        {sending ? <span className="fw-spinner"></span> : <FaRocket />} {sending ? "Running..." : "Start analysis"}
                    </button>

                    {sending && (
                        <div style={{ display: "grid", gap: 8 }}>
                            <div className="wz-progress"><span></span></div>
                            <p className="fw-muted" style={{ fontSize: 13 }}>{analysts} AI analysts are working on your question. Please keep this page open.</p>
                        </div>
                    )}
                </div>

                {showTips && (
                <div className="ax-card wz-tip">
                    <b><FaLightbulb style={{ color: "var(--amber)", marginRight: 6 }} /> Tips for a good run</b>
                    <span>Ask about one outcome and one main variable at a time.</span>
                    <span>Write what one row means. It helps the analysts choose sensible controls.</span>
                    <span>No data yet? Try a file from <Link to="/templates">Templates</Link>.</span>
                </div>
                )}
            </aside>
        </form>
    )
}

export default function Chat() {
    return (
        <AppLayout title="New analysis" crumbs={[{ label: "Overview", to: "/dashboard" }, { label: "New analysis" }]}>
            <NewAnalysis />
        </AppLayout>
    )
}
