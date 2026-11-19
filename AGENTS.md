# Agent coordination

Use this protocol for both Codex and GitHub Copilot work in this repository.

## Before edits

1. Run `git status --short --branch` and inspect existing uncommitted changes.
2. Do not edit dirty files or overwrite work you did not create.
3. Choose one narrowly scoped task and claim it with:

   ```bash
   node scripts/agent-task-lock.cjs claim <agent-name> <task-id> --files <comma-separated-paths>
   ```

4. Work in a dedicated branch and worktree. Never make parallel agents edit the same checkout.
5. Use `node scripts/agent-task-lock.cjs list` to verify file ownership. A claim fails if two agents claim the same file.

## Task dispatch rules

- Prefer independent, file-disjoint tasks.
- Read the master remediation plan and repository scripts before choosing a production task.
- Do not run database migrations, seed production data, or inspect or write secret values.
- Do not deploy or merge unless explicitly authorized.
- Do not claim files outside the task's measured scope.
- Stop and report a conflict rather than resolving ownership ad hoc.

## Handoff

1. Run the smallest relevant test, type-check, and build command.
2. Review only the task's diff.
3. Release the claim:

   ```bash
   node scripts/agent-task-lock.cjs release <task-id>
   ```
4. Report the branch, changed files, test results, and any remaining blocker.

## Conflict recovery

If files overlap, do not edit. Create separate worktrees and re-distribute tasks until each active task has a disjoint file set.
