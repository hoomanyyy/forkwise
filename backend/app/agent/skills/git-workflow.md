---
name: git-workflow
title: Git and pull requests
category: Ship
description: Clean branches, commits, pull requests, rebases and conflict resolution. Use whenever the work involves git or GitHub.
---
# Git and pull requests

## Before changing anything
- git status and git log --oneline -10 to see where you are. Never discard uncommitted work you did not create; ask first.
- Create a branch for the task: feature/short-name or fix/short-name.

## Commits
- One logical change per commit. Message: a short imperative subject under 72 characters ("Add order export to CSV"), a blank line, then why the change was needed when it is not obvious.
- Stage specific files (git add path) rather than everything, and check git diff --staged before committing. Never commit secrets, .env files, build output or node_modules.

## Pull requests
- Title like a commit subject. Body: what changed, why, how it was tested, screenshots for UI changes, and anything the reviewer should look at closely.
- Keep PRs small enough to review in fifteen minutes. Split large work into a chain.
- With the gh CLI: gh pr create --fill, gh pr view, gh pr checks.

## Rebasing and conflicts
- Update with git fetch then git rebase origin/main (or merge if the team merges). For conflicts: read both sides, understand what each side intended, combine them, remove the markers, run the tests, then git rebase --continue.
- Never force push to a shared branch. On your own branch use git push --force-with-lease.

## Undo safely
- Undo a pushed commit with git revert. Recover lost work with git reflog. Use git stash to set work aside.

## Parallel work
git worktree add ../name -b branch lets several tasks run in separate folders of the same repository without stepping on each other.
