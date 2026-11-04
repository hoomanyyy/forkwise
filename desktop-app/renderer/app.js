const $ = function (id) {
  return document.getElementById(id)
}
const rows = {}
let current = null

function timeText(ms) {
  const d = new Date(ms)
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function drawState(state) {
  current = state
  const status = state.status
  let label = "Not connected"
  let dotClass = ""
  if (status.state === "online") {
    label = (state.paused ? "Paused" : "Connected") + (status.name ? " as " + status.name : "")
    dotClass = state.paused ? "paused" : "online"
  } else if (status.state === "connecting") {
    label = "Connecting..."
    dotClass = "connecting"
  } else if (status.state === "refused" || status.state === "replaced") {
    label = "Not connected"
    dotClass = "refused"
  }
  $("statusText").textContent = label
  $("dot").className = dotClass
  $("version").textContent = "v" + state.version
  $("pair").hidden = state.hasToken
  $("live").hidden = !state.hasToken
  if (!$("server").value) $("server").value = state.server
  $("pause").textContent = state.paused ? "Resume" : "Pause"
  $("confirm").checked = state.confirm
  $("autostart").checked = state.autoStart
  $("hotkey").textContent = "Emergency stop: " + state.hotkey
  $("note").textContent = status.note || (state.paused ? "Paused. The agent cannot use this computer." : "")
  $("pairNote").textContent = status.note || ""
}

function addRow(entry) {
  const feed = $("feed")
  const empty = feed.querySelector(".empty")
  if (empty) empty.remove()
  let row = rows[entry.id]
  if (!row) {
    const box = document.createElement("div")
    box.className = "item"
    const head = document.createElement("div")
    head.className = "head"
    const mark = document.createElement("span")
    const what = document.createElement("span")
    what.className = "what"
    const when = document.createElement("span")
    when.className = "when"
    head.appendChild(mark)
    head.appendChild(what)
    head.appendChild(when)
    const detail = document.createElement("div")
    detail.className = "detail"
    const pre = document.createElement("pre")
    detail.appendChild(pre)
    const img = document.createElement("img")
    img.hidden = true
    detail.appendChild(img)
    box.appendChild(head)
    box.appendChild(detail)
    box.onclick = function () {
      box.classList.toggle("open")
    }
    feed.insertBefore(box, feed.firstChild)
    row = { mark: mark, what: what, when: when, pre: pre, img: img }
    rows[entry.id] = row
    while (feed.children.length > 120) feed.removeChild(feed.lastChild)
  }
  row.mark.className = "mark " + entry.status
  row.what.textContent = entry.text
  row.when.textContent = timeText(entry.time)
  row.pre.textContent = entry.result || (entry.status === "asking" ? "Waiting for your answer..." : "Running...")
  if (entry.image) {
    row.img.src = "data:image/png;base64," + entry.image
    row.img.hidden = false
  }
}

$("connect").onclick = async function () {
  const result = await window.fw.connect($("token").value, $("server").value)
  if (!result.ok) $("pairNote").textContent = result.text
}
$("token").addEventListener("keydown", function (event) {
  if (event.key === "Enter") $("connect").click()
})
$("openSite").onclick = function () {
  window.fw.site("/app/settings/computer")
}
$("pause").onclick = function () {
  window.fw.pause(!(current && current.paused))
}
$("browser").onclick = function () {
  window.fw.browser()
}
$("panic").onclick = function () {
  window.fw.panic()
}
$("confirm").onchange = function () {
  window.fw.confirm($("confirm").checked)
}
$("autostart").onchange = function () {
  window.fw.autostart($("autostart").checked)
}
$("forget").onclick = function () {
  window.fw.forget()
}

window.fw.onState(drawState)
window.fw.onActivity(addRow)
window.fw.load().then(function (data) {
  drawState(data.state)
  data.feed.forEach(addRow)
})
