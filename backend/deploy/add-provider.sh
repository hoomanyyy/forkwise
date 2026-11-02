#!/usr/bin/env bash
set -uo pipefail

ENV_FILE="${ENV_FILE:-/opt/forkwise/backend.env}"
PY="/opt/forkwise/venv/bin/python"
[ -x "$PY" ] || PY="python3"

if [ "$(id -u)" != "0" ]; then
    echo "Run with sudo."
    exit 1
fi

echo
echo "Forkwise: add a model provider (tests the key first)"
echo "-------------------------------------------------------"
echo "  1) Google AI Studio (Gemini)"
echo "  2) Groq"
echo "  3) OpenRouter"
echo "  4) Cerebras"
echo "  5) Other (OpenAI compatible)"
read -r -p "Choose 1-5: " CHOICE </dev/tty

VISION="false"
case "$CHOICE" in
    1) BASE="https://generativelanguage.googleapis.com/v1beta/openai"; DEFAULT_MODELS="gemini-3.5-flash=Gemini 3.5 Flash,gemini-3.5-flash-lite=Gemini 3.5 Flash-Lite"; VISION="true" ;;
    2) BASE="https://api.groq.com/openai/v1"; DEFAULT_MODELS="llama-3.3-70b-versatile=Llama 3.3 70B (Groq)" ;;
    3) BASE="https://openrouter.ai/api/v1"; DEFAULT_MODELS="" ;;
    4) BASE="https://api.cerebras.ai/v1"; DEFAULT_MODELS="" ;;
    *) read -r -p "Base URL (ending in /v1): " BASE </dev/tty; DEFAULT_MODELS="" ;;
esac
BASE="${BASE%/}"

read -r -s -p "API key (hidden): " KEY </dev/tty
echo
KEY="$(echo "$KEY" | tr -d '[:space:]')"
if [ -z "$KEY" ]; then
    echo "A key is needed."
    exit 1
fi

echo
echo "Asking the provider which models this key can use..."
LIST="$(curl -s -m 30 -H "Authorization: Bearer $KEY" "$BASE/models" | "$PY" -c "
import sys, json
try:
    data = json.load(sys.stdin)
    items = data.get('data') or data.get('models') or []
    names = []
    for item in items:
        name = item.get('id') or item.get('name') or ''
        if name.startswith('models/'):
            name = name[7:]
        names.append(name)
    if len(names) == 0:
        print('ERROR ' + json.dumps(data)[:300])
    else:
        print('\n'.join(names[:60]))
except Exception:
    print('ERROR could not read the answer')
")"
if echo "$LIST" | grep -q '^ERROR'; then
    echo "$LIST"
    echo "The key or the address is not right. Nothing was changed."
    exit 1
fi
echo "$LIST"
echo

if [ -n "$DEFAULT_MODELS" ]; then
    echo "Suggested: $DEFAULT_MODELS"
    read -r -p "Press Enter to use it, or paste your own (id=Label,id=Label): " MODELS </dev/tty
    [ -z "$MODELS" ] && MODELS="$DEFAULT_MODELS"
else
    read -r -p "Models to use (id=Label,id=Label): " MODELS </dev/tty
fi
if [ -z "$MODELS" ]; then
    echo "At least one model is needed."
    exit 1
fi
FIRST="$(echo "$MODELS" | cut -d, -f1 | cut -d= -f1)"

echo
echo "Test 1 of 2: a normal answer from $FIRST ..."
REPLY="$(curl -s -m 90 -X POST "$BASE/chat/completions" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d "{\"model\":\"$FIRST\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with the single word: ready\"}],\"max_tokens\":200}")"
echo "$REPLY" | "$PY" -c "
import sys, json
try:
    data = json.load(sys.stdin)
    message = data['choices'][0]['message']
    print('OK, the model said:', (message.get('content') or '(empty, but the call worked)')[:100])
except Exception:
    print('FAILED:', json.dumps(data)[:400] if 'data' in dir() else 'no valid answer')
    sys.exit(1)
"
if [ $? -ne 0 ]; then
    echo "The test failed, so nothing was changed. Check the model name in the list above."
    exit 1
fi

echo
echo "Test 2 of 2: can it use tools (needed for building files and running code)? ..."
TOOL="$(curl -s -m 90 -X POST "$BASE/chat/completions" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d "{\"model\":\"$FIRST\",\"messages\":[{\"role\":\"user\",\"content\":\"Use the tool to read the file notes.txt.\"}],\"tools\":[{\"type\":\"function\",\"function\":{\"name\":\"read_file\",\"description\":\"Read a file\",\"parameters\":{\"type\":\"object\",\"properties\":{\"path\":{\"type\":\"string\"}},\"required\":[\"path\"]}}}],\"max_tokens\":300}")"
echo "$TOOL" | "$PY" -c "
import sys, json
try:
    data = json.load(sys.stdin)
    calls = data['choices'][0]['message'].get('tool_calls') or []
    if len(calls) > 0:
        print('OK, it called the tool:', calls[0]['function']['name'], calls[0]['function']['arguments'][:60])
    else:
        print('WARNING: it answered without calling the tool. It may still work for chat, but is weak for building.')
except Exception:
    print('WARNING: the tool test gave no clear answer:', sys.stdin.read()[:200])
"

echo
read -r -p "Add this provider to Forkwise? (y/n): " SURE </dev/tty
if [ "$SURE" != "y" ]; then
    echo "Nothing was changed."
    exit 0
fi

cp "$ENV_FILE" "$ENV_FILE.bak-$(date +%Y%m%d-%H%M%S)"
"$PY" - "$ENV_FILE" "$BASE" "$KEY" "$MODELS" "$VISION" <<'PYEOF'
import sys
path, base, key, models, vision = sys.argv[1:6]
lines = open(path).read().split("\n")
slot = 0
for index in range(1, 10):
    prefix = "PROVIDER_" + str(index) + "_URL="
    found = ""
    for line in lines:
        if line.startswith(prefix):
            found = line[len(prefix):].strip()
    if found == base:
        slot = index
        break
    if found == "" and slot == 0:
        slot = index
if slot == 0:
    print("All 9 provider slots are used.")
    sys.exit(1)
names = ["URL", "KEY", "MODELS", "VISION"]
values = [base, key, models, vision]
out = []
for line in lines:
    skip = False
    for name in names:
        if line.startswith("PROVIDER_" + str(slot) + "_" + name + "="):
            skip = True
    if not skip:
        out.append(line)
while len(out) > 0 and out[len(out) - 1] == "":
    out.pop()
for position in range(len(names)):
    out.append("PROVIDER_" + str(slot) + "_" + names[position] + "=" + values[position])
open(path, "w").write("\n".join(out) + "\n")
print("Saved as provider slot " + str(slot))
PYEOF
[ $? -ne 0 ] && exit 1

systemctl restart forkwise-api
sleep 3
echo
curl -s http://127.0.0.1:5000/api/status
echo
echo "Done. Open https://forkwiseai.com/app and pick the new model next to the send button."
