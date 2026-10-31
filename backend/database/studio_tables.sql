-- Only the Studio tables, for databases that already have the Agent tables.
-- Run once:  mysql -u USER -p DB_NAME < database/studio_tables.sql
-- ---------------- Forkwise Studio (chat coding) ----------------

-- One row for every Studio chat. Each chat has its own sandbox on the worker.
CREATE TABLE IF NOT EXISTS studio_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT 'New project',
  repo_url VARCHAR(500) DEFAULT NULL,             -- empty means "start from an empty folder"
  branch VARCHAR(200) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'idle',     -- idle, pending, running, stopping, error
  box VARCHAR(20) NOT NULL DEFAULT 'none',        -- none, running, stopped
  patch MEDIUMTEXT DEFAULT NULL,                  -- all changes so far, saved after every turn
  files MEDIUMTEXT DEFAULT NULL,                  -- JSON list of the project files
  todos TEXT DEFAULT NULL,                        -- JSON task list the agent keeps
  installs TEXT DEFAULT NULL,                     -- JSON list of install commands, replayed when the sandbox restarts
  error TEXT DEFAULT NULL,
  tokens INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Every message of a Studio chat: the user, the agent, and every tool the agent used.
CREATE TABLE IF NOT EXISTS studio_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  role VARCHAR(20) NOT NULL,                      -- user, assistant, tool, info, error
  content MEDIUMTEXT,
  calls MEDIUMTEXT DEFAULT NULL,                  -- assistant: JSON tool calls
  call_id VARCHAR(100) DEFAULT NULL,              -- tool: which call this answers
  tool VARCHAR(50) DEFAULT NULL,
  tool_args TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Files of a Studio chat: what the user uploaded and what the agent made.
CREATE TABLE IF NOT EXISTS studio_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(10) NOT NULL,                      -- upload or output
  size BIGINT NOT NULL DEFAULT 0,
  path VARCHAR(500) NOT NULL,                     -- where the file is on the API server
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS worker_heartbeat (
  name VARCHAR(50) PRIMARY KEY,
  seen_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
