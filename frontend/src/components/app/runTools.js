// small helpers shared by the app pages

export function formatDate(text) {
    if (!text) {
        return "-"
    }
    const date = new Date(text)
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + " · " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function shortDate(text) {
    if (!text) {
        return "-"
    }
    return new Date(text).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

export function timeAgo(text) {
    if (!text) {
        return "-"
    }
    const seconds = (Date.now() - new Date(text).getTime()) / 1000
    if (seconds < 60) {
        return "just now"
    }
    if (seconds < 3600) {
        return Math.floor(seconds / 60) + " min ago"
    }
    if (seconds < 86400) {
        return Math.floor(seconds / 3600) + " h ago"
    }
    if (seconds < 86400 * 30) {
        return Math.floor(seconds / 86400) + " days ago"
    }
    return shortDate(text)
}

export function fileList(filename) {
    if (!filename) {
        return []
    }
    return filename.split(", ").filter((f) => f.trim() !== "")
}

export function runState(run) {
    if (run.verdict) {
        return run.verdict
    }
    return run.status
}

export function stateLabel(state) {
    if (!state) {
        return "-"
    }
    return state.replaceAll("_", " ")
}

export function greeting() {
    const hour = new Date().getHours()
    if (hour < 12) {
        return "Good morning"
    }
    if (hour < 18) {
        return "Good afternoon"
    }
    return "Good evening"
}

export function countRuns(history) {
    const result = { total: history.length, robust: 0, fragile: 0, choice_dependent: 0, no_effect: 0, running: 0, failed: 0 }
    for (const run of history) {
        if (run.verdict && result[run.verdict] !== undefined) {
            result[run.verdict] = result[run.verdict] + 1
        } else if (run.status === "running") {
            result.running = result.running + 1
        } else if (run.status === "failed") {
            result.failed = result.failed + 1
        }
    }
    return result
}

function dayKey(date) {
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
}

export function runsPerDay(history, days) {
    const list = []
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        list.push({ key: dayKey(date), label: date.getDate(), total: 0, date: date })
    }
    for (const run of history) {
        if (!run.created_at) {
            continue
        }
        const key = dayKey(new Date(run.created_at))
        for (const d of list) {
            if (d.key === key) {
                d.total = d.total + 1
            }
        }
    }
    return list
}

export const VERDICT_TEXT = {
    robust: "Almost all analysts found the same direction, and most of them found a real effect.",
    fragile: "Analysts agree on the direction, but many of them could not show the effect is real.",
    choice_dependent: "The answer changes depending on the choices each analyst made.",
    no_effect: "Almost no analyst found a real effect. With these choices, the data does not support this link."
}
