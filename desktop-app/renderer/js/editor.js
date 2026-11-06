/* The code editor: tabs of files from the open folder, edited with Monaco
   (the editor inside VS Code), a diff view for changes and Ctrl+K to ask the
   agent to change the selected code. */
(function () {
  const U = window.FW.util
  const S = window.FW.store.state
  const h = U.h
  const icon = U.icon

  let monaco = null
  let loading = null
  let editor = null
  let diffEditor = null
  let host = null
  let diffHost = null
  let noteHost = null
  const tabs = []
  let active = null
  let saveTimer = null

  /* ------------------------------------------------------------ loading */

  function loadMonaco() {
    if (monaco) return Promise.resolve(monaco)
    if (loading) return loading
    loading = new Promise(function (resolve, reject) {
      const base = new URL("../node_modules/monaco-editor/min/vs", location.href).href
      window.MonacoEnvironment = {
        getWorkerUrl: function () {
          return base + "/base/worker/workerMain.js"
        }
      }
      const script = document.createElement("script")
      script.src = base + "/loader.js"
      script.onload = function () {
        window.require.config({ paths: { vs: base } })
        window.require(["vs/editor/editor.main"], function () {
          monaco = window.monaco
          defineThemes()
          configureLanguages()
          resolve(monaco)
          setTimeout(loadProject, 300)
        }, function (problem) {
          loading = null
          reject(problem)
        })
      }
      script.onerror = function () {
        loading = null
        reject(new Error("The code editor could not load"))
      }
      document.head.appendChild(script)
    })
    return loading
  }

  function defineThemes() {
    monaco.editor.defineTheme("fw-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [{ token: "comment", foreground: "7d7a73", fontStyle: "italic" }],
      colors: {
        "editor.background": "#151413",
        "editor.lineHighlightBackground": "#ffffff09",
        "editorLineNumber.foreground": "#5c5953",
        "editorLineNumber.activeForeground": "#a8a49d",
        "editorGutter.background": "#151413",
        "editorIndentGuide.background1": "#ffffff10",
        "editor.selectionBackground": "#4a6fa555",
        "editorWidget.background": "#1e1d1b",
        "editorWidget.border": "#ffffff22",
        "minimap.background": "#151413",
        "scrollbarSlider.background": "#ffffff1c",
        "diffEditor.insertedTextBackground": "#4ade8022",
        "diffEditor.removedTextBackground": "#ff7a9022"
      }
    })
    monaco.editor.defineTheme("fw-light", {
      base: "vs",
      inherit: true,
      rules: [{ token: "comment", foreground: "8a867e", fontStyle: "italic" }],
      colors: {
        "editor.background": "#f7f7f7",
        "editor.lineHighlightBackground": "#21201e08",
        "editorLineNumber.foreground": "#b0ada6",
        "editorLineNumber.activeForeground": "#6c6962",
        "editorGutter.background": "#f7f7f7",
        "minimap.background": "#f7f7f7",
        "editorWidget.background": "#ffffff"
      }
    })
  }

  function themeName() {
    return document.documentElement.dataset.theme === "light" ? "fw-light" : "fw-dark"
  }

  function applyTheme() {
    if (monaco) monaco.editor.setTheme(themeName())
  }

  function options() {
    const prefs = S.prefs || {}
    return {
      fontFamily: "JetBrains Mono, ui-monospace, Menlo, Consolas, monospace",
      fontSize: prefs.editorFontSize || 13,
      lineHeight: Math.round((prefs.editorFontSize || 13) * 1.6),
      tabSize: prefs.tabSize || 2,
      insertSpaces: prefs.insertSpaces !== false,
      wordWrap: prefs.wordWrap ? "on" : "off",
      minimap: { enabled: prefs.minimap !== false, scale: 1, renderCharacters: false },
      lineNumbers: prefs.lineNumbers === false ? "off" : "on",
      renderWhitespace: "selection",
      smoothScrolling: true,
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "smooth",
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: "active", indentation: true },
      stickyScroll: { enabled: prefs.stickyScroll !== false },
      scrollBeyondLastLine: false,
      padding: { top: 8, bottom: 8 },
      automaticLayout: true,
      fixedOverflowWidgets: true,
      mouseWheelZoom: true,
      formatOnPaste: false,
      theme: themeName()
    }
  }

  function applyOptions() {
    if (editor) editor.updateOptions(options())
    if (diffEditor) diffEditor.updateOptions(Object.assign({}, options(), { minimap: { enabled: false }, renderSideBySide: S.prefs.diffInline !== true }))
    tabs.forEach(function (tab) {
      if (tab.model) tab.model.updateOptions({ tabSize: options().tabSize, insertSpaces: options().insertSpaces })
    })
  }

  function ensureEditor() {
    if (editor) return
    host = h("div", { class: "editor-host" })
    diffHost = h("div", { class: "editor-host", hidden: true })
    noteHost = h("div", { class: "editor-host", hidden: true })
    const body = document.getElementById("editorBody")
    body.appendChild(host)
    body.appendChild(diffHost)
    body.appendChild(noteHost)
    editor = monaco.editor.create(host, Object.assign({ model: null }, options()))
    editor.onDidChangeCursorSelection(cursorStatus)
    editor.onDidFocusEditorText(cursorStatus)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
      save()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, function () {
      inlineAsk()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, function () {
      selectionToChat()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, function () {
      FW.wb.palette("")
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, function () {
      FW.wb.palette(">")
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, function () {
      closeActive()
    })
    editor.addAction({
      id: "fw.ask",
      label: "Edit with the agent",
      keybindings: [],
      contextMenuGroupId: "1_forkwise",
      contextMenuOrder: 1,
      run: function () {
        inlineAsk()
      }
    })
    editor.addAction({
      id: "fw.chat",
      label: "Add to chat",
      contextMenuGroupId: "1_forkwise",
      contextMenuOrder: 2,
      run: function () {
        selectionToChat()
      }
    })
    editor.addAction({
      id: "fw.explain",
      label: "Explain this code",
      contextMenuGroupId: "1_forkwise",
      contextMenuOrder: 3,
      run: function () {
        explainSelection()
      }
    })
  }

  function ensureDiff() {
    if (diffEditor) return
    diffEditor = monaco.editor.createDiffEditor(diffHost, Object.assign({}, options(), { renderSideBySide: S.prefs.diffInline !== true, useInlineViewWhenSpaceIsLimited: true, renderSideBySideInlineBreakpoint: 760, originalEditable: false, enableSplitViewResizing: true, renderOverviewRuler: true, renderMarginRevertIcon: false, renderGutterMenu: false, minimap: { enabled: false } }))
    diffEditor.getModifiedEditor().addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
      save()
    })
  }

  /* ------------------------------------------------ project intelligence */

  // JS and TS files of the open folder are loaded into the editor's language
  // service, so go to definition, find references, rename and type errors
  // work across the whole project, not just the open file.
  const projectModels = new Set()
  let projectRoot = ""
  let projectLoading = false
  const CODE = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/i
  const IGNORED_CODES = [2307, 2792, 7016, 2580, 2591, 2593, 2582, 2503, 2875, 1259, 2686]

  function configureLanguages() {
    const ts = monaco.languages.typescript
    const options = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,
      checkJs: false,
      jsx: 4,
      allowNonTsExtensions: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      noEmit: true,
      strict: false
    }
    ts.typescriptDefaults.setCompilerOptions(options)
    ts.javascriptDefaults.setCompilerOptions(options)
    ts.typescriptDefaults.setEagerModelSync(true)
    ts.javascriptDefaults.setEagerModelSync(true)
    ts.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false, diagnosticCodesToIgnore: IGNORED_CODES })
    ts.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false, diagnosticCodesToIgnore: IGNORED_CODES })
    // Ctrl+click and F12 open the target file in a tab here
    monaco.editor.registerEditorOpener({
      openCodeEditor: function (source, resource, selection) {
        const root = FW.wb.root()
        const full = resource.path.replace(/^\/([a-zA-Z]:)/, "$1")
        const rel = FW.wb.toRel(full)
        if (!root || !rel) return false
        let line = 1
        let col = 1
        if (selection && selection.startLineNumber) {
          line = selection.startLineNumber
          col = selection.startColumn
        } else if (selection && selection.lineNumber) {
          line = selection.lineNumber
          col = selection.column
        }
        open(rel, { pin: true, line: line, col: col })
        return true
      }
    })
    monaco.editor.onDidChangeMarkers(function () {
      clearTimeout(markerTimer)
      markerTimer = setTimeout(function () {
        FW.store.emit("problems", problems())
        FW.wb.status()
      }, 300)
    })
  }

  let markerTimer = null

  async function loadProject() {
    const root = FW.wb.root()
    if (!monaco || !root || projectLoading || projectRoot === root) return
    projectLoading = true
    projectRoot = root
    // models of the last folder go away, unless a tab still uses them
    projectModels.forEach(function (model) {
      const used = tabs.some(function (tab) {
        return tab.model === model
      })
      if (!used) model.dispose()
    })
    projectModels.clear()
    try {
      const files = (await FW.wb.allFiles(true)).filter(function (file) {
        return CODE.test(file) && file.indexOf(".min.") < 0
      }).slice(0, 700)
      let total = 0
      for (let index = 0; index < files.length; index += 16) {
        if (projectRoot !== root) return
        const batch = files.slice(index, index + 16)
        const read = await Promise.all(batch.map(function (file) {
          return window.fw.wb.read(root, file).then(function (data) {
            return { file: file, data: data }
          }).catch(function () {
            return null
          })
        }))
        read.forEach(function (item) {
          if (!item || item.data.kind !== "text" || item.data.text.length > 400000) return
          total += item.data.text.length
          if (total > 14000000) return
          const uri = monaco.Uri.file(String(root).replace(/[\\/]+$/, "") + "/" + item.file)
          let model = monaco.editor.getModel(uri)
          if (!model) model = monaco.editor.createModel(item.data.text, undefined, uri)
          projectModels.add(model)
        })
      }
      S.intelFiles = projectModels.size
      FW.wb.status()
      refreshDiagnostics()
    } finally {
      projectLoading = false
    }
  }

  // The language service checks files when they change; this asks it to
  // check everything that is loaded now.
  let diagTimer = null
  function refreshDiagnostics() {
    if (!monaco) return
    clearTimeout(diagTimer)
    diagTimer = setTimeout(function () {
      const ts = monaco.languages.typescript
      ts.typescriptDefaults.setDiagnosticsOptions(ts.typescriptDefaults.getDiagnosticsOptions())
      ts.javascriptDefaults.setDiagnosticsOptions(ts.javascriptDefaults.getDiagnosticsOptions())
    }, 900)
  }

  async function reloadProjectModel(tab) {
    try {
      const data = await window.fw.wb.read(tab.root, tab.path)
      if (data.kind === "text" && tab.model && !tab.model.isDisposed()) tab.model.setValue(data.text)
    } catch (problem) {}
  }

  function problems() {
    if (!monaco) return []
    const root = FW.wb.root()
    const list = []
    monaco.editor.getModelMarkers({}).forEach(function (marker) {
      if (marker.severity < 4) return
      const full = marker.resource.path.replace(/^\/([a-zA-Z]:)/, "$1")
      const rel = root ? FW.wb.toRel(full) : ""
      if (!rel) return
      list.push({ path: rel, line: marker.startLineNumber, col: marker.startColumn, message: marker.message, severity: marker.severity === 8 ? "error" : "warning", code: marker.code && marker.code.value ? marker.code.value : marker.code, source: marker.source || "" })
    })
    list.sort(function (a, b) {
      if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1
      return a.path.localeCompare(b.path) || a.line - b.line
    })
    return list
  }

  /* --------------------------------------------------------------- tabs */

  function keyOf(root, rel, kind) {
    return root + "|" + rel + (kind === "diff" ? "|diff" : "")
  }

  function fullPath(tab) {
    return String(tab.root).replace(/[\\/]+$/, "") + "/" + tab.path
  }

  function count() {
    return tabs.length
  }

  async function open(rel, opts) {
    const settings = opts || {}
    const root = settings.root || FW.wb.root()
    if (!root || !rel) return
    const id = keyOf(root, rel, "file")
    let tab = tabs.find(function (item) {
      return item.id === id
    })
    if (!tab) {
      try {
        await loadMonaco()
      } catch (problem) {
        U.toast(problem.message || "The editor could not load", "bad")
        return
      }
      ensureEditor()
      let data = null
      try {
        data = await window.fw.wb.read(root, rel)
      } catch (problem) {
        U.toast(problem.message || "Could not open " + rel, "bad")
        return
      }
      // a quick look (single click) reuses the last quick-look tab
      if (settings.preview && !settings.pin) {
        const old = tabs.find(function (item) {
          return item.preview && !item.dirty
        })
        if (old) dispose(old)
      }
      tab = { id: id, root: root, path: rel, kind: data.kind, preview: !!settings.preview && !settings.pin, dirty: false, mtime: data.mtime || 0, size: data.size || 0 }
      if (data.kind === "text") {
        const uri = monaco.Uri.file(fullPath(tab))
        const existing = monaco.editor.getModel(uri)
        if (existing && projectModels.has(existing)) {
          // the file was loaded for code intelligence; edit that same model
          if (existing.getValue() !== data.text) existing.setValue(data.text)
          tab.model = existing
        } else {
          if (existing) existing.dispose()
          tab.model = monaco.editor.createModel(data.text, undefined, uri)
        }
        tab.model.updateOptions({ tabSize: options().tabSize, insertSpaces: options().insertSpaces })
        tab.saved = tab.model.getAlternativeVersionId()
        tab.eol = data.eol
        tab.model.onDidChangeContent(function () {
          markDirty(tab)
        })
      } else if (data.kind === "image") {
        tab.url = data.url
      }
      const index = active ? tabs.indexOf(active) + 1 : tabs.length
      tabs.splice(index, 0, tab)
    } else if (settings.pin && tab.preview) {
      tab.preview = false
    }
    activate(tab)
    if (settings.line) reveal(settings.line, settings.col || 1, settings.length || 0)
    FW.explorer.reveal(rel)
    if (CODE.test(rel)) refreshDiagnostics()
    return tab
  }

  async function openDiff(rel, opts) {
    const settings = opts || {}
    const root = settings.root || FW.wb.root()
    if (!root || !rel) return
    try {
      await loadMonaco()
    } catch (problem) {
      U.toast(problem.message || "The editor could not load", "bad")
      return
    }
    ensureEditor()
    ensureDiff()
    const id = keyOf(root, rel, "diff")
    let tab = tabs.find(function (item) {
      return item.id === id
    })
    if (tab) {
      await refreshDiff(tab)
      activate(tab)
      return tab
    }
    tab = { id: id, root: root, path: rel, kind: "diff", dirty: false }
    const index = active ? tabs.indexOf(active) + 1 : tabs.length
    tabs.splice(index, 0, tab)
    const ok = await refreshDiff(tab)
    if (!ok) {
      tabs.splice(tabs.indexOf(tab), 1)
      return
    }
    activate(tab)
    return tab
  }

  async function refreshDiff(tab) {
    let before = null
    let now = null
    try {
      before = await window.fw.wb.original(tab.root, tab.path)
      now = await window.fw.wb.read(tab.root, tab.path).catch(function () {
        return { kind: "text", text: "" }
      })
    } catch (problem) {
      U.toast(problem.message || "Could not compare the file", "bad")
      return false
    }
    if (!before.ok) {
      U.toast("This folder is not a git repository, so there is nothing to compare with")
      return false
    }
    if (now.kind !== "text") {
      U.toast("Only text files can be compared")
      return false
    }
    const language = languageFor(tab.path)
    if (!tab.original) {
      tab.original = monaco.editor.createModel(before.text, language)
      tab.model = monaco.editor.createModel(now.text, language)
      tab.saved = tab.model.getAlternativeVersionId()
      tab.model.onDidChangeContent(function () {
        markDirty(tab)
      })
    } else {
      tab.original.setValue(before.text)
      if (!tab.dirty) {
        tab.model.setValue(now.text)
        tab.saved = tab.model.getAlternativeVersionId()
      }
    }
    tab.isNew = !!before.isNew
    return true
  }

  function languageFor(rel) {
    const ext = "." + String(rel).split(".").pop().toLowerCase()
    const found = monaco.languages.getLanguages().find(function (lang) {
      return (lang.extensions || []).indexOf(ext) >= 0
    })
    return found ? found.id : "plaintext"
  }

  function activate(tab) {
    if (active && active !== tab) saveViewState(active)
    active = tab
    hideInlineAsk()
    host.hidden = true
    diffHost.hidden = true
    noteHost.hidden = true
    noteHost.innerHTML = ""
    removeBar()
    if (tab.kind === "text") {
      host.hidden = false
      editor.setModel(tab.model)
      if (tab.view) editor.restoreViewState(tab.view)
      editor.focus()
      if (tab.conflict) conflictBar(tab)
    } else if (tab.kind === "diff") {
      diffHost.hidden = false
      diffEditor.setModel({ original: tab.original, modified: tab.model })
      diffBar(tab)
      setTimeout(function () {
        diffEditor.getModifiedEditor().focus()
      }, 30)
    } else if (tab.kind === "image") {
      noteHost.hidden = false
      noteHost.appendChild(h("div", { class: "image-view" }, [h("img", { src: tab.url, alt: tab.path })]))
    } else {
      noteHost.hidden = false
      const text = tab.kind === "binary" ? "This is a binary file, so it is not shown here." : "This file is too big to open here (" + window.FWLabels.bytes(tab.size) + ")."
      noteHost.appendChild(h("div", { class: "editor-note" }, [h("div", {}, [h("div", { text: text }), h("button", { class: "btn sm", text: "Open with the system app", onclick: function () { window.fw.wb.openOutside(tab.root, tab.path) } })])]))
    }
    drawTabs()
    crumbs()
    cursorStatus()
    FW.wb.updateSplit()
  }

  function saveViewState(tab) {
    if (tab.kind === "text" && editor && editor.getModel() === tab.model) tab.view = editor.saveViewState()
  }

  function markDirty(tab) {
    const dirty = tab.model.getAlternativeVersionId() !== tab.saved
    if (dirty !== tab.dirty) {
      tab.dirty = dirty
      if (dirty) tab.preview = false
      drawTabs()
    }
    if (dirty && tab.kind === "text" && S.prefs.autoSave === "delay") {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(function () {
        saveTab(tab)
      }, 1000)
    }
  }

  function drawTabs() {
    const strip = document.getElementById("editorTabs")
    strip.innerHTML = ""
    tabs.forEach(function (tab) {
      const name = tab.path.split("/").pop() + (tab.kind === "diff" ? " (changes)" : "")
      const close = h("span", { class: "x", title: "Close (" + U.key("Mod+W") + ")" }, [h("span", { class: "dirty-dot" }), h("span", { html: icon("close", 11) })])
      const node = h("div", { class: "etab" + (tab === active ? " on" : "") + (tab.dirty ? " dirty" : "") + (tab.preview ? " preview" : ""), title: fullPath(tab), draggable: "true" }, [
        h("span", { class: "file-ico", html: tab.kind === "diff" ? icon("branch", 12) : FW.explorer.fileIcon(name) }),
        h("span", { class: "name", text: name }),
        close
      ])
      node.addEventListener("mousedown", function (event) {
        if (event.button === 1) {
          event.preventDefault()
          closeTab(tab)
        }
      })
      node.addEventListener("click", function (event) {
        if (close.contains(event.target)) {
          closeTab(tab)
          return
        }
        activate(tab)
      })
      node.addEventListener("dblclick", function () {
        tab.preview = false
        drawTabs()
      })
      node.addEventListener("contextmenu", function (event) {
        event.preventDefault()
        tabMenu(tab, node)
      })
      node.addEventListener("dragstart", function (event) {
        event.dataTransfer.setData("text/fw-tab", tab.id)
        node.classList.add("dragging")
      })
      node.addEventListener("dragend", function () {
        node.classList.remove("dragging")
      })
      node.addEventListener("dragover", function (event) {
        if (Array.prototype.indexOf.call(event.dataTransfer.types, "text/fw-tab") >= 0) event.preventDefault()
      })
      node.addEventListener("drop", function (event) {
        const id = event.dataTransfer.getData("text/fw-tab")
        const moving = tabs.find(function (item) {
          return item.id === id
        })
        if (!moving || moving === tab) return
        event.preventDefault()
        tabs.splice(tabs.indexOf(moving), 1)
        tabs.splice(tabs.indexOf(tab), 0, moving)
        drawTabs()
      })
      strip.appendChild(node)
    })
    const tools = h("div", { class: "etab-tools" }, [
      h("button", { class: "view-btn", title: "Show or hide the chat (" + FW.wb.key("view.chatToggle") + ")", html: icon("chat", 13), onclick: function () { FW.wb.toggleChat() } }),
      h("button", { class: "view-btn", title: "More", html: icon("more", 13), onclick: function (event) { moreMenu(event.currentTarget) } })
    ])
    strip.appendChild(tools)
    const on = strip.querySelector(".etab.on")
    if (on) on.scrollIntoView({ block: "nearest", inline: "nearest" })
  }

  function tabMenu(tab, node) {
    U.menu(node, [
      { value: "close", label: "Close", key: U.key("Mod+W") },
      { value: "others", label: "Close others" },
      { value: "right", label: "Close to the right" },
      { value: "saved", label: "Close saved" },
      { value: "all", label: "Close all" },
      { separator: true },
      { value: "copy", label: "Copy path" },
      { value: "copyRel", label: "Copy relative path" },
      { value: "reveal", label: "Reveal in file manager" },
      { value: "chat", label: "Add to chat" },
      { value: "diff", label: "Open changes" }
    ], function (value) {
      if (value === "close") closeTab(tab)
      if (value === "others") closeMany(tabs.filter(function (item) { return item !== tab }))
      if (value === "right") closeMany(tabs.slice(tabs.indexOf(tab) + 1))
      if (value === "saved") closeMany(tabs.filter(function (item) { return !item.dirty }))
      if (value === "all") closeAll()
      if (value === "copy") U.copy(fullPath(tab))
      if (value === "copyRel") U.copy(tab.path)
      if (value === "reveal") window.fw.wb.reveal(tab.root, tab.path)
      if (value === "chat") FW.composer.insertMention(tab.path)
      if (value === "diff") openDiff(tab.path, { root: tab.root })
    })
  }

  function moreMenu(anchor) {
    const prefs = S.prefs
    U.menu(anchor, [
      { value: "wrap", label: "Word wrap", checked: !!prefs.wordWrap },
      { value: "minimap", label: "Minimap", checked: prefs.minimap !== false },
      { value: "sticky", label: "Sticky scroll", checked: prefs.stickyScroll !== false },
      { value: "numbers", label: "Line numbers", checked: prefs.lineNumbers !== false },
      { value: "autosave", label: "Auto save", checked: prefs.autoSave === "delay" },
      { separator: true },
      { value: "split", label: "Diff side by side", checked: prefs.diffInline !== true },
      { separator: true },
      { value: "closeAll", label: "Close all editors" }
    ], function (value) {
      if (value === "wrap") setPref({ wordWrap: !prefs.wordWrap })
      if (value === "minimap") setPref({ minimap: prefs.minimap === false })
      if (value === "sticky") setPref({ stickyScroll: prefs.stickyScroll === false })
      if (value === "numbers") setPref({ lineNumbers: prefs.lineNumbers === false })
      if (value === "autosave") setPref({ autoSave: prefs.autoSave === "delay" ? "off" : "delay" })
      if (value === "split") {
        setPref({ diffInline: prefs.diffInline !== true })
        if (diffEditor) diffEditor.updateOptions({ renderSideBySide: S.prefs.diffInline !== true })
      }
      if (value === "closeAll") closeAll()
    }, { alignRight: true })
  }

  function setPref(values) {
    Object.assign(S.prefs, values)
    FW.store.savePrefs(values)
    applyOptions()
  }

  function crumbs() {
    const bar = document.getElementById("editorCrumbs")
    bar.innerHTML = ""
    if (!active) return
    const parts = active.path.split("/")
    bar.appendChild(h("span", { text: FW.wb.baseName(active.root) }))
    parts.forEach(function (part, index) {
      bar.appendChild(h("span", { class: "sep", text: "›" }))
      bar.appendChild(h("span", { class: index === parts.length - 1 ? "last" : "", text: part }))
    })
    const tools = h("span", { class: "crumb-tools" })
    if (active.kind === "text") {
      tools.appendChild(h("button", { class: "view-btn", title: "Open changes", html: icon("branch", 12), onclick: function () { openDiff(active.path, { root: active.root }) } }))
      tools.appendChild(h("button", { class: "view-btn", title: "Edit with the agent (" + U.key("Mod+K") + ")", html: icon("wand", 12), onclick: inlineAsk }))
      tools.appendChild(h("button", { class: "view-btn", title: "Add to chat (" + U.key("Mod+L") + ")", html: icon("chat", 12), onclick: selectionToChat }))
    }
    bar.appendChild(tools)
  }

  function cursorStatus() {
    if (!active || active.kind !== "text" || !editor || !editor.getModel()) {
      S.cursor = null
      FW.wb.status()
      return
    }
    const position = editor.getPosition() || { lineNumber: 1, column: 1 }
    const selection = editor.getSelection()
    const selected = selection && !selection.isEmpty() ? editor.getModel().getValueInRange(selection).length : 0
    const langId = editor.getModel().getLanguageId()
    const lang = monaco.languages.getLanguages().find(function (item) {
      return item.id === langId
    })
    S.cursor = { line: position.lineNumber, col: position.column, selected: selected, language: lang && lang.aliases ? lang.aliases[0] : langId, eol: active.eol || "lf" }
    FW.wb.status()
  }

  function reveal(line, col, length) {
    const target = active && active.kind === "diff" ? diffEditor.getModifiedEditor() : editor
    if (!target) return
    target.revealLineInCenter(line)
    target.setSelection(new monaco.Range(line, col, line, col + (length || 0)))
    target.focus()
  }

  function goToLine(line) {
    if (!active || (active.kind !== "text" && active.kind !== "diff")) {
      U.toast("Open a file first")
      return
    }
    reveal(line, 1, 0)
  }

  /* ----------------------------------------------------------- closing */

  function dispose(tab) {
    const index = tabs.indexOf(tab)
    if (index < 0) return
    tabs.splice(index, 1)
    if (tab.kind === "text" && editor && editor.getModel() === tab.model) editor.setModel(null)
    if (tab.kind === "diff" && diffEditor) diffEditor.setModel(null)
    if (tab.model && !projectModels.has(tab.model)) tab.model.dispose()
    if (tab.model && projectModels.has(tab.model) && tab.dirty) reloadProjectModel(tab)
    if (tab.original) tab.original.dispose()
    if (active === tab) {
      active = null
      const next = tabs[index] || tabs[index - 1]
      if (next) activate(next)
    }
  }

  async function closeTab(tab) {
    if (tab.dirty) {
      const answer = await U.dialog({ title: "Save changes to " + tab.path.split("/").pop() + "?", text: "Your changes are lost if you do not save them.", ok: "Save", extra: "Don't save" })
      if (answer === null) return false
      if (answer === true) {
        const saved = await saveTab(tab)
        if (!saved) return false
      }
    }
    dispose(tab)
    drawTabs()
    crumbs()
    if (!tabs.length) {
      active = null
      S.cursor = null
      FW.wb.status()
    }
    FW.wb.updateSplit()
    return true
  }

  async function closeMany(list) {
    for (let index = 0; index < list.length; index += 1) {
      const ok = await closeTab(list[index])
      if (!ok) return false
    }
    return true
  }

  function closeActive() {
    if (active) closeTab(active)
  }

  function closeAll() {
    return closeMany(tabs.slice())
  }

  function cycle(step) {
    if (tabs.length < 2) return
    const index = tabs.indexOf(active)
    activate(tabs[(index + step + tabs.length) % tabs.length])
  }

  /* ------------------------------------------------------------- saving */

  async function saveTab(tab) {
    if (!tab || !tab.model || (tab.kind !== "text" && tab.kind !== "diff")) return false
    try {
      const done = await window.fw.wb.write(tab.root, tab.path, tab.model.getValue())
      tab.saved = tab.model.getAlternativeVersionId()
      tab.dirty = false
      tab.conflict = false
      tab.mtime = done.mtime
      tab.justSaved = Date.now()
      drawTabs()
      if (tab === active) removeBar()
      return true
    } catch (problem) {
      U.toast(problem.message || "Could not save", "bad")
      return false
    }
  }

  function save() {
    if (!active) return
    if (active.kind !== "text" && active.kind !== "diff") return
    saveTab(active).then(function (ok) {
      if (ok) U.toast("Saved " + active.path.split("/").pop())
    })
  }

  async function saveAll() {
    const dirty = tabs.filter(function (tab) {
      return tab.dirty
    })
    for (let index = 0; index < dirty.length; index += 1) await saveTab(dirty[index])
    if (dirty.length) U.toast("Saved " + dirty.length + (dirty.length === 1 ? " file" : " files"))
  }

  async function saveAs() {
    if (!active || !active.model) return
    const result = await window.fw.wb.saveAs(fullPath(active), active.model.getValue())
    if (result.file) U.toast("Saved as " + result.file)
  }

  /* ---------------------------------------- the folder changed on disk */

  function changed(paths) {
    const set = {}
    ;(paths || []).forEach(function (rel) {
      set[rel] = true
    })
    // files the language service knows but no tab shows: keep them current
    if (monaco && projectRoot) {
      Object.keys(set).forEach(function (rel) {
        if (!CODE.test(rel)) return
        const uri = monaco.Uri.file(String(projectRoot).replace(/[\\/]+$/, "") + "/" + rel)
        const model = monaco.editor.getModel(uri)
        const inTab = tabs.some(function (tab) {
          return tab.model === model
        })
        if (model && projectModels.has(model) && !inTab) {
          window.fw.wb.read(projectRoot, rel).then(function (data) {
            if (data.kind === "text" && !model.isDisposed() && model.getValue() !== data.text) model.setValue(data.text)
          }).catch(function () {
            if (!model.isDisposed()) {
              projectModels.delete(model)
              model.dispose()
            }
          })
        } else if (!model && projectModels.size < 700) {
          window.fw.wb.read(projectRoot, rel).then(function (data) {
            if (data.kind !== "text" || data.text.length > 400000 || monaco.editor.getModel(uri)) return
            projectModels.add(monaco.editor.createModel(data.text, undefined, uri))
          }).catch(function () {})
        }
      })
    }
    tabs.forEach(function (tab) {
      if (!set[tab.path]) return
      if (tab.kind === "diff") {
        refreshDiff(tab)
        return
      }
      if (tab.kind !== "text") return
      reload(tab)
    })
  }

  async function reload(tab, force) {
    let data = null
    try {
      data = await window.fw.wb.read(tab.root, tab.path)
    } catch (problem) {
      return
    }
    if (data.kind !== "text" || !tab.model) return
    if (data.text === tab.model.getValue()) return
    if (tab.dirty && !force) {
      tab.conflict = true
      if (tab === active) conflictBar(tab)
      return
    }
    const view = tab === active ? editor.saveViewState() : tab.view
    // as one edit, so Ctrl+Z can bring back what was there before
    tab.model.pushEditOperations([], [{ range: tab.model.getFullModelRange(), text: data.text }], function () {
      return null
    })
    tab.saved = tab.model.getAlternativeVersionId()
    tab.dirty = false
    tab.conflict = false
    tab.mtime = data.mtime
    if (tab === active && view) editor.restoreViewState(view)
    drawTabs()
    if (tab === active) removeBar()
  }

  function removeBar() {
    const old = document.querySelector("#editorBody .editor-bar, #editorBody .diff-bar")
    if (old) old.remove()
    const body = document.getElementById("editorBody")
    if (host) host.style.top = ""
    if (diffHost) diffHost.style.top = ""
    if (body) body.classList.remove("with-bar")
  }

  function conflictBar(tab) {
    removeBar()
    const bar = h("div", { class: "editor-bar warn" }, [
      h("span", { html: icon("alert", 13) }),
      h("span", { class: "grow", text: "This file changed on disk (maybe by the agent) while you were editing it." }),
      h("button", { class: "btn sm", text: "Load theirs", onclick: function () { reload(tab, true) } }),
      h("button", { class: "btn ghost sm", text: "Keep mine", onclick: function () { tab.conflict = false; removeBar() } }),
      h("button", { class: "btn ghost sm", text: "Compare", onclick: function () { openDiff(tab.path, { root: tab.root }) } })
    ])
    document.getElementById("editorBody").appendChild(bar)
    host.style.top = bar.offsetHeight + "px"
  }

  function diffBar(tab) {
    removeBar()
    const changes = diffEditor.getLineChanges() || []
    let added = 0
    let removed = 0
    changes.forEach(function (change) {
      if (change.modifiedEndLineNumber >= change.modifiedStartLineNumber && change.modifiedEndLineNumber > 0) added += change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1
      if (change.originalEndLineNumber >= change.originalStartLineNumber && change.originalEndLineNumber > 0) removed += change.originalEndLineNumber - change.originalStartLineNumber + 1
    })
    const stats = h("span", {}, [h("span", { class: "diff-stat-add", text: "+" + added }), h("span", { text: " " }), h("span", { class: "diff-stat-del", text: "−" + removed })])
    const bar = h("div", { class: "diff-bar editor-bar" }, [
      h("span", { html: icon("branch", 13) }),
      h("span", { class: "grow", text: tab.path + (tab.isNew ? "  (new file)" : "  — last commit ↔ now") }),
      stats,
      h("button", { class: "view-btn", title: "Previous change", html: icon("arrowUp", 12), onclick: function () { jumpChange(-1) } }),
      h("button", { class: "view-btn", title: "Next change", html: '<span style="display:inline-flex;transform:rotate(180deg)">' + icon("arrowUp", 12) + "</span>", onclick: function () { jumpChange(1) } }),
      h("button", { class: "btn sm", text: "Open file", onclick: function () { open(tab.path, { root: tab.root, pin: true }) } }),
      h("button", { class: "btn sm danger", text: "Discard", onclick: function () { FW.explorer.discard(tab.path) } })
    ])
    document.getElementById("editorBody").appendChild(bar)
    diffHost.style.top = bar.offsetHeight + "px"
    if (!changes.length) {
      // the diff is computed after a moment; draw the numbers again then
      const once = diffEditor.onDidUpdateDiff(function () {
        once.dispose()
        if (active === tab) diffBar(tab)
      })
    }
  }

  function jumpChange(step) {
    const changes = diffEditor.getLineChanges() || []
    if (!changes.length) return
    const target = diffEditor.getModifiedEditor()
    const line = target.getPosition() ? target.getPosition().lineNumber : 1
    let pick = null
    if (step > 0) {
      pick = changes.find(function (change) {
        return change.modifiedStartLineNumber > line
      }) || changes[0]
    } else {
      const before = changes.filter(function (change) {
        return change.modifiedStartLineNumber < line
      })
      pick = before[before.length - 1] || changes[changes.length - 1]
    }
    const goTo = Math.max(1, pick.modifiedStartLineNumber)
    target.revealLineInCenter(goTo)
    target.setPosition({ lineNumber: goTo, column: 1 })
    target.focus()
  }

  /* ------------------------------------------------- the agent in the editor */

  function selectionInfo() {
    if (!active || active.kind !== "text" || !editor) return null
    const selection = editor.getSelection()
    const model = editor.getModel()
    if (!selection || !model) return null
    const empty = selection.isEmpty()
    return {
      path: active.path,
      start: selection.startLineNumber,
      end: selection.endLineNumber,
      text: empty ? "" : model.getValueInRange(selection),
      language: model.getLanguageId(),
      empty: empty
    }
  }

  let askBox = null
  function hideInlineAsk() {
    if (askBox) {
      askBox.remove()
      askBox = null
    }
  }

  // Ctrl+K: say what to change; the agent edits the file and it reloads here.
  function inlineAsk() {
    const info = selectionInfo()
    if (!info) {
      U.toast("Open a file and select some code first")
      return
    }
    hideInlineAsk()
    const input = h("input", { type: "text", placeholder: info.empty ? "Describe the change to this file…" : "Describe the change to lines " + info.start + "–" + info.end + "…", spellcheck: "false" })
    askBox = h("div", { class: "inline-ask" }, [
      input,
      h("div", { class: "meta" }, [
        h("span", { html: icon("wand", 11) }),
        h("span", { class: "grow", text: info.path + (info.empty ? "" : "  ·  lines " + info.start + "–" + info.end) }),
        h("span", { text: "Enter to send · Esc to cancel" })
      ])
    ])
    document.getElementById("editorBody").appendChild(askBox)
    input.addEventListener("keydown", async function (event) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        hideInlineAsk()
        editor.focus()
      } else if (event.key === "Enter" && input.value.trim()) {
        event.preventDefault()
        const ask = input.value.trim()
        hideInlineAsk()
        if (active && active.dirty) await saveTab(active)
        let message = "Edit @" + info.path + (info.empty ? "" : " (lines " + info.start + "–" + info.end + ")") + ": " + ask
        if (!info.empty) message += "\n\n```" + info.language + "\n" + info.text + "\n```"
        message += "\n\nChange only what is needed and keep the rest of the file as it is."
        FW.composer.sendText(message)
        U.toast("Sent to the agent. The file reloads here when it is changed.")
      }
    })
    setTimeout(function () {
      input.focus()
    }, 10)
  }

  function selectionToChat() {
    const info = selectionInfo()
    if (!info) {
      U.toast("Open a file first")
      return
    }
    if (info.empty) {
      FW.composer.insertMention(info.path)
      return
    }
    FW.composer.insertText("@" + info.path + " (lines " + info.start + "–" + info.end + ")\n```" + info.language + "\n" + info.text + "\n```\n")
  }

  function explainSelection() {
    const info = selectionInfo()
    if (!info) return
    if (info.empty) explainActive()
    else FW.composer.sendText("Explain this code from @" + info.path + " (lines " + info.start + "–" + info.end + "):\n\n```" + info.language + "\n" + info.text + "\n```")
  }

  function explainActive() {
    if (!active) {
      U.toast("Open a file first")
      return
    }
    FW.composer.sendText("Explain what @" + active.path + " does, the important parts and how it fits into the project.")
  }

  // Following the agent: open the file it is working on.
  function follow(rel) {
    const clean = FW.wb.toRel(rel)
    if (!clean) return
    const existing = tabs.find(function (tab) {
      return tab.path === clean && tab.kind === "text"
    })
    if (existing) activate(existing)
    else open(clean, { preview: true })
  }

  /* ------------------------------------------------- files moved or gone */

  function renamed(from, to) {
    tabs.forEach(function (tab) {
      if (tab.path === from || tab.path.indexOf(from + "/") === 0) {
        const rel = to + tab.path.slice(from.length)
        if (tab.kind === "text" && tab.model) {
          const text = tab.model.getValue()
          const dirty = tab.dirty
          const old = tab.model
          if (editor.getModel() === old) editor.setModel(null)
          tab.model = monaco.editor.createModel(text, undefined, monaco.Uri.file(String(tab.root).replace(/[\\/]+$/, "") + "/" + rel))
          tab.model.onDidChangeContent(function () {
            markDirty(tab)
          })
          tab.saved = dirty ? -1 : tab.model.getAlternativeVersionId()
          old.dispose()
        }
        tab.path = rel
        tab.id = keyOf(tab.root, rel, tab.kind)
        if (tab === active) activate(tab)
      }
    })
    drawTabs()
  }

  function removed(rel) {
    tabs.slice().forEach(function (tab) {
      if (tab.path === rel || tab.path.indexOf(rel + "/") === 0) {
        tab.dirty = false
        dispose(tab)
      }
    })
    drawTabs()
    FW.wb.updateSplit()
  }

  function revealActive() {
    if (active) window.fw.wb.reveal(active.root, active.path)
  }

  function action(id) {
    if (!active) return false
    const target = active.kind === "diff" ? diffEditor.getModifiedEditor() : active.kind === "text" ? editor : null
    if (!target) return false
    target.focus()
    target.trigger("menu", id, null)
    return true
  }

  function layout() {
    if (editor) editor.layout()
    if (diffEditor) diffEditor.layout()
  }

  function dirtyCount() {
    return tabs.filter(function (tab) {
      return tab.dirty
    }).length
  }

  function init() {
    // the editor cancels work it no longer needs; that is not an error
    window.addEventListener("unhandledrejection", function (event) {
      if (event.reason && (event.reason.name === "Canceled" || event.reason.message === "Canceled")) event.preventDefault()
    })
    FW.store.on("theme", applyTheme)
    FW.store.on("root", function () {
      if (monaco) setTimeout(loadProject, 200)
    })
  }

  window.FW = window.FW || {}
  /* ----------------------------------------------- colors for chat code */

  const CHAT_LANGS = { js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript", javascript: "javascript", node: "javascript", ts: "typescript", tsx: "typescript", typescript: "typescript", py: "python", python: "python", sh: "shell", bash: "shell", zsh: "shell", shell: "shell", console: "shell", ps1: "powershell", powershell: "powershell", pwsh: "powershell", bat: "bat", cmd: "bat", json: "json", jsonc: "json", html: "html", vue: "html", xml: "xml", svg: "xml", css: "css", scss: "scss", less: "less", sql: "sql", go: "go", rust: "rust", rs: "rust", java: "java", cs: "csharp", csharp: "csharp", c: "cpp", cpp: "cpp", h: "cpp", hpp: "cpp", yaml: "yaml", yml: "yaml", md: "markdown", markdown: "markdown", php: "php", rb: "ruby", ruby: "ruby", kt: "kotlin", kotlin: "kotlin", swift: "swift", dockerfile: "dockerfile", docker: "dockerfile", ini: "ini", toml: "ini", lua: "lua", r: "r", dart: "dart", graphql: "graphql", scala: "scala", perl: "perl" }

  async function colorize(root) {
    if (!root) return
    const blocks = Array.prototype.filter.call(root.querySelectorAll(".md-code code"), function (code) {
      return !code.dataset.colored && CHAT_LANGS[code.dataset.lang || ""]
    })
    if (!blocks.length) return
    let editorLib = null
    try {
      editorLib = await loadMonaco()
      editorLib.editor.setTheme(themeName())
    } catch (problem) {
      return
    }
    for (let i = 0; i < blocks.length; i++) {
      const code = blocks[i]
      if (code.dataset.colored || !code.isConnected) continue
      const text = code.textContent
      const box = code.closest(".md-code")
      if (box) box.dataset.raw = text
      code.dataset.colored = "1"
      try {
        const html = await editorLib.editor.colorize(text, CHAT_LANGS[code.dataset.lang], { tabSize: 2 })
        if (code.isConnected && code.textContent === text) code.innerHTML = html
      } catch (problem) {}
    }
  }

  window.FW.editor = {
    colorize: colorize,
    init: init,
    open: open,
    openDiff: openDiff,
    count: count,
    save: save,
    saveAll: saveAll,
    saveAs: saveAs,
    closeActive: closeActive,
    closeAll: closeAll,
    cycle: cycle,
    changed: changed,
    renamed: renamed,
    removed: removed,
    revealActive: revealActive,
    goToLine: goToLine,
    action: action,
    layout: layout,
    applyTheme: applyTheme,
    applyOptions: applyOptions,
    inlineAsk: inlineAsk,
    selectionToChat: selectionToChat,
    explainActive: explainActive,
    follow: follow,
    dirtyCount: dirtyCount,
    problems: problems,
    loadProject: loadProject,
    active: function () {
      return active
    }
  }
})()
