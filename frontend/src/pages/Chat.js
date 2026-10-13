import React, { useEffect, useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../styles/Chat.css"
import Logo from "../images/logo.svg"
import Seo from "../components/Seo"
import { Link, useNavigate } from "react-router-dom"
import { FaCloudUploadAlt, FaFileAlt, FaTrash, FaCheck, FaRocket } from "react-icons/fa"
import { sendInformationsAn } from "../api"

function fileSize(bytes) {
    if (bytes >= 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }
    return Math.max(1, Math.round(bytes / 1024)) + " KB"
}

export default function Chat() {
    const navigate = useNavigate()
    const [files, setFiles] = useState([])
    const [fileDetails, setFileDetails] = useState({})
    const [relation, setRelation] = useState("")
    const [joinColumn, setJoinColumn] = useState("")
    const [question, setQuestion] = useState("")
    const [outcome, setOutcome] = useState("")
    const [mainVariable, setMainVariable] = useState("")
    const [expectation, setExpectation] = useState("")
    const [analysts, setAnalysts] = useState("10")
    const [notes, setNotes] = useState("")
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
            console.log("ERROR: " , err.message)
        }
        setSending(false)
    }

    return (
        <div className="ChatPage">
            <Seo title="New analysis | Forkwise" noindex />
            <nav className="ChatNav">
                <Link to="/" className="ChatBrand">
                    <img src={Logo} alt="Logo" className="ChatLogo" />
                    <span>Forkwise</span>
                </Link>
                <button className="btn ChatBack" onClick={() => navigate("/dashboard")}>Back to dashboard</button>
            </nav>

            <div className="ChatHead">
                <p className="ChatEyebrow">New analysis</p>
                <h2 className="ChatTitle">Ask your data a question</h2>
                <div className="ChatSteps">
                    <span className={filesDone ? "ChatStep StepDone" : "ChatStep"}><b>{filesDone ? <FaCheck /> : "1"}</b>Upload files</span>
                    <span className={describedDone ? "ChatStep StepDone" : "ChatStep"}><b>{describedDone ? <FaCheck /> : "2"}</b>Describe them</span>
                    <span className={questionDone ? "ChatStep StepDone" : "ChatStep"}><b>{questionDone ? <FaCheck /> : "3"}</b>Ask a question</span>
                    <span className="ChatStep"><b>4</b>Start</span>
                </div>
            </div>

            <form className="ChatLayout" onSubmit={submitForm} noValidate>
                <div className="ChatMain">
                    <section className="ChatCard">
                        <h6 className="ChatCardTitle"><span>1</span>Upload your data</h6>
                        <label
                            className={dragging ? "ChatDrop ChatDropOn" : "ChatDrop"}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={dropFiles}
                        >
                            <input type="file" multiple accept=".csv,.json,.xlsx,.xls" onChange={chooseFiles} style={{ display: "none" }} />
                            <FaCloudUploadAlt className="ChatDropIcon" />
                            <span className="ChatDropText">Drag files here or click to choose</span>
                            <span className="ChatDropHint">CSV, Excel or JSON. You can add many files.</span>
                        </label>

                        {files.map((f, index) => (
                            <div key={f.name} className="ChatFile">
                                <div className="ChatFileTop">
                                    <span className="ChatFileIcon"><FaFileAlt /></span>
                                    <div className="ChatFileInfo">
                                        <p className="ChatFileName" title={f.name}>{f.name}</p>
                                        <p className="ChatFileSize">File {index + 1} · {fileSize(f.size)}</p>
                                    </div>
                                    <button type="button" className="ChatRemove" onClick={() => removeFile(f.name)} aria-label="Remove file"><FaTrash /></button>
                                </div>

                                <div className="ChatGrid2">
                                    <label className="ChatField">
                                        <span>Role of this file</span>
                                        <select className="form-select ChatInput" value={fileDetails[f.name].role} onChange={(e) => updateDetail(f.name, "role", e.target.value)}>
                                            <option value="main">Main data</option>
                                            <option value="extra">Extra information</option>
                                        </select>
                                    </label>
                                    <label className="ChatField">
                                        <span>What does one row mean? *</span>
                                        <input className="form-control ChatInput" placeholder="One student" value={fileDetails[f.name].rowMeaning} onChange={(e) => updateDetail(f.name, "rowMeaning", e.target.value)} />
                                    </label>
                                </div>
                                <label className="ChatField">
                                    <span>Description of this file *</span>
                                    <textarea className="form-control ChatInput" rows="2" placeholder="Exam results of grade 10 students in our school" value={fileDetails[f.name].description} onChange={(e) => updateDetail(f.name, "description", e.target.value)} />
                                </label>
                                <div className="ChatGrid3">
                                    <label className="ChatField">
                                        <span>Source</span>
                                        <input className="form-control ChatInput" placeholder="School office" value={fileDetails[f.name].source} onChange={(e) => updateDetail(f.name, "source", e.target.value)} />
                                    </label>
                                    <label className="ChatField">
                                        <span>Time period</span>
                                        <input className="form-control ChatInput" placeholder="2015 to 2024" value={fileDetails[f.name].period} onChange={(e) => updateDetail(f.name, "period", e.target.value)} />
                                    </label>
                                    <label className="ChatField">
                                        <span>Missing values are</span>
                                        <select className="form-select ChatInput" value={fileDetails[f.name].missing} onChange={(e) => updateDetail(f.name, "missing", e.target.value)}>
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
                            <div className="ChatRelation">
                                <label className="ChatField">
                                    <span>How are these files related? *</span>
                                    <select className="form-select ChatInput" value={relation} onChange={(e) => setRelation(e.target.value)}>
                                        <option value="">Choose</option>
                                        <option value="stack">Same columns, more rows (for example one file per year)</option>
                                        <option value="join">Different columns, connected by a common column</option>
                                        <option value="separate">Separate files, use them as extra context</option>
                                    </select>
                                </label>
                                {relation === "join" && (
                                    <label className="ChatField">
                                        <span>Common column *</span>
                                        <input className="form-control ChatInput" placeholder="country, year" value={joinColumn} onChange={(e) => setJoinColumn(e.target.value)} />
                                        <small className="ChatHint">It must be in every file. For two columns, write them with a comma.</small>
                                    </label>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="ChatCard">
                        <h6 className="ChatCardTitle"><span>2</span>Your research question</h6>
                        <label className="ChatField">
                            <span>Question *</span>
                            <input className="form-control ChatInput ChatBig" placeholder="Does study time affect exam score?" value={question} onChange={(e) => setQuestion(e.target.value)} />
                        </label>
                        <div className="ChatGrid2">
                            <label className="ChatField">
                                <span>Outcome, what you want to explain *</span>
                                <input className="form-control ChatInput" placeholder="exam score" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
                            </label>
                            <label className="ChatField">
                                <span>Main variable, what may affect it *</span>
                                <input className="form-control ChatInput" placeholder="study hours" value={mainVariable} onChange={(e) => setMainVariable(e.target.value)} />
                            </label>
                        </div>
                        <small className="ChatHint ChatHintTop">You can write in your own words. The AI finds the matching columns.</small>
                        <label className="ChatField">
                            <span>What do you expect? * <em>choose before you see the results</em></span>
                            <select className="form-select ChatInput" value={expectation} onChange={(e) => setExpectation(e.target.value)}>
                                <option value="">Choose</option>
                                <option value="increase">It increases the outcome</option>
                                <option value="decrease">It decreases the outcome</option>
                                <option value="none">No effect</option>
                                <option value="unknown">I don't know</option>
                            </select>
                        </label>
                    </section>

                    <section className="ChatCard">
                        <h6 className="ChatCardTitle"><span>3</span>Extra notes <em>optional</em></h6>
                        <textarea className="form-control ChatInput" rows="3" placeholder="Anything else the AI analysts should know" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </section>
                </div>

                <aside className="ChatSide">
                    <div className="ChatSummary">
                        <p className="ChatEyebrow">Your analysis</p>
                        <div className="SumRow"><span>Files</span><b>{files.length}</b></div>
                        <div className="SumRow"><span>Question</span><b className="SumQuestion">{question.trim() === "" ? "-" : question}</b></div>

                        <p className="SumLabel">Number of AI analysts</p>
                        <div className="ChatChips">
                            <button type="button" className={analysts === "10" ? "ChatChip ChatChipOn" : "ChatChip"} onClick={() => setAnalysts("10")}>10</button>
                            <button type="button" className={analysts === "25" ? "ChatChip ChatChipOn" : "ChatChip"} onClick={() => setAnalysts("25")}>25</button>
                            <button type="button" className={analysts === "50" ? "ChatChip ChatChipOn" : "ChatChip"} onClick={() => setAnalysts("50")}>50</button>
                            <button type="button" className={analysts === "100" ? "ChatChip ChatChipOn" : "ChatChip"} onClick={() => setAnalysts("100")}>100</button>
                        </div>
                        <p className="SumHint">More analysts give a more reliable verdict. About {minutes} min.</p>

                        {error !== "" && <div className="ChatError">{error}</div>}

                        <button type="submit" className="ChatStart" disabled={sending}>
                            <FaRocket /> {sending ? "Running..." : "Start analysis"}
                        </button>

                        {sending && (
                            <div className="ChatRunning">
                                <div className="ChatProgress"><span></span></div>
                                <p>{analysts} AI analysts are working on your question. Please keep this page open.</p>
                            </div>
                        )}
                    </div>
                </aside>
            </form>
        </div>
    )
}
