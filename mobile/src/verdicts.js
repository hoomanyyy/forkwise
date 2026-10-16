export const VERDICTS = {
    robust: {
        label: "Robust",
        color: "#4ade80",
        soft: "rgba(74, 222, 128, 0.14)",
        text: "Almost all analysts found the same direction, and most of them found a real effect."
    },
    fragile: {
        label: "Fragile",
        color: "#fbbf24",
        soft: "rgba(251, 191, 36, 0.14)",
        text: "Analysts agree on the direction, but many of them could not show the effect is real."
    },
    choice_dependent: {
        label: "Choice dependent",
        color: "#f87171",
        soft: "rgba(248, 113, 113, 0.14)",
        text: "The answer changes depending on the choices each analyst made."
    },
    no_effect: {
        label: "No effect",
        color: "#a5b4fc",
        soft: "rgba(165, 180, 252, 0.14)",
        text: "Almost no analyst found a real effect. With these choices, the data does not support this link."
    }
}

export function verdictInfo(run) {
    if (run.status === "running") {
        return { label: "Running", color: "#3fb6f5", soft: "rgba(63, 182, 245, 0.14)", text: "The analysts are still working on this question." }
    }
    if (run.status === "failed") {
        return { label: "Failed", color: "#8a8fb0", soft: "rgba(138, 143, 176, 0.14)", text: "This analysis could not finish." }
    }
    if (VERDICTS[run.verdict]) {
        return VERDICTS[run.verdict]
    }
    return { label: "No verdict", color: "#8a8fb0", soft: "rgba(138, 143, 176, 0.14)", text: "There were not enough valid analysts to decide." }
}

export function shortDate(text) {
    if (!text) {
        return ""
    }
    const date = new Date(String(text).replace(" ", "T"))
    if (isNaN(date.getTime())) {
        return String(text)
    }
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}
