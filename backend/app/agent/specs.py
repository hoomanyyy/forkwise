READ_ONLY = ["read_file", "list_dir", "glob", "grep", "web_search", "web_fetch", "todo_write", "job_output", "ask_user", "use_skill", "memory", "screenshot", "exit_plan_mode"]


def fn(name, description, properties, required=None):
    parameters = {"type": "object", "properties": properties}
    if required:
        parameters["required"] = required
    return {"type": "function", "function": {"name": name, "description": description, "parameters": parameters}}


def string(description):
    return {"type": "string", "description": description}


def integer(description):
    return {"type": "integer", "description": description}


def boolean(description):
    return {"type": "boolean", "description": description}


BUILTIN = [
    fn("read_file", "Read a text file with line numbers. Use offset and limit for big files. Images are shown to you when your model can see.", {
        "path": string("File path, relative to the project folder or absolute inside it."),
        "offset": integer("First line to read, starting at 1."),
        "limit": integer("How many lines to read, default 800."),
    }, ["path"]),
    fn("write_file", "Create a new file or replace a whole file. Folders are created for you. Prefer edit_file for small changes in existing files.", {
        "path": string("File path."),
        "content": string("The complete content of the file."),
    }, ["path", "content"]),
    fn("edit_file", "Replace exact text in a file. old_string must match the file exactly, including spaces, and must be unique unless replace_all is true. Read the file first.", {
        "path": string("File path."),
        "old_string": string("The exact text to replace."),
        "new_string": string("The new text."),
        "replace_all": boolean("Replace every match instead of one."),
    }, ["path", "old_string", "new_string"]),
    fn("multi_edit", "Make several exact text replacements in one file at once. Edits are applied in order and all must succeed.", {
        "path": string("File path."),
        "edits": {"type": "array", "items": {"type": "object", "properties": {
            "old_string": {"type": "string"},
            "new_string": {"type": "string"},
            "replace_all": {"type": "boolean"},
        }, "required": ["old_string", "new_string"]}},
    }, ["path", "edits"]),
    fn("list_dir", "List files and folders as a tree. Big folders like node_modules are skipped.", {
        "path": string("Folder, default is the project folder."),
        "depth": integer("How deep to go, default 3."),
    }),
    fn("glob", "Find files by name pattern, for example **/*.jsx or src/**/test_*.py.", {
        "pattern": string("Glob pattern."),
        "path": string("Folder to search in."),
    }, ["pattern"]),
    fn("grep", "Search file contents with a regular expression. Returns matching lines with file and line number.", {
        "pattern": string("Regular expression."),
        "path": string("Folder or file to search in."),
        "include": string("Only files matching this glob, for example *.py"),
        "ignore_case": boolean("Ignore upper and lower case."),
        "context": integer("Lines of context around each match."),
    }, ["pattern"]),
    fn("bash", "Run a shell command on your Linux computer in the project folder. Internet works. Use run_in_background for servers, watchers and long jobs, then read them with job_output.", {
        "command": string("The command to run."),
        "description": string("A few words about what it does, shown to the user."),
        "timeout": integer("Seconds before it is stopped, default 180, at most 900."),
        "run_in_background": boolean("Start it in the background and return at once."),
    }, ["command"]),
    fn("job_output", "Read the output of a background job and see if it is still running.", {
        "job_id": string("The id returned by bash with run_in_background."),
    }, ["job_id"]),
    fn("kill_job", "Stop a background job.", {
        "job_id": string("The job id."),
    }, ["job_id"]),
    fn("preview", "Show a web app that is running on your computer to the user in the live Preview panel. Start the server first with bash run_in_background, listening on 0.0.0.0. Returns the public preview link.", {
        "port": integer("The port the app listens on."),
        "command": string("The command that starts the server, so the preview can be restarted later."),
        "path": string("Page to open first, default /"),
    }, ["port"]),
    fn("screenshot", "Open a page in a real Chromium browser on your computer and take a screenshot. Also returns console errors. Use it to check how a site really looks and to read pages that need JavaScript.", {
        "url": string("For your own apps use http://localhost:PORT/path. Public links work too."),
        "width": integer("Viewport width, default 1280. Use 390 to check mobile."),
        "full_page": boolean("Capture the whole page, not only the first screen."),
        "wait_ms": integer("Extra wait after load in milliseconds, default 800."),
    }, ["url"]),
    fn("web_search", "Search the internet. Use it for anything current: prices, exchange rates, news, weather, versions, documentation.", {
        "query": string("The search query. Use the language that gives the best results."),
    }, ["query"]),
    fn("web_fetch", "Open a public web page or API and return its text.", {
        "url": string("The link."),
        "max_chars": integer("Most characters to return, default 20000."),
    }, ["url"]),
    fn("todo_write", "Create or update your task list for this job. The user sees it live. Send the whole list each time. Keep exactly one item in_progress while you work.", {
        "todos": {"type": "array", "items": {"type": "object", "properties": {
            "content": {"type": "string"},
            "status": {"type": "string", "enum": ["pending", "in_progress", "completed"]},
        }, "required": ["content", "status"]}},
    }, ["todos"]),
    fn("memory", "Long term memory about the user that stays across all chats. Use it when the user asks you to remember or forget something, or tells you a lasting fact or preference. Never use files for this.", {
        "action": {"type": "string", "enum": ["save", "delete", "list"]},
        "content": string("The fact to remember, one short sentence, for save."),
        "id": string("Memory id, for delete."),
        "scope": {"type": "string", "enum": ["user", "project"], "description": "user: everywhere. project: only in this project."},
    }, ["action"]),
    fn("ask_user", "Ask the user a question and wait for the answer. Only for decisions that truly belong to the user. Give clear options when you can.", {
        "question": string("The question."),
        "options": {"type": "array", "items": {"type": "string"}, "description": "Possible answers to click."},
    }, ["question"]),
    fn("task", "Give a self-contained job to a helper agent with its own fresh context, and get its final report. explore: read-only, for searching a codebase or researching the web. general: can change files and run commands.", {
        "description": string("Three to six words, shown to the user."),
        "prompt": string("Full instructions. The helper cannot see this chat, so include everything it needs."),
        "agent": {"type": "string", "enum": ["explore", "general"]},
    }, ["description", "prompt"]),
    fn("show_file", "Show a file you made to the user as a card with a preview and a download button. Use it for results like images, videos, audio, PDFs, documents, zip files and data exports.", {
        "path": string("File path."),
        "caption": string("One line about the file."),
    }, ["path"]),
    fn("create_tool", "Give yourself a new permanent tool. Write a Python 3 script that reads its JSON arguments from stdin and prints the result. It runs on your computer with internet. After it is created you can call it as my_<name> in this and every later chat. Use it for capabilities you will need again.", {
        "name": string("Short snake_case name."),
        "description": string("What the tool does and when to use it."),
        "parameters": {"type": "object", "description": "JSON schema of the arguments, type object with properties."},
        "code": string("Python 3 code. Read input with: import sys, json; args = json.load(sys.stdin). Print the result."),
        "test_input": {"type": "object", "description": "Arguments for a test run right after saving."},
    }, ["name", "description", "parameters", "code"]),
    fn("save_skill", "Save a reusable skill: step by step instructions for a kind of job, loaded later with use_skill in any chat.", {
        "name": string("Short kebab-case name."),
        "description": string("When to use this skill."),
        "instructions": string("Markdown instructions."),
    }, ["name", "description", "instructions"]),
    fn("use_skill", "Load the full instructions of a saved skill.", {
        "name": string("Skill name."),
    }, ["name"]),
]

PLAN_TOOL = fn("exit_plan_mode", "Present your finished plan to the user for approval. Call it once, when the plan is complete. The user can approve it to start building.", {
    "plan": string("The plan in Markdown: goal, steps, files to create or change, how you will verify it."),
}, ["plan"])


def names(spec_list):
    result = []
    for spec in spec_list:
        result.append(spec["function"]["name"])
    return result


def pick(wanted):
    result = []
    for spec in BUILTIN:
        if spec["function"]["name"] in wanted:
            result.append(spec)
    return result


EXPLORE_TOOLS = ["read_file", "list_dir", "glob", "grep", "web_search", "web_fetch", "screenshot"]
GENERAL_EXCLUDE = ["task", "ask_user", "todo_write", "memory", "create_tool", "save_skill"]


def explore_specs():
    return pick(EXPLORE_TOOLS)


def general_specs():
    result = []
    for spec in BUILTIN:
        if spec["function"]["name"] not in GENERAL_EXCLUDE:
            result.append(spec)
    return result


def plan_specs():
    result = []
    for spec in BUILTIN:
        name = spec["function"]["name"]
        if name in READ_ONLY or name == "task":
            result.append(spec)
    result.append(PLAN_TOOL)
    return result
