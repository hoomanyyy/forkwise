import { useEffect, useRef, useState } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import "@xterm/xterm/css/xterm.css"
import { Plus, Square, X } from "lucide-react"
import { api, socketUrl } from "../../../lib/api"

function TerminalView({ wid, theme, active }) {
  const host = useRef(null)
  const fitRef = useRef(null)
  const socketRef = useRef(null)
  const termRef = useRef(null)

  useEffect(() => {
    const dark = theme !== "light"
    const term = new Terminal({
      fontFamily: "JetBrains Mono Variable, monospace",
      fontSize: 13,
      cursorBlink: true,
      theme: dark
        ? { background: "#0a0a0c", foreground: "#e6e6ea", cursor: "#8b7bff", selectionBackground: "#33335a" }
        : { background: "#f7f7f8", foreground: "#17171a", cursor: "#5b49f0", selectionBackground: "#d4d0fb" },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host.current)
    termRef.current = term
    fitRef.current = fit
    try {
      fit.fit()
    } catch (problem) {
      fit.proposeDimensions()
    }
    const socket = new WebSocket(socketUrl("/api/ws/" + wid + "/terminal"))
    socketRef.current = socket
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }))
    }
    socket.onmessage = (event) => term.write(event.data)
    socket.onclose = () => term.write("\r\n\x1b[90m[terminal closed]\x1b[0m\r\n")
    const input = term.onData((data) => {
      if (socket.readyState === 1) socket.send(JSON.stringify({ type: "input", data }))
    })
    function resize() {
      if (!host.current || host.current.offsetWidth === 0) return
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
  }, [wid, theme])

  useEffect(() => {
    if (active && termRef.current) {
      setTimeout(() => {
        try {
          fitRef.current.fit()
          termRef.current.focus()
        } catch (problem) {
          return
        }
      }, 30)
    }
  }, [active])

  return <div className="terminal-host" ref={host} style={{ display: active ? "block" : "none" }} />
}

export default function TerminalPane({ wid, theme }) {
  const [tabs, setTabs] = useState([{ id: 1, name: "bash 1" }])
  const [active, setActive] = useState(1)
  const [counter, setCounter] = useState(1)
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

  function add() {
    if (tabs.length >= 6) return
    const next = counter + 1
    setCounter(next)
    setTabs([...tabs, { id: next, name: "bash " + next }])
    setActive(next)
  }

  function close(id) {
    if (tabs.length === 1) return
    const rest = tabs.filter((item) => item.id !== id)
    setTabs(rest)
    if (active === id) setActive(rest[rest.length - 1].id)
  }

  async function kill(id) {
    await api.post("/api/ws/" + wid + "/jobs/" + id + "/kill")
    loadJobs()
  }

  const alive = jobs.filter((job) => job.alive)

  return (
    <div className="terminal-pane">
      <div className="term-tabs">
        {tabs.map((item) => (
          <span key={item.id} className={"term-tab" + (active === item.id ? " on" : "")}>
            <button type="button" onClick={() => setActive(item.id)}>{item.name}</button>
            {tabs.length > 1 && <button type="button" className="term-close" aria-label={"Close " + item.name} onClick={() => close(item.id)}><X size={11} /></button>}
          </span>
        ))}
        <button className="icon-btn tiny" title="New terminal" onClick={add} disabled={tabs.length >= 6}><Plus size={13} /></button>
        <span className="tool-spacer" />
        <span className="faint small">Forkwise's computer</span>
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
      <div className="terminal-stack">
        {tabs.map((item) => <TerminalView key={item.id} wid={wid} theme={theme} active={active === item.id} />)}
      </div>
    </div>
  )
}
