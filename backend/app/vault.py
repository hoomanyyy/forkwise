import base64
import hashlib
import secrets
from cryptography.fernet import Fernet, InvalidToken
from app import config

KEY = {"value": None}


def load_key():
    if KEY["value"] is not None:
        return KEY["value"]
    config.make_dirs()
    path = config.DATA_DIR / "secret.key"
    wanted = config.text("SECRET_KEY")
    if wanted:
        raw = hashlib.sha256(wanted.encode("utf-8")).digest()
        KEY["value"] = Fernet(base64.urlsafe_b64encode(raw))
        return KEY["value"]
    if path.exists():
        data = path.read_bytes().strip()
    else:
        data = Fernet.generate_key()
        path.write_bytes(data)
        try:
            path.chmod(0o600)
        except OSError:
            pass
    KEY["value"] = Fernet(data)
    return KEY["value"]


def seal(text):
    if text is None or text == "":
        return ""
    return load_key().encrypt(text.encode("utf-8")).decode("ascii")


def unseal(text):
    if not text:
        return ""
    try:
        return load_key().decrypt(text.encode("ascii")).decode("utf-8")
    except InvalidToken:
        return ""


def random_name():
    return secrets.token_hex(4)
