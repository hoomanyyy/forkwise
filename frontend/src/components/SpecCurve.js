import React from "react"
import { shortName, downloadChart } from "./chartTools"

export default function SpecCurve({ analysts, middleEffect, runId }) {
    const valid = analysts.filter((a) => a.effect !== null)
    const sorted = [...valid].sort((a, b) => a.effect - b.effect)
    const effects = sorted.map((a) => a.effect)

    const controls = []
    for (const a of sorted) {
        for (const c of a.covariates) {
            if (!controls.includes(c)) {
                controls.push(c)
            }
        }
    }

    const width = 620
    const left = 170
    const right = 24
    const chartTop = 20
    const chartHeight = 200
    const matrixTop = chartTop + chartHeight + 48
    const rowHeight = 24
    const rowCount = controls.length + 2
    const height = matrixTop + rowCount * rowHeight + 6

    let top = Math.max(...effects, 0)
    let bottom = Math.min(...effects, 0)
    if (top === bottom) {
        top = top + 1
    }
    const padding = (top - bottom) * 0.1
    top = top + padding
    if (bottom < 0) {
        bottom = bottom - padding
    }

    function getY(value) {
        return chartTop + ((top - value) / (top - bottom)) * chartHeight
    }

    function getX(index) {
        if (sorted.length === 1) {
            return left + (width - left - right) / 2
        }
        return left + 14 + index * ((width - left - right - 28) / (sorted.length - 1))
    }

    function rowY(index) {
        return matrixTop + index * rowHeight + rowHeight / 2
    }

    const ticks = []
    for (let i = 0; i <= 4; i++) {
        ticks.push(bottom + ((top - bottom) * i) / 4)
    }

    return (
        <section className="ResultCard">
            <div className="CardTop">
                <div>
                    <p className="Eyebrow mb-1">Specification curve</p>
                    <p className="CardTitle">Effect found by each AI analyst</p>
                </div>
                {sorted.length > 0 && (
                    <button className="btn DownloadButton" onClick={() => downloadChart("specChart", "run-" + runId + "-analysts.png")}>Download PNG</button>
                )}
            </div>
            {sorted.length === 0 ? (
                <p className="Muted">No analyst returned a valid result.</p>
            ) : (
                <svg id="specChart" viewBox={`0 0 ${width} ${height}`} className="Chart">
                    {ticks.map((t) => (
                        <g key={t}>
                            <line x1={left} x2={width - right} y1={getY(t)} y2={getY(t)} className="GridLine" />
                            <text x={left - 10} y={getY(t) + 4} className="AxisText" textAnchor="end">{t.toFixed(1)}</text>
                        </g>
                    ))}
                    <text x={left - 50} y={chartTop + chartHeight / 2} className="AxisTitle" textAnchor="middle" transform={`rotate(-90 ${left - 50} ${chartTop + chartHeight / 2})`}>Effect on Y</text>
                    <line x1={left} x2={width - right} y1={getY(0)} y2={getY(0)} className="ZeroLine" />
                    {middleEffect !== null && (
                        <g>
                            <line x1={left} x2={width - right} y1={getY(middleEffect)} y2={getY(middleEffect)} className="MiddleLine" />
                            <text x={width - right} y={getY(middleEffect) - 6} className="MiddleText" textAnchor="end">middle {middleEffect}</text>
                        </g>
                    )}
                    {sorted.map((a, index) => (
                        <line key={"guide" + a.analyst_number} x1={getX(index)} x2={getX(index)} y1={getY(a.effect)} y2={height - 6} className="GuideLine" />
                    ))}
                    {sorted.map((a, index) => (
                        <circle key={"dot" + a.analyst_number} cx={getX(index)} cy={getY(a.effect)} r="7" className={a.p_value < 0.05 ? "DotSignificant" : "DotNormal"}>
                            <title>{"Analyst " + a.analyst_number + ": effect " + a.effect}</title>
                        </circle>
                    ))}
                    {sorted.map((a, index) => (
                        <text key={"num" + a.analyst_number} x={getX(index)} y={chartTop + chartHeight + 20} className="AxisText" textAnchor="middle">#{a.analyst_number}</text>
                    ))}
                    <text x={left - 10} y={matrixTop - 10} className="MatrixTitle" textAnchor="end">Choices</text>
                    {controls.map((c, row) => (
                        <g key={c}>
                            <rect x={0} y={matrixTop + row * rowHeight} width={width - right} height={rowHeight} className={row % 2 === 0 ? "MatrixStripe" : "MatrixPlain"} />
                            <text x={left - 10} y={rowY(row) + 4} className="MatrixLabel" textAnchor="end">
                                <title>{c}</title>
                                {shortName(c, 22)}
                            </text>
                            {sorted.map((a, index) => (
                                <circle key={c + a.analyst_number} cx={getX(index)} cy={rowY(row)} r="5" className={a.covariates.includes(c) ? "MatrixOn" : "MatrixOff"} />
                            ))}
                        </g>
                    ))}
                    <g>
                        <rect x={0} y={matrixTop + controls.length * rowHeight} width={width - right} height={rowHeight} className={controls.length % 2 === 0 ? "MatrixStripe" : "MatrixPlain"} />
                        <text x={left - 10} y={rowY(controls.length) + 4} className="MatrixLabel" textAnchor="end">Drop outliers</text>
                        {sorted.map((a, index) => (
                            <circle key={"out" + a.analyst_number} cx={getX(index)} cy={rowY(controls.length)} r="5" className={a.outliers === "drop_3sd" ? "MatrixOn" : "MatrixOff"} />
                        ))}
                    </g>
                    <g>
                        <rect x={0} y={matrixTop + (controls.length + 1) * rowHeight} width={width - right} height={rowHeight} className={(controls.length + 1) % 2 === 0 ? "MatrixStripe" : "MatrixPlain"} />
                        <text x={left - 10} y={rowY(controls.length + 1) + 4} className="MatrixLabel" textAnchor="end">Fill missing values</text>
                        {sorted.map((a, index) => (
                            <circle key={"miss" + a.analyst_number} cx={getX(index)} cy={rowY(controls.length + 1)} r="5" className={a.missing === "median_impute" ? "MatrixOn" : "MatrixOff"} />
                        ))}
                    </g>
                </svg>
            )}
            <div className="Legend">
                <span><span className="LegendDot DotSignificantBg"></span>Significant</span>
                <span><span className="LegendDot DotNormalBg"></span>Not significant</span>
                <span><span className="LegendLine"></span>Middle effect</span>
                <span><span className="LegendDot MatrixOnBg"></span>Choice used</span>
            </div>
        </section>
    )
}
