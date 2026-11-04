const tabsBox = document.getElementById("tabs")
const urlBox = document.getElementById("url")
let lastActive = ""

function draw(data) {
  tabsBox.innerHTML = ""
  data.tabs.forEach(function (tab) {
    const item = document.createElement("div")
    item.className = "tab" + (tab.id === data.active ? " on" : "")
    if (tab.loading) {
      const dot = document.createElement("span")
      dot.className = "dot"
      item.appendChild(dot)
    }
    const name = document.createElement("span")
    name.className = "name"
    name.textContent = tab.title || tab.url || "New tab"
    item.appendChild(name)
    const close = document.createElement("button")
    close.className = "x"
    close.textContent = "×"
    close.onclick = function (event) {
      event.stopPropagation()
      window.fwBrowser.closeTab(tab.id)
    }
    item.appendChild(close)
    item.onclick = function () {
      window.fwBrowser.switchTab(tab.id)
    }
    tabsBox.appendChild(item)
    if (tab.id === data.active && document.activeElement !== urlBox) {
      urlBox.value = tab.url === "about:blank" ? "" : tab.url
    }
  })
  const plus = document.createElement("button")
  plus.id = "plus"
  plus.textContent = "+"
  plus.onclick = function () {
    window.fwBrowser.newTab()
  }
  tabsBox.appendChild(plus)
  if (data.active !== lastActive) {
    lastActive = data.active
  }
}

document.getElementById("back").onclick = function () { window.fwBrowser.back() }
document.getElementById("forward").onclick = function () { window.fwBrowser.forward() }
document.getElementById("reload").onclick = function () { window.fwBrowser.reload() }
urlBox.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    window.fwBrowser.go(urlBox.value)
    urlBox.blur()
  }
})
window.fwBrowser.onTabs(draw)
