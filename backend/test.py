import requests
import os
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("NOWPAYMENTS_API_KEY")

coins = ["usdtbsc", "usdcbsc", "bnbbsc", "usdttrc20", "trx", "ltc", "btc", "eth", "ton", "usdtton", "usdterc20", "usdtmatic", "usdcmatic", "sol", "usdtsol"]

for coin in coins:
    response = requests.get(
        "https://api.nowpayments.io/v1/min-amount",
        headers={"x-api-key": key},
        params={
            "currency_from": coin,
            "currency_to": "usdtbsc",
            "fiat_equivalent": "usd",
            "is_fixed_rate": "false"
        }
    )
    data = response.json()
    usd = data.get("fiat_equivalent")
    if usd is None:
        print(coin, "| ERROR:", data)
    elif usd < 5:
        print(coin, "| min $", round(usd, 2), "| OK - enable")
    else:
        print(coin, "| min $", round(usd, 2), "| TOO HIGH - disable")