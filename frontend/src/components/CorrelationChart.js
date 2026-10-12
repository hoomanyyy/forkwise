import React from "react"
import { shortName, fitLine, getPairs, downloadChart } from "./chartTools"

export default function CorrelationChart({ chart, outcome, runId }) {
    const items = []
    for (const c of chart.columns) {
        if (c !== outcome) {
            const pairs = getPairs(chart, c, outcome)
            if (pairs.length >= 3) {
                items.push({ name: c, r: fitLine(pairs).r })
            }
        }
    }
    items.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))

    const width = 520
    const left = 190
    const right = 64
    const rowHeight = 34
    const height = items.length * rowHeight + 40
    const middle = left + (width - left - right) / 2
    const half = (width - left - right) / 2

    return (
        <section className="ResultCard">
            <div className="CardTop">
                <div>
                    <p className="Eyebrow mb-1">Correlation with Y</p>
                    <p className="CardTitle">Which columns move with the outcome?</p>
                </div>
                {items.length > 0 && (
                    <button className="btn DownloadButton" onClick={() => downloadChart("corrChart", "run-" + runId + "-correlation.png")}>Download PNG</button>
                )}
            </div>
            {items.length === 0 ? (
                <p className="Muted">No other number columns to compare.</p>
            ) : (
                <svg id="corrChart" viewBox={`0 0 ${width} ${height}`} className="Chart">
                    <line x1={middle} x2={middle} y1={8} y2={height - 24} className="ZeroLine" />
                    <text x={left} y={height - 6} className="AxisText" textAnchor="start">−1</text>
                    <text x={middle} y={height - 6} className="AxisText" textAnchor="middle">0</text>
                    <text x={width - right} y={height - 6} className="AxisText" textAnchor="end">+1</text>
                    {items.map((item, index) => (
                        <g key={item.name}>
                            <text x={left - 10} y={14 + index * rowHeight + 15} className="MatrixLabel" textAnchor="end">
                                <title>{item.name}</title>
                                {shortName(item.name, 24)}
                            </text>
                            <rect
                                x={item.r >= 0 ? middle : middle + item.r * half}
                                y={14 + index * rowHeight + 4}
                                width={Math.abs(item.r) * half}
                                height={rowHeight - 12}
                                rx="4"
                                className={item.r >= 0 ? "BarUp" : "BarDown"}
                            />
                            <text x={width - 6} y={14 + index * rowHeight + 19} className={item.r >= 0 ? "BarText TextUp" : "BarText TextDown"} textAnchor="end">{item.r.toFixed(2)}</text>
                        </g>
                    ))}
                </svg>
            )}
            <p className="ChartNote">Green: when this column goes up, Y goes up. Red: Y goes down. Correlation is not cause.</p>
        </section>
    )
}
