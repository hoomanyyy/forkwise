import requests
from dotenv import load_dotenv
import os
import pandas as pd
from database.mysql import Mysql
from ai.analysis import judge , analyze_one, make_chart
import re
import json

load_dotenv()

API_KEY = os.getenv("WORKERS_AI_API_KEY")
ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")

model1 = os.getenv("MODEL_1")
model2 = os.getenv("MODEL_2")
model3 = os.getenv("MODEL_3")

def parse_answer(answer):
    if isinstance(answer, dict):
        return answer
    text = re.sub(r"<think>.*?</think>", "", answer, flags=re.S)
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(text[start:end + 1])
    except ValueError:
        return None

class GptModel():
    def __init__(self , model_name1=model1, model_name2=model2 , model_name3=model3):
         self.model_name1 = model_name1
         self.model_name2 = model_name2
         self.model_name3 = model_name3
         self.BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/"
         self.APY_KEY = API_KEY


    def summarize(self, records, max_cols=60):
        df = pd.DataFrame(records)
        lines = [f"rows: {len(df)}, columns: {df.shape[1]}"]
        for col in df.columns[:max_cols]:
            s = df[col]
            missing = round(s.isna().mean() * 100, 1)
            if pd.api.types.is_numeric_dtype(s):
                lines.append(f"- {col}: number, min={s.min()}, mean={round(s.mean(), 2)}, max={s.max()}, missing={missing}%")
            else:
                top = s.astype(str).value_counts().head(3).index.tolist()
                lines.append(f"- {col}: text, {s.nunique()} different values, e.g. {top}, missing={missing}%")
        return "\n".join(lines)

    def pick_columns(self, question, outcome, main_variable, columns):
        if outcome in columns and main_variable in columns and outcome != main_variable:
            return outcome, main_variable

        prompt = f"""Research question: {question}
The user described the outcome (Y) as: {outcome}
The user described the main variable (X) as: {main_variable}

These are the only number columns in the file:
{", ".join(columns)}

Choose the one column that best matches Y and the one column that best matches X.
Use exact column names from the list. Y and X must be different columns.
Answer only with JSON: {{"outcome": "column_name", "mainVariable": "column_name"}}"""

        headers = {"Authorization": f"Bearer {self.APY_KEY}"}
        body = {
            "messages": [
                {"role": "system", "content": "You match descriptions to column names. Answer with JSON only."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 100
        }
        try:
            response = requests.post(self.BASE_URL + self.model_name1, headers=headers, json=body, timeout=60)
            if response.status_code != 200:
                return None, None
            answer = parse_answer(response.json()["result"]["response"])
        except Exception as e:
            print(f"ERROR: {e}", flush=True)
            return None, None

        if answer is None:
            return None, None

        y = answer.get("outcome")
        x = answer.get("mainVariable")
        if y not in columns or x not in columns or y == x:
            return None, None
        return y, x

    def Predict(self, analysts , information):
        info = information[0]

        print("MODELS:", model1, model2, model3, flush=True)
        print("ACCOUNT_ID found:", ACCOUNT_ID is not None, "| API_KEY found:", API_KEY is not None, flush=True)

        url1 = self.BASE_URL + self.model_name1
        url2 = self.BASE_URL + self.model_name2
        url3 = self.BASE_URL + self.model_name3

        text_information = ""
        for f in info["files"]:
            fi = f["file_information"]
            text_information += f"File: {f['name']}\n"
            text_information += f"Description: {fi.get('description', '')}\n"
            text_information += f"Source: {fi.get('source', '')}\n"
            text_information += f"One row means: {fi.get('rowMeaning', '')}\n"
            text_information += f"Time period: {fi.get('period', '')}\n"
            text_information += self.summarize(f["content"]) + "\n\n"

        text_information += "Combined table (this is the table that will be analyzed):\n"
        text_information += self.summarize(info["combined"]) + "\n"

        prompt = f"""Research question: {info['question']}
                        Outcome (Y): {info['outcome']}
                        Main variable (X): {info['mainVariable']}
                        Common column between files: {info['joinColumn']}
                        Extra notes: {info['notes']}

                        Files:
                        {text_information}
                        Decide how to analyze the effect of X on Y:
                        1. covariates: other columns to control for. Use only column names from above. Never use Y or X.
                        2. model_family: "ols" if Y is a normal number, "logistic" if Y is only 0 or 1, "poisson" if Y is a count.
                        3. outliers: "keep" or "drop_3sd".
                        4. missing: "drop_rows" or "median_impute".
                        5. reason: one or two sentences explaining your choices.

                        Answer only with JSON in this exact shape (reason is required):
                        {{"covariates": ["col_a", "col_b"], "model_family": "ols", "outliers": "keep", "missing": "drop_rows", "reason": "I controlled for GDP and infant mortality because..."}}
                        """

        headers = {"Authorization": f"Bearer {self.APY_KEY}"}
        urls = [url1, url2, url3]
        answers = []
        styles = [
            "You like simple analyses with very few controls.", 
            "You like to control for many things.",
            "You are careful about outliers.",
            "You are careful about missing data.",
            "You think about differences in time and groups."
        ]

        for i in range(int(analysts)):
            url = urls[i % 3]
            style = styles[i % 5]
            body = {
                "messages": [
                    {"role": "system", "content": "You are an independent data analyst. " + style + " Answer with JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 400,
                "temperature": 0.9
            }

            try:
                response = requests.post(url, headers=headers, json=body, timeout=60)
                if response.status_code == 200:
                    answer = parse_answer(response.json()["result"]["response"])
                    answers.append(answer)
                    print(f"analyst {i + 1}: ok", flush=True)
                else:
                    answers.append(None)
                    print(f"analyst {i + 1}: ERROR {response.status_code}", flush=True)
            except Exception as e:
                answers.append(None)
                print(f"analyst {i + 1}: ERROR {e}", flush=True)

        df = pd.DataFrame(info["combined"])
        results = []
        for answer in answers:
            results.append(analyze_one(df, info["outcome"], info["mainVariable"], answer))
        
        chart = make_chart(df, info["outcome"], info["mainVariable"], results)
        verdict = judge(results)
        print("verdict:", verdict, flush=True)

        return {
            "Message": "ok",
            "answers": answers,
            "results": results,
            "verdict": verdict,
            "chart": chart
        }