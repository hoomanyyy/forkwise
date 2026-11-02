#!/usr/bin/env bash
set -e

ENV_FILE="${ENV_FILE:-/opt/forkwise/backend.env}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash $0"
  exit 1
fi

echo
echo "Forkwise: connect NOWPayments"
echo "-------------------------------------------"
echo "API key   : NOWPayments dashboard, Store settings, API keys."
echo "IPN secret: NOWPayments dashboard, Store settings, IPN secret key."
echo "IPN URL to set there: https://api.forkwiseai.com/api/billing/ipn"
echo

read -r -s -p "NOWPayments API key (hidden): " API_KEY < /dev/tty
echo
read -r -s -p "NOWPayments IPN secret (hidden): " IPN_SECRET < /dev/tty
echo

if [ -z "$API_KEY" ] || [ -z "$IPN_SECRET" ]; then
  echo "Both values are needed."
  exit 1
fi

cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"

for NAME in NOWPAYMENTS_API_KEY NOWPAYMENTS_IPN_SECRET; do
  sed -i "/^$NAME=/d" "$ENV_FILE"
done
echo "NOWPAYMENTS_API_KEY=$API_KEY" >> "$ENV_FILE"
echo "NOWPAYMENTS_IPN_SECRET=$IPN_SECRET" >> "$ENV_FILE"

if ! grep -q "^DAILY_TOKEN_LIMIT=[1-9]" "$ENV_FILE"; then
  sed -i "/^DAILY_TOKEN_LIMIT=/d" "$ENV_FILE"
  echo "DAILY_TOKEN_LIMIT=200000" >> "$ENV_FILE"
  echo "Free plan daily limit set to 200000 tokens (Pro x10, Premium x30). Change DAILY_TOKEN_LIMIT in $ENV_FILE to adjust."
fi

systemctl restart forkwise-api
sleep 3
curl -s http://127.0.0.1:5000/api/health || true
echo
echo "Done. Open https://forkwiseai.com/app/billing and press Pay with crypto."
