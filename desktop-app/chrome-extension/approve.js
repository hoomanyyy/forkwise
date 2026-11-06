const params = new URLSearchParams(location.search)
const id = params.get("id")
let left = 180

document.getElementById("site").textContent = params.get("site") || ""
document.getElementById("what").textContent = "It wants to " + (params.get("what") || "use this site") + "."

function answer(choice) {
  chrome.runtime.sendMessage({ type: "answer", id: id, choice: choice })
}

document.getElementById("once").addEventListener("click", function () {
  answer("once")
})
document.getElementById("always").addEventListener("click", function () {
  answer("always")
})
document.getElementById("deny").addEventListener("click", function () {
  answer("deny")
})

function tick() {
  document.getElementById("timer").textContent = "Denied automatically in " + left + "s"
  left = left - 1
  if (left < 0) answer("deny")
}

tick()
setInterval(tick, 1000)
