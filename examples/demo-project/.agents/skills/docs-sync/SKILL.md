---
name: docs-sync
description: Incrementally update project documentation from a git diff by returning structured operations, never by editing Markdown directly. Use after implementing a task, before commit or PR.
---

# docs-sync

## Purpose

Keep documentation in sync with the code that just changed — updating individual
blocks, not whole documents.

## Input

- `--task <TASK-ID>` — Jira task ID
- `--base <ref>` — diff base, default `origin/main`

## Steps

### 1. Collect the diff (scripts, no model)

```bash
git diff --name-status <base>...HEAD
git diff --unified=3 <base>...HEAD
```

### 2. Classify the change

Return this shape:

```json
{
  "behavior": true,
  "api_contract": false,
  "database": false,
  "architecture": false,
  "configuration": false,
  "refactoring_only": false,
  "affected_paths": ["backend/app/contest/service.py"]
}
```

If `refactoring_only` is `true`, **stop here**: the only allowed operation is
`append_task_result`. Permanent documentation is not touched.

### 3. Select context

From `docs/_index.json`, take only documents whose `code_paths` intersect
`affected_paths`. Load only their matching blocks.

Send to the model:

- the Jira task;
- changed code hunks;
- signatures of changed classes and functions;
- the selected documentation blocks;
- the current implementation plan.

Never send: the whole repository, all documentation, other tasks, git history.

### 4. Return operations

Respond with JSON conforming to `schemas/sync-operations.schema.json`:

```json
{
  "status": "update_required",
  "operations": [
    {
      "action": "replace_block",
      "document_id": "PRODUCT-CONTESTS",
      "block_id": "CONTEST.DEFAULT_SORTING",
      "content": "По умолчанию конкурсы сортируются...",
      "evidence": [
        "backend/app/contest/service.py#ContestService.get_all",
        "frontend/src/pages/ContestsPage.vue#defaultSort"
      ],
      "confidence": 0.94
    },
    {
      "action": "append_task_result",
      "task": "ABSHTRUE-657",
      "content": "Изменена сортировка конкурсов..."
    }
  ]
}
```

## Rules

- **Never write Markdown files directly.** Only return operations.
- Every operation must carry `evidence` — `path#Symbol` references to code
  that actually changed.
- Reference code by path and symbol, never by line number.
- When intent cannot be determined from code, emit `mark_needs_review`
  instead of guessing.
- Update `last_verified_commit` only for blocks you actually verified.
- Create an ADR only for a real architectural decision.

## When NOT to update permanent documentation

Variable renames, formatting, moving a function without behavior change,
typo fixes, internal tests, small refactors, comment edits.

## Verification

```bash
repomind check
```
