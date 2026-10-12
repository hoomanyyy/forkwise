function solveSystem(matrix, vector) {
    const size = vector.length
    const a = matrix.map((row) => [...row])
    const b = [...vector]

    for (let col = 0; col < size; col++) {
        let best = col
        for (let row = col + 1; row < size; row++) {
            if (Math.abs(a[row][col]) > Math.abs(a[best][col])) {
                best = row
            }
        }
        const tempRow = a[col]
        a[col] = a[best]
        a[best] = tempRow
        const tempValue = b[col]
        b[col] = b[best]
        b[best] = tempValue

        if (Math.abs(a[col][col]) < 1e-12) {
            return null
        }

        for (let row = col + 1; row < size; row++) {
            const factor = a[row][col] / a[col][col]
            for (let k = col; k < size; k++) {
                a[row][k] = a[row][k] - factor * a[col][k]
            }
            b[row] = b[row] - factor * b[col]
        }
    }

    const answer = []
    for (let i = 0; i < size; i++) {
        answer.push(0)
    }
    for (let row = size - 1; row >= 0; row--) {
        let total = b[row]
        for (let k = row + 1; k < size; k++) {
            total = total - a[row][k] * answer[k]
        }
        answer[row] = total / a[row][row]
    }
    return answer
}

function choose(n, k) {
    let result = 1
    for (let i = 1; i <= k; i++) {
        result = result * (n - k + i) / i
    }
    return result
}

function fitPolynomial(points, degree) {
    let shift = 0
    for (const p of points) {
        shift = shift + p[0]
    }
    shift = shift / points.length

    let scale = 0
    for (const p of points) {
        if (Math.abs(p[0] - shift) > scale) {
            scale = Math.abs(p[0] - shift)
        }
    }
    if (scale === 0) {
        scale = 1
    }

    const size = degree + 1
    const matrix = []
    const vector = []
    for (let i = 0; i < size; i++) {
        const row = []
        for (let j = 0; j < size; j++) {
            row.push(0)
        }
        matrix.push(row)
        vector.push(0)
    }

    for (const p of points) {
        const z = (p[0] - shift) / scale
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                matrix[i][j] = matrix[i][j] + Math.pow(z, i + j)
            }
            vector[i] = vector[i] + p[1] * Math.pow(z, i)
        }
    }

    const zCoefs = solveSystem(matrix, vector)
    if (zCoefs === null) {
        return null
    }

    const coefs = []
    for (let i = 0; i < size; i++) {
        coefs.push(0)
    }
    for (let k = 0; k < size; k++) {
        for (let j = 0; j <= k; j++) {
            coefs[j] = coefs[j] + zCoefs[k] * choose(k, j) * Math.pow(-shift, k - j) / Math.pow(scale, k)
        }
    }

    return { coefs: coefs, zCoefs: zCoefs, shift: shift, scale: scale }
}

export function predictY(model, x) {
    const c = model.coefs
    if (model.type === "linear" || model.type === "quadratic" || model.type === "cubic") {
        const z = (x - model.shift) / model.scale
        let y = 0
        for (let i = 0; i < model.zCoefs.length; i++) {
            y = y + model.zCoefs[i] * Math.pow(z, i)
        }
        return y
    }
    if (model.type === "log") {
        return c[0] + c[1] * Math.log(x)
    }
    if (model.type === "exp") {
        return c[0] * Math.exp(c[1] * x)
    }
    if (model.type === "power") {
        return c[0] * Math.pow(x, c[1])
    }
    return 0
}

function number(value) {
    return Number(value.toPrecision(4)).toString()
}

function term(value, text) {
    if (value < 0) {
        return " − " + number(Math.abs(value)) + text
    }
    return " + " + number(value) + text
}

function makeFormula(model) {
    const c = model.coefs
    if (model.type === "linear") {
        return "y = " + number(c[0]) + term(c[1], "·x")
    }
    if (model.type === "quadratic") {
        return "y = " + number(c[0]) + term(c[1], "·x") + term(c[2], "·x²")
    }
    if (model.type === "cubic") {
        return "y = " + number(c[0]) + term(c[1], "·x") + term(c[2], "·x²") + term(c[3], "·x³")
    }
    if (model.type === "log") {
        return "y = " + number(c[0]) + term(c[1], "·ln(x)")
    }
    if (model.type === "exp") {
        return "y = " + number(c[0]) + " · e^(" + number(c[1]) + "·x)"
    }
    if (model.type === "power") {
        return "y = " + number(c[0]) + " · x^" + number(c[1])
    }
    return ""
}

function addScores(model, points, predictors) {
    let meanY = 0
    for (const p of points) {
        meanY = meanY + p[1]
    }
    meanY = meanY / points.length

    let errorSum = 0
    let totalSum = 0
    for (const p of points) {
        const guess = predictY(model, p[0])
        errorSum = errorSum + (p[1] - guess) * (p[1] - guess)
        totalSum = totalSum + (p[1] - meanY) * (p[1] - meanY)
    }

    let r2 = 0
    if (totalSum > 0) {
        r2 = 1 - errorSum / totalSum
    }
    const n = points.length
    let adjusted = r2
    if (n - predictors - 1 > 0) {
        adjusted = 1 - (1 - r2) * (n - 1) / (n - predictors - 1)
    }

    model.r2 = r2
    model.adjusted = adjusted
    model.formula = makeFormula(model)
    return model
}

export function fitAllModels(points) {
    const models = []

    const names = ["linear", "quadratic", "cubic"]
    const labels = ["Linear", "Quadratic (curve)", "Cubic (S-curve)"]
    for (let degree = 1; degree <= 3; degree++) {
        const fit = fitPolynomial(points, degree)
        if (fit !== null && points.length > degree + 1) {
            models.push(addScores({ type: names[degree - 1], name: labels[degree - 1], coefs: fit.coefs, zCoefs: fit.zCoefs, shift: fit.shift, scale: fit.scale }, points, degree))
        }
    }

    const positiveX = points.filter((p) => p[0] > 0)
    if (positiveX.length === points.length) {
        const logPoints = positiveX.map((p) => [Math.log(p[0]), p[1]])
        const fit = fitPolynomial(logPoints, 1)
        if (fit !== null) {
            models.push(addScores({ type: "log", name: "Logarithmic", coefs: fit.coefs }, points, 1))
        }
    }

    const positiveY = points.filter((p) => p[1] > 0)
    if (positiveY.length === points.length) {
        const expPoints = positiveY.map((p) => [p[0], Math.log(p[1])])
        const fit = fitPolynomial(expPoints, 1)
        if (fit !== null) {
            models.push(addScores({ type: "exp", name: "Exponential", coefs: [Math.exp(fit.coefs[0]), fit.coefs[1]] }, points, 1))
        }
    }

    const positiveBoth = points.filter((p) => p[0] > 0 && p[1] > 0)
    if (positiveBoth.length === points.length) {
        const powerPoints = positiveBoth.map((p) => [Math.log(p[0]), Math.log(p[1])])
        const fit = fitPolynomial(powerPoints, 1)
        if (fit !== null) {
            models.push(addScores({ type: "power", name: "Power", coefs: [Math.exp(fit.coefs[0]), fit.coefs[1]] }, points, 1))
        }
    }

    let bestIndex = 0
    for (let i = 1; i < models.length; i++) {
        if (models[i].adjusted > models[bestIndex].adjusted) {
            bestIndex = i
        }
    }
    for (let i = 0; i < models.length; i++) {
        models[i].best = i === bestIndex
    }
    return models
}
