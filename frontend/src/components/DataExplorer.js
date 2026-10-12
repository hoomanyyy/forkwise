import React, { useState } from "react"
import { shortName, formatNumber, fitLine, getPairs, downloadChart, downloadCsv } from "./chartTools"
import { fitAllModels, predictY } from "./fitModels"

export default function DataExplorer({ chart, outcome, mainVariable, middleEffect, runId }) {
    const [yName, setYName] = useState(outcome)
    const [xName, setXName] = useState(mainVariable)
    const [chartType, setChartType] = useState("points")
    const [logX, setLogX] = useState(false)
    const [fitChoice, setFitChoice] = useState("best")
    const [showMiddle, setShowMiddle] = useState(true)
    const [drawMode, setDrawMode] = useState(false)
    const [penColor, setPenColor] = useState("#f472b6")
    const [paths, setPaths] = useState([])
    const [current, setCurrent] = useState(null)

    const width = 720
    const height = 440
    const left = 64
    const right = 20
    const top = 20
    const bottom = 60
    const plotWidth = width - left - right
    const plotHeight = height - top - bottom

    const rawPairs = getPairs(chart, xName, yName)
    const points = []
    for (const p of rawPairs) {
        if (logX) {
            if (p[0] > 0) {
                points.push([Math.log10(p[0]), p[1]])
            }
        } else {
            points.push(p)
        }
    }

    if (points.length < 3) {
        return (
            <section className="ResultCard">
                <p className="Eyebrow">Data explorer</p>
                <p className="Muted">Not enough rows to draw these two columns.</p>
            </section>
        )
    }

    const xValues = []
    for (const p of points) {
        if (!xValues.includes(p[0])) {
            xValues.push(p[0])
        }
    }

    const groups = []
    if (xValues.length <= 40) {
        for (const value of xValues) {
            groups.push({ x: value, sum: 0, count: 0 })
        }
        for (const p of points) {
            for (const g of groups) {
                if (g.x === p[0]) {
                    g.sum = g.sum + p[1]
                    g.count = g.count + 1
                }
            }
        }
    } else {
        const smallX = Math.min(...xValues)
        const bigX = Math.max(...xValues)
        const step = (bigX - smallX) / 20
        for (let i = 0; i < 20; i++) {
            groups.push({ x: smallX + step * (i + 0.5), sum: 0, count: 0 })
        }
        for (const p of points) {
            let index = Math.floor((p[0] - smallX) / step)
            if (index > 19) {
                index = 19
            }
            groups[index].sum = groups[index].sum + p[1]
            groups[index].count = groups[index].count + 1
        }
    }

    const averages = []
    for (const g of groups) {
        if (g.count > 0) {
            averages.push([g.x, g.sum / g.count])
        }
    }
    averages.sort((a, b) => a[0] - b[0])

    const rawLine = fitLine(rawPairs)
    const models = fitAllModels(rawPairs)
    const ranked = [...models].sort((a, b) => b.adjusted - a.adjusted)

    let chosen = null
    for (const m of models) {
        if (fitChoice === "best" && m.best) {
            chosen = m
        }
        if (fitChoice === m.type) {
            chosen = m
        }
    }

    let xMin = Math.min(...points.map((p) => p[0]))
    let xMax = Math.max(...points.map((p) => p[0]))
    let yMin = Math.min(...points.map((p) => p[1]))
    let yMax = Math.max(...points.map((p) => p[1]))
    if (xMax === xMin) {
        xMax = xMin + 1
    }
    if (yMax === yMin) {
        yMax = yMin + 1
    }
    const xPadding = (xMax - xMin) * 0.03
    const yPadding = (yMax - yMin) * 0.06
    if (xMin >= 0 && xMin - xPadding < 0) {
        xMin = 0
    } else {
        xMin = xMin - xPadding
    }
    if (yMin >= 0 && yMin - yPadding < 0) {
        yMin = 0
    } else {
        yMin = yMin - yPadding
    }
    xMax = xMax + xPadding
    yMax = yMax + yPadding

    const xTicks = []
    const yTicks = []
    for (let i = 0; i <= 5; i++) {
        xTicks.push(xMin + ((xMax - xMin) * i) / 5)
        yTicks.push(yMin + ((yMax - yMin) * i) / 5)
    }

    function getX(value) {
        return left + ((value - xMin) / (xMax - xMin)) * plotWidth
    }

    function getY(value) {
        return top + ((yMax - value) / (yMax - yMin)) * plotHeight
    }

    function xLabel(value) {
        if (logX) {
            return formatNumber(Math.pow(10, value))
        }
        return formatNumber(value)
    }

    const isMainPair = xName === mainVariable && yName === outcome
    const canShowMiddle = isMainPair && middleEffect !== null && rawLine.sdX > 0
    let middleSlope = 0
    if (canShowMiddle) {
        middleSlope = middleEffect / rawLine.sdX
    }

    function middleY(value) {
        return rawLine.meanY + middleSlope * (value - rawLine.meanX)
    }

    function curveText(getValue) {
        const list = []
        for (let i = 0; i <= 150; i++) {
            const shown = xMin + ((xMax - xMin) * i) / 150
            let raw = shown
            if (logX) {
                raw = Math.pow(10, shown)
            }
            const y = getValue(raw)
            if (isFinite(y)) {
                list.push(getX(shown) + "," + getY(y))
            }
        }
        return list.join(" ")
    }

    let strength = "No clear relationship"
    if (Math.abs(rawLine.r) >= 0.7) {
        strength = "Strong relationship"
    } else if (Math.abs(rawLine.r) >= 0.4) {
        strength = "Medium relationship"
    } else if (Math.abs(rawLine.r) >= 0.2) {
        strength = "Weak relationship"
    }

    function svgPoint(e) {
        const box = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - box.left) / box.width) * width
        const y = ((e.clientY - box.top) / box.height) * height
        return [Math.round(x), Math.round(y)]
    }

    function startDrawing(e) {
        if (drawMode) {
            e.preventDefault()
            setCurrent([svgPoint(e)])
        }
    }

    function keepDrawing(e) {
        if (drawMode && current !== null) {
            setCurrent([...current, svgPoint(e)])
        }
    }

    function stopDrawing() {
        if (current !== null) {
            setPaths([...paths, { color: penColor, points: current }])
            setCurrent(null)
        }
    }

    function pointsText(list) {
        return list.map((p) => p[0] + "," + p[1]).join(" ")
    }

    const penColors = ["#f472b6", "#facc15", "#ffffff", "#38bdf8"]

    return (
        <section className="ResultCard">
            <div className="CardTop">
                <div>
                    <p className="Eyebrow mb-1">Data explorer</p>
                    <p className="CardTitle">Your real data, with linear and non-linear fits</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                    <button className="btn GhostButton" onClick={() => downloadCsv(chart, "run-" + runId + "-data.csv")}>Download CSV</button>
                    <button className="btn DownloadButton" onClick={() => downloadChart("explorerChart", "run-" + runId + "-" + xName + ".png")}>Download PNG</button>
                </div>
            </div>

            <div className="Toolbar">
                <label className="ToolField">
                    <span>Y axis</span>
                    <select className="form-select ToolSelect" value={yName} onChange={(e) => setYName(e.target.value)}>
                        {chart.columns.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </label>
                <label className="ToolField">
                    <span>X axis</span>
                    <select className="form-select ToolSelect" value={xName} onChange={(e) => setXName(e.target.value)}>
                        {chart.columns.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </label>
                <label className="ToolField ToolSmall">
                    <span>Chart type</span>
                    <select className="form-select ToolSelect" value={chartType} onChange={(e) => setChartType(e.target.value)}>
                        <option value="points">Points (scatter)</option>
                        <option value="line">Line (average Y for each X)</option>
                        <option value="both">Points and line</option>
                    </select>
                </label>
                <label className="ToolField ToolSmall">
                    <span>Fit line</span>
                    <select className="form-select ToolSelect" value={fitChoice} onChange={(e) => setFitChoice(e.target.value)}>
                        <option value="best">Best model (automatic)</option>
                        {models.map((m) => (
                            <option key={m.type} value={m.type}>{m.name}</option>
                        ))}
                        <option value="none">No line</option>
                    </select>
                </label>
                <div className="ToolChecks">
                    <label><input type="checkbox" checked={logX} onChange={(e) => setLogX(e.target.checked)} /> Log scale X</label>
                    {canShowMiddle && (
                        <label><input type="checkbox" checked={showMiddle} onChange={(e) => setShowMiddle(e.target.checked)} /> Middle analyst line</label>
                    )}
                </div>
            </div>

            <div className="DrawBar">
                <button className={drawMode ? "btn DrawButton DrawOn" : "btn DrawButton"} onClick={() => setDrawMode(!drawMode)}>
                    {drawMode ? "Drawing: on" : "Draw on chart"}
                </button>
                {penColors.map((c) => (
                    <button
                        key={c}
                        className={penColor === c ? "ColorDot ColorDotOn" : "ColorDot"}
                        style={{ background: c }}
                        onClick={() => setPenColor(c)}
                        aria-label={"Pen color " + c}
                    ></button>
                ))}
                <button className="btn GhostButton" onClick={() => setPaths(paths.slice(0, -1))} disabled={paths.length === 0}>Undo</button>
                <button className="btn GhostButton" onClick={() => setPaths([])} disabled={paths.length === 0}>Clear</button>
                {drawMode && <span className="Muted small">Hold the mouse button and draw. Your drawing is saved in the PNG.</span>}
            </div>

            <div className="ExplorerGrid">
                <svg
                    id="explorerChart"
                    viewBox={`0 0 ${width} ${height}`}
                    className={drawMode ? "Chart DrawCursor" : "Chart"}
                    onMouseDown={startDrawing}
                    onMouseMove={keepDrawing}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                >
                    <defs>
                        <clipPath id="explorerArea">
                            <rect x={left} y={top} width={plotWidth} height={plotHeight} />
                        </clipPath>
                    </defs>
                    {yTicks.map((t) => (
                        <g key={"y" + t}>
                            <line x1={left} x2={width - right} y1={getY(t)} y2={getY(t)} className="GridLine" />
                            <text x={left - 8} y={getY(t) + 4} className="AxisText" textAnchor="end">{formatNumber(t)}</text>
                        </g>
                    ))}
                    {xTicks.map((t) => (
                        <g key={"x" + t}>
                            <line x1={getX(t)} x2={getX(t)} y1={top} y2={top + plotHeight} className="GridLine" />
                            <text x={getX(t)} y={top + plotHeight + 18} className="AxisText" textAnchor="middle">{xLabel(t)}</text>
                        </g>
                    ))}
                    {chartType !== "line" && points.map((p, index) => (
                        <circle key={index} cx={getX(p[0])} cy={getY(p[1])} r="3" className="DataPoint" />
                    ))}
                    {chartType !== "points" && (
                        <polyline points={averages.map((a) => getX(a[0]) + "," + getY(a[1])).join(" ")} className="AverageLine" />
                    )}
                    {chartType !== "points" && averages.map((a, index) => (
                        <circle key={"avg" + index} cx={getX(a[0])} cy={getY(a[1])} r="4.5" className="AverageDot">
                            <title>{xLabel(a[0]) + ": " + a[1].toFixed(2)}</title>
                        </circle>
                    ))}
                    {chosen !== null && (
                        <polyline clipPath="url(#explorerArea)" points={curveText((x) => predictY(chosen, x))} className="FitCurve" />
                    )}
                    {canShowMiddle && showMiddle && (
                        <polyline clipPath="url(#explorerArea)" points={curveText(middleY)} className="MiddleCurve" />
                    )}
                    <text x={left + plotWidth / 2} y={height - 14} className="AxisTitle" textAnchor="middle">{shortName(xName, 60) + (logX ? " (log scale)" : "")}</text>
                    <text x={16} y={top + plotHeight / 2} className="AxisTitle" textAnchor="middle" transform={`rotate(-90 16 ${top + plotHeight / 2})`}>{shortName(yName, 45)}</text>
                    {paths.map((path, index) => (
                        <polyline key={"draw" + index} points={pointsText(path.points)} fill="none" stroke={path.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                    {current !== null && (
                        <polyline points={pointsText(current)} fill="none" stroke={penColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                </svg>

                <div className="FitPanel">
                    {chosen !== null && (
                        <div className="FitBox">
                            <p className="StatLabel">{chosen.name}{chosen.best ? " · best model" : ""}</p>
                            <p className="Equation">{chosen.formula}</p>
                            <p className="StatNumber mt-2">{(chosen.r2 * 100).toFixed(1)}%</p>
                            <p className="Muted small mb-1">R², how much of Y this curve explains</p>
                            <div className="FitTrack"><div className="FitFill" style={{ width: Math.max(chosen.r2, 0) * 100 + "%" }}></div></div>
                        </div>
                    )}
                    <div className="FitBox">
                        <p className="StatLabel">Correlation r</p>
                        <p className="StatNumber">{rawLine.r.toFixed(2)}</p>
                        <p className="Muted small mb-0">{strength}{rawLine.r > 0 ? ", going up" : ", going down"}</p>
                    </div>
                    <div className="FitBox">
                        <p className="StatLabel">Points</p>
                        <p className="StatNumber">{points.length}</p>
                        <p className="Muted small mb-0">random sample of {chart.total_rows} rows</p>
                    </div>
                </div>
            </div>

            <div className="ModelTable">
                <p className="StatLabel mb-2">Which formula fits best? (sorted by adjusted R²)</p>
                {ranked.map((m) => (
                    <button key={m.type} className={chosen !== null && chosen.type === m.type ? "ModelRow ModelRowOn" : "ModelRow"} onClick={() => setFitChoice(m.type)}>
                        <span className="ModelName">{m.name}{m.best && <span className="BestBadge">Best</span>}</span>
                        <span className="ModelFormula">{m.formula}</span>
                        <span className="ModelBar"><span className="ModelFill" style={{ width: Math.max(m.r2, 0) * 100 + "%" }}></span></span>
                        <span className="ModelScore">{(m.r2 * 100).toFixed(1)}%</span>
                    </button>
                ))}
                <p className="Muted small mt-2 mb-0">Adjusted R² gives a small penalty to curves with more terms, so a complicated curve only wins if it is really better.</p>
            </div>

            <div className="Legend">
                {chartType !== "line" && <span><span className="LegendDot DataPointBg"></span>One row of data</span>}
                {chartType !== "points" && <span><span className="LegendSolid AverageBg"></span>Average Y</span>}
                {chosen !== null && <span><span className="LegendSolid"></span>{chosen.name} fit</span>}
                {canShowMiddle && showMiddle && <span><span className="LegendLine"></span>Middle analyst (with controls)</span>}
            </div>
        </section>
    )
}
