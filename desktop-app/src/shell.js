const { spawn, execFile } = require("child_process")
const os = require("os")
const util = require("./util")

const running = new Set()

function argvFor(command) {
  if (process.platform === "win32") {
    const prefix = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $ProgressPreference = 'SilentlyContinue'; "
    return { file: "powershell.exe", args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", prefix + command] }
  }
  return { file: process.env.SHELL || "/bin/bash", args: ["-lc", command] }
}

function killTree(child) {
  if (!child || !child.pid) return
  if (process.platform === "win32") {
    execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], function () {})
    return
  }
  try {
    process.kill(-child.pid, "SIGKILL")
  } catch (problem) {
    try {
      child.kill("SIGKILL")
    } catch (second) {}
  }
}

function runShell(command, cwd, timeoutSeconds, onData) {
  const seconds = util.clamp(util.toInt(timeoutSeconds, 120), 1, 600)
  const where = cwd ? util.expand(cwd) : os.homedir()
  const picked = argvFor(command)
  return new Promise(function (resolve) {
    let output = ""
    let finished = false
    let timedOut = false
    const child = spawn(picked.file, picked.args, { cwd: where, detached: process.platform !== "win32", windowsHide: true, env: process.env })
    running.add(child)
    function add(chunk) {
      output = output + chunk.toString("utf8")
      if (output.length > 200000) output = output.slice(output.length - 100000)
      if (onData) onData(chunk.toString("utf8"))
    }
    child.stdout.on("data", add)
    child.stderr.on("data", add)
    const timer = setTimeout(function () {
      timedOut = true
      killTree(child)
    }, seconds * 1000)
    function done(code, problem) {
      if (finished) return
      finished = true
      clearTimeout(timer)
      running.delete(child)
      let text = util.tail(output, 20000)
      if (problem) text = text + "\n" + problem
      if (timedOut) {
        resolve({ ok: false, text: text + "\n(timed out after " + seconds + "s)" })
        return
      }
      resolve({ ok: code === 0, text: text + "\n(exit code " + code + ")" })
    }
    child.on("error", function (problem) {
      done(1, "Could not start the shell: " + problem.message)
    })
    child.on("close", function (code) {
      done(code === null ? 1 : code, "")
    })
  })
}

const jobs = new Map()
let jobCounter = 0

function startJob(command, cwd) {
  const picked = argvFor(command)
  jobCounter = jobCounter + 1
  const id = "j" + jobCounter
  const job = { id: id, command: command, output: "", alive: true, code: null, child: null }
  jobs.set(id, job)
  function add(chunk) {
    job.output = job.output + chunk.toString("utf8")
    if (job.output.length > 200000) job.output = job.output.slice(job.output.length - 100000)
  }
  const child = spawn(picked.file, picked.args, { cwd: util.expand(cwd) || os.homedir(), detached: process.platform !== "win32", windowsHide: true, env: process.env })
  job.child = child
  child.stdout.on("data", add)
  child.stderr.on("data", add)
  child.on("error", function (problem) {
    job.output = job.output + "\nCould not start: " + problem.message
    job.alive = false
  })
  child.on("close", function (code) {
    job.alive = false
    job.code = code
  })
  return id
}

function jobOutput(id) {
  const job = jobs.get(id)
  if (!job) {
    const known = []
    jobs.forEach(function (item) {
      known.push(item.id + " (" + item.command.slice(0, 40) + ")")
    })
    return { ok: false, text: "No job with this id. Jobs: " + (known.join(", ") || "none") }
  }
  let text = util.tail(job.output, 6000).trim() || "(no output yet)"
  if (!job.alive) text = text + "\n(exit code " + job.code + ")"
  return { ok: true, text: text, data: { alive: job.alive } }
}

function killJob(id) {
  const job = jobs.get(id)
  if (!job) return { ok: false, text: "No such job." }
  if (job.alive) killTree(job.child)
  job.alive = false
  return { ok: true, text: "Stopped " + id + "." }
}

function stopAll() {
  const count = running.size
  running.forEach(function (child) {
    killTree(child)
  })
  running.clear()
  return count
}

function stopJobs() {
  jobs.forEach(function (job) {
    if (job.alive) killTree(job.child)
    job.alive = false
  })
}

module.exports = { runShell, stopAll, startJob, jobOutput, killJob, stopJobs }
