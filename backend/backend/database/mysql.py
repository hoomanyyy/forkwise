import mysql.connector
import os
from dotenv import load_dotenv
from datetime import datetime , timedelta
import bcrypt
import json

load_dotenv()

HOST = os.getenv("DB_HOST")
USER = os.getenv("DB_USER")
PASS = os.getenv("DB_PASS")
NAME = os.getenv("DB_NAME")

def to_text(value):
    if value is None:
        return None
    if isinstance(value, list) or isinstance(value, dict):
        return json.dumps(value)
    
    return str(value)
    

class Mysql():
    def __init__(self , user=USER , password=PASS , db_name=NAME, host=HOST):
        self.user = user
        self.password = password
        self.db_name = db_name
        self.host = host

    def connect_to_mysql(self):
        con = mysql.connector.connect(
            host=self.host,
            user=self.user,
            password=self.password,
            database=self.db_name
        )
        return con
    
    def add_history(self , 
                    question ,
                    filename,
                    user_id,
                    status,
                    outcome,
                    main_variable
                    ):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            query = "INSERT INTO history (user_id , question , filename, status, outcome , main_variable) VALUES (%s , %s , %s , %s, %s , %s)"
            cursor.execute(query , (user_id,question,filename,status,outcome,main_variable))

            con.commit()
            row_id = cursor.lastrowid
            con.close()

            return row_id

        except Exception as e:
            print(f"ERROR: {e}")
            return False
        
    def update_history(self , row_id , status):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            query = "UPDATE history SET status = %s WHERE id = %s"
            cursor.execute(query , (status , row_id))

            con.commit()
            con.close()

            return True
        
        except Exception as e:
            print(f"ERROR: {e}")
            return False

    def save_results(self, history_id, result):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            verdict = result["verdict"]
            query = "UPDATE history SET status = %s, verdict = %s, analysts = %s, agree = %s, significant = %s, middle_effect = %s, chart = %s WHERE id = %s"
            cursor.execute(query, ("complete", verdict.get("verdict"), verdict.get("analysts"), verdict.get("agree"), verdict.get("significant"), verdict.get("middle_effect"), json.dumps(result.get("chart")), history_id))

            for i in range(len(result["answers"])):
                answer = result["answers"][i]
                r = result["results"][i]
                if answer is None:
                    answer = {}
                if r is None:
                    r = {}
                query = "INSERT INTO analyst_results (history_id, analyst_number, covariates, outliers, missing, reason, effect, p_value, rows_used) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
                cursor.execute(query, (history_id, i + 1, json.dumps(r.get("controls", [])), to_text(answer.get("outliers")), to_text(answer.get("missing")), to_text(answer.get("reason")), r.get("effect"), r.get("p"), r.get("rows")))

            con.commit()
            con.close()
            return True
        except Exception as e:
            print(f"ERROR: {e}")
            return False
        
    def get_run(self, history_id, user_id):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor(dictionary=True)

            query = "SELECT id, question, filename, status, verdict, analysts, agree, significant, middle_effect, outcome, main_variable, chart FROM history WHERE id = %s AND user_id = %s"
            cursor.execute(query, (history_id, user_id))
            run = cursor.fetchone()
            if run is None:
                con.close()
                return None

            if run["chart"]:
                run["chart"] = json.loads(run["chart"])

            query = "SELECT analyst_number, covariates, outliers, missing, reason, effect, p_value, rows_used FROM analyst_results WHERE history_id = %s ORDER BY analyst_number"
            cursor.execute(query, (history_id,))
            analysts = cursor.fetchall()
            con.close()

            for a in analysts:
                covariates = json.loads(a["covariates"] or "[]")
                if not isinstance(covariates, list):
                    covariates = []
                a["covariates"] = covariates

            return {"run": run, "analysts": analysts}
        except Exception as e:
            print(f"ERROR: {e}")
            return None

    def checkUsernameIfExist(self , username , email):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            query = "SELECT id FROM users WHERE username = %s OR email = %s"
            cursor.execute(query , (username , email))

            user = cursor.fetchone()
            con.close()
            if user:
                return True
            else:
                return False

        except Exception as e:
            print(f"ERROR: {e}")
            return True

    def hash(self , password):
            bytes = password.encode("utf-8")
            salt = bcrypt.gensalt()

            hash_password = bcrypt.hashpw(bytes, salt)
            return hash_password
    
    def verifyHash(self , hashed_password, password):
        userBytes = hashed_password.encode("utf-8")
        result = bcrypt.checkpw(password.encode("utf-8") , userBytes)
        return result

    def addUser(self , username , email , name , lastname, password):
        try:
            hash_password = self.hash(password)

            con = self.connect_to_mysql()
            cursor = con.cursor()
            
            query = "INSERT INTO users (`name` , `last_name` , `username` , `email` , `hash_password`) VALUES (%s , %s , %s, %s ,%s)"
            cursor.execute(query , (name , lastname , username , email , hash_password,))

            con.commit()
            con.close()
            return True
        
        except Exception as e:
            print(f"ERROR: {e}")
            return False
        
    def add_otpcode(self, email, otp_code):
        con = None

        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            otp_hash = bcrypt.hashpw(
                otp_code.encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

            query = """
                DELETE FROM email_verifications
                WHERE email = %s
            """
            cursor.execute(query, (email,))

            query = """
                INSERT INTO email_verifications
                    (email, otp_code_hash, attempts, expires_at)
                VALUES (%s, %s, %s, %s)
            """

            expires_at = datetime.now() + timedelta(minutes=10)

            cursor.execute(
                query,
                (email, otp_hash, 0, expires_at)
            )

            con.commit()
            con.close()

            return True

        except Exception as e:
            print(f"ERROR: {e}")
            if con:
                con.rollback()
            return False

    def Login(self , username , password):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            query = "SELECT id, name, last_name, hash_password, email, username FROM users WHERE email = %s OR username = %s"
            cursor.execute(query , (username,username,))

            row = cursor.fetchone()
            con.close()
            if not row:
                return False

            user_id , name , lastname , hashed_password , em , u = row
            result = self.verifyHash(hashed_password=hashed_password , password=password)

            if result:
                return {
                    "Message": True,
                    "user_id": user_id,
                    "name": name,
                    "lastname": lastname,
                    "username": u,
                    "email": em
                }
            
            else:
                return {
                    "Message": False
                }
        except Exception as e:
            print(f"ERROR: {e}")
            return False


    def select_otps(self , email):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor(dictionary=True)

            query = "SELECT otp_code_hash, attempts, expires_at FROM `email_verifications` WHERE email = %s"
            cursor.execute(query , (email,))

            data = cursor.fetchone()
            con.close()

            if not data:
                return {
                    "Message": False
                }

            return {
                "Message": True,
                "otp_hash": data["otp_code_hash"],
                "attempts": data["attempts"],
                "expires_at": data["expires_at"]
            }

        except Exception as e:
            print(f"ERROR: {e}")
            return {
                "Message": False
            }

    def delete_otp(self, email):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            cursor.execute("DELETE FROM email_verifications WHERE email = %s", (email,))

            con.commit()
            con.close()
            return True

        except Exception as e:
            print(f"ERROR: {e}")
            return False

    def otp_sent_recently(self, email):
        otps = self.select_otps(email=email)
        if otps["Message"] == False:
            return False
        sent_at = otps["expires_at"] - timedelta(minutes=10)
        return datetime.now() - sent_at < timedelta(seconds=60)


    def getHistory(self, user_id):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor(dictionary=True)

            query = "SELECT id, question, filename, status, verdict, created_at FROM history WHERE user_id = %s ORDER BY id DESC"
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            con.close()

            return {"Message": True, "data": rows}
        except Exception as e:
            print(f"ERROR: {e}")
            return {"Message": False}
        
    def add_contact(self, name, email, topic, message):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            query = "INSERT INTO contact_messages (name, email, topic, message) VALUES (%s, %s, %s, %s)"
            cursor.execute(query, (name, email, topic, message))

            con.commit()
            con.close()
            return True

        except Exception as e:
            print(f"ERROR: {e}")
            return False
        

    def is_admin(self, user_id):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            query = "SELECT user_id FROM admins WHERE user_id = %s"
            cursor.execute(query, (user_id,))
            row = cursor.fetchone()
            con.close()

            return row is not None
        except Exception as e:
            print(f"ERROR: {e}")
            return False

    def admin_stats(self):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor(dictionary=True)

            cursor.execute("SELECT COUNT(*) AS total FROM users")
            users = cursor.fetchone()["total"]

            cursor.execute("SELECT status, verdict, COUNT(*) AS total FROM history GROUP BY status, verdict")
            groups = cursor.fetchall()

            cursor.execute("SELECT DATE(created_at) AS day, COUNT(*) AS total FROM history WHERE created_at >= CURDATE() - INTERVAL 13 DAY GROUP BY DATE(created_at)")
            days = cursor.fetchall()

            messages = 0
            try:
                cursor.execute("SELECT COUNT(*) AS total FROM contact_messages")
                messages = cursor.fetchone()["total"]
            except Exception as e:
                print(f"ERROR: {e}")

            con.close()

            runs = 0
            robust = 0
            fragile = 0
            choice = 0
            no_effect = 0
            failed = 0
            running = 0
            for g in groups:
                runs = runs + g["total"]
                if g["status"] == "failed":
                    failed = failed + g["total"]
                elif g["status"] == "running":
                    running = running + g["total"]
                elif g["verdict"] == "robust":
                    robust = robust + g["total"]
                elif g["verdict"] == "fragile":
                    fragile = fragile + g["total"]
                elif g["verdict"] == "choice_dependent":
                    choice = choice + g["total"]
                elif g["verdict"] == "no_effect":
                    no_effect = no_effect + g["total"]

            per_day = []
            for d in days:
                per_day.append({"day": str(d["day"]), "total": d["total"]})

            return {
                "Message": True,
                "users": users,
                "runs": runs,
                "robust": robust,
                "fragile": fragile,
                "choice_dependent": choice,
                "no_effect": no_effect,
                "failed": failed,
                "running": running,
                "messages": messages,
                "per_day": per_day
            }
        except Exception as e:
            print(f"ERROR: {e}")
            return {"Message": False}

    def admin_users(self):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor(dictionary=True)

            query = """SELECT users.id, users.name, users.last_name, users.username, users.email,
                       COUNT(history.id) AS runs, admins.user_id AS admin_id
                       FROM users
                       LEFT JOIN history ON history.user_id = users.id
                       LEFT JOIN admins ON admins.user_id = users.id
                       GROUP BY users.id, users.name, users.last_name, users.username, users.email, admins.user_id
                       ORDER BY users.id DESC"""
            cursor.execute(query)
            rows = cursor.fetchall()
            con.close()

            for r in rows:
                r["is_admin"] = r["admin_id"] is not None
                del r["admin_id"]

            return {"Message": True, "data": rows}
        except Exception as e:
            print(f"ERROR: {e}")
            return {"Message": False}

    def admin_runs(self):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor(dictionary=True)

            query = """SELECT history.id, history.question, history.status, history.verdict,
                       history.analysts, history.created_at, users.username
                       FROM history
                       LEFT JOIN users ON users.id = history.user_id
                       ORDER BY history.id DESC
                       LIMIT 500"""
            cursor.execute(query)
            rows = cursor.fetchall()
            con.close()

            return {"Message": True, "data": rows}
        except Exception as e:
            print(f"ERROR: {e}")
            return {"Message": False}

    def admin_messages(self):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor(dictionary=True)

            query = "SELECT id, name, email, topic, message, created_at FROM contact_messages ORDER BY id DESC LIMIT 500"
            cursor.execute(query)
            rows = cursor.fetchall()
            con.close()

            return {"Message": True, "data": rows}
        except Exception as e:
            print(f"ERROR: {e}")
            return {"Message": False}

    def admin_delete_run(self, run_id):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            cursor.execute("DELETE FROM analyst_results WHERE history_id = %s", (run_id,))
            cursor.execute("DELETE FROM history WHERE id = %s", (run_id,))
            deleted = cursor.rowcount

            con.commit()
            con.close()
            return deleted > 0
        except Exception as e:
            print(f"ERROR: {e}")
            return False

    def admin_delete_user(self, user_id):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            cursor.execute("DELETE analyst_results FROM analyst_results JOIN history ON analyst_results.history_id = history.id WHERE history.user_id = %s", (user_id,))
            cursor.execute("DELETE FROM history WHERE user_id = %s", (user_id,))
            cursor.execute("DELETE FROM admins WHERE user_id = %s", (user_id,))
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            deleted = cursor.rowcount

            con.commit()
            con.close()
            return deleted > 0
        except Exception as e:
            print(f"ERROR: {e}")
            return False

    def admin_delete_message(self, message_id):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            cursor.execute("DELETE FROM contact_messages WHERE id = %s", (message_id,))
            deleted = cursor.rowcount

            con.commit()
            con.close()
            return deleted > 0
        except Exception as e:
            print(f"ERROR: {e}")
            return False

    def admin_delete_failed_runs(self):
        try:
            con = self.connect_to_mysql()
            cursor = con.cursor()

            old_or_failed = "history.status = 'failed' OR (history.status = 'running' AND history.created_at < NOW() - INTERVAL 1 HOUR)"
            cursor.execute("DELETE analyst_results FROM analyst_results JOIN history ON analyst_results.history_id = history.id WHERE " + old_or_failed)
            cursor.execute("DELETE FROM history WHERE " + old_or_failed)
            deleted = cursor.rowcount

            con.commit()
            con.close()
            return deleted
        except Exception as e:
            print(f"ERROR: {e}")
            return -1