from fastapi import FastAPI , Request , WebSocket
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from ai.Model import GptModel
from database.mysql import Mysql
import uvicorn
import os
import pandas as pd
from typing import List
import json
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","https://forkwise.site"],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

app.add_middleware(
    SessionMiddleware,secret_key=os.getenv("SESSION_SECRET_KEY")
)

UPLOAD_DIR = "./upload"

@app.get("/health")
def health():
    try:
        print("health: ok")
        return {
            "Message": "ok"
        }
    except Exception as e:
        print(f"error: {e}")
        return HTTPException(
            status_code=400
        )
    
def read_file(file):
    try:
        name = file.lower()
        if name.endswith(".csv"):
            print("csv")
            f = pd.read_csv(file)
            return f

        if name.endswith(".xlsx") or name.endswith(".xls"):
            print("excel")
            f = pd.read_excel(file)
            return f
        
        if name.endswith(".json"):
            print("json")   
            with open(file , encoding="utf-8") as f:
                data = json.load(f)
            content = pd.json_normalize(data)
            return content
        
        if name.endswith(".xml"):
            print("xml")
            f = pd.read_xml(file)
            return f
        
        if name.endswith(".html"):
            print("html")
            f = pd.read_html(file)
            return f
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

@app.post("/api/analyze")
async def analyze(request: Request):
    user_id = request.session.get("user_id")
    if user_id is None:
        return {"Message": "login"}
    
    form = await request.form()

    files = form.getlist("files")
    fileDetails = json.loads(form.get("fileDetails"))
    print(f"file details: {fileDetails}")

    question = form.get("question")
    outcome = form.get("outcome")
    mainVariable = form.get("mainVariable")
    expectation = form.get("expectation")
    analysts = form.get("analysts")
    notes = form.get("notes")
    relation = form.get("relation")
    joinColumn = form.get("joinColumn")

    data = [
        {
            "question": question,
            "outcome": outcome,
            "mainVariable": mainVariable,
            "expectation": expectation,
            "notes": notes,
            "joinColumn": joinColumn
        }
    ]    

    file_information = []
    tables = []
    
    for f in files:
            file_name = os.path.basename(f.filename)
            path = os.path.join(UPLOAD_DIR, file_name)

            with open(path, "wb") as fl:
                fl.write(await f.read())

            content = read_file(path)
            print(f"file_name: {file_name} \n data: {content}")
            
            tables.append(content)

            file_information.append({
                "name": file_name,
                "file_information": fileDetails.get(file_name),
                "content": content.to_dict(orient="records")
            })

    print(question)
    print(outcome)
    print(mainVariable)

    data[0]["files"] = file_information
    combined = tables[0]
    keys = []

    if relation == "join":
        for k in joinColumn.split(","):
            keys.append(k.strip())
        for t in tables[1:]:
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

    data[0]["combined"] = combined.to_dict(orient="records")
    print("files:", [f["name"] for f in file_information], flush=True)
    filenames = ", ".join(f["name"] for f in file_information)

    model = GptModel()
    outcome, mainVariable = await run_in_threadpool(model.pick_columns, question, outcome, mainVariable, number_columns)
    if outcome is None:
        return {"Message": False, "error": "Could not match your outcome and main variable to columns in the file. Please write the column names."}

    data[0]["outcome"] = outcome
    data[0]["mainVariable"] = mainVariable
    print("columns chosen:", outcome, mainVariable, flush=True)

    mysql = Mysql()
    row_id = mysql.add_history(user_id=user_id, question=question, filename=filenames, status="running", outcome=outcome, main_variable=mainVariable)
    if not row_id:
        return {"Message": False, "error": "Could not save the analysis."}

    try:
        result = await run_in_threadpool(model.Predict, analysts, data)
    except Exception as e:
        print(f"ERROR: {e}")
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
                username = data["username"]
                email = data["email"]

                isExist = mysql.checkUsernameIfExist(username=username, email=email)
                if isExist == True:
                    await websocket.send_json({
                            "Message": False,
                        })
                else:
                    name , lastname , password = data["name"] , data["lastname"] , data["password"]
                    result = mysql.addUser(
                        username=username,
                        email=email,
                        name=name,
                        lastname=lastname,
                        password=password
                    )
                    if result == True:
                        await websocket.send_json({
                            "Message": True,
                        })
                    else:
                        await websocket.send_json({
                            "Message": False,
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
                print(data)
                await websocket.send_json(data)

    except Exception as e:
        print(f"ERROR: {e}")
        return await websocket.send_json({
                 "Message": True,
            })



@app.post("/auth/login")
async def login(request: Request):
    data = await request.json()
    result = Mysql().Login(username=data["username"], password=data["password"])
    if result == False or result["Message"] == False:
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