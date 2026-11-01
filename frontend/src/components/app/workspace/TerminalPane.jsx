import { useEffect, useRef, useState } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import "@xterm/xterm/css/xterm.css"
import { RotateCcw, Square } from "lucide-react"
import { api, socketUrl } from "../../../lib/api"

export default function TerminalPane({ wid, theme }) {
  const host = useRef(null)
  const [session, setSession] = useState(0)
  const [jobs, setJobs] = useState([])

  async function loadJobs() {
    try {
      const data = await api.get("/api/ws/" + wid + "/jobs")
      setJobs(data.jobs)
    } catch (problem) {
      setJobs([])
    }
  }

  useEffect(() => {
    loadJobs()
    const timer = setInterval(loadJobs, 8000)
    return () => clearInterval(timer)
  }, [wid])

  useEffect(() => {
    const dark = theme !== "light"
    const term = new Terminal({
      fontFamily: "JetBrains Mono Variable, monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: dark
        ? { background: "#080a1d", foreground: "#e6e8ff", cursor: "#8b7bff", selectionBackground: "#2c2f6e" }
        : { background: "#f3f4fd", foreground: "#14173a", cursor: "#5b4bff", selectionBackground: "#c9ccf2" },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host.current)
    fit.fit()
    const socket = new WebSocket(socketUrl("/api/ws/" + wid + "/terminal"))
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }))
    }
    socket.onmessage = (event) => term.write(event.data)
    socket.onclose = () => term.write("\r\n\x1b[90m[terminal closed]\x1b[0m\r\n")
    const input = term.onData((data) => {
      if (socket.readyState === 1) socket.send(JSON.stringify({ type: "input", data }))
    })
    function resize() {
      try {
        fit.fit()
      } catch (problem) {
        return
      }
      if (socket.readyState === 1) socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host.current)
    return () => {
      observer.disconnect()
      input.dispose()
      socket.close()
      term.dispose()
    }
  }, [wid, session, theme])

  async function kill(id) {
    await api.post("/api/ws/" + wid + "/jobs/" + id + "/kill")
    loadJobs()
  }

  const alive = jobs.filter((job) => job.alive)

  return (
    <div className="terminal-pane">
      <div className="pane-toolbar">
        <span className="faint small">Shell on Forkwise's computer</span>
        <span className="tool-spacer" />
        <button className="icon-btn tiny" title="New session" onClick={() => setSession(session + 1)}><RotateCcw size={13} /></button>
      </div>
      {alive.length > 0 && (
        <div className="jobs">
          {alive.map((job) => (
            <span key={job.id} className="job">
              <span className="job-dot" />
              <span className="mono">{job.command.slice(0, 48)}</span>
              <button className="icon-btn tiny" title="Stop" onClick={() => kill(job.id)}><Square size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="terminal-host" ref={host} />
    </div>
  )
}
