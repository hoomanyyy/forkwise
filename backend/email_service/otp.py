import requests
import secrets
from dotenv import load_dotenv
import os
from database.mysql import Mysql

load_dotenv()
key = os.getenv("RESEND_API_KEY")

BASE_URL = "https://api.resend.com/emails"

def send_otp(to, purpose="register"):
    if not key:
        print("ERROR: RESEND_API_KEY is not set", flush=True)
        return False

    otp_code = secrets.randbelow(90000000) + 10000000

    if purpose == "reset":
        title = "Reset your password"
        intro = "Use this code to choose a new password for your Forkwise account."
        ignore = "If you did not ask to reset your password, you can safely ignore this email. Your password will not change."
        subject = "Reset your Forkwise password"
    else:
        title = "Verify your email"
        intro = "Use this code to finish creating your Forkwise account."
        ignore = "If you did not try to create an account, you can safely ignore this email."
        subject = "Your Forkwise verification code"

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0e1f;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">

  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your Forkwise code is {otp_code}. It expires in 10 minutes.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0b0e1f"
    style="background-color:#0b0e1f;padding:40px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#12152b"
          style="max-width:480px;background-color:#12152b;border:1px solid #1f2444;border-radius:16px;overflow:hidden;">

          <tr>
            <td bgcolor="#7c6cff" style="height:4px;line-height:4px;font-size:0;background-color:#7c6cff;background-image:linear-gradient(90deg,#8b7bff,#3fb6f5);">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0;">
              <a href="https://forkwiseai.com" style="text-decoration:none;">
                <img src="https://forkwiseai.com/email-logo.png" width="36" height="36" alt="Forkwise"
                  style="vertical-align:middle;border:0;border-radius:9px;">
                <span style="vertical-align:middle;font-size:20px;font-weight:700;color:#ffffff;padding-left:10px;">Forkwise</span>
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 8px;">

              <h1 style="font-size:24px;line-height:1.3;margin:0 0 12px;color:#ffffff;font-weight:700;">
                {title}
              </h1>

              <p style="font-size:15px;line-height:1.7;color:#a3a8c7;margin:0 0 24px;">
                {intro}
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" bgcolor="#1b1645"
                    style="background-color:#1b1645;border:1px solid #2f2870;border-radius:12px;padding:24px 12px;">

                    <div style="font-size:12px;font-weight:700;color:#a99cff;
                      text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">
                      Your verification code
                    </div>

                    <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;
                      letter-spacing:8px;color:#ffffff;padding-left:8px;">
                      {otp_code}
                    </div>

                  </td>
                </tr>
              </table>

              <p style="font-size:14px;line-height:1.7;color:#a3a8c7;margin:24px 0 0;">
                This code expires in <strong style="color:#ffffff;">10 minutes</strong>.
                Do not share it with anyone.
              </p>

              <p style="font-size:14px;line-height:1.7;color:#6f7499;margin:16px 0 0;">
                {ignore}
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-top:1px solid #1f2444;padding-top:18px;">
                    <p style="font-size:12px;line-height:1.7;color:#6f7499;margin:0;">
                      Forkwise · Many AI analysts, one honest answer
                      <br>
                      <a href="https://forkwiseai.com" style="color:#a99cff;text-decoration:none;">forkwiseai.com</a>
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
        f"{title}\n\n"
        f"Your Forkwise code is: {otp_code}\n\n"
        "This code expires in 10 minutes. Do not share it with anyone.\n"
        f"{ignore}\n\n"
        "https://forkwiseai.com"
    )
    data = {
        "from": "Forkwise <noreply@forkwiseai.com>",
        "to": [f"{to}"],
        "subject": subject,
        "html": html,
        "text": text,
    }
    mysql = Mysql()
    isSaved = mysql.add_otpcode(otp_code=str(otp_code) , email=to)
    if isSaved == False:
        return False

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
