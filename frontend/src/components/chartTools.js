export function shortName(name, max) {
    if (name.length <= max) {
        return name
    }
    return name.slice(0, max - 1) + "…"
}

export function formatNumber(value) {
    if (Math.abs(value) >= 1000000) {
        return (value / 1000000).toFixed(1) + "M"
    }
    if (Math.abs(value) >= 1000) {
        return (value / 1000).toFixed(0) + "k"
    }
    if (Math.abs(value) >= 100) {
        return value.toFixed(0)
    }
    return value.toFixed(1)
}

export function fitLine(points) {
    let sumX = 0
    let sumY = 0
    for (const p of points) {
        sumX = sumX + p[0]
        sumY = sumY + p[1]
    }
    const meanX = sumX / points.length
    const meanY = sumY / points.length

    let together = 0
    let spreadX = 0
    let spreadY = 0
    for (const p of points) {
        together = together + (p[0] - meanX) * (p[1] - meanY)
        spreadX = spreadX + (p[0] - meanX) * (p[0] - meanX)
        spreadY = spreadY + (p[1] - meanY) * (p[1] - meanY)
    }

    let slope = 0
    if (spreadX > 0) {
        slope = together / spreadX
    }
    let r = 0
    if (spreadX > 0 && spreadY > 0) {
        r = together / Math.sqrt(spreadX * spreadY)
    }

    return {
        slope: slope,
        intercept: meanY - slope * meanX,
        r: r,
        r2: r * r,
        meanX: meanX,
        meanY: meanY,
        sdX: Math.sqrt(spreadX / (points.length - 1))
    }
}

export function getPairs(chart, xName, yName) {
    const xIndex = chart.columns.indexOf(xName)
    const yIndex = chart.columns.indexOf(yName)
    const pairs = []
    for (const row of chart.rows) {
        if (row[xIndex] !== null && row[yIndex] !== null) {
            pairs.push([row[xIndex], row[yIndex]])
        }
    }
    return pairs
}

export function downloadChart(svgId, fileName) {
    const svg = document.getElementById(svgId)
    const copy = svg.cloneNode(true)
    const original = svg.querySelectorAll("*")
    const copied = copy.querySelectorAll("*")
    for (let i = 0; i < original.length; i++) {
        const style = window.getComputedStyle(original[i])
        copied[i].setAttribute("style",
            "fill:" + style.fill +
            ";fill-opacity:" + style.fillOpacity +
            ";stroke:" + style.stroke +
            ";stroke-width:" + style.strokeWidth +
            ";stroke-dasharray:" + style.strokeDasharray +
            ";stroke-linecap:" + style.strokeLinecap +
            ";stroke-linejoin:" + style.strokeLinejoin +
            ";font-size:" + style.fontSize +
            ";font-family:" + style.fontFamily +
            ";font-weight:" + style.fontWeight)
    }
    const box = svg.viewBox.baseVal
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    copy.setAttribute("width", box.width)
    copy.setAttribute("height", box.height)
    const text = new XMLSerializer().serializeToString(copy)

    const image = new Image()
    image.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = box.width * 2
        canvas.height = box.height * 2
        const context = canvas.getContext("2d")
        context.fillStyle = "#12152b"
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const link = document.createElement("a")
        link.download = fileName
        link.href = canvas.toDataURL("image/png")
        link.click()
    }
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text)
}

export function downloadCsv(chart, fileName) {
    let text = chart.columns.join(",") + "\n"
    for (const row of chart.rows) {
        const cells = []
        for (const value of row) {
            cells.push(value === null ? "" : value)
        }
        text = text + cells.join(",") + "\n"
    }
    const link = document.createElement("a")
    link.download = fileName
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(text)
    link.click()
}
