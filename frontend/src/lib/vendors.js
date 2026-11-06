export const VENDORS = [
  { key: "anthropic", label: "Claude", color: "#d97757", words: ["claude", "anthropic/"] },
  { key: "openai", label: "OpenAI", color: "#10a37f", words: ["gpt", "openai/", "chatgpt", "codex", "davinci"] },
  { key: "google", label: "Gemini", color: "#4f8df5", words: ["gemini", "gemma", "google/", "palm"] },
  { key: "deepseek", label: "DeepSeek", color: "#4d6bfe", words: ["deepseek"] },
  { key: "xai", label: "Grok", color: "#a1a1aa", words: ["grok", "x-ai/", "xai/"] },
  { key: "qwen", label: "Qwen", color: "#8b5cf6", words: ["qwen", "qwq", "alibaba/"] },
  { key: "meta", label: "Llama", color: "#0668e1", words: ["llama", "meta-llama/", "meta/"] },
  { key: "mistral", label: "Mistral", color: "#fa520f", words: ["mistral", "mixtral", "codestral", "devstral", "magistral", "ministral", "pixtral"] },
  { key: "moonshot", label: "Kimi", color: "#16a34a", words: ["kimi", "moonshot"] },
  { key: "zhipu", label: "GLM", color: "#2563eb", words: ["glm", "z-ai/", "zhipu", "thudm/"] },
  { key: "minimax", label: "MiniMax", color: "#e11d48", words: ["minimax"] },
  { key: "nvidia", label: "NVIDIA", color: "#76b900", words: ["nemotron", "nvidia/"] },
  { key: "microsoft", label: "Phi", color: "#0ea5e9", words: ["phi-", "microsoft/"] },
  { key: "cohere", label: "Cohere", color: "#39594d", words: ["command-r", "command-a", "cohere/"] },
  { key: "amazon", label: "Amazon Nova", color: "#ff9900", words: ["nova-", "amazon/"] },
  { key: "other", label: "Other models", color: "#71717a", words: [] },
]

export function vendorInfo(key) {
  for (const item of VENDORS) {
    if (item.key === key) return item
  }
  return VENDORS[VENDORS.length - 1]
}

export function vendorOf(model) {
  if (model.vendor) return model.vendor
  const name = String(model.key || "").toLowerCase()
  const base = name.split("/").pop().split(":").pop()
  for (const start of ["o1", "o3", "o4"]) {
    if (base === start || base.startsWith(start + "-")) return "openai"
  }
  for (const item of VENDORS) {
    for (const word of item.words) {
      if (name.includes(word)) return item.key
    }
  }
  return "other"
}

export function groupModels(models) {
  const groups = []
  for (const vendor of VENDORS) {
    const items = models.filter((model) => vendorOf(model) === vendor.key)
    if (items.length > 0) groups.push({ vendor: vendor, items: items })
  }
  return groups
}

export function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem("fw-recent-models") || "[]")
    return Array.isArray(list) ? list : []
  } catch (problem) {
    return []
  }
}

export function rememberModel(key) {
  const list = readRecent().filter((item) => item !== key)
  list.unshift(key)
  try {
    localStorage.setItem("fw-recent-models", JSON.stringify(list.slice(0, 3)))
  } catch (problem) {
    return
  }
}
