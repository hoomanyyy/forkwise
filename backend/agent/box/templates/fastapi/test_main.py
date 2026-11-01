from fastapi.testclient import TestClient
from main import app


def test_health():
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"ok": True}
