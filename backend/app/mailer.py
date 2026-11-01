import smtplib
import ssl
import sys
from email.message import EmailMessage
from app import config


def ready():
    return bool(config.SMTP_HOST and config.SMTP_FROM)


def send(to, subject, text, html=""):
    if not ready():
        return False
    try:
        return deliver(to, subject, text, html)
    except Exception as problem:
        print("EMAIL FAILED to " + to + " via " + config.SMTP_HOST + ":" + str(config.SMTP_PORT) + " as " + config.SMTP_FROM + ": " + type(problem).__name__ + ": " + str(problem), file=sys.stderr, flush=True)
        raise


def deliver(to, subject, text, html):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = "Forkwise <" + config.SMTP_FROM + ">"
    message["To"] = to
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")
    context = ssl.create_default_context()
    if config.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, context=context, timeout=20) as server:
            if config.SMTP_USER:
                server.login(config.SMTP_USER, config.SMTP_PASS)
            server.send_message(message)
    else:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=20) as server:
            if config.SMTP_TLS:
                server.starttls(context=context)
            if config.SMTP_USER:
                server.login(config.SMTP_USER, config.SMTP_PASS)
            server.send_message(message)
    return True
