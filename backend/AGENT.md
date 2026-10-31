# Forkwise Agent (phase 0)

A coding agent that proves its work. Several independent agents ("forks") solve the same task in
locked sandboxes, then the tests of each fork are run on the code of every other fork. The result is
a verdict, the best patch, and a question for the user when the task can be read in more than one way.

| Verdict | Meaning |
|---|---|
| verified | 2 or more forks pass their tests and every fork passes the tests of the others |
| fragile | the code works, but the forks only partly agree, or there was nothing to compare with |
| choice_dependent | the forks pass their own tests but fail each other's tests: the task is ambiguous |
| failing | no fork passes its tests |

## How it fits together

```
Browser (/agent)  ->  API server (server.py)  ->  MySQL  <-  Worker server (agent_worker.py + Docker)
                      saves tasks, reads results           takes queued tasks, runs the forks
```

The API server never runs user code. Only the worker does, and only inside Docker sandboxes.

| File | What it does |
|---|---|
| `database/agent_tables.sql` | the 4 new tables: tasks, forks, cross checks, live log |
| `database/agent_db.py` | plain functions to read and write those tables |
| `agent/sandbox.py` | starts and stops Docker sandboxes, runs commands in them, reads and writes files |
| `agent/model.py` | calls the language model (any OpenAI compatible provider) |
| `agent/loop.py` | the agent loop and its 7 tools (list, read, search, write, edit, run, finish) |
| `agent/verify.py` | finds the test command, runs tests, cross testing, verdict, explanation |
| `agent/fork.py` | runs one task from start to end with several forks in parallel |
| `agent_worker.py` | the worker loop: takes the oldest queued task and runs it |
| `agent/Dockerfile.sandbox` | the image every fork runs in |
| `agent/forkwise-agent.service` | keeps the worker running (systemd) |

API endpoints (added to `server.py`):

- `POST /api/agent/tasks` new task `{repo_url, branch, task, test_command, setup_command, forks}`
- `GET /api/agent/tasks` your tasks
- `GET /api/agent/tasks/{id}?after=EVENT_ID` task, forks, cross checks and new log lines
- `GET /api/agent/tasks/{id}/patch` download the chosen patch
- `POST /api/agent/tasks/{id}/again` run again, with the user's answer `{answer}`

## Setup

### 1. Database (once)

```
mysql -u USER -p DB_NAME < database/agent_tables.sql
```

### 2. API server

Deploy the new `server.py` and the `database/agent_db.py`, `agent/` files as usual. Optional settings in `.env`:

```
AGENT_DAILY_LIMIT=3     # agent tasks per user per day (admins have no limit)
AGENT_MAX_FORKS=3       # most forks a normal user can choose (admins: 5)
```

### 3. Worker server (a separate VPS with at least 4 GB RAM)

Do not use the API server. Anyone in the `docker` group is effectively root on that machine.

```
# Docker
curl -fsSL https://get.docker.com | sh
sudo adduser forkwise && sudo usermod -aG docker forkwise

# code (same repository, only the backend folder is needed)
git clone https://github.com/hoomanyyy/forkwise.git && cd forkwise/backend
pip install -r requirements.txt

# the sandbox image
docker build -t forkwise-sandbox -f agent/Dockerfile.sandbox agent
```

`.env` on the worker:

```
DB_HOST=...            # the same database as the API (allow this server's IP in MySQL)
DB_USER=...
DB_PASS=...
DB_NAME=...

AGENT_BASE_URL=https://openrouter.ai/api/v1
AGENT_API_KEY=...
AGENT_MODEL=...         # a strong model with tool calling, it writes the code
AGENT_SMALL_MODEL=...   # a cheap model, it only writes the short summary

SANDBOX_IMAGE=forkwise-sandbox
SANDBOX_MEMORY=2g
SANDBOX_CPUS=1
SANDBOX_INTERNET=setup  # internet only for the setup command
```

Test by hand first, then install the service:

```
python3 agent_worker.py
sudo cp agent/forkwise-agent.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now forkwise-agent
```

### 4. Frontend

The new pages are `/agent` and `/agent/:id` (sidebar: Agent). Deploy the frontend as usual.

## Safety in phase 0

- Only `https` links to github.com, gitlab.com and bitbucket.org, max 200 MB, public repositories.
- Every fork: its own container, user `agent` (not root), no Linux capabilities, 2 GB memory, 1 CPU,
  256 processes, a time limit on every command, internet cut after setup.
- One open task per user and a daily limit.
- Containers and cloned code are deleted when the task ends.

For real customers later: install gVisor (`SANDBOX_RUNTIME=runsc`) or move the sandboxes to a
service such as E2B or Firecracker microVMs.

## What is not in phase 0 yet

- private repositories and Pull Requests (GitHub App)
- memory between tasks (summaries of recent tasks, long term memory, archive)
- live preview of web apps, dashboards
- billing by usage (tokens are already saved per fork in `agent_forks.tokens`)
