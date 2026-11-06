/* Turns raw tool calls into the short single-line labels the desktop UI shows,
   in the flat style of Cursor / Claude: "Read main.js", "Ran npm test". */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory()
  else root.FWLabels = factory()
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function text(value) {
    return String(value == null ? "" : value)
  }

  function shorten(value, size) {
    const clean = text(value).replace(/\s+/g, " ").trim()
    if (clean.length <= size) return clean
    return clean.slice(0, size - 1) + "\u2026"
  }

  function basePath(value) {
    const clean = text(value).replace(/\\/g, "/").replace(/\/+$/, "")
    if (!clean || clean === "." || clean === "./") return "the project folder"
    if (clean === "~") return "the home folder"
    const parts = clean.split("/")
    if (parts.length <= 2) return clean
    return parts.slice(-2).join("/")
  }

  function iconFor(name, args) {
    const action = args && args.action
    if (name === "computer") {
      if (action === "shell") return "terminal"
      if (action === "screenshot") return "eye"
      if (action === "click" || action === "drag" || action === "type" || action === "key") return "cursor"
      if (action === "open") return "app"
      if (action === "chrome") return "globe"
      if (action === "wallpaper") return "image"
      if (action === "fs_read" || action === "fs_list" || action === "fs_glob" || action === "fs_grep") return "file"
      return "monitor"
    }
    if (name === "bash") return "terminal"
    if (name === "read_file" || name === "fs_read") return "file"
    if (name === "write_file" || name === "edit_file" || name === "multi_edit") return "edit"
    if (name === "list_dir") return "folder"
    if (name === "glob" || name === "grep") return "search"
    if (name === "web_search" || name === "web_fetch") return "globe"
    if (name === "task") return "branch"
    if (name === "todo_write") return "list"
    if (name === "ask_user") return "chat"
    if (name === "memory") return "bookmark"
    if (name === "use_skill") return "spark"
    if (name === "screenshot" || name === "preview") return "eye"
    if (name === "generate_image") return "image"
    if (name === "browser") return "globe"
    if (name === "create_tool") return "tool"
    return "dot"
  }

  function label(name, args) {
    const data = args && typeof args === "object" ? args : {}
    if (name === "computer") {
      const action = text(data.action)
      if (action === "shell") return "Ran " + shorten(data.command, 90)
      if (action === "click") return "Clicked " + text(data.x) + ", " + text(data.y) + (data.double ? " (double)" : "")
      if (action === "drag") return "Dragged from " + text(data.x) + "," + text(data.y) + " to " + text(data.x2) + "," + text(data.y2)
      if (action === "type") return "Typed " + shorten(data.text, 48)
      if (action === "key") return "Pressed " + text(data.keys)
      if (action === "scroll") return "Scrolled " + text(data.amount)
      if (action === "open") return "Opened " + shorten(data.target, 60)
      if (action === "focus") return "Focused " + shorten(data.title, 50)
      if (action === "windows") return "Listed open windows"
      if (action === "processes") return "Listed running apps"
      if (action === "kill") return "Stopped process " + text(data.pid)
      if (action === "screenshot") return "Took a screenshot"
      if (action === "wallpaper") return "Changed the wallpaper"
      if (action === "clipboard") return text(data.mode) === "write" ? "Copied to the clipboard" : "Read the clipboard"
      if (action === "info") return "Read system info"
      if (action === "ui_elements") return "Read the window on screen"
      if (action === "fs_read" || action === "fs_list" || action === "fs_glob" || action === "fs_grep") return "Read " + basePath(data.path)
      if (action === "fs_write") return "Wrote " + basePath(data.path)
      if (action === "job_output") return "Read job output"
      if (action === "download") return "Downloaded " + shorten(data.url, 50)
      if (action === "chrome") {
        const op = text(data.op)
        if (op === "open") return "Opened " + shorten(data.url, 56)
        if (op === "read" || op === "html") return "Read the page"
        if (op === "screenshot") return "Screenshotted the page"
        if (op === "click") return "Clicked on the page"
        if (op === "type") return "Typed on the page"
        return "Browser: " + (op || "step")
      }
      return action ? "Computer: " + action : "Used the computer"
    }
    if (name === "bash") return "Ran " + shorten(data.command, 90)
    if (name === "read_file") return "Read " + basePath(data.path)
    if (name === "write_file") return "Wrote " + basePath(data.path)
    if (name === "edit_file" || name === "multi_edit") return "Edited " + basePath(data.path)
    if (name === "list_dir") return "Listed " + basePath(data.path)
    if (name === "glob") return "Found files matching " + shorten(data.pattern, 40)
    if (name === "grep") return "Searched for " + shorten(data.pattern, 40)
    if (name === "job_output") return "Read background output"
    if (name === "kill_job") return "Stopped a background job"
    if (name === "web_search") return "Searched the web: " + shorten(data.query, 56)
    if (name === "web_fetch") return "Opened " + shorten(data.url, 56)
    if (name === "task") return "Started a helper (" + (text(data.agent) || "explore") + ")"
    if (name === "todo_write") return "Updated the plan"
    if (name === "ask_user") return "Asked you a question"
    if (name === "memory") return data.action === "delete" ? "Forgot a memory" : "Saved to memory"
    if (name === "use_skill") return "Loaded skill " + shorten(data.name, 32)
    if (name === "screenshot") return "Took a screenshot"
    if (name === "preview") return "Showed a preview"
    if (name === "generate_image") return "Generated an image"
    if (name === "browser") return "Used the browser"
    if (name === "create_tool") return "Created the tool " + shorten(data.name, 30)
    if (name.indexOf("my_") === 0) return "Used " + name.slice(3)
    return name
  }

  // The same label while the step is still going: "Ran ls" becomes "Running ls".
  const RUNNING = [
    ["Ran ", "Running "],
    ["Read ", "Reading "],
    ["Wrote ", "Writing "],
    ["Edited ", "Editing "],
    ["Listed ", "Listing "],
    ["Found files matching ", "Finding files matching "],
    ["Searched the web: ", "Searching the web: "],
    ["Searched for ", "Searching for "],
    ["Opened ", "Opening "],
    ["Clicked ", "Clicking "],
    ["Dragged ", "Dragging "],
    ["Typed ", "Typing "],
    ["Pressed ", "Pressing "],
    ["Scrolled ", "Scrolling "],
    ["Focused ", "Focusing "],
    ["Took a screenshot", "Taking a screenshot"],
    ["Screenshotted the page", "Taking a screenshot of the page"],
    ["Changed the wallpaper", "Changing the wallpaper"],
    ["Downloaded ", "Downloading "],
    ["Stopped ", "Stopping "],
    ["Started a helper", "Starting a helper"],
    ["Updated the plan", "Updating the plan"],
    ["Saved to memory", "Saving to memory"],
    ["Loaded skill ", "Loading skill "],
    ["Generated an image", "Generating an image"],
    ["Used ", "Using "],
    ["Created the tool ", "Creating the tool "],
    ["Showed a preview", "Showing a preview"]
  ]

  function running(value) {
    const clean = text(value)
    for (let index = 0; index < RUNNING.length; index += 1) {
      const pair = RUNNING[index]
      if (clean.indexOf(pair[0]) === 0) return pair[1] + clean.slice(pair[0].length)
    }
    return clean
  }

  function detail(name, args) {
    const data = args && typeof args === "object" ? args : {}
    if (name === "computer" && data.action === "open") return text(data.target)
    if (name === "computer" && data.action === "shell") return text(data.command)
    if (name === "bash") return text(data.command)
    if (data.path) return text(data.path)
    if (data.url) return text(data.url)
    if (data.query) return text(data.query)
    if (data.pattern) return text(data.pattern)
    return ""
  }

  function needsApproval(name, args, readOnlyActions) {
    if (name !== "computer") return false
    const action = text(args && args.action)
    return (readOnlyActions || []).indexOf(action) === -1
  }

  function fileName(path) {
    const clean = text(path).replace(/\\/g, "/")
    const parts = clean.split("/")
    return parts[parts.length - 1] || clean
  }

  function bytes(size) {
    const number = Number(size) || 0
    if (number < 1024) return number + " B"
    if (number < 1048576) return Math.round(number / 1024) + " KB"
    return (number / 1048576).toFixed(1) + " MB"
  }

  function duration(ms) {
    const number = Number(ms) || 0
    if (number < 1000) return Math.round(number) + "ms"
    if (number < 60000) return (number / 1000).toFixed(number < 10000 ? 1 : 0) + "s"
    const minutes = Math.floor(number / 60000)
    return minutes + "m " + Math.round((number % 60000) / 1000) + "s"
  }

  return { label: label, running: running, icon: iconFor, detail: detail, needsApproval: needsApproval, fileName: fileName, bytes: bytes, duration: duration, shorten: shorten }
})
