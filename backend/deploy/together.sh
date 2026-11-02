#!/usr/bin/env bash
set -e

ENV_FILE="${ENV_FILE:-/opt/forkwise/backend.env}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash $0"
  exit 1
fi

echo
echo "Forkwise: connect Together AI for image generation"
echo "-------------------------------------------"
echo "Key: api.together.ai, Settings, API Keys."
echo

read -r -s -p "Together AI API key (hidden): " KEY < /dev/tty
echo
KEY="$(echo "$KEY" | tr -d '[:space:]')"
if [ -z "$KEY" ]; then
  echo "A key is needed."
  exit 1
fi

MODEL="black-forest-labs/FLUX.1-schnell-Free"
echo
echo "Testing a real image call with $MODEL ..."
CODE="$(curl -s -m 120 -o /tmp/together-test.json -w "%{http_code}" -X POST "https://api.together.xyz/v1/images/generations" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d "{\"model\":\"$MODEL\",\"prompt\":\"a red airplane in a blue sky\",\"steps\":4,\"n\":1,\"response_format\":\"base64\"}")"
echo "Answer code: $CODE"
if [ "$CODE" != "200" ]; then
  echo "The test failed. The answer was:"
  head -c 500 /tmp/together-test.json
  echo
  echo "Nothing was changed."
  exit 1
fi
if ! grep -q "b64_json" /tmp/together-test.json; then
  echo "The answer had no image. Nothing was changed."
  head -c 300 /tmp/together-test.json
  echo
  exit 1
fi
rm -f /tmp/together-test.json
echo "The image service works."

cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
for NAME in TOGETHER_API_KEY TOGETHER_IMAGE_MODEL; do
  sed -i "/^$NAME=/d" "$ENV_FILE"
done
echo "TOGETHER_API_KEY=$KEY" >> "$ENV_FILE"
echo "TOGETHER_IMAGE_MODEL=$MODEL" >> "$ENV_FILE"

systemctl restart forkwise-api
sleep 3
curl -s http://127.0.0.1:5000/api/health
echo
echo "Done. Forkwise now tries Together AI first for images, then Cloudflare, then Pollinations."
