# Moving Forkwise to a new server

Two scripts. They work on Oracle Linux 8/9 and Ubuntu 22.04/24.04, on ARM64 (Ampere) and x86_64.

| Script | Where | What it does |
|---|---|---|
| `backup-old-server.sh` | old server | one file with the database, settings, Studio files |
| `install.sh` | new server | installs everything and restores the backup |

## 1. Old server

```
curl -fsSL https://raw.githubusercontent.com/hoomanyyy/forkwise/main/deploy/backup-old-server.sh -o backup.sh
sudo bash backup.sh
```

`sudo bash backup.sh --final` does the same and then stops the old API and worker. Use it for the last
backup, right before you change the DNS, so no new data is left behind.

## 2. Copy the backup (Windows PowerShell)

```
scp OLD_USER@OLD_IP:~/forkwise-backup-*.tar.gz "$env:USERPROFILE\Downloads\"
$b = Get-ChildItem "$env:USERPROFILE\Downloads\forkwise-backup-*.tar.gz" | Sort-Object LastWriteTime | Select-Object -Last 1
scp -i "$env:USERPROFILE\Downloads\ssh-key.key" $b.FullName opc@NEW_IP:~/
```

## 3. Oracle Cloud

Networking > Virtual cloud networks > your VCN > subnet > security list > Add Ingress Rules:
source `0.0.0.0/0`, TCP, destination ports `80` and `443`.

## 4. New server

```
curl -fsSL https://raw.githubusercontent.com/hoomanyyy/forkwise/main/deploy/install.sh -o install.sh
sudo bash install.sh ~/forkwise-backup-*.tar.gz
```

Test before the DNS change (from Windows):

```
curl.exe -H "Host: api.forkwiseai.com" http://NEW_IP/health
```

## 5. DNS and HTTPS

Point the `A` record of `api.forkwiseai.com` to the new IP. A few minutes later:

```
sudo bash /opt/forkwise/app/deploy/install.sh --ssl
```

## 6. AI model for Studio and Agent

```
sudo bash /opt/forkwise/app/deploy/install.sh --model
```

It asks for an OpenRouter key, shows current models with prices, checks the one you choose and restarts the worker.
Set a credit limit on the key at https://openrouter.ai/keys.

## What Studio can use

- a real Chromium browser (`browser` tool) and a virtual 1280x800 desktop it controls with mouse and keyboard (`computer` tool);
  the user sees every screenshot live in the Screen panel
- `start_server` for apps that keep running (uvicorn, npm run dev)
- internet inside the sandbox (`SANDBOX_INTERNET=always`), with a firewall that blocks this server, the cloud metadata
  service, private networks and mail ports
- free web search without a key through SearXNG on 127.0.0.1:8888, then DuckDuckGo, Bing and Mojeek
- when the model hits a rate limit it waits (up to `STUDIO_LIMIT_WAIT_MINUTES`) and continues; `AGENT_FALLBACK_MODEL`
  can be a comma separated list of models to try first

## Layout on the new server

| Path | |
|---|---|
| `/opt/forkwise/app` | the code (git clone) |
| `/opt/forkwise/venv` | Python packages |
| `/opt/forkwise/api.env` | API settings (secrets, mode 600) |
| `/opt/forkwise/worker.env` | worker settings |
| `/opt/forkwise/studio_files` | Studio uploads and outputs |
| `forkwise.service` | API, uvicorn on 127.0.0.1:5000, user `forkwise` |
| `forkwise-agent.service` | Agent and Studio worker, user `forkwiseagent` (docker group) |
| `/etc/nginx/conf.d/forkwise.conf` | nginx, websockets, uploads up to 300 MB |
| `forkwise-sandbox-firewall.service` | firewall rules for the sandboxes |
| `forkwise-searxng` (Docker) | free web search for the agent |

Update the code later: `sudo bash /opt/forkwise/app/deploy/install.sh` (keeps settings and data).
