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
  let serverHits = null
  let searchToken = 0

  function init() {
    listEl = document.getElementById("chatList")
    searchEl = document.getElementById("chatSearch")
    accountEl = document.getElementById("account")
    footStatus = document.getElementById("deviceRow")

    searchEl.addEventListener("input", U.debounce(function () {
      S.search = searchEl.value.trim().toLowerCase()
      serverHits = null
      render()
      searchServer(S.search)
    }, 120))
    searchEl.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && searchEl.value) {
        event.preventDefault()
        searchEl.value = ""
        S.search = ""
        serverHits = null
        render()
      } else if (event.key === "Enter") {
        const first = listEl.querySelector(".chat-row")
        if (first) FW.app.openChat(first.dataset.id)
      } else if (event.key === "ArrowDown") {
        const first = listEl.querySelector(".chat-row")
        if (first) {
          event.preventDefault()
          first.focus()
        }
      }
    })

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
      { name: "Pinned", items: [] },
      { name: "Today", items: [] },
      { name: "Yesterday", items: [] },
      { name: "Previous 7 days", items: [] },
      { name: "Older", items: [] }
    ]
    chats.forEach(function (chat) {
      const stamp = U.stampMs(chat.updated_at || chat.created_at)
      if (chat.pinned) buckets[0].items.push(chat)
      else if (stamp >= startOfToday) buckets[1].items.push(chat)
      else if (stamp >= startOfYesterday) buckets[2].items.push(chat)
      else if (stamp >= week) buckets[3].items.push(chat)
      else buckets[4].items.push(chat)
    })
    return buckets.filter(function (bucket) {
      return bucket.items.length > 0
    })
  }

  // Titles match at once; the server then adds chats whose messages match.
  async function searchServer(query) {
    const token = ++searchToken
    if (query.length < 2) return
    try {
      const data = await window.fw.api("/api/search?q=" + encodeURIComponent(query), "GET")
      if (token !== searchToken) return
      serverHits = (data.results || []).map(function (item) {
        return item.id
      })
      render()
    } catch (problem) {}
  }

  function render() {
    if (!listEl) return
    const chats = (S.chats || []).filter(function (chat) {
      if (!S.search) return true
      if (String(chat.title || "").toLowerCase().indexOf(S.search) >= 0) return true
      return !!serverHits && serverHits.indexOf(chat.id) >= 0
    })
    listEl.innerHTML = ""
    if (!chats.length) {
      listEl.appendChild(h("div", { class: "side-empty", text: S.search ? (serverHits || S.search.length < 2 ? "No chats match that." : "Searching\u2026") : "No chats yet. Start one above." }))
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
    const items = [
      { value: "rename", label: "Rename", icon: "edit" },
      { value: "pin", label: chat.pinned ? "Unpin" : "Pin to the top", icon: "pin" }
    ]
    if (chat.local_path) items.push({ value: "folder", label: "Open the folder", icon: "folder" })
    items.push({ value: "delete", label: "Delete", icon: "trash", danger: true })
    U.menu(anchor.querySelector(".chat-more") || anchor, items, function (value) {
      if (value === "rename") rename(chat)
      if (value === "pin") pin(chat)
      if (value === "folder") window.fw.openPath(chat.local_path)
      if (value === "delete") remove(chat)
    }, { alignRight: true, className: "chat-menu" })
  }

  async function rename(chat) {
    const next = await U.dialog({ title: "Rename chat", input: chat.title || "New chat", ok: "Rename" })
    if (!next) return
    try {
      await window.fw.chats.patch(chat.id, { title: next })
      chat.title = next
      if (S.chat && S.chat.id === chat.id) S.chat.title = next
      render()
      FW.store.emit("title", next)
    } catch (problem) {
      U.toast(problem.message || "Could not rename the chat", "bad")
    }
  }

  function pin(chat) {
    window.fw.chats.patch(chat.id, { pinned: !chat.pinned }).then(function () {
      FW.app.refreshChats()
    }).catch(function (problem) {
      U.toast(problem.message || "Could not pin the chat", "bad")
    })
  }

  async function remove(chat) {
    const sure = await U.dialog({ title: "Delete this chat?", text: "\u201c" + (chat.title || "New chat") + "\u201d and its messages are removed for good.", ok: "Delete", danger: true })
    if (!sure) return
    try {
      await window.fw.chats.remove(chat.id)
      if (S.chat && S.chat.id === chat.id) FW.app.newChat()
      FW.app.refreshChats()
    } catch (problem) {
      U.toast(problem.message || "Could not delete the chat", "bad")
    }
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
