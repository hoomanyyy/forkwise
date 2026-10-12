import statistics
import pandas as pd
import statsmodels.formula.api as smf


def clean_data(df, outcome, x, answer):
    controls = []
    root = outcome.split("_")[0]
    for c in answer.get("covariates", []):
        if root in c:
            continue
        if c in df.columns and c != outcome and c != x and pd.api.types.is_numeric_dtype(df[c]):
            controls.append(c)

    data = df[[outcome, x] + controls].copy()

    if answer.get("missing") == "median_impute":
        data = data.fillna(data.median())
    else:
        data = data.dropna()

    if answer.get("outliers") == "drop_3sd":
        z = (data - data.mean()) / data.std()
        data = data[(z.abs() <= 3).all(axis=1)]

    return data, controls


def draw_line(data, outcome, x, controls):
    columns = [x] + controls
    data[columns] = (data[columns] - data[columns].mean()) / data[columns].std()

    formula = f'Q("{outcome}") ~ ' + " + ".join(f'Q("{c}")' for c in columns)
    line = smf.ols(formula, data=data).fit()

    name = f'Q("{x}")'
    return {
        "effect": round(float(line.params[name]), 3),
        "p": round(float(line.pvalues[name]), 4),
        "rows": len(data),
        "controls": controls,
    }


def analyze_one(df, outcome, x, answer):
    if answer is None:
        return None
    data, controls = clean_data(df, outcome, x, answer)
    if len(data) < 30:
        return None
    return draw_line(data, outcome, x, controls)


def judge(results):
    valid = [r for r in results if r is not None]
    if len(valid) == 0:
        return {"verdict": "no valid analysts"}

    up = 0
    real = 0
    for r in valid:
        if r["effect"] > 0:
            up = up + 1
        if r["p"] < 0.05:
            real = real + 1

    down = len(valid) - up
    agree = max(up, down) / len(valid)
    significant = real / len(valid)

    if agree >= 0.9 and significant >= 0.8:
        verdict = "robust"
    elif agree >= 0.85 and significant >= 0.3:
        verdict = "fragile"
    else:
        verdict = "choice_dependent"

    effects = [r["effect"] for r in valid]
    return {
        "analysts": len(valid),
        "agree": round(agree * 100),
        "significant": round(significant * 100),
        "middle_effect": round(statistics.median(effects), 3),
        "verdict": verdict,
    }

def make_chart(df, outcome, x, results):
    columns = [outcome, x]
    for r in results:
        if r is not None:
            for c in r["controls"]:
                if c not in columns:
                    columns.append(c)
    for c in df.select_dtypes("number").columns:
        if c not in columns and len(columns) < 12:
            columns.append(c)

    data = df[columns].dropna(subset=[outcome, x])
    if len(data) < 3:
        return None
    sample = data.sample(n=min(1000, len(data)), random_state=1)

    rows = []
    for values in sample.values.tolist():
        row = []
        for v in values:
            if pd.isna(v):
                row.append(None)
            else:
                row.append(round(float(v), 4))
        rows.append(row)

    return {"columns": columns, "rows": rows, "total_rows": len(data)}