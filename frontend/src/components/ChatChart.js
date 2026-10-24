import React from "react"

export default function ChatChart({ chart }) {
    const labels = chart.labels || []
    const values = (chart.values || []).map((v) => Number(v))

    if (labels.length === 0 || labels.length !== values.length || values.some((v) => isNaN(v))) {
        return null
    }

    const width = 520
    const height = 250
    const left = 48
    const right = 16
    const top = 22
    const bottom = 40
    const plotWidth = width - left - right
    const plotHeight = height - top - bottom

    let smallest = Math.min(0, ...values)
    let largest = Math.max(0, ...values)
    if (smallest === largest) {
        largest = smallest + 1
    }
    const range = largest - smallest

    function yOf(v) {
        return top + ((largest - v) / range) * plotHeight
    }

    function fmt(v) {
        return Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(3)
    }

    const zeroY = yOf(0)
    const step = plotWidth / labels.length
    const ticks = [0, 1, 2, 3].map((n) => smallest + (range / 3) * n)

    const points = values.map((v, i) => ({
        x: left + step * i + step / 2,
        y: yOf(v),
    }))

    const showValues = labels.length <= 12

    return (
        <div className="ChatChartBox">
            {chart.title && <p className="ChatChartTitle">{chart.title}</p>}
            <svg viewBox={`0 0 ${width} ${height}`} className="Chart">
                {ticks.map((t, i) => (
                    <g key={i}>
                        <line x1={left} x2={width - right} y1={yOf(t)} y2={yOf(t)} className="GridLine" />
                        <text x={left - 6} y={yOf(t) + 4} textAnchor="end" className="AxisText">
                            {fmt(t)}
                        </text>
                    </g>
                ))}

                <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} className="ZeroLine" />

                {chart.type === "line" ? (
                    <>
                        <polyline
                            className="SimpleLine"
                            fill="none"
                            points={points.map((p) => p.x + "," + p.y).join(" ")}
                        />
                        {points.map((p, i) => (
                            <g key={i}>
                                <circle cx={p.x} cy={p.y} r="4.5" className="AverageDot" />
                                {showValues && (
                                    <text x={p.x} y={p.y - 10} textAnchor="middle" className="AxisText">
                                        {fmt(values[i])}
                                    </text>
                                )}
                            </g>
                        ))}
                    </>
                ) : (
                    values.map((v, i) => {
                        const barWidth = Math.min(step * 0.6, 44)
                        const x = left + step * i + (step - barWidth) / 2
                        const y = Math.min(yOf(v), zeroY)
                        const h = Math.abs(yOf(v) - zeroY)
                        return (
                            <g key={i}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={Math.max(h, 1)}
                                    rx="4"
                                    className={v >= 0 ? "BarUp" : "BarDown"}
                                />
                                {showValues && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={v >= 0 ? y - 6 : y + h + 14}
                                        textAnchor="middle"
                                        className={"BarText " + (v >= 0 ? "TextUp" : "TextDown")}
                                    >
                                        {fmt(v)}
                                    </text>
                                )}
                            </g>
                        )
                    })
                )}

                {labels.map((l, i) => (
                    <text
                        key={i}
                        x={left + step * i + step / 2}
                        y={height - 16}
                        textAnchor="middle"
                        className="AxisText"
                    >
                        {String(l).slice(0, 8)}
                    </text>
                ))}
            </svg>
        </div>
    )
}