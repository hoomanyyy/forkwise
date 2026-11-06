/* Sidebar views for files: the explorer tree, search across files and
   source control (git changes). */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  const listing = {}
  const expanded = {}
  let gitMarks = {}
  let gitFiles = []
  let gitRepoRoot = ""
  let selected = ""
  let searchState = { query: "", replace: "", include: "", regex: false, caseSensitive: false, showReplace: false, results: null, busy: false, error: "" }

  /* ------------------------------------------------------------ file icons */

  const COLORS = {
    js: "#e8c547", mjs: "#e8c547", cjs: "#e8c547", jsx: "#5fc3e4", ts: "#3f8fd2", tsx: "#3f8fd2",
    json: "#c7a33a", md: "#7aa0c4", py: "#4f86c6", rb: "#d1503f", go: "#42b4d6", rs: "#d48a5a",
    java: "#c96b3c", kt: "#a77bd8", swift: "#f0774c", c: "#6c8ebf", h: "#6c8ebf", cpp: "#6c8ebf", cs: "#68a063",
    php: "#8892bf", html: "#e26a3c", htm: "#e26a3c", css: "#4d8fd1", scss: "#cf6b9b", less: "#4d6fa8",
    vue: "#41b883", svelte: "#ff5d2e", sql: "#d6a33a", sh: "#7fb35d", bash: "#7fb35d", ps1: "#4c79b3",
    yml: "#c4687a", yaml: "#c4687a", toml: "#9c7a5a", xml: "#d08a3c", svg: "#e3a33c", png: "#a87bd0",
    jpg: "#a87bd0", jpeg: "#a87bd0", gif: "#a87bd0", webp: "#a87bd0", ico: "#a87bd0", lock: "#8a867e",
    env: "#8a867e", txt: "#8a867e", dart: "#3fb6d3", lua: "#4b6fc4", r: "#4c88c4", pdf: "#d9534f"
  }

  function fileIcon(name, isDir, open) {
    if (isDir) return icon(open ? "folder" : "folder", 14)
    const lower = String(name || "").toLowerCase()
    const ext = lower.indexOf(".") >= 0 ? lower.split(".").pop() : ""
    const color = COLORS[ext] || (lower === "dockerfile" ? "#3f8fd2" : lower === "makefile" ? "#7fb35d" : "")
    if (!color) return icon("file", 13)
    return '<span class="dot-ico" style="background:' + color + '"></span>'
  }

  /* ---------------------------------------------------------------- views */

  function show(view) {
    if (view === "explorer") drawExplorer()
    if (view === "search") drawSearch()
    if (view === "git") drawGit()
  }

  function root() {
    return FW.wb.root()
  }

  function viewHead(title, buttons) {
    const head = h("div", { class: "view-head" }, [h("span", { class: "grow", text: title, title: title })])
    ;(buttons || []).forEach(function (button) {
      if (button) head.appendChild(button)
    })
    return head
  }

  function viewButton(name, title, onclick, on) {
    return h("button", { class: "view-btn" + (on ? " on" : ""), type: "button", title: title, html: icon(name, 13), onclick: onclick })
  }

  async function noFolder(host, text) {
    const body = h("div", { class: "view-empty" }, [
      h("div", { text: text }),
      h("button", { class: "btn primary sm", text: "Open folder", onclick: function () { FW.wb.openFolder() } })
    ])
    host.appendChild(body)
    try {
      const folders = (await window.fw.wb.recent()).folders || []
      if (folders.length) {
        const recent = h("div", { class: "recent-list" }, [h("div", { class: "panel-section-title", text: "Recent" })])
        folders.slice(0, 8).forEach(function (folder) {
          recent.appendChild(h("button", { class: "recent-item", type: "button", title: folder, onclick: function () { FW.wb.setRoot(folder, { forChats: true, force: true }); drawExplorer() } }, [h("b", { text: FW.wb.baseName(folder) }), h("span", { text: folder })]))
        })
        body.appendChild(recent)
      }
    } catch (problem) {}
  }

  /* ------------------------------------------------------------- explorer */

  function drawExplorer() {
    const host = document.getElementById("viewExplorer")
    if (!host) return
    host.innerHTML = ""
    const current = root()
    host.appendChild(viewHead(current ? FW.wb.baseName(current) : "Explorer", current ? [
      viewButton("filePlus", "New file", function () { newItem(false) }),
      viewButton("folderPlus", "New folder", function () { newItem(true) }),
      viewButton("refresh", "Refresh", function () { refreshTree(true) }),
      viewButton("collapse", "Collapse all", collapseAll),
      viewButton("more", "More", function (event) { folderMenu(event.currentTarget) })
    ] : [viewButton("folder", "Open folder", function () { FW.wb.openFolder() })]))
    const body = h("div", { class: "view-body tree", tabindex: "0" })
    host.appendChild(body)
    if (!current) {
      noFolder(body, "No folder is open. Open one to browse, edit and search its files.")
      return
    }
    body.addEventListener("keydown", treeKeys)
    body.addEventListener("contextmenu", function (event) {
      if (event.target === body) {
        event.preventDefault()
        rowMenu({ path: "", dir: true, name: FW.wb.baseName(current) }, event)
      }
    })
    wireDrop(body, "")
    drawLevel(body, "", 0)
    loadGitMarks()
  }

  async function load(rel, force) {
    const current = root()
    if (!force && listing[current + "|" + rel]) return listing[current + "|" + rel]
    try {
      const data = await window.fw.wb.list(current, rel)
      listing[current + "|" + rel] = data.entries || []
    } catch (problem) {
      listing[current + "|" + rel] = []
      U.toast(problem.message || "Could not read that folder", "bad")
    }
    return listing[current + "|" + rel]
  }

  async function drawLevel(host, rel, depth) {
    const entries = await load(rel)
    const current = root()
    const frag = document.createDocumentFragment()
    entries.forEach(function (entry) {
      const open = !!expanded[current + "|" + entry.path]
      const mark = gitMarks[entry.path]
      const row = h("button", {
        class: "tree-row" + (entry.dir && open ? " open" : "") + (entry.heavy ? " heavy" : "") + (mark ? " git-" + mark.toLowerCase() : "") + (selected === entry.path ? " active" : ""),
        type: "button",
        title: entry.path,
        dataset: { path: entry.path, dir: entry.dir ? "1" : "" },
        draggable: "true"
      }, [
        h("span", { class: "twist", html: entry.dir ? icon("chevron", 10) : "" }),
        h("span", { class: "file-ico", html: fileIcon(entry.name, entry.dir, open) }),
        h("span", { class: "name", text: entry.name }),
        mark ? h("span", { class: "deco", text: mark }) : null
      ])
      row.style.paddingLeft = 8 + depth * 12 + "px"
      row.addEventListener("click", function () {
        selected = entry.path
        Array.prototype.forEach.call(document.querySelectorAll("#viewExplorer .tree-row.active"), function (node) {
          node.classList.remove("active")
        })
        row.classList.add("active")
        if (entry.dir) toggle(entry, row, depth)
        else FW.editor.open(entry.path, { preview: true })
      })
      row.addEventListener("dblclick", function () {
        if (!entry.dir) FW.editor.open(entry.path, { pin: true })
      })
      row.addEventListener("contextmenu", function (event) {
        event.preventDefault()
        event.stopPropagation()
        selected = entry.path
        rowMenu(entry, event)
      })
      row.addEventListener("dragstart", function (event) {
        event.dataTransfer.setData("text/fw-path", entry.path)
        event.dataTransfer.setData("text/plain", entry.path)
        event.dataTransfer.effectAllowed = "copyMove"
      })
      if (entry.dir) wireDrop(row, entry.path)
      frag.appendChild(row)
      if (entry.dir && open) {
        const child = h("div", { class: "tree-children", dataset: { parent: entry.path } })
        frag.appendChild(child)
        drawLevel(child, entry.path, depth + 1)
      }
    })
    host.innerHTML = ""
    if (!entries.length && depth > 0) {
      const empty = h("div", { class: "tree-row", text: "empty" })
      empty.style.paddingLeft = 8 + depth * 12 + 17 + "px"
      empty.style.color = "var(--text-3)"
      frag.appendChild(empty)
    }
    host.appendChild(frag)
  }

  // Dragging a file onto a folder moves it there.
  function wireDrop(target, folder) {
    target.addEventListener("dragover", function (event) {
      if (Array.prototype.indexOf.call(event.dataTransfer.types, "text/fw-path") < 0) return
      event.preventDefault()
      event.stopPropagation()
      target.classList.add("drop-target")
    })
    target.addEventListener("dragleave", function () {
      target.classList.remove("drop-target")
    })
    target.addEventListener("drop", async function (event) {
      const from = event.dataTransfer.getData("text/fw-path")
      target.classList.remove("drop-target")
      if (!from) return
      event.preventDefault()
      event.stopPropagation()
      const name = from.split("/").pop()
      const to = folder ? folder + "/" + name : name
      if (to === from || to.indexOf(from + "/") === 0) return
      try {
        await window.fw.wb.rename(root(), from, to)
        FW.editor.renamed(from, to)
        refreshTree(true)
      } catch (problem) {
        U.toast(problem.message || "Could not move it", "bad")
      }
    })
  }

  function toggle(entry, row, depth) {
    const keyName = root() + "|" + entry.path
    expanded[keyName] = !expanded[keyName]
    saveExpanded()
    row.classList.toggle("open", expanded[keyName])
    const next = row.nextElementSibling
    if (expanded[keyName]) {
      const child = h("div", { class: "tree-children", dataset: { parent: entry.path } })
      row.after(child)
      drawLevel(child, entry.path, depth + 1)
    } else if (next && next.classList.contains("tree-children")) {
      next.remove()
    }
  }

  function saveExpanded() {
    const current = root()
    const open = Object.keys(expanded).filter(function (keyName) {
      return expanded[keyName] && keyName.indexOf(current + "|") === 0
    }).map(function (keyName) {
      return keyName.slice(current.length + 1)
    })
    const all = Object.assign({}, S.prefs.treeOpen || {})
    all[current] = open.slice(0, 200)
    FW.store.savePrefs({ treeOpen: all })
  }

  function restoreExpanded() {
    const current = root()
    const saved = (S.prefs.treeOpen || {})[current] || []
    saved.forEach(function (rel) {
      expanded[current + "|" + rel] = true
    })
  }

  function collapseAll() {
    const current = root()
    Object.keys(expanded).forEach(function (keyName) {
      if (keyName.indexOf(current + "|") === 0) delete expanded[keyName]
    })
    saveExpanded()
    drawExplorer()
  }

  function refreshTree(force) {
    const current = root()
    if (force) {
      Object.keys(listing).forEach(function (keyName) {
        if (keyName.indexOf(current + "|") === 0) delete listing[keyName]
      })
    }
    if (S.sideView === "explorer") drawExplorer()
  }

  // The folder changed on disk: reload the folders that are showing.
  let changeTimer = null
  function changed(paths) {
    const current = root()
    ;(paths || []).forEach(function (rel) {
      const parent = rel.indexOf("/") >= 0 ? rel.slice(0, rel.lastIndexOf("/")) : ""
      delete listing[current + "|" + parent]
    })
    clearTimeout(changeTimer)
    changeTimer = setTimeout(function () {
      if (S.sideView === "explorer" && S.sidebarOpen) drawExplorer()
      if (S.sideView === "git" && S.sidebarOpen) drawGit()
    }, 300)
  }

  function treeKeys(event) {
    const row = document.activeElement && document.activeElement.closest ? document.activeElement.closest(".tree-row") : null
    if (!row || !row.dataset.path) return
    const rel = row.dataset.path
    if (event.key === "F2") {
      event.preventDefault()
      renameItem({ path: rel, dir: !!row.dataset.dir, name: rel.split("/").pop() })
    } else if (event.key === "Delete") {
      event.preventDefault()
      deleteItem({ path: rel, dir: !!row.dataset.dir, name: rel.split("/").pop() })
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const rows = Array.prototype.slice.call(document.querySelectorAll("#viewExplorer .tree-row[data-path]"))
      const index = rows.indexOf(row)
      const next = rows[index + (event.key === "ArrowDown" ? 1 : -1)]
      if (next) next.focus()
    }
  }

  function rowMenu(entry, event) {
    const items = []
    if (!entry.dir) {
      items.push({ value: "open", label: "Open", icon: "file" })
      items.push({ value: "diff", label: "Open changes", icon: "branch" })
      items.push({ value: "chat", label: "Add to chat", icon: "chat" })
      items.push({ value: "explain", label: "Ask the agent about it", icon: "spark" })
      items.push({ separator: true })
    }
    if (entry.dir) {
      items.push({ value: "newFile", label: "New file here", icon: "filePlus" })
      items.push({ value: "newFolder", label: "New folder here", icon: "folderPlus" })
      items.push({ value: "searchHere", label: "Find in folder", icon: "search" })
      items.push({ separator: true })
    }
    if (entry.path) {
      items.push({ value: "rename", label: "Rename", icon: "edit", key: "F2" })
      items.push({ value: "delete", label: "Delete", icon: "trash", danger: true, key: "Del" })
      items.push({ separator: true })
    }
    items.push({ value: "copyPath", label: "Copy path", icon: "copy" })
    items.push({ value: "copyRel", label: "Copy relative path", icon: "copy" })
    items.push({ value: "reveal", label: "Reveal in file manager", icon: "folder" })
    if (!entry.dir) items.push({ value: "outside", label: "Open with the system app", icon: "external" })
    const anchor = { getBoundingClientRect: function () { return { left: event.clientX, right: event.clientX, top: event.clientY, bottom: event.clientY, width: 0 } }, contains: function () { return false }, classList: { add: function () {}, remove: function () {} }, setAttribute: function () {} }
    U.menu(anchor, items, function (value) {
      const current = root()
      const full = current.replace(/[\\/]+$/, "") + "/" + entry.path
      if (value === "open") FW.editor.open(entry.path, { pin: true })
      if (value === "diff") FW.editor.openDiff(entry.path)
      if (value === "chat") FW.composer.insertMention(entry.path)
      if (value === "explain") FW.composer.fill("Explain what @" + entry.path + " does and how it fits into the project.")
      if (value === "newFile") newItem(false, entry.path)
      if (value === "newFolder") newItem(true, entry.path)
      if (value === "searchHere") {
        searchState.include = entry.path ? entry.path + "/*" : ""
        FW.wb.setView("search")
      }
      if (value === "rename") renameItem(entry)
      if (value === "delete") deleteItem(entry)
      if (value === "copyPath") U.copy(full)
      if (value === "copyRel") U.copy(entry.path || ".")
      if (value === "reveal") window.fw.wb.reveal(current, entry.path || ".")
      if (value === "outside") window.fw.wb.openOutside(current, entry.path)
    }, { className: "wide" })
  }

  async function newItem(isDir, inFolder) {
    const current = root()
    if (!current) {
      U.toast("Open a folder first")
      return FW.wb.openFolder()
    }
    let base = inFolder
    if (base === undefined) {
      // next to what is selected in the tree
      const pick = selected
      const entry = pick ? findEntry(pick) : null
      base = entry ? (entry.dir ? entry.path : pick.indexOf("/") >= 0 ? pick.slice(0, pick.lastIndexOf("/")) : "") : ""
    }
    const name = await U.dialog({ title: isDir ? "New folder" : "New file", text: base ? "In " + base + "/" : "In " + FW.wb.baseName(current) + "/", input: "", ok: "Create" })
    if (!name) return
    const rel = (base ? base + "/" : "") + name.replace(/^[\\/]+/, "")
    try {
      const made = await window.fw.wb.create(current, rel, isDir)
      if (base) expanded[current + "|" + base] = true
      refreshTree(true)
      if (!isDir) FW.editor.open(made.path, { pin: true })
    } catch (problem) {
      U.toast(problem.message || "Could not create it", "bad")
    }
  }

  function findEntry(rel) {
    const current = root()
    const parent = rel.indexOf("/") >= 0 ? rel.slice(0, rel.lastIndexOf("/")) : ""
    const entries = listing[current + "|" + parent] || []
    return entries.find(function (entry) {
      return entry.path === rel
    })
  }

  async function renameItem(entry) {
    const next = await U.dialog({ title: "Rename", input: entry.name, ok: "Rename" })
    if (!next || next === entry.name) return
    const parent = entry.path.indexOf("/") >= 0 ? entry.path.slice(0, entry.path.lastIndexOf("/") + 1) : ""
    try {
      const done = await window.fw.wb.rename(root(), entry.path, parent + next)
      FW.editor.renamed(entry.path, done.path)
      refreshTree(true)
    } catch (problem) {
      U.toast(problem.message || "Could not rename it", "bad")
    }
  }

  async function deleteItem(entry) {
    const sure = await U.dialog({ title: "Delete " + entry.name + "?", text: entry.dir ? "The folder and everything in it go to the Recycle Bin / Trash." : "The file goes to the Recycle Bin / Trash.", ok: "Delete", danger: true })
    if (!sure) return
    try {
      await window.fw.wb.remove(root(), entry.path)
      FW.editor.removed(entry.path)
      refreshTree(true)
    } catch (problem) {
      U.toast(problem.message || "Could not delete it", "bad")
    }
  }

  function folderMenu(anchor) {
    U.menu(anchor, [
      { value: "reveal", label: "Reveal in file manager", icon: "folder" },
      { value: "terminal", label: "Open a terminal here", icon: "terminal" },
      { value: "copy", label: "Copy folder path", icon: "copy" },
      { separator: true },
      { value: "open", label: "Open another folder…", icon: "folder" },
      { value: "close", label: "Close folder", icon: "close" }
    ], function (value) {
      const current = root()
      if (value === "reveal") window.fw.wb.reveal(current, ".")
      if (value === "terminal") FW.wb.run("view.terminal")
      if (value === "copy") U.copy(current)
      if (value === "open") FW.wb.openFolder()
      if (value === "close") {
        FW.wb.setRoot("")
        drawExplorer()
      }
    }, { alignRight: true })
  }

  async function loadGitMarks() {
    const current = root()
    if (!current) return
    try {
      const data = await window.fw.git.status(current)
      gitRepoRoot = data.root || ""
      gitFiles = data.files || []
      const marks = {}
      const prefix = relPrefix(current, gitRepoRoot)
      gitFiles.forEach(function (file) {
        let rel = file.path
        if (prefix) {
          if (rel.indexOf(prefix) !== 0) return
          rel = rel.slice(prefix.length)
        }
        const code = file.code === "??" ? "U" : file.code.charAt(0)
        marks[rel] = code
        // folders above a changed file get a soft mark too
        let parent = rel
        while (parent.indexOf("/") >= 0) {
          parent = parent.slice(0, parent.lastIndexOf("/"))
          if (!marks[parent]) marks[parent] = "•"
        }
      })
      const changedMarks = JSON.stringify(marks) !== JSON.stringify(gitMarks)
      gitMarks = marks
      if (changedMarks && S.sideView === "explorer") {
        Array.prototype.forEach.call(document.querySelectorAll("#viewExplorer .tree-row[data-path]"), function (row) {
          const mark = gitMarks[row.dataset.path]
          row.classList.remove("git-m", "git-a", "git-u", "git-d")
          let deco = row.querySelector(".deco")
          if (mark) {
            if (mark !== "•") row.classList.add("git-" + mark.toLowerCase())
            if (!deco) {
              deco = h("span", { class: "deco" })
              row.appendChild(deco)
            }
            deco.textContent = mark
          } else if (deco) deco.remove()
        })
      }
    } catch (problem) {}
  }

  // How the open folder sits inside its git repository ("" when it is the top).
  function relPrefix(folder, repo) {
    if (!repo) return ""
    const a = String(folder).replace(/\\/g, "/").replace(/\/+$/, "")
    const b = String(repo).replace(/\\/g, "/").replace(/\/+$/, "")
    if (a.toLowerCase() === b.toLowerCase()) return ""
    return a.slice(b.length + 1) + "/"
  }

  /* --------------------------------------------------------------- search */

  function drawSearch() {
    const host = document.getElementById("viewSearch")
    if (!host) return
    host.innerHTML = ""
    host.appendChild(viewHead("Search", [
      viewButton("refresh", "Search again", runSearch),
      viewButton("close", "Clear", function () { searchState.query = ""; searchState.results = null; drawSearch() })
    ]))
    if (!root()) {
      noFolder(host, "Open a folder to search inside its files.")
      return
    }
    const query = h("input", { type: "text", placeholder: "Search", value: searchState.query, spellcheck: "false" })
    const caseBtn = viewButton("caseSense", "Match case", function () { searchState.caseSensitive = !searchState.caseSensitive; drawSearch(); runSearch() }, searchState.caseSensitive)
    const regexBtn = viewButton("regex", "Use regular expression", function () { searchState.regex = !searchState.regex; drawSearch(); runSearch() }, searchState.regex)
    const replaceToggle = viewButton("replace", "Replace", function () { searchState.showReplace = !searchState.showReplace; drawSearch() }, searchState.showReplace)
    const form = h("div", { class: "search-form" }, [h("div", { class: "search-line" }, [query, caseBtn, regexBtn, replaceToggle])])
    if (searchState.showReplace) {
      const replace = h("input", { type: "text", placeholder: "Replace", value: searchState.replace, spellcheck: "false" })
      replace.addEventListener("input", function () {
        searchState.replace = replace.value
      })
      form.appendChild(h("div", { class: "search-line" }, [replace, viewButton("check", "Replace all", replaceAll)]))
    }
    const include = h("input", { type: "text", placeholder: "Files to include, e.g. *.js, src/*", value: searchState.include, spellcheck: "false" })
    form.appendChild(h("div", { class: "search-line" }, [include]))
    host.appendChild(form)
    const body = h("div", { class: "view-body" })
    host.appendChild(body)
    let timer = null
    query.addEventListener("input", function () {
      searchState.query = query.value
      clearTimeout(timer)
      timer = setTimeout(runSearch, 320)
    })
    query.addEventListener("keydown", function (event) {
      if (event.key === "Enter") runSearch()
    })
    include.addEventListener("input", function () {
      searchState.include = include.value
      clearTimeout(timer)
      timer = setTimeout(runSearch, 450)
    })
    drawResults(body)
    setTimeout(function () {
      query.focus()
      query.select()
    }, 20)
  }

  let searchToken = 0
  async function runSearch() {
    const mine = ++searchToken
    if (!searchState.query.trim()) {
      searchState.results = null
      redrawResults()
      return
    }
    searchState.busy = true
    searchState.error = ""
    redrawResults()
    try {
      const data = await window.fw.wb.search(root(), { query: searchState.query, regex: searchState.regex, caseSensitive: searchState.caseSensitive, include: searchState.include })
      if (mine !== searchToken) return
      searchState.results = data
    } catch (problem) {
      searchState.results = null
      searchState.error = problem.message || "Search failed"
    }
    searchState.busy = false
    redrawResults()
  }

  function redrawResults() {
    const body = document.querySelector("#viewSearch .view-body")
    if (body) drawResults(body)
  }

  function highlight(text, query) {
    const node = h("span")
    if (!query) {
      node.textContent = text
      return node
    }
    let pattern = null
    try {
      pattern = new RegExp(searchState.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), searchState.caseSensitive ? "g" : "gi")
    } catch (problem) {
      node.textContent = text
      return node
    }
    let last = 0
    let found = pattern.exec(text)
    let guard = 0
    while (found && guard < 50) {
      guard += 1
      node.appendChild(document.createTextNode(text.slice(last, found.index)))
      node.appendChild(h("mark", { text: found[0] }))
      last = found.index + found[0].length
      if (!found[0].length) pattern.lastIndex += 1
      found = pattern.exec(text)
    }
    node.appendChild(document.createTextNode(text.slice(last)))
    return node
  }

  function drawResults(body) {
    body.innerHTML = ""
    if (searchState.busy) {
      body.appendChild(h("div", { class: "view-empty", text: "Searching…" }))
      return
    }
    if (searchState.error) {
      body.appendChild(h("div", { class: "view-empty", text: searchState.error }))
      return
    }
    const data = searchState.results
    if (!data) return
    if (!data.results.length) {
      body.appendChild(h("div", { class: "view-empty", text: "No results." }))
      return
    }
    body.appendChild(h("div", { class: "search-sum", style: "padding:0 12px 6px", text: data.count + " results in " + data.results.length + " files" + (data.cut ? " (stopped at 3000)" : "") }))
    data.results.forEach(function (file) {
      const name = file.path.split("/").pop()
      const folder = file.path.slice(0, file.path.length - name.length).replace(/\/$/, "")
      const lines = h("div")
      const head = h("button", { class: "hit-file", type: "button", title: file.path }, [h("span", { class: "file-ico", html: fileIcon(name) }), h("span", { text: name }), h("span", { class: "dim", text: folder }), h("span", { class: "n", text: String(file.hits.length) })])
      head.addEventListener("click", function () {
        lines.hidden = !lines.hidden
      })
      file.hits.forEach(function (hit) {
        const line = h("button", { class: "hit-line", type: "button", title: hit.text.trim() }, [h("span", { class: "ln", text: String(hit.line) }), highlight(hit.text.trim().slice(0, 200), searchState.query)])
        line.addEventListener("click", function () {
          FW.editor.open(file.path, { line: hit.line, col: hit.col, length: hit.length, pin: true })
        })
        lines.appendChild(line)
      })
      body.appendChild(head)
      body.appendChild(lines)
    })
  }

  async function replaceAll() {
    const data = searchState.results
    if (!data || !data.count) return U.toast("Search first, then replace")
    const sure = await U.dialog({ title: "Replace " + data.count + " matches?", text: "In " + data.results.length + " files, “" + searchState.query + "” becomes “" + searchState.replace + "”.", ok: "Replace all", danger: true })
    if (!sure) return
    try {
      const done = await window.fw.wb.replace(root(), { query: searchState.query, replace: searchState.replace, regex: searchState.regex, caseSensitive: searchState.caseSensitive, include: searchState.include })
      U.toast("Changed " + done.files + " files")
      runSearch()
    } catch (problem) {
      U.toast(problem.message || "Replace failed", "bad")
    }
  }

  /* ------------------------------------------------------- source control */

  async function drawGit() {
    const host = document.getElementById("viewGit")
    if (!host) return
    host.innerHTML = ""
    host.appendChild(viewHead("Source control", [viewButton("refresh", "Refresh", drawGit)]))
    const current = root()
    if (!current) {
      noFolder(host, "Open a folder that uses git to see its changes here.")
      return
    }
    const body = h("div", { class: "view-body" })
    host.appendChild(body)
    body.appendChild(h("div", { class: "view-empty", text: "Loading…" }))
    let data = null
    try {
      data = await window.fw.git.status(current)
    } catch (problem) {
      body.innerHTML = ""
      body.appendChild(h("div", { class: "view-empty", text: problem.message || "git is not available" }))
      return
    }
    body.innerHTML = ""
    if (!data.repo) {
      body.appendChild(h("div", { class: "view-empty", text: "This folder is not a git repository." }))
      body.appendChild(h("div", { class: "git-actions" }, [h("button", { class: "btn sm", text: "Ask the agent to set up git", onclick: function () { FW.composer.fill("Initialise a git repository in this folder with a sensible .gitignore and make a first commit.") } })]))
      return
    }
    gitRepoRoot = data.root
    const prefix = relPrefix(current, data.root)
    body.appendChild(h("div", { class: "git-branch" }, [h("span", { html: icon("branch", 12) }), h("span", { text: data.branch || "detached" }), h("span", { style: "margin-left:auto;color:var(--text-3)", text: data.files.length + " changed" })]))
    if (!data.files.length) {
      body.appendChild(h("div", { class: "view-empty", text: "No changes. Everything is committed." }))
      return
    }
    data.files.forEach(function (file) {
      let rel = file.path
      const outside = prefix && rel.indexOf(prefix) !== 0
      if (prefix && !outside) rel = rel.slice(prefix.length)
      const code = file.code === "??" ? "U" : file.code.charAt(0)
      const name = rel.split("/").pop()
      const folder = rel.slice(0, rel.length - name.length).replace(/\/$/, "")
      const row = h("div", { class: "git-row", title: rel }, [
        h("span", { class: "file-ico", html: fileIcon(name) }),
        h("span", { class: "name", text: name }),
        h("span", { class: "dim", text: folder }),
        h("span", { class: "row-tools" }, [
          viewButton("file", "Open file", function (event) { event.stopPropagation(); FW.editor.open(rel, { pin: true }) }),
          viewButton("refresh", "Discard changes", function (event) { event.stopPropagation(); discard(rel) })
        ]),
        h("span", { class: "code " + code, text: code })
      ])
      if (!outside) {
        row.addEventListener("click", function () {
          if (code === "D") U.toast("This file was deleted")
          else FW.editor.openDiff(rel)
        })
      }
      body.appendChild(row)
    })
    body.appendChild(h("div", { class: "git-actions" }, [
      h("button", { class: "btn sm", text: "Ask the agent to commit", onclick: function () { FW.wb.run("agent.commit") } }),
      h("button", { class: "btn ghost sm", text: "Review with the agent", onclick: function () { FW.composer.fill("Review the uncommitted changes in this folder. Point out bugs, risks and anything unfinished.") } })
    ]))
  }

  async function discard(rel) {
    const sure = await U.dialog({ title: "Discard changes to " + rel.split("/").pop() + "?", text: "The file goes back to the last commit. A new file is moved to the Recycle Bin / Trash.", ok: "Discard", danger: true })
    if (!sure) return
    try {
      await window.fw.wb.revert(root(), rel)
      U.toast("Discarded")
      FW.editor.changed([rel])
      drawGit()
      FW.wb.refreshBranch()
    } catch (problem) {
      U.toast(problem.message || "Could not discard", "bad")
    }
  }

  function init() {
    FW.store.on("root", function () {
      restoreExpanded()
      gitMarks = {}
      selected = ""
      if (S.sideView && S.sideView !== "chats") show(S.sideView)
    })
    restoreExpanded()
  }

  window.FW = window.FW || {}
  window.FW.explorer = {
    init: init,
    show: show,
    fileIcon: fileIcon,
    newItem: newItem,
    changed: changed,
    refresh: refreshTree,
    discard: discard,
    reveal: function (rel) {
      selected = rel
      const current = root()
      let parent = rel
      while (parent.indexOf("/") >= 0) {
        parent = parent.slice(0, parent.lastIndexOf("/"))
        expanded[current + "|" + parent] = true
      }
      if (S.sideView === "explorer") drawExplorer()
    }
  }
})()
