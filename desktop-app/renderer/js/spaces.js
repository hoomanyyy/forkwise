/* Spaces: groups of chats and agents that share instructions and context
   (stored as Forkwise projects, so every agent in a space reads them). */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  let draft = null
  let draftFor = ""

  function host() {
    return document.getElementById("viewSpaces")
  }

  function current() {
    return (S.spaces || []).find(function (space) {
      return space.id === S.space
    }) || null
  }

  function select(id) {
    S.space = id || ""
    FW.store.savePrefs({ space: S.space })
    draft = null
    render()
    if (FW.composer) FW.composer.renderChips()
  }

  function render() {
    const view = host()
    if (!view || view.hidden) return
    view.innerHTML = ""
    view.appendChild(h("div", { class: "view-head" }, [
      h("span", { class: "grow", text: "Spaces" }),
      h("button", { class: "view-btn", type: "button", title: "New space", html: icon("plus", 13), onclick: create }),
      h("button", { class: "view-btn", type: "button", title: "Refresh", html: icon("refresh", 13), onclick: function () { FW.agents.loadSpaces() } })
    ]))
    const body = h("div", { class: "view-body" })
    view.appendChild(body)
    const spaces = S.spaces || []
    if (!spaces.length) {
      body.appendChild(h("div", { class: "view-empty" }, [
        h("div", { text: "A space groups the chats and agents of one piece of work. Everything in a space shares its instructions, so every agent knows the goal, the rules and the decisions." }),
        h("button", { class: "btn primary sm", text: "New space", onclick: create })
      ]))
      return
    }
    const list = h("div", { class: "space-list" })
    list.appendChild(spaceRow({ id: "", name: "No space", chats: null }))
    spaces.forEach(function (space) {
      list.appendChild(spaceRow(space))
    })
    body.appendChild(list)
    const space = current()
    if (space) body.appendChild(details(space))
  }

  function spaceRow(space) {
    const on = (S.space || "") === space.id
    const row = h("button", { class: "space-row" + (on ? " on" : ""), type: "button", title: space.description || space.name }, [
      h("span", { html: icon(space.id ? "layout" : "dot", 13) }),
      h("span", { class: "name", text: space.name }),
      space.chats !== null && space.chats !== undefined ? h("span", { class: "n", text: String(space.chats) }) : null
    ])
    row.addEventListener("click", function () {
      select(space.id)
    })
    if (space.id) {
      row.addEventListener("contextmenu", function (event) {
        event.preventDefault()
        spaceMenu(space, row)
      })
    }
    return row
  }

  function details(space) {
    const wrap = h("div", { class: "space-detail" })
    wrap.appendChild(h("div", { class: "space-title" }, [
      h("b", { text: space.name }),
      h("button", { class: "view-btn", type: "button", title: "More", html: icon("more", 12), onclick: function (event) { spaceMenu(space, event.currentTarget) } })
    ]))
    wrap.appendChild(h("div", { class: "panel-section-title", text: "Shared instructions" }))
    if (draft === null || draftFor !== space.id) {
      draft = space.instructions || ""
      draftFor = space.id
    }
    const area = h("textarea", { class: "space-notes", spellcheck: "false", dir: "auto", placeholder: "The goal, the rules, decisions so far, links. Every agent in this space reads this first." })
    area.value = draft
    const save = h("button", { class: "btn sm primary", text: "Save", disabled: true })
    area.addEventListener("input", function () {
      draft = area.value
      save.disabled = false
    })
    area.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        event.stopPropagation()
        save.click()
      }
    })
    save.addEventListener("click", async function () {
      try {
        await window.fw.api("/api/projects/" + encodeURIComponent(space.id), "PATCH", { instructions: draft })
        space.instructions = draft
        save.disabled = true
        U.toast("Saved. Agents in this space read it on their next step.")
      } catch (problem) {
        U.toast(problem.message || "Could not save", "bad")
      }
    })
    wrap.appendChild(area)
    wrap.appendChild(h("div", { class: "rules-foot" }, [h("span", { class: "grow", text: "Shared by every chat and agent here" }), save]))
    wrap.appendChild(h("div", { class: "space-actions" }, [
      h("button", { class: "btn sm", html: icon("plus", 12) + "<span>Agent</span>", onclick: function () { FW.agents.newAgent({ space: space.id }) } }),
      h("button", { class: "btn sm", html: icon("chat", 12) + "<span>Chat</span>", onclick: function () { FW.app.newChat(); FW.composer.focus() } }),
      h("button", { class: "btn ghost sm", html: icon("app", 12) + "<span>Board</span>", onclick: function () { FW.agents.show() } })
    ]))
    const chats = (S.chats || []).filter(function (chat) {
      return chat.project_id === space.id
    })
    wrap.appendChild(h("div", { class: "panel-section-title", style: "margin-top:12px", text: "In this space (" + chats.length + ")" }))
    if (!chats.length) wrap.appendChild(h("div", { class: "view-empty", style: "padding:4px 0", text: "Nothing yet. New chats and agents start here while this space is selected." }))
    chats.forEach(function (chat) {
      const row = h("button", { class: "git-row", type: "button", title: chat.title }, [
        h("span", { class: "file-ico", html: icon(chat.running ? "zap" : "chat", 12) }),
        h("span", { class: "name", dir: "auto", text: chat.title || "New chat" }),
        h("span", { class: "dim", text: chat.running ? (chat.waiting ? "needs you" : "working") : U.timeAgo(chat.updated_at) })
      ])
      row.addEventListener("click", function () {
        FW.agents.hide()
        FW.app.openChat(chat.id)
      })
      wrap.appendChild(row)
    })
    return wrap
  }

  function spaceMenu(space, anchor) {
    U.menu(anchor, [
      { value: "rename", label: "Rename", icon: "edit" },
      { value: "board", label: "Show on the board", icon: "app" },
      { separator: true },
      { value: "delete", label: "Delete the space", icon: "trash", danger: true }
    ], async function (value) {
      if (value === "rename") {
        const name = await U.dialog({ title: "Rename space", input: space.name, ok: "Rename" })
        if (!name) return
        try {
          await window.fw.api("/api/projects/" + encodeURIComponent(space.id), "PATCH", { name: name })
          FW.agents.loadSpaces()
        } catch (problem) {
          U.toast(problem.message || "Could not rename", "bad")
        }
      }
      if (value === "board") FW.agents.show()
      if (value === "delete") {
        const sure = await U.dialog({ title: "Delete “" + space.name + "”?", text: "The space and its instructions are deleted. Check what happens to its chats on the website before deleting a space with work in it.", ok: "Delete", danger: true })
        if (!sure) return
        try {
          await window.fw.api("/api/projects/" + encodeURIComponent(space.id), "DELETE")
          if (S.space === space.id) select("")
          FW.agents.loadSpaces()
          FW.app.refreshChats()
        } catch (problem) {
          U.toast(problem.message || "Could not delete", "bad")
        }
      }
    }, { alignRight: true })
  }

  async function create() {
    const name = await U.dialog({ title: "New space", text: "For one project or piece of work, e.g. “Checkout redesign”.", input: "", ok: "Create" })
    if (!name) return null
    try {
      const data = await window.fw.api("/api/projects", "POST", { name: name, description: "", instructions: "" })
      const made = data.project || data
      await FW.agents.loadSpaces()
      if (made && made.id) select(made.id)
      return made
    } catch (problem) {
      U.toast(problem.message || "Could not create the space", "bad")
      return null
    }
  }

  async function moveChat(chat) {
    const anchor = document.querySelector('.agent-card[data-id="' + chat.id + '"] .card-more') || document.querySelector('.chat-row[data-id="' + chat.id + '"]') || document.body
    const items = [{ value: "", label: "No space", checked: !chat.project_id }]
    ;(S.spaces || []).forEach(function (space) {
      items.push({ value: space.id, label: space.name, checked: chat.project_id === space.id })
    })
    items.push({ separator: true })
    items.push({ value: "__new", label: "New space…", icon: "plus" })
    U.menu(anchor, items, async function (value) {
      let target = value
      if (value === "__new") {
        const made = await create()
        if (!made) return
        target = made.id
      }
      try {
        await window.fw.chats.patch(chat.id, { project_id: target })
        U.toast(target ? "Moved to " + ((S.spaces || []).find(function (space) { return space.id === target }) || {}).name : "Removed from the space")
        FW.agents.loadSpaces()
        FW.app.refreshChats()
      } catch (problem) {
        U.toast(problem.message || "Could not move it", "bad")
      }
    })
  }

  function init() {
    S.space = S.prefs.space || ""
  }

  window.FW = window.FW || {}
  window.FW.spaces = { init: init, render: render, create: create, moveChat: moveChat, select: select, current: current }
})()
