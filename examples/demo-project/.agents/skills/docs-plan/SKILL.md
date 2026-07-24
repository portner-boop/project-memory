---
name: docs-plan
description: Build a two-level implementation plan (technical + PM summary) for a Jira task, using only the documentation blocks connected to the affected code paths. Use when starting work on a task ID.
---

# docs-plan

## Purpose

Turn a Jira task into `implementation-plan.md` and `pm-summary.md` without
reading the whole repository.

## Input

A Jira task ID, e.g. `ABSHTRUE-657`.

## Steps

1. Run `repomind task <TASK-ID>` if `docs/tasks/<TASK-ID>/` does not exist yet.
2. Read `docs/tasks/<TASK-ID>/request.md`.
3. Read `docs/_index.json`.
4. Determine likely affected code paths from the request.
5. Select **only** documents whose `code_paths` intersect those paths.
   Record the selection and the reasoning in `analysis.md`.
6. Read accepted ADRs in `docs/decisions/` whose subject touches the
   affected area. Skip the rest.
7. Write `analysis.md`, `implementation-plan.md`, `pm-summary.md`.

## Do not

- Do not read documents unrelated to the affected code paths.
- Do not read other tasks' folders.
- Do not modify permanent documentation at this stage.

## Output format

### `implementation-plan.md`

Sections, in this order:

- `## Изменяемые компоненты` — file paths
- `## Изменение поведения` — one paragraph, user-visible effect
- `## Риски` — bullet list
- `## Проверка` — how it will be tested
- `## Шаги` — checkbox list, last item is `repomind sync --task <TASK-ID>`

### `pm-summary.md`

Plain language. No file paths, no class names, no technology names.
Three short paragraphs: what changes, what the user gains, what is affected.

## Verification

```bash
repomind check
```
