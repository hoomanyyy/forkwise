function ask(message) {
  return chrome.runtime.sendMessage(message)
}

function showSites(list) {
  const box = document.getElementById("sites")
  if (list.length === 0) return
  box.innerHTML = ""
  for (let i = 0; i < list.length; i++) {
    const row = document.createElement("div")
    row.className = "site"
    const name = document.createElement("span")
    name.textContent = list[i]
    const remove = document.createElement("button")
    remove.textContent = "Remove"
    remove.addEventListener("click", async function () {
      await ask({ type: "forget", site: list[i] })
      location.reload()
    })
    row.appendChild(name)
    row.appendChild(remove)
    box.appendChild(row)
  }
}

async function refresh() {
  const state = await ask({ type: "state" })
  document.getElementById("version").textContent = "Version " + state.version
  const dot = document.getElementById("dot")
  const text = document.getElementById("state")
  dot.className = "dot"
  if (state.paused) {
    dot.className = "dot paused"
    text.textContent = "Paused. Forkwise cannot use your browser."
  } else if (state.connected) {
    dot.className = "dot on"
    text.textContent = state.tabs > 0 ? "Connected. Working in " + state.tabs + " tab" + (state.tabs === 1 ? "" : "s") + "." : "Connected to the Forkwise app."
  } else {
    text.textContent = "Not connected. Open the Forkwise app on this computer."
  }
  document.getElementById("pause").textContent = state.paused ? "Resume" : "Pause"
  document.getElementById("pause").onclick = async function () {
    await ask({ type: "pause", value: !state.paused })
    refresh()
  }
  showSites(state.always)
}

document.getElementById("share").addEventListener("click", async function () {
  const answer = await ask({ type: "share" })
  document.getElementById("state").textContent = answer.text
})

document.getElementById("stop").addEventListener("click", async function () {
  await ask({ type: "stop" })
  document.getElementById("state").textContent = "Stopped. Forkwise let go of every tab."
})

refresh()
