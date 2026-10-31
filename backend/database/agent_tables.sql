-- Forkwise Agent tables.
-- Run this once on your database:  mysql -u USER -p DB_NAME < agent_tables.sql

-- One row for every coding task a user gives the agent.
CREATE TABLE IF NOT EXISTS agent_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  repo_url VARCHAR(500) NOT NULL,
  branch VARCHAR(200) DEFAULT NULL,
  task TEXT NOT NULL,
  test_command VARCHAR(500) DEFAULT NULL,
  setup_command VARCHAR(500) DEFAULT NULL,
  forks INT NOT NULL DEFAULT 3,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',   -- queued, running, done, failed
  verdict VARCHAR(30) DEFAULT NULL,               -- verified, fragile, choice_dependent, failing
  chosen_fork INT DEFAULT NULL,
  summary TEXT DEFAULT NULL,
  question TEXT DEFAULT NULL,                     -- what Forkwise asks the user when forks disagree
  patch MEDIUMTEXT DEFAULT NULL,
  error TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME DEFAULT NULL,
  finished_at DATETIME DEFAULT NULL,
  INDEX (user_id),
  INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row for every fork (one independent agent) of a task.
CREATE TABLE IF NOT EXISTS agent_forks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  fork_no INT NOT NULL,
  style VARCHAR(200) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',  -- waiting, working, done, failed
  summary TEXT DEFAULT NULL,
  diff MEDIUMTEXT DEFAULT NULL,
  tests_ok TINYINT DEFAULT NULL,
  test_output TEXT DEFAULT NULL,
  steps INT DEFAULT 0,
  tokens INT DEFAULT 0,
  INDEX (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The cross check: the tests written by one fork, run on the code of another fork.
CREATE TABLE IF NOT EXISTS agent_checks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  tests_from INT NOT NULL,
  code_of INT NOT NULL,
  passed TINYINT NOT NULL,
  output TEXT DEFAULT NULL,
  INDEX (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A live log, so the user can watch what every fork is doing.
CREATE TABLE IF NOT EXISTS agent_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  fork_no INT NOT NULL DEFAULT 0,                 -- 0 means the whole task
  kind VARCHAR(20) NOT NULL,                      -- info, tool, think, error, verdict
  text TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
