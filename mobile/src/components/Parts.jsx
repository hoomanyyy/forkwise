import React from "react"
import { FiHome, FiPlusCircle, FiClock, FiUser, FiChevronRight, FiArrowLeft } from "react-icons/fi"
import { verdictInfo, shortDate } from "../verdicts"
import { tap } from "../native"
import "../styles/Parts.css"

const TABS = [
    { id: "home", label: "Home", icon: FiHome },
    { id: "new", label: "Analyze", icon: FiPlusCircle },
    { id: "history", label: "History", icon: FiClock },
    { id: "profile", label: "Profile", icon: FiUser }
]

export function BottomNav({ tab, onChange }) {
    return (
        <nav className="NavBar">
            {TABS.map((t) => {
                const Icon = t.icon
                const on = tab === t.id
                return (
                    <button
                        key={t.id}
                        className={on ? "NavItem NavItemOn" : "NavItem"}
                        onClick={() => {
                            tap()
                            onChange(t.id)
                        }}
                    >
                        <span className="NavPill">
                            <Icon />
                        </span>
                        <span className="NavLabel">{t.label}</span>
                    </button>
                )
            })}
        </nav>
    )
}

export function TopBar({ title, onBack, right }) {
    return (
        <header className="AppTopBar">
            {onBack && (
                <button className="AppIconButton" onClick={onBack} aria-label="Back">
                    <FiArrowLeft />
                </button>
            )}
            <h1 className="AppTopTitle" style={onBack ? null : { paddingLeft: 8 }}>{title}</h1>
            {right}
        </header>
    )
}

export function VerdictBadge({ run }) {
    const info = verdictInfo(run)
    return (
        <span className="AppBadge" style={{ background: info.soft, color: info.color }}>
            <span className="AppBadgeDot" style={{ background: info.color }}></span>
            {info.label}
        </span>
    )
}

export function RunRow({ run, onOpen }) {
    return (
        <button
            className="RunRow"
            onClick={() => {
                tap()
                onOpen(run.id)
            }}
        >
            <div className="RunMain">
                <p className="RunQuestion">{run.question}</p>
                <div className="RunMeta">
                    <VerdictBadge run={run} />
                    <span>#{run.id} · {shortDate(run.created_at)}</span>
                </div>
            </div>
            <FiChevronRight className="RunArrow" />
        </button>
    )
}

export function UsageRing({ usage, size }) {
    const box = size || 92
    const stroke = 9
    const radius = (box - stroke) / 2
    const length = 2 * Math.PI * radius
    let part = 1
    let big = "∞"
    if (usage && !usage.unlimited) {
        part = usage.limit > 0 ? usage.left / usage.limit : 0
        big = String(usage.left)
    }
    return (
        <svg width={box} height={box} viewBox={"0 0 " + box + " " + box} className="RingSvg">
            <defs>
                <linearGradient id="RingGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8b7bff" />
                    <stop offset="1" stopColor="#3fb6f5" />
                </linearGradient>
            </defs>
            <circle cx={box / 2} cy={box / 2} r={radius} fill="none" stroke="#22274a" strokeWidth={stroke} />
            <circle
                cx={box / 2}
                cy={box / 2}
                r={radius}
                fill="none"
                stroke="url(#RingGradient)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={length}
                strokeDashoffset={length * (1 - part)}
                transform={"rotate(-90 " + box / 2 + " " + box / 2 + ")"}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="RingBig">{big}</text>
            <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" className="RingSmall">left</text>
        </svg>
    )
}

export function SpecCurve({ analysts }) {
    const points = analysts
        .filter((a) => a.effect !== null && a.effect !== undefined)
        .map((a) => ({ effect: a.effect, p: a.p_value, n: a.analyst_number }))
        .sort((a, b) => a.effect - b.effect)

    if (points.length === 0) {
        return <p className="ChartEmpty">No analyst returned a result.</p>
    }

    const width = 340
    const height = 190
    const left = 42
    const right = 12
    const top = 14
    const bottom = 26

    let min = Math.min(0, ...points.map((p) => p.effect))
    let max = Math.max(0, ...points.map((p) => p.effect))
    if (max - min < 0.000001) {
        max = max + 1
        min = min - 1
    }
    const pad = (max - min) * 0.12
    min = min - pad
    max = max + pad

    const y = (v) => top + (max - v) / (max - min) * (height - top - bottom)
    const x = (i) => left + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (width - left - right)

    const sorted = points.map((p) => p.effect).slice().sort((a, b) => a - b)
    const middle = sorted.length % 2 === 1 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    const ticks = [max - pad, (max + min) / 2, min + pad]

    return (
        <svg viewBox={"0 0 " + width + " " + height} className="ChartSvg">
            {ticks.map((t, i) => (
                <g key={i}>
                    <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke="#1c2142" />
                    <text x={left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="ChartTick">{formatNumber(t)}</text>
                </g>
            ))}
            <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="#6f7499" strokeWidth="1.2" />
            <line x1={left} x2={width - right} y1={y(middle)} y2={y(middle)} stroke="#a99cff" strokeDasharray="5 4" />
            <text x={width - right} y={y(middle) - 7} textAnchor="end" className="ChartMiddle">middle {formatNumber(middle)}</text>
            {points.map((p, i) => (
                <circle key={i} cx={x(i)} cy={y(p.effect)} r={points.length > 40 ? 3 : 5} fill={p.p < 0.05 ? "#4ade80" : "#6f7499"} />
            ))}
            <text x={left} y={height - 6} className="ChartTick">smallest effect</text>
            <text x={width - right} y={height - 6} textAnchor="end" className="ChartTick">largest effect</text>
        </svg>
    )
}

export function ScatterChart({ chart, outcome, mainVariable }) {
    if (!chart || !chart.columns || !chart.rows) {
        return <p className="ChartEmpty">No data to show.</p>
    }
    const yi = chart.columns.indexOf(outcome)
    const xi = chart.columns.indexOf(mainVariable)
    if (xi < 0 || yi < 0) {
        return <p className="ChartEmpty">No data to show.</p>
    }

    const rows = chart.rows.filter((r) => r[xi] !== null && r[yi] !== null).slice(0, 400)
    if (rows.length < 2) {
        return <p className="ChartEmpty">No data to show.</p>
    }

    const width = 340
    const height = 220
    const left = 42
    const right = 10
    const top = 10
    const bottom = 34

    const xs = rows.map((r) => r[xi])
    const ys = rows.map((r) => r[yi])
    let xMin = Math.min(...xs)
    let xMax = Math.max(...xs)
    let yMin = Math.min(...ys)
    let yMax = Math.max(...ys)
    if (xMax === xMin) {
        xMax = xMax + 1
    }
    if (yMax === yMin) {
        yMax = yMax + 1
    }

    const px = (v) => left + (v - xMin) / (xMax - xMin) * (width - left - right)
    const py = (v) => top + (yMax - v) / (yMax - yMin) * (height - top - bottom)

    const n = xs.length
    const meanX = xs.reduce((a, b) => a + b, 0) / n
    const meanY = ys.reduce((a, b) => a + b, 0) / n
    let sxy = 0
    let sxx = 0
    for (let i = 0; i < n; i++) {
        sxy = sxy + (xs[i] - meanX) * (ys[i] - meanY)
        sxx = sxx + (xs[i] - meanX) * (xs[i] - meanX)
    }
    const slope = sxx === 0 ? 0 : sxy / sxx
    const start = meanY + slope * (xMin - meanX)
    const end = meanY + slope * (xMax - meanX)

    return (
        <svg viewBox={"0 0 " + width + " " + height} className="ChartSvg">
            <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} stroke="#22274a" />
            <line x1={left} x2={left} y1={top} y2={height - bottom} stroke="#22274a" />
            {rows.map((r, i) => (
                <circle key={i} cx={px(r[xi])} cy={py(r[yi])} r="2.6" fill="#3fb6f5" opacity="0.55" />
            ))}
            <line x1={px(xMin)} y1={py(start)} x2={px(xMax)} y2={py(end)} stroke="#a99cff" strokeWidth="2.4" />
            <text x={left - 6} y={top + 4} textAnchor="end" className="ChartTick">{formatNumber(yMax)}</text>
            <text x={left - 6} y={height - bottom} textAnchor="end" className="ChartTick">{formatNumber(yMin)}</text>
            <text x={left} y={height - bottom + 14} className="ChartTick">{formatNumber(xMin)}</text>
            <text x={width - right} y={height - bottom + 14} textAnchor="end" className="ChartTick">{formatNumber(xMax)}</text>
            <text x={(left + width - right) / 2} y={height - 4} textAnchor="middle" className="ChartAxis">{mainVariable}</text>
        </svg>
    )
}

export function formatNumber(v) {
    if (v === null || v === undefined || isNaN(v)) {
        return "-"
    }
    const a = Math.abs(v)
    if (a === 0) {
        return "0"
    }
    if (a >= 1000) {
        return v.toFixed(0)
    }
    if (a >= 10) {
        return v.toFixed(1)
    }
    if (a >= 0.1) {
        return v.toFixed(2)
    }
    return v.toFixed(3)
}
