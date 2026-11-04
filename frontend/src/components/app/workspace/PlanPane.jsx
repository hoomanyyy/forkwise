import { useEffect, useState } from "react"
import { ChevronRight, Square } from "lucide-react"
import { TodoList } from "../ToolCall"
import { api } from "../../../lib/api"

function Job({ job, wid, onKill }) {
  const [open, setOpen] = useState(false)
  const [log, setLog] = useState("")

  useEffect(() => {
    if (!open) return undefined
    let alive = true
    function load() {
      api.get("/api/ws/" + wid + "/jobs/" + job.id).then((data) => alive && setLog(data.output || data.text || "")).catch(() => alive && setLog(""))
    }
    load()
    const timer = job.alive ? setInterval(load, 3000) : null
    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  }, [open, job.id, job.alive])

  return (
    <div className="job-block">
      <button type="button" className="job-head" onClick={() => setOpen(!open)}>
        <span className={"job-dot" + (job.alive ? "" : " off")} />
        <span className="mono job-cmd">{job.command}</span>
        <span className="tool-spacer" />
        <ChevronRight size={13} className={"flow-chev" + (open ? " open" : "")} />
      </button>
      {open && (
        <div className="job-body">
          <pre className="tool-pre" dir="ltr">{log || "No output yet."}</pre>
          {job.alive && <button className="btn btn-ghost btn-sm" onClick={() => onKill(job.id)}><Square size={11} />Stop</button>}
        </div>
      )}
    </div>
  )
}

export default function PlanPane({ wid, todos, refreshKey }) {
  const [jobs, setJobs] = useState([])

  function load() {
    api.get("/api/ws/" + wid + "/jobs").then((data) => setJobs(data.jobs)).catch(() => setJobs([]))
  }

  useEffect(() => {
    load()
  }, [wid, refreshKey])

  useEffect(() => {
    const timer = setInterval(load, 8000)
    return () => clearInterval(timer)
  }, [wid])

  async function kill(id) {
    await api.post("/api/ws/" + wid + "/jobs/" + id + "/kill").catch(() => null)
    load()
  }

  const done = todos.filter((item) => item.status === "completed").length
  return (
    <div className="plan-pane">
      <div className="pane-toolbar"><span className="faint small">Plan</span><span className="tool-spacer" />{todos.length > 0 && <span className="faint small">{done} of {todos.length} done</span>}</div>
      <div className="plan-pane-body">
        {todos.length === 0 ? <div className="empty-small">Forkwise writes a plan here when a task has several steps.</div> : <TodoList todos={todos} />}
      </div>
      <div className="pane-toolbar"><span className="faint small">Background processes</span></div>
      <div className="plan-pane-body">
        {jobs.length === 0 && <div className="empty-small">No servers or long commands are running.</div>}
        {jobs.map((job) => <Job key={job.id} job={job} wid={wid} onKill={kill} />)}
      </div>
    </div>
  )
}
