from database.mysql import Mysql
import requests
from dotenv import load_dotenv
import os

load_dotenv()

BATCH_URL = "https://api.resend.com/emails/batch"
key = os.getenv("RESEND_API_KEY")


def send_email(html, subject, domain):
    try:
        rows = Mysql().select_all_emails()
        emails = [row[0] for row in rows]
        if not emails:
            print("no recipients", flush=True)
            return False

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }

        sent = 0
        failed = 0
        for i in range(0, len(emails), 100):
            chunk = emails[i:i + 100]
            payload = [
                {
                    "from": f"Forkwise <{domain}>",
                    "to": [email],
                    "subject": subject,
                    "html": html,
                }
                for email in chunk
            ]
            response = requests.post(BATCH_URL, headers=headers, json=payload, timeout=30)
            if response.status_code in (200, 201):
                sent += len(chunk)
            else:
                failed += len(chunk)
                print(f"BATCH ERROR: {response.status_code} {response.text}", flush=True)

        print(f"emails sent: {sent}, failed: {failed}", flush=True)
        return failed == 0

    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        return False