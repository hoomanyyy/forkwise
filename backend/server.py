from fastapi import FastAPI, Request, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from ai.Model import GptModel
from database.mysql import Mysql
import uvicorn  
import bcrypt
from datetime import datetime
from email_service.email import send_email
from email_service.otp import send_otp
from email_service.register_email import send_register_email
import os
import pandas as pd
import json
import uuid
from starlette.middleware.sessions import SessionMiddleware
from itsdangerous import URLSafeTimedSerializer
from dotenv import load_dotenv
import requests
from database import agent_db
from database import studio_db
from agent.sandbox import check_repo_url
from fastapi import UploadFile, File, Form
from fastapi.responses import FileResponse
import hashlib

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://forkwiseai.com",
        "https://www.forkwiseai.com",
        "https://localhost",
        "http://localhost",
        "capacitor://localhost",
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
DAILY_LIMIT = int(os.getenv("DAILY_LIMIT", "5"))
TOKEN_DAYS = 30

token_maker = URLSafeTimedSerializer(os.getenv("SESSION_SECRET_KEY") or "dev-secret", salt="forkwise-mobile")


def make_token(user):
    return token_maker.dumps({
        "user_id": user["user_id"],
        "username": user["username"],
        "name": user["name"],
        "lastname": user["lastname"]
    })


def get_user(request):
    user_id = request.session.get("user_id")
    if user_id is not None:
        return {
            "user_id": user_id,
            "username": request.session.get("username"),
            "name": request.session.get("name"),
            "lastname": request.session.get("lastname")
        }

    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        return token_maker.loads(header[7:], max_age=TOKEN_DAYS * 24 * 60 * 60)
    except Exception:
        return None

FREE_PLAN = {
    "id": 1,
    "plan_type": "Free",
    "daily_limit": DAILY_LIMIT,
    "max_analysts": 10,
    "daily_chat_limit": 3,
    "can_export": False,
    "plan_expires_at": None
}

def get_usage(mysql, user_id):
    plan = mysql.get_user_plan(user_id)
    if plan is None:
        plan = FREE_PLAN
    
    used = mysql.count_today(user_id=user_id)
    unlimited = mysql.is_admin(user_id)
    left = plan["daily_limit"] - used
    if left < 0:
        left = 0
    return {"used": used, "limit": plan["daily_limit"], "left": left, "unlimited": unlimited, "plan": plan}

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
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    user_id = user["user_id"]

    usage = get_usage(Mysql(), user_id)
    if not usage["unlimited"] and usage["left"] <= 0:
        return {
            "Message": False,
            "limit": True,
            "upgrade": True,
            "error": f"Your {usage['plan']['plan_type']} plan allows {usage['limit']} analyses per day. Please come back tomorrow or upgrade your plan."
            }

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

        if not usage["unlimited"] and int(analysts) > usage["plan"]["max_analysts"]:
            return {
                "Message": False,
                "upgrade": True,
                "error": f"Your {usage['plan']['plan_type']} plan allows up to {usage['plan']['max_analysts']} AI analysts per run."
            }
        
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
                    await run_in_threadpool(send_register_email, email, name, username)
                    await websocket.send_json({
                        "Message": True,
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

        if data.get("type") == "send_reset_code":
            email = str(data.get("email", "")).strip().lower()

            if not email or "@" not in email or "." not in email or len(email) > 150:
                await websocket.send_json({
                    "Message": False,
                    "error": "Please write a real email address."
                })
            elif mysql.otp_sent_recently(email=email):
                await websocket.send_json({
                    "Message": False,
                    "error": "Please wait one minute before asking for a new code."
                })
            elif not mysql.email_exists(email=email):
                await websocket.send_json({
                    "Message": True
                })
            else:
                response = await run_in_threadpool(send_otp, email, "reset")
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

        if data.get("type") == "reset_password":
            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", ""))
            submited_otp_code = str(data.get("otp_code", "")).strip()

            if "@" not in email or len(password) < 8 or len(submited_otp_code) != 8:
                await websocket.send_json({
                    "Message": False,
                    "error": "Please write the code and a new password with at least 8 characters."
                })
                await websocket.close()
                return

            otps = mysql.select_otps(email=email)

            if otps["Message"] == False or otps["expires_at"] <= datetime.now() or not mysql.email_exists(email=email):
                await websocket.send_json({
                    "Message": False,
                    "error": "This code is wrong or has expired. Please ask for a new one."
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
                    "error": "The code is wrong."
                })
                await websocket.close()
                return

            if mysql.update_password(email=email, password=password):
                mysql.delete_otp(email=email)
                await websocket.send_json({
                    "Message": True
                })
            else:
                await websocket.send_json({
                    "Message": False,
                    "error": "Could not change the password. Please try again."
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

@app.post("/auth/mobile/login")
async def mobile_login(request: Request):
    data = await request.json()
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if username == "" or password == "":
        return {"Message": False}
    result = Mysql().Login(username=username, password=password)
    if not result or result["Message"] == False:
        return {"Message": False}
    user = {
        "user_id": result["user_id"],
        "username": result["username"],
        "name": result["name"],
        "lastname": result["lastname"]
    }
    return {"Message": True, "token": make_token(user), "user": user}


@app.get("/api/me")
def me(request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    usage = get_usage(Mysql(), user["user_id"])
    return {"Message": True, "user": user, "usage": usage}


@app.post("/auth/logout")
def logout(request: Request):
    request.session.clear()
    return {"Message": True}

@app.get("/api/runs/{run_id}/export")
def export_run(run_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}

    mysql = Mysql()
    usage = get_usage(mysql, user["user_id"])
    if not usage["unlimited"] and not usage["plan"]["can_export"]:
        return {"Message": False, "upgrade": True, "error": "Export is not included in your plan."}

    result = mysql.get_run(history_id=run_id, user_id=user["user_id"])
    if result is None:
        return {"Message": False, "error": "This analysis was not found."}

    table = pd.DataFrame(result["analysts"])
    if "covariates" in table.columns:
        table["covariates"] = table["covariates"].apply(lambda c: ", ".join(c))
    csv_text = table.to_csv(index=False)

    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="forkwise-run-{run_id}.csv"'}
    )

@app.get("/api/runs/{run_id}")
def get_run(run_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    user_id = user["user_id"]
    result = Mysql().get_run(history_id=run_id, user_id=user_id)
    if result is None:
        return {"Message": False}
    return {"Message": True, "run": result["run"], "analysts": result["analysts"]}


@app.get("/api/get/history")
def get_History(request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    return Mysql().getHistory(user_id=user["user_id"])


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


@app.post("/api/vellumup")
def vellumup():
    try:
        return {
            "ok": True,
            "Message": "everything is fine"
        }
    except Exception as e:
        return {
            "ok": False,
            "Message": f"we got an error: {e}"
        }


@app.post("/api/sendEmailAll")
def sendEmailAll(data: dict, request: Request, background_tasks: BackgroundTasks):
    problem = check_admin(request)
    if problem:
        return problem

    subject = str(data.get("subject", "")).strip()
    html = str(data.get("html", "")).strip()
    domain = str(data.get("domain", "")).strip()

    if subject == "" or html == "" or domain == "":
        return {"Message": False, "error": "Subject and message are required."}

    background_tasks.add_task(send_email, html, subject, domain)
    return {"Message": True}


@app.post("/api/chat/generate")
def GenerateOut(data: dict, request: Request):
    try:
        user = get_user(request)
        if user is None:
            return {"ok": False, "detail": "User is not Login"}

        user_prompt = str(data.get("user_prompt") or "").strip()
        run_id = data.get("run_id")

        if user_prompt == "" or len(user_prompt) > 1000:
            return {"ok": False, "detail": "Write a message under 1000 characters."}

        mysql = Mysql()
        usage = get_usage(mysql, user["user_id"])
        if not usage["unlimited"]:
            used = mysql.count_chat_today(user_id=user["user_id"])
            limit = usage["plan"]["daily_chat_limit"]
            if used >= limit:
                return {
                    "ok": False,
                    "upgrade": True,
                    "detail": f"Your {usage['plan']['plan_type']} plan allows {limit} chat messages per day. Please come back tomorrow or upgrade your plan."
                }

        run_data = mysql.getHistory_by_id(run_id=run_id, user_id=user["user_id"])


        if run_data["error"]:
            print(f"ERROR: {run_data['error']}")
            return {"ok": False, "detail": "Analysis not found."}

        old_history = mysql.get_chat_history(run_id=run_id , user_id=user["user_id"])

        model = GptModel()
        o = model.Generate(user_prompt=user_prompt, an_results=run_data , history=old_history)

        if o.get("error") or not o.get("out"):
            return {"ok": False, "detail": "Failed to generate model response"}

        mysql.add_to_chatHistory(run_id=run_id, question=user_prompt, awnser=o["out"])
        return {"ok": True, "model_output": o["out"]}

    except Exception as e:
        print(f"ERROR: {e}")
        return {"ok": False, "detail": "Something went wrong."}
    
@app.get("/api/chat/{run_id}")
def getChatOldHistory(request: Request , run_id: int):
    user = get_user(request)
    if user is None:
        return {"ok": False, "detail": "User is not Login"}
    
    mysql = Mysql()
    history  =mysql.get_chat_history(user_id=user["user_id"] , run_id=run_id)
    return {
        "Message": True , "messages": history
    }


@app.get("/api/plans")
def get_plans():
    mysql = Mysql()
    rows = mysql.get_plans()
    print("ROWS: ", rows)

    for row in rows:
        row["price"] = float(row["price"])
    
    return {
        "Message": True,
        "data": rows
    }

@app.post("/api/create/invoice")
def invoice(data: dict, req: Request):
    print("CREATE INVOICE CALLED, DATA:", data)
    print("USER:", get_user(req))
    
    user = get_user(req)
    if user is None:
        return {"Message": False, "error": True, "detail": "Please log in before buying a plan."}
    user_id = user["user_id"]

    plan_id = data.get("plan_id")
    mysql = Mysql()
    con = mysql.connect_to_mysql()
    cursor = con.cursor(dictionary=True)

    cursor.execute("SELECT * FROM plans WHERE id = %s", (plan_id,))
    info = cursor.fetchone()

    if not info:
        con.close()
        return {"Message": False, "error": True, "detail": "There is no plan with this information"}

    price = float(info["price"])
    plan_name = str(info["plan_type"])

    if price <= 0:
        con.close()
        return {"Message": False, "error": True, "detail": "The free plan does not need payment."}

    API_KEY = os.getenv("NOWPAYMENTS_API_KEY")
    if not API_KEY:
        con.close()
        print("ERROR: NOWPAYMENTS_API_KEY is missing in .env")
        return {"Message": False, "error": True, "detail": "Error from the server"}

    cursor.execute(
        "INSERT INTO invoices (`price`, `status`, `plan_id`, `user_id`) VALUES (%s, %s, %s, %s)",
        (price, "waiting", plan_id, user_id)
    )
    con.commit()
    invoice_id = cursor.lastrowid

    site_url = os.getenv("BASE_SITE_URL", "http://127.0.0.1:3000")
    api_url = os.getenv("BASE_API_URL", "http://127.0.0.1:5000")

    params = {
        "price_amount": price,
        "price_currency": "usd",
        "order_id": str(invoice_id),
        "order_description": f"Forkwise account upgrade to {plan_name}",
        "ipn_callback_url": api_url + "/api/pay/ipn",
        "success_url": site_url + "/payment/success",
        "cancel_url": site_url + "/plans",
        "partially_paid_url": site_url + "/payment/partial",
        "is_fixed_rate": False,
        "is_fee_paid_by_user": False
    }

    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }

    result = {}
    try:
        response = requests.post("https://api.nowpayments.io/v1/invoice", headers=headers, json=params, timeout=30)
        result = response.json()
        print(f"STATUS_CODE: {response.status_code} \n RESPONSE: {result}")
    except Exception as e:
        print(f"ERROR: {e}")

    if "invoice_url" not in result:
        cursor.execute("UPDATE invoices SET status = %s WHERE id = %s", ("failed", invoice_id))
        con.commit()
        con.close()
        return {"Message": False, "error": True, "detail": "Could not create the payment. Please try again."}

    con.close()
    return {"Message": True, "invoice_url": result["invoice_url"]}


@app.get("/api/get/invoices")
def getInvoices(req: Request):
    user = get_user(req)
    if user is None:
        return {"Message": "login"}

    try:
        mysql = Mysql()
        con = mysql.connect_to_mysql()
        cursor = con.cursor(dictionary=True)

        query = """SELECT invoices.*, plans.plan_type
                   FROM invoices
                   LEFT JOIN plans ON plans.id = invoices.plan_id
                   WHERE invoices.user_id = %s
                   ORDER BY invoices.id DESC"""
        cursor.execute(query, (user["user_id"],))
        rows = cursor.fetchall()
        con.close()

        print("INVOICES:", rows)
        return {"Message": True, "rows": rows}
    except Exception as e:
        print(f"ERROR: {e}")
        return {"Message": False, "detail": "Could not load your invoices."}


AGENT_DAILY_LIMIT = int(os.getenv("AGENT_DAILY_LIMIT", "3"))
AGENT_MAX_FORKS = int(os.getenv("AGENT_MAX_FORKS", "3"))


@app.post("/api/agent/tasks")
def agent_new_task(data: dict, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    user_id = user["user_id"]
    admin = Mysql().is_admin(user_id)

    repo_url = str(data.get("repo_url", "")).strip()
    branch = str(data.get("branch", "")).strip() or None
    task = str(data.get("task", "")).strip()
    test_command = str(data.get("test_command", "")).strip() or None
    setup_command = str(data.get("setup_command", "")).strip() or None

    try:
        forks = int(data.get("forks", 3))
    except (TypeError, ValueError):
        forks = 3
    max_forks = 5 if admin else AGENT_MAX_FORKS
    forks = max(1, min(forks, max_forks))

    problem = check_repo_url(repo_url)
    if problem:
        return {"Message": False, "error": problem}
    if len(task) < 10:
        return {"Message": False, "error": "Describe the task in a bit more detail."}
    if len(task) > 8000:
        return {"Message": False, "error": "The task is too long. Keep it under 8000 characters."}

    if not admin:
        if agent_db.count_open_tasks(user_id) > 0:
            return {"Message": False, "error": "You already have a task running. Wait until it finishes."}
        if agent_db.count_tasks_today(user_id) >= AGENT_DAILY_LIMIT:
            return {"Message": False, "error": "You reached your daily limit of " + str(AGENT_DAILY_LIMIT) + " agent tasks."}

    task_id = agent_db.add_task(user_id, repo_url, branch, task, test_command, setup_command, forks)
    if task_id is None:
        return {"Message": False, "error": "Could not save the task. Try again."}
    return {"Message": True, "id": task_id}


@app.get("/api/agent/tasks")
def agent_tasks(request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    return {"Message": True, "data": agent_db.list_tasks(user["user_id"]), "daily_limit": AGENT_DAILY_LIMIT}


@app.get("/api/agent/tasks/{task_id}")
def agent_task(task_id: int, request: Request, after: int = 0):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    task = agent_db.get_task(task_id, user["user_id"])
    if task is None:
        return {"Message": False, "error": "This task was not found."}
    return {
        "Message": True,
        "task": task,
        "forks": agent_db.get_forks(task_id),
        "checks": agent_db.get_checks(task_id),
        "events": agent_db.get_events(task_id, after)
    }


@app.get("/api/agent/tasks/{task_id}/patch")
def agent_patch(task_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    task = agent_db.get_task(task_id, user["user_id"])
    if task is None or not task["patch"]:
        return {"Message": False, "error": "There is no patch for this task."}
    return Response(
        content=task["patch"],
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="forkwise-task-{task_id}.patch"'}
    )


@app.post("/api/agent/tasks/{task_id}/again")
def agent_again(task_id: int, data: dict, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    old = agent_db.get_task(task_id, user["user_id"])
    if old is None:
        return {"Message": False, "error": "This task was not found."}

    answer = str(data.get("answer", "")).strip()
    text = old["task"]
    if answer:
        text += "\n\nThe user answered this question: " + str(old["question"] or "") + "\nAnswer: " + answer
    return agent_new_task({
        "repo_url": old["repo_url"],
        "branch": old["branch"] or "",
        "task": text,
        "test_command": old["test_command"] or "",
        "setup_command": old["setup_command"] or "",
        "forks": old["forks"]
    }, request)


STUDIO_FOR_ALL = os.getenv("STUDIO_FOR_ALL", "false") == "true"
STUDIO_DAILY_MESSAGES = int(os.getenv("STUDIO_DAILY_MESSAGES", "50"))
STUDIO_MAX_UPLOAD_MB = int(os.getenv("STUDIO_MAX_UPLOAD_MB", "300"))
STUDIO_FILES_DIR = os.getenv("STUDIO_FILES_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "studio_files"))
WORKER_KEY = os.getenv("WORKER_KEY", "")


def studio_allowed(user_id):
    if STUDIO_FOR_ALL:
        return True
    return Mysql().is_admin(user_id)


def load_json(text, empty):
    try:
        value = json.loads(text or "")
        return value
    except ValueError:
        return empty


def safe_file_name(name):
    name = os.path.basename(str(name or "file")).strip()
    clean = ""
    for letter in name:
        if letter in "/\\:*?\"<>|" or ord(letter) < 32:
            clean = clean + "_"
        else:
            clean = clean + letter
    clean = clean.lstrip(".")
    if clean == "":
        clean = "file"
    if len(clean) > 120:
        clean = clean[-120:]
    return clean


def unique_file_name(session_id, name):
    used = []
    for item in studio_db.list_files(session_id):
        used.append(item["name"])
    if name not in used:
        return name
    base, ext = os.path.splitext(name)
    number = 2
    while base + "-" + str(number) + ext in used:
        number = number + 1
    return base + "-" + str(number) + ext


def worker_ok(request):
    return WORKER_KEY != "" and request.headers.get("X-Worker-Key", "") == WORKER_KEY


@app.post("/api/studio/sessions")
def studio_new_session(data: dict, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    if not studio_allowed(user["user_id"]):
        return {"Message": False, "error": "Forkwise Studio is not open for your account yet."}

    repo_url = str(data.get("repo_url", "")).strip() or None
    branch = str(data.get("branch", "")).strip() or None
    title = str(data.get("title", "")).strip()[:200] or "New project"
    if repo_url:
        problem = check_repo_url(repo_url)
        if problem:
            return {"Message": False, "error": problem}
        if title == "New project":
            title = repo_url.replace("https://", "").replace(".git", "")[:200]

    session_id = studio_db.add_session(user["user_id"], title, repo_url, branch)
    if session_id is None:
        return {"Message": False, "error": "Could not create the chat. Try again."}
    return {"Message": True, "id": session_id}


@app.get("/api/studio/sessions")
def studio_sessions(request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    return {"Message": True, "data": studio_db.list_sessions(user["user_id"]), "allowed": studio_allowed(user["user_id"]), "worker_online": studio_db.worker_online()}


@app.get("/api/studio/sessions/{session_id}")
def studio_session(session_id: int, request: Request, after: int = 0):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    session = studio_db.get_session(session_id, user["user_id"])
    if session is None:
        return {"Message": False, "error": "This chat was not found."}

    patch = session["patch"] or ""
    info = {
        "id": session["id"],
        "title": session["title"],
        "repo_url": session["repo_url"],
        "branch": session["branch"],
        "status": session["status"],
        "box": session["box"],
        "error": session["error"],
        "tokens": session["tokens"],
        "files": load_json(session["files"], []),
        "todos": load_json(session["todos"], []),
        "patch_hash": hashlib.md5(patch.encode("utf-8")).hexdigest(),
        "patch_size": len(patch),
        "created_at": session["created_at"],
        "worker_online": studio_db.worker_online()
    }
    return {"Message": True, "session": info, "messages": studio_db.get_messages(session_id, after)}


@app.post("/api/studio/sessions/{session_id}/messages")
def studio_send(session_id: int, data: dict, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    user_id = user["user_id"]
    session = studio_db.get_session(session_id, user_id)
    if session is None:
        return {"Message": False, "error": "This chat was not found."}
    if not studio_allowed(user_id):
        return {"Message": False, "error": "Forkwise Studio is not open for your account yet."}
    if session["status"] in ["pending", "running", "stopping"]:
        return {"Message": False, "error": "Wait until the current answer is finished, or press Stop."}

    text = str(data.get("text", "")).strip()
    if text == "":
        return {"Message": False, "error": "Write a message."}
    if len(text) > 20000:
        return {"Message": False, "error": "The message is too long. Keep it under 20000 characters."}
    if not Mysql().is_admin(user_id) and studio_db.count_messages_today(user_id) >= STUDIO_DAILY_MESSAGES:
        return {"Message": False, "error": "You reached your daily limit of " + str(STUDIO_DAILY_MESSAGES) + " Studio messages."}

    if session["title"] == "New project":
        studio_db.update_session(session_id, {"title": text[:60]})
    message_id = studio_db.send_message(session_id, text)
    return {"Message": True, "id": message_id}


@app.post("/api/studio/sessions/{session_id}/stop")
def studio_stop(session_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    session = studio_db.get_session(session_id, user["user_id"])
    if session is None:
        return {"Message": False, "error": "This chat was not found."}
    if session["status"] == "pending":
        studio_db.update_session(session_id, {"status": "idle"})
        studio_db.add_message(session_id, "info", "Stopped.")
    elif session["status"] == "running":
        studio_db.update_session(session_id, {"status": "stopping"})
    return {"Message": True}


@app.post("/api/studio/sessions/{session_id}/upload")
def studio_upload(session_id: int, request: Request, file: UploadFile = File(...)):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    session = studio_db.get_session(session_id, user["user_id"])
    if session is None:
        return {"Message": False, "error": "This chat was not found."}
    if not studio_allowed(user["user_id"]):
        return {"Message": False, "error": "Forkwise Studio is not open for your account yet."}

    name = unique_file_name(session_id, safe_file_name(file.filename))
    folder = os.path.join(STUDIO_FILES_DIR, str(session_id))
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, uuid.uuid4().hex + "_" + name)

    limit = STUDIO_MAX_UPLOAD_MB * 1024 * 1024
    size = 0
    out = open(path, "wb")
    while True:
        chunk = file.file.read(1024 * 1024)
        if not chunk:
            break
        size = size + len(chunk)
        if size > limit:
            out.close()
            os.remove(path)
            return {"Message": False, "error": "The file is larger than " + str(STUDIO_MAX_UPLOAD_MB) + " MB."}
        out.write(chunk)
    out.close()

    file_id = studio_db.add_file(session_id, name, "upload", size, path)
    if file_id is None:
        os.remove(path)
        return {"Message": False, "error": "Could not save the file."}
    studio_db.add_message(session_id, "file", json.dumps({"id": file_id, "name": name, "size": size, "kind": "upload"}))
    return {"Message": True, "id": file_id, "name": name, "size": size}


@app.post("/api/studio/sessions/{session_id}/export")
def studio_export(session_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    session = studio_db.get_session(session_id, user["user_id"])
    if session is None:
        return {"Message": False, "error": "This chat was not found."}
    if session["status"] in ["pending", "running", "stopping"]:
        return {"Message": False, "error": "Wait until the current answer is finished."}
    studio_db.request_export(session_id)
    return {"Message": True}


@app.get("/api/studio/files/{file_id}")
def studio_download(file_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    item = studio_db.get_file(file_id)
    if item is None or studio_db.get_session(item["session_id"], user["user_id"]) is None:
        return {"Message": False, "error": "This file was not found."}
    if not os.path.exists(item["path"]):
        return {"Message": False, "error": "This file is no longer on the server."}
    return FileResponse(item["path"], filename=item["name"])


@app.get("/api/studio/sessions/{session_id}/patch")
def studio_patch(session_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    session = studio_db.get_session(session_id, user["user_id"])
    if session is None:
        return {"Message": False, "error": "This chat was not found."}
    return Response(
        content=session["patch"] or "",
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="forkwise-studio-{session_id}.patch"'}
    )


@app.delete("/api/studio/sessions/{session_id}")
def studio_delete(session_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    session = studio_db.get_session(session_id, user["user_id"])
    if session is None:
        return {"Message": False, "error": "This chat was not found."}
    for item in studio_db.list_files(session_id):
        full = studio_db.get_file(item["id"])
        if full is not None and os.path.exists(full["path"]):
            os.remove(full["path"])
    studio_db.delete_session(session_id, user["user_id"])
    return {"Message": True}


@app.post("/api/studio/sessions/{session_id}/verify")
def studio_verify(session_id: int, request: Request):
    user = get_user(request)
    if user is None:
        return {"Message": "login"}
    session = studio_db.get_session(session_id, user["user_id"])
    if session is None:
        return {"Message": False, "error": "This chat was not found."}
    if not session["repo_url"]:
        return {"Message": False, "error": "Verify with forks needs a GitHub repository."}

    last_text = ""
    for row in studio_db.get_messages(session_id):
        if row["role"] == "user":
            last_text = row["content"] or ""
    if last_text == "":
        return {"Message": False, "error": "Send a message first."}
    return agent_new_task({"repo_url": session["repo_url"], "branch": session["branch"] or "", "task": last_text, "forks": 3}, request)


@app.get("/internal/studio/files/{file_id}")
def internal_studio_file(file_id: int, request: Request):
    if not worker_ok(request):
        return Response(status_code=403)
    item = studio_db.get_file(file_id)
    if item is None or not os.path.exists(item["path"]):
        return Response(status_code=404)
    return FileResponse(item["path"], filename=item["name"])


@app.post("/internal/studio/sessions/{session_id}/outputs")
def internal_studio_output(session_id: int, request: Request, file: UploadFile = File(...), kind: str = Form("output")):
    if not worker_ok(request):
        return {"Message": False, "error": "not allowed"}
    if studio_db.get_session(session_id) is None:
        return {"Message": False, "error": "chat not found"}

    if kind not in ["output", "screen"]:
        kind = "output"
    if kind == "screen":
        name = "screen-" + uuid.uuid4().hex[:8] + ".jpg"
    else:
        name = unique_file_name(session_id, safe_file_name(file.filename))
    folder = os.path.join(STUDIO_FILES_DIR, str(session_id))
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, uuid.uuid4().hex + "_" + name)
    size = 0
    out = open(path, "wb")
    while True:
        chunk = file.file.read(1024 * 1024)
        if not chunk:
            break
        size = size + len(chunk)
        out.write(chunk)
    out.close()

    file_id = studio_db.add_file(session_id, name, kind, size, path)
    return {"Message": True, "id": file_id, "name": name}


if __name__ == "__main__":
    uvicorn.run("server:app" , port=5000 , reload=True)
