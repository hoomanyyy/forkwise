import { categoryOf } from "../components/app/Flow"
import { describe } from "../components/app/ToolCall"

export function parseArgs(raw) {
  if (!raw) return {}
  if (typeof raw === "object") return raw
  try {
    return JSON.parse(raw)
  } catch (problem) {
    return {}
  }
}

export function collectCalls(messages) {
  const results = {}
  for (const message of messages) {
    if (message.role === "tool") results[message.tool_call_id] = message
  }
  const list = []
  for (const message of messages) {
    if (message.role !== "assistant") continue
    for (const call of message.tool_calls || []) {
      const args = parseArgs(call.function.arguments)
      const result = results[call.id]
      const meta = (result && result.meta) || {}
      list.push({
        id: call.id,
        name: call.function.name,
        category: categoryOf(call.function.name),
        args,
        result,
        meta,
        done: Boolean(result),
        failed: Boolean(result) && meta.ok === false,
        info: describe(call.function.name, args, meta),
      })
    }
  }
  return list
}
