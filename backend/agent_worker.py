# The Forkwise Agent worker.
# Run it on a SEPARATE server that has Docker (not on the API server):
#   python agent_worker.py
#
# It checks the database every few seconds, takes the oldest queued task,
# runs it with the fork engine and writes everything back to the database.
# The API server only reads and writes the database, it never runs user code.

import time
from database import agent_db
from agent.fork import run_task

WAIT_SECONDS = 3


def main():
    print("Forkwise Agent worker started", flush=True)
    agent_db.fail_stuck_tasks()

    while True:
        task = agent_db.claim_next_task()
        if task is None:
            time.sleep(WAIT_SECONDS)
            continue

        print("task", task["id"], "started", flush=True)
        run_task(task)
        print("task", task["id"], "finished", flush=True)


if __name__ == "__main__":
    main()
