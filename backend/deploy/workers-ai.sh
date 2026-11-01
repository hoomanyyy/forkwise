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
echo "Forkwise: connect Cloudflare Workers AI"
echo "-------------------------------------------"
echo "Account ID: Cloudflare dashboard, Workers AI page (right side)."
echo "API token : dash.cloudflare.com/profile/api-tokens, permission Workers AI."
echo

read -r -p "Cloudflare Account ID: " ACCOUNT_ID </dev/tty
read -r -s -p "Cloudflare API token (hidden): " TOKEN </dev/tty
echo
ACCOUNT_ID="$(echo "$ACCOUNT_ID" | tr -d '[:space:]')"
TOKEN="$(echo "$TOKEN" | tr -d '[:space:]')"
if [ -z "$ACCOUNT_ID" ] || [ -z "$TOKEN" ]; then
    echo "Both values are needed."
    exit 1
fi

BASE="https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai/v1"

echo
echo "Checking the token and listing text models..."
RESULT="$(curl -s -H "Authorization: Bearer $TOKEN" "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai/models/search?task=Text%20Generation&per_page=100")"
LIST="$(echo "$RESULT" | "$PY" -c "
import sys, json
try:
    data = json.load(sys.stdin)
except ValueError:
    print('ERROR not json')
    sys.exit(0)
if not data.get('success'):
    print('ERROR ' + json.dumps(data.get('errors'))[:300])
    sys.exit(0)
for item in data.get('result', []):
    functions = ''
    for prop in item.get('properties', []):
        if prop.get('property_id') == 'function_calling' and str(prop.get('value')).lower() == 'true':
            functions = '   [tools]'
    print(item['name'] + functions)
")"

if echo "$LIST" | grep -q '^ERROR'; then
    echo "$LIST"
    echo "The token or the account id is not right. Nothing was changed."
    exit 1
fi

echo "$LIST" | head -40
echo
echo "Models marked [tools] can work with files and commands. Prefer those."
echo

DEFAULT_MODELS="@cf/openai/gpt-oss-120b=GPT-OSS 120B,@cf/moonshotai/kimi-k2.6=Kimi K2.6,@cf/meta/llama-3.3-70b-instruct-fp8-fast=Llama 3.3 70B,@cf/mistralai/mistral-small-3.1-24b-instruct=Mistral Small 3.1"
echo "Default list:"
echo "  $DEFAULT_MODELS"
read -r -p "Press Enter to use it, or paste your own (id=Label,id=Label): " MODELS </dev/tty
[ -z "$MODELS" ] && MODELS="$DEFAULT_MODELS"

FIRST="$(echo "$MODELS" | cut -d, -f1 | cut -d= -f1)"

echo
echo "Testing a real call with $FIRST ..."
REPLY="$(curl -s -m 60 -X POST "$BASE/chat/completions" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"model\":\"$FIRST\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with the single word: ready\"}],\"max_tokens\":40}")"
echo "$REPLY" | "$PY" -c "
import sys, json
try:
    data = json.load(sys.stdin)
    message = data['choices'][0]['message']
    print('Model answered:', (message.get('content') or message.get('reasoning_content') or message.get('reasoning') or '(empty)')[:120])
except Exception:
    print('TEST FAILED:', sys.stdin.read()[:300])
    sys.exit(1)
"
if [ $? -ne 0 ]; then
    echo "The test call failed, so nothing was changed. Check the model id above."
    echo "$REPLY" | head -c 400
    echo
    exit 1
fi

cp "$ENV_FILE" "$ENV_FILE.bak-$(date +%Y%m%d-%H%M%S)"
"$PY" - "$ENV_FILE" "$BASE" "$TOKEN" "$MODELS" "$FIRST" <<'PYEOF'
import sys
path, base, token, models, first = sys.argv[1:6]
wanted = {
    "LLM_BASE_URL": base,
    "LLM_API_KEY": token,
    "LLM_MODELS": models,
    "LLM_SMALL_MODEL": first,
    "LLM_VISION": "false",
    "LLM_CONTEXT": "128000",
}
lines = open(path).read().split("\n")
done = []
out = []
for line in lines:
    key = line.split("=", 1)[0]
    if key in wanted and "=" in line:
        out.append(key + "=" + wanted[key])
        done.append(key)
    else:
        out.append(line)
for key in wanted:
    if key not in done:
        out.append(key + "=" + wanted[key])
open(path, "w").write("\n".join(out))
PYEOF

systemctl restart forkwise-api
sleep 4
echo
echo "Status:"
curl -s http://127.0.0.1:5000/api/status
echo
echo
echo "Done. Open https://forkwiseai.com/app and send a message."
echo "A backup of the old settings was saved next to the settings file."
