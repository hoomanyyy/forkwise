import * as monaco from "monaco-editor"
import { loader } from "@monaco-editor/react"
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker"
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker"
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"

self.MonacoEnvironment = {
  getWorker(id, label) {
    if (label === "json") return new JsonWorker()
    if (label === "css" || label === "scss" || label === "less") return new CssWorker()
    if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker()
    if (label === "typescript" || label === "javascript") return new TsWorker()
    return new EditorWorker()
  },
}

monaco.editor.defineTheme("forkwise-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6f74a8", fontStyle: "italic" },
    { token: "keyword", foreground: "b3a8ff" },
    { token: "string", foreground: "7fd8a8" },
    { token: "number", foreground: "f5b84a" },
    { token: "type", foreground: "6fcaf8" },
  ],
  colors: {
    "editor.background": "#080a1d",
    "editor.lineHighlightBackground": "#12163a",
    "editorLineNumber.foreground": "#3a3f70",
    "editorLineNumber.activeForeground": "#a9addb",
    "editor.selectionBackground": "#2c2f6e",
    "editorGutter.background": "#080a1d",
    "diffEditor.insertedTextBackground": "#4ade8022",
    "diffEditor.removedTextBackground": "#ff7a9022",
  },
})

loader.config({ monaco })

export function languageOf(path) {
  const ext = (path.split(".").pop() || "").toLowerCase()
  const map = {
    js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", json: "json", css: "css", scss: "scss", less: "less", html: "html", htm: "html", md: "markdown",
    sh: "shell", bash: "shell", yml: "yaml", yaml: "yaml", sql: "sql", go: "go", rs: "rust", java: "java",
    php: "php", rb: "ruby", c: "c", h: "c", cpp: "cpp", cs: "csharp", xml: "xml", svg: "xml", toml: "ini", ini: "ini",
    dockerfile: "dockerfile", vue: "html", svelte: "html", kt: "kotlin", swift: "swift",
  }
  if (path.toLowerCase().endsWith("dockerfile")) return "dockerfile"
  return map[ext] || "plaintext"
}
