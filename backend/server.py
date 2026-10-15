from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from ai.Model import GptModel
from database.mysql import Mysql
import uvicorn
import bcrypt
from datetime import datetime
from email_service.otp import send_otp
from email_service.register_email import send_register_email
import os
import pandas as pd
import json
import uuid
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://forkwise.online",
        "https://www.forkwise.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY"),
    same_site="lax",
    https_only=os.getenv("HTTPS_ONLY") == "true",
    max_age=60 * 60 * 24 * 7
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "upload")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ANALYST_CHOICES = ["10", "25", "50", "100"]
MISSING_NUMBERS = ["0", "-1", "-999"]


@app.get("/health")
def health():
    return {"Message": "ok"}


def read_file(path, name):
    try:
        name = name.lower()
        if name.endswith(".csv"):
            return pd.read_csv(path)

        if name.endswith(".xlsx") or name.endswith(".xls"):
            return pd.read_excel(path)

        if name.endswith(".json"):
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            return pd.json_normalize(data)

        return None
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        return None


def clean_missing(table, marker):
    if marker in MISSING_NUMBERS:
        number = float(marker)
        for c in table.select_dtypes("number").columns:
            table[c] = table[c].replace(number, float("nan"))
    return table

@app.post("/api/analyze")
async def analyze(request: Request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return {"Message": "login"}

    try:
        form = await request.form()

        files = form.getlist("files")
        fileDetails = json.loads(form.get("fileDetails") or "{}")

        question = (form.get("question") or "").strip()
        outcome = (form.get("outcome") or "").strip()
        mainVariable = (form.get("mainVariable") or "").strip()
        expectation = form.get("expectation") or "unknown"
        analysts = form.get("analysts") or "10"
        notes = (form.get("notes") or "").strip()
        relation = form.get("relation") or "single"
        joinColumn = form.get("joinColumn") or ""

        if len(files) == 0:
            return {"Message": False, "error": "Please upload at least one file."}
        if question == "" or outcome == "" or mainVariable == "":
            return {"Message": False, "error": "Please write the question, the outcome and the main variable."}
        if len(question) > 500 or len(notes) > 2000:
            return {"Message": False, "error": "Your question or notes are too long."}
        if analysts not in ANALYST_CHOICES:
            analysts = "10"

        file_information = []
        tables = []
        main_index = 0

        for f in files:
            file_name = os.path.basename(f.filename)
            details = fileDetails.get(file_name, {})
            path = os.path.join(UPLOAD_DIR, uuid.uuid4().hex + "_" + file_name)

            with open(path, "wb") as fl:
                fl.write(await f.read())

            content = read_file(path, file_name)
            os.remove(path)

            if content is None or len(content) == 0:
                return {"Message": False, "error": f"Could not read {file_name}. Please upload a CSV, Excel or JSON file."}

            content = clean_missing(content, details.get("missing", "empty"))

            if details.get("role") == "main" and main_index == 0:
                main_index = len(tables)

            tables.append(content)
            file_information.append({
                "name": file_name,
                "file_information": details,
                "content": content.to_dict(orient="records")
            })

        combined = tables[main_index]
        keys = []

        if relation == "join":
            for k in joinColumn.split(","):
                if k.strip() != "":
                    keys.append(k.strip())
            if len(keys) == 0:
                return {"Message": False, "error": "Please write the common column that connects the files."}
            for i in range(len(tables)):
                if i == main_index:
                    continue
                t = tables[i]
                for k in keys:
                    if k not in t.columns or k not in combined.columns:
                        return {"Message": False, "error": f"Column {k} is not in every file."}
                combined = combined.merge(t, on=keys, how="inner")

        if relation == "stack":
            combined = pd.concat(tables, ignore_index=True)

        print("combined:", combined.shape, flush=True)

        number_columns = []
        for c in combined.select_dtypes("number").columns:
            if c not in keys:
                number_columns.append(c)

        if len(number_columns) < 2:
            return {"Message": False, "error": "The data needs at least two number columns."}
        if len(combined) < 30:
            return {"Message": False, "error": "The data needs at least 30 rows."}

        data = [
            {
                "question": question,
                "outcome": outcome,
                "mainVariable": mainVariable,
                "expectation": expectation,
                "notes": notes,
                "joinColumn": joinColumn,
                "files": file_information,
                "combined": combined.to_dict(orient="records")
            }
        ]

        filenames = ", ".join(f["name"] for f in file_information)

        model = GptModel()
        outcome, mainVariable = await run_in_threadpool(model.pick_columns, question, outcome, mainVariable, number_columns)
        if outcome is None:
            return {"Message": False, "error": "Could not match your outcome and main variable to columns in the file. Please write the column names."}

        data[0]["outcome"] = outcome
        data[0]["mainVariable"] = mainVariable
        print("columns chosen:", outcome, mainVariable, flush=True)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        return {"Message": False, "error": "Could not read your data. Please check the files and try again."}

    mysql = Mysql()
    row_id = mysql.add_history(user_id=user_id, question=question, filename=filenames, status="running", outcome=outcome, main_variable=mainVariable)
    if not row_id:
        return {"Message": False, "error": "Could not save the analysis."}

    try:
        result = await run_in_threadpool(model.Predict, analysts, data)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        mysql.update_history(row_id=row_id, status="failed")
        return {"Message": False, "error": "The analysis failed. Please try again."}

    saved = mysql.save_results(history_id=row_id, result=result)
    if not saved:
        mysql.update_history(row_id=row_id, status="failed")
        return {"Message": False, "error": "The analysis finished but could not be saved."}

    return {
        "Message": True,
        "row_id": row_id
    }


@app.websocket("/ws/auth")
async def register(websocket: WebSocket):
    try:
        await websocket.accept()
        data = await websocket.receive_json()

        mysql = Mysql()

        if data["type"] == "register":
            try:
                username = str(data.get("username", "")).strip()
                email = str(data.get("email", "")).strip().lower()
                password = str(data.get("password", ""))
                submited_otp_code = str(data.get("otp_code" , "")).strip()

                if username == "" or "@" not in email or len(password) < 8 or len(username) > 50 or len(email) > 150:
                    await websocket.send_json({
                        "Message": False,
                        "error": "Please fill in every field correctly."
                    })
                    await websocket.close()
                    return

                isExist = mysql.checkUsernameIfExist(username=username, email=email)
                if isExist == True:
                    await websocket.send_json({
                        "Message": False,
                        "error": "This username or email is already used."
                    })
                    await websocket.close()
                    return

                otps = mysql.select_otps(email=email)

                if otps["Message"] == False or otps["expires_at"] <= datetime.now():
                    await websocket.send_json({
                        "Message": False,
                        "error": "Please ask for a verification code first, or ask for a new one if it has expired."
                    })
                    await websocket.close()
                    return

                if otps["attempts"] >= 5:
                    await websocket.send_json({
                        "Message": False,
                        "error": "Too many tries. Please ask for a new code."
                    })
                    await websocket.close()
                    return

                is_valid = bcrypt.checkpw(
                    submited_otp_code.encode("utf-8"),
                    otps["otp_hash"].encode("utf-8")
                )

                if not is_valid:
                    await websocket.send_json({
                        "Message": False,
                        "error": "The verification code is wrong."
                    })
                    await websocket.close()
                    return

                name = str(data.get("name", "")).strip()
                lastname = str(data.get("lastname", "")).strip()
                result = mysql.addUser(
                    username=username,
                    email=email,
                    name=name,
                    lastname=lastname,
                    password=password
                )
                if result == True:
                    mysql.delete_otp(email=email)
                    res = send_register_email(to=email , name=name, username=username)
                    if res.get("Message") == True:
                        await websocket.send_json({
                            "Message": True,
                        })
                    else:
                        await websocket.send_json({
                            "Message": True
                        })
                else:
                    await websocket.send_json({
                        "Message": False,
                        "error": "Could not create the account. Please try again."
                    })

            except Exception as e:
               print(f"ERROR: {e}")
               await websocket.send_json({
                       "Message": False,
                    })

        if data["type"] == "whoami":
            user_id = websocket.session.get("user_id")
            if user_id is None:
                await websocket.send_json({"Message": False})
            else:
                data = {
                    "Message": True,
                    "user_id": user_id,
                    "username": websocket.session.get("username"),
                    "name": websocket.session.get("name"),
                    "lastname": websocket.session.get("lastname")
                }
                await websocket.send_json(data)

        if data.get("type") == "send_otp_code":
            email = str(data.get("email", "")).strip().lower()

            if not email or "@" not in email or "." not in email or len(email) > 150:
                await websocket.send_json({
                    "Message": False,
                    "error": "Please write a real email address."
                })
            elif mysql.checkUsernameIfExist(username="", email=email):
                await websocket.send_json({
                    "Message": False,
                    "error": "This email is already used."
                })
            elif mysql.otp_sent_recently(email=email):
                await websocket.send_json({
                    "Message": False,
                    "error": "Please wait one minute before asking for a new code."
                })
            else:
                response = await run_in_threadpool(send_otp, email)
                if response and response.get("Message") is True:
                    await websocket.send_json({
                        "Message": True
                    })
                else:
                    await websocket.send_json({
                        "Message": False,
                        "error": "Could not send the email. Please try again later."
                    })

            await websocket.close()
            return

        await websocket.close()

    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        try:
            await websocket.send_json({"Message": False})
            await websocket.close()
        except Exception:
            pass



@app.post("/auth/login")
async def login(request: Request):
    data = await request.json()
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if username == "" or password == "":
        return {"Message": False}
    result = Mysql().Login(username=username, password=password)
    if not result or result["Message"] == False:
        return {"Message": False}
    request.session["user_id"] = result["user_id"]
    request.session["username"] = result["username"]
    request.session["name"] = result["name"]
    request.session["lastname"] = result["lastname"]
    return {"Message": True}

@app.post("/auth/logout")
def logout(request: Request):
    request.session.clear()
    return {"Message": True}

@app.get("/api/runs/{run_id}")
def get_run(run_id: int, request: Request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return {"Message": "login"}
    result = Mysql().get_run(history_id=run_id, user_id=user_id)
    if result is None:
        return {"Message": False}
    return {"Message": True, "run": result["run"], "analysts": result["analysts"]}


@app.get("/api/get/history")
def get_History(request: Request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return {"Message": "login"}
    return Mysql().getHistory(user_id=user_id)


@app.post("/api/contact")
async def contact(request: Request):
    data = await request.json()
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    topic = str(data.get("topic", "question")).strip()
    message = str(data.get("message", "")).strip()

    if name == "" or email == "" or message == "":
        return {"Message": False, "error": "Please fill in your name, email and message."}
    if "@" not in email or "." not in email:
        return {"Message": False, "error": "Please write a real email address."}
    if topic not in ["question", "bug", "feedback", "judges"]:
        topic = "question"
    if len(name) > 100 or len(email) > 150 or len(message) > 2000:
        return {"Message": False, "error": "Your message is too long."}

    saved = Mysql().add_contact(name=name, email=email, topic=topic, message=message)
    if not saved:
        return {"Message": False, "error": "Could not save your message. Please try again."}
    return {"Message": True}

def check_admin(request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return {"Message": "login"}
    if not Mysql().is_admin(user_id):
        return {"Message": "forbidden"}
    return None


@app.get("/api/admin/stats")
def admin_stats(request: Request):
    problem = check_admin(request)
    if problem:
        return problem
    return Mysql().admin_stats()


@app.get("/api/admin/users")
def admin_users(request: Request):
    problem = check_admin(request)
    if problem:
        return problem
    return Mysql().admin_users()


@app.get("/api/admin/runs")
def admin_runs(request: Request):
    problem = check_admin(request)
    if problem:
        return problem
    return Mysql().admin_runs()


@app.get("/api/admin/messages")
def admin_messages(request: Request):
    problem = check_admin(request)
    if problem:
        return problem
    return Mysql().admin_messages()


@app.delete("/api/admin/runs/{run_id}")
def admin_delete_run(run_id: int, request: Request):
    problem = check_admin(request)
    if problem:
        return problem
    deleted = Mysql().admin_delete_run(run_id)
    return {"Message": deleted}


@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, request: Request):
    problem = check_admin(request)
    if problem:
        return problem
    if user_id == request.session.get("user_id"):
        return {"Message": False, "error": "You cannot delete your own account."}
    deleted = Mysql().admin_delete_user(user_id)
    return {"Message": deleted}


@app.delete("/api/admin/messages/{message_id}")
def admin_delete_message(message_id: int, request: Request):
    problem = check_admin(request)
    if problem:
        return problem
    deleted = Mysql().admin_delete_message(message_id)
    return {"Message": deleted}


@app.delete("/api/admin/failed-runs")
def admin_delete_failed_runs(request: Request):
    problem = check_admin(request)
    if problem:
        return problem
    deleted = Mysql().admin_delete_failed_runs()
    if deleted < 0:
        return {"Message": False}
    return {"Message": True, "deleted": deleted}



if __name__ == "__main__":
    uvicorn.run("server:app" , port=5000 , reload=True)
