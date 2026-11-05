/* Left sidebar: new chat, search, chat list, account. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  let listEl = null
  let searchEl = null
  let accountEl = null
  let footStatus = null

  function init() {
    listEl = document.getElementById("chatList")
    searchEl = document.getElementById("chatSearch")
    accountEl = document.getElementById("account")
    footStatus = document.getElementById("deviceRow")

    searchEl.addEventListener("input", U.debounce(function () {
      S.search = searchEl.value.trim().toLowerCase()
      render()
    }, 90))

    document.getElementById("btnNew").addEventListener("click", function () {
      FW.app.newChat()
    })
    footStatus.addEventListener("click", function () {
      FW.app.showPanel("computer")
    })
    accountEl.addEventListener("click", function () {
      FW.settings.open("account")
    })
    listEl.addEventListener("click", function (event) {
      const more = event.target.closest("[data-more]")
      if (more) {
        event.stopPropagation()
        openMenu(more.dataset.more, more)
        return
      }
      const row = event.target.closest("[data-id]")
      if (!row) return
      FW.app.openChat(row.dataset.id)
    })
    listEl.addEventListener("keydown", function (event) {
      const row = event.target.closest("[data-id]")
      if (!row) return
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        FW.app.openChat(row.dataset.id)
        return
      }
      if (event.key === "Delete" || (event.key === "F10" && event.shiftKey)) {
        event.preventDefault()
        openMenu(row.dataset.id, row)
        return
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        const rows = Array.prototype.slice.call(listEl.querySelectorAll(".chat-row"))
        const index = rows.indexOf(row) + (event.key === "ArrowDown" ? 1 : -1)
        const next = rows[index]
        if (next) next.focus()
      }
    })
    listEl.addEventListener("contextmenu", function (event) {
      const row = event.target.closest("[data-id]")
      if (!row) return
      event.preventDefault()
      openMenu(row.dataset.id, row)
    })
  }

  function group(chats) {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 86400000
    const week = startOfToday - 6 * 86400000
    const buckets = [
      { name: "Today", items: [] },
      { name: "Yesterday", items: [] },
      { name: "Previous 7 days", items: [] },
      { name: "Older", items: [] }
    ]
    chats.forEach(function (chat) {
      const stamp = new Date(chat.updated_at || chat.created_at || Date.now()).getTime()
      if (stamp >= startOfToday) buckets[0].items.push(chat)
      else if (stamp >= startOfYesterday) buckets[1].items.push(chat)
      else if (stamp >= week) buckets[2].items.push(chat)
      else buckets[3].items.push(chat)
    })
    return buckets.filter(function (bucket) {
      return bucket.items.length > 0
    })
  }

  function render() {
    if (!listEl) return
    const chats = (S.chats || []).filter(function (chat) {
      if (!S.search) return true
      return String(chat.title || "").toLowerCase().indexOf(S.search) >= 0
    })
    listEl.innerHTML = ""
    if (!chats.length) {
      listEl.appendChild(h("div", { class: "side-empty", text: S.search ? "No chats match that." : "No chats yet. Start one below." }))
      return
    }
    group(chats).forEach(function (bucket) {
      listEl.appendChild(h("div", { class: "side-label", text: bucket.name }))
      bucket.items.forEach(function (chat) {
        const active = S.chat && S.chat.id === chat.id
        const row = h("div", {
          class: "chat-row" + (active ? " active" : ""),
          dataset: { id: chat.id },
          title: chat.title || "New chat",
          tabindex: "0",
          role: "button",
          "aria-current": active ? "true" : null
        }, [
          chat.pinned ? h("span", { html: icon("pin", 11) }) : null,
          h("span", { class: "chat-title", text: chat.title || "New chat" }),
          chat.running ? h("span", { class: "chat-flag", title: "Running" }) : null,
          h("button", { class: "chat-more", dataset: { more: chat.id }, html: icon("more", 13), title: "Chat actions" })
        ])
        listEl.appendChild(row)
      })
    })
  }

  function openMenu(chatId, anchor) {
    const chat = (S.chats || []).find(function (item) {
      return item.id === chatId
    })
    if (!chat) return
    const existing = document.getElementById("chatMenu")
    if (existing) existing.remove()
    const menu = h("div", { class: "pop", id: "chatMenu" }, [
      h("button", { class: "pop-item", onclick: function () { menu.remove(); rename(chat) } }, [h("span", { html: icon("edit", 13) }), h("span", { text: "Rename" })]),
      h("button", { class: "pop-item", onclick: function () { menu.remove(); pin(chat) } }, [h("span", { html: icon("pin", 13) }), h("span", { text: chat.pinned ? "Unpin" : "Pin" })]),
      h("button", { class: "pop-item danger", onclick: function () { menu.remove(); remove(chat) } }, [h("span", { html: icon("trash", 13) }), h("span", { text: "Delete" })])
    ])
    document.body.appendChild(menu)
    const box = anchor.getBoundingClientRect()
    menu.style.position = "fixed"
    menu.style.left = Math.min(box.left + 20, window.innerWidth - 190) + "px"
    menu.style.top = Math.min(box.bottom + 4, window.innerHeight - 120) + "px"
    setTimeout(function () {
      document.addEventListener("click", closeMenuOnce)
    }, 10)
  }

  function closeMenuOnce() {
    const menu = document.getElementById("chatMenu")
    if (menu) menu.remove()
    document.removeEventListener("click", closeMenuOnce)
  }

  function rename(chat) {
    const next = window.prompt("Rename chat", chat.title || "New chat")
    if (!next || !next.trim()) return
    window.fw.chats.patch(chat.id, { title: next.trim() }).then(function () {
      chat.title = next.trim()
      if (S.chat && S.chat.id === chat.id) S.chat.title = next.trim()
      render()
      FW.store.emit("title", next.trim())
    })
  }

  function pin(chat) {
    window.fw.chats.patch(chat.id, { pinned: !chat.pinned }).then(function () {
      FW.app.refreshChats()
    })
  }

  function remove(chat) {
    if (!window.confirm("Delete \u201c" + (chat.title || "this chat") + "\u201d?")) return
    window.fw.chats.remove(chat.id).then(function () {
      if (S.chat && S.chat.id === chat.id) FW.app.newChat()
      FW.app.refreshChats()
    })
  }

  function device() {
    if (!footStatus) return
    const status = S.device.state || "off"
    const label = status === "online" ? "This computer" : status === "connecting" ? "Connecting\u2026" : "Computer offline"
    footStatus.innerHTML = ""
    footStatus.appendChild(h("span", { class: "status-dot " + (status === "online" ? "online" : status === "connecting" ? "connecting" : "") }))
    footStatus.appendChild(h("span", { class: "grow", text: label }))
    footStatus.appendChild(h("span", { html: icon("monitor", 13) }))
  }

  function account() {
    if (!accountEl) return
    const user = S.user
    accountEl.innerHTML = ""
    if (!user) return
    accountEl.appendChild(h("span", { class: "avatar", text: U.initials(user.name || user.email) }))
    const who = h("span", { class: "who" }, [h("b", { text: user.name || user.email }), h("span", { text: (S.plan && S.plan.name) || user.email })])
    accountEl.appendChild(who)
    accountEl.appendChild(h("span", { html: icon("settings", 14), class: "ico" }))
    accountEl.title = "Settings"
  }

  window.FW = window.FW || {}
  window.FW.sidebar = { init: init, render: render, device: device, account: account }
})()
