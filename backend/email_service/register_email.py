import requests
from dotenv import load_dotenv
import os
from html import escape

load_dotenv()
key = os.getenv("RESEND_API_KEY")

BASE_URL = "https://api.resend.com/emails"

def send_register_email(to, name, username):
    if not key:
        print("ERROR: RESEND_API_KEY is not set", flush=True)
        return False

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }

    safe_name = escape(name) if name else "there"
    safe_username = escape(username)

    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Welcome to Forkwise</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0e1f;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your Forkwise account is ready. Ask your first question in a few minutes.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0b0e1f"
    style="background-color:#0b0e1f;padding:40px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#12152b"
          style="max-width:520px;background-color:#12152b;border:1px solid #1f2444;border-radius:16px;overflow:hidden;">

          <tr>
            <td bgcolor="#7c6cff" style="height:4px;line-height:4px;font-size:0;background-color:#7c6cff;background-image:linear-gradient(90deg,#8b7bff,#3fb6f5);">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0;">
              <a href="https://forkwise.online" style="text-decoration:none;">
                <img src="https://forkwise.online/email-logo.png" width="36" height="36" alt="Forkwise"
                  style="vertical-align:middle;border:0;border-radius:9px;">
                <span style="vertical-align:middle;font-size:20px;font-weight:700;color:#ffffff;padding-left:10px;">Forkwise</span>
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px;">

              <h1 style="font-size:24px;line-height:1.3;margin:0 0 12px;color:#ffffff;font-weight:700;">
                Welcome to Forkwise, {safe_name}!
              </h1>

              <p style="font-size:15px;line-height:1.7;color:#a3a8c7;margin:0 0 20px;">
                Your account is ready. Your username is
                <strong style="color:#ffffff;">{safe_username}</strong>.
              </p>

              <p style="font-size:15px;line-height:1.7;color:#a3a8c7;margin:0 0 16px;">
                Forkwise sends one question to many AI analysts. Python checks every answer
                and a judge tells you how strong the result really is.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#1b1645"
                style="background-color:#1b1645;border:1px solid #2f2870;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="font-size:14px;line-height:1.6;color:#e4e1ff;margin:0 0 10px;">
                      <span style="color:#3fb6f5;font-weight:700;">1.</span>&nbsp; Upload a CSV, Excel or JSON file
                    </p>
                    <p style="font-size:14px;line-height:1.6;color:#e4e1ff;margin:0 0 10px;">
                      <span style="color:#3fb6f5;font-weight:700;">2.</span>&nbsp; Ask one question about your data
                    </p>
                    <p style="font-size:14px;line-height:1.6;color:#e4e1ff;margin:0;">
                      <span style="color:#3fb6f5;font-weight:700;">3.</span>&nbsp; Get a clear verdict in a few minutes
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
                <tr>
                  <td align="center" bgcolor="#7c6cff" style="background-color:#7c6cff;border-radius:10px;">
                    <a href="https://forkwise.online/dashboard"
                      style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Open your dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;line-height:1.7;color:#6f7499;margin:24px 0 0;">
                New to this? Read
                <a href="https://forkwise.online/learn/multiverse-analysis" style="color:#a99cff;text-decoration:none;">what a multiverse analysis is</a>
                or try the
                <a href="https://forkwise.online/examples/coffee-and-heart-risk" style="color:#a99cff;text-decoration:none;">coffee example</a>.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top:1px solid #1f2444;padding-top:18px;">
                    <p style="font-size:12px;line-height:1.7;color:#6f7499;margin:0;">
                      You got this email because you created an account on Forkwise.
                      If this was not you, please tell us on the
                      <a href="https://forkwise.online/contact" style="color:#a99cff;text-decoration:none;">contact page</a>.
                      <br>
                      <a href="https://forkwise.online" style="color:#a99cff;text-decoration:none;">forkwise.online</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
    """

    text = (
        f"Welcome to Forkwise, {name or 'there'}!\n\n"
        f"Your account is ready. Your username is {username}.\n\n"
        "1. Upload a CSV, Excel or JSON file\n"
        "2. Ask one question about your data\n"
        "3. Get a clear verdict in a few minutes\n\n"
        "Open your dashboard: https://forkwise.online/dashboard"
    )

    data = {
        "from": "Forkwise <noreply@forkwise.online>",
        "to": [f"{to}"],
        "subject": "Welcome to Forkwise",
        "html": html,
        "text": text,
    }

    try:
        response = requests.post(BASE_URL, headers=headers , json=data , timeout=10)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        return False

    status_code = response.status_code
    if status_code == 200 or status_code == 201:
        return {
            "Message": True,
        }

    print(f"ERROR: Resend status {status_code}: {response.text}", flush=True)
    return False
