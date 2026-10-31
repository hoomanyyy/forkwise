import time
import threading
from database import agent_db
from agent.fork import run_task
from agent.studio import studio_loop

WAIT_SECONDS = 3


def main():
    print("Forkwise worker started", flush=True)
    agent_db.fail_stuck_tasks()

    studio_thread = threading.Thread(target=studio_loop, daemon=True)
    studio_thread.start()

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
