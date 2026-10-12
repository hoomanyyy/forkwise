import secrets

def generate_secret_key():
    session_secret_key = secrets.token_hex(32)
    return session_secret_key