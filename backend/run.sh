#!/usr/bin/env bash
cd "$(dirname "$0")"
PORT_VALUE="${PORT:-5000}"
exec python3 -m uvicorn app.main:app --host 127.0.0.1 --port "$PORT_VALUE" --reload
