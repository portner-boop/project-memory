# Project instructions

## Repository

Monorepo, three independently released parts:

- `backend/` — Django 4 + DRF. All business logic lives here.
- `frontend/` — Nuxt 2 + Vue 2. Display only, never computes business values.
- `pdf-service/` — FastAPI + Jinja2. Renders a JSON payload into PDF.
  Never touches the database.
- `docs/` — project knowledge and task documentation.

## Documentation workflow

Before implementing a task:

1. Determine the task ID (or read `docs/now/current-task.md`).
2. Read `docs/_index.json`.
3. Read only documents whose `code_paths` intersect the affected code.
4. Read the real code of those modules before proposing anything.
5. Create or update `docs/tasks/<TASK-ID>/deep-dive.md`.

After implementation:

1. Run `/docs-sync`.
2. Update permanent documentation only when behavior, contracts,
   data structures or architectural decisions changed.
3. Do not rewrite whole documents — update individual blocks.
4. Every documentation statement must reference changed code,
   a requirement or an explicit decision.
5. When intent cannot be determined from code, mark the item
   as `needs_review` instead of guessing.

## Code references

In permanent documentation reference code by path and symbol, never by line:

- Good: `backend/app/report/services/expenses.py#calc_stage_expense`
- Bad: `backend/app/report/services/expenses.py:142`

Inside `docs/tasks/<ID>/deep-dive.md` line numbers are allowed — it is a
snapshot document describing the code at the moment of analysis.

## Decisions

Create an ADR in `docs/decisions/` only for a real architectural decision:
technology choice, storage change, dropping a previously accepted approach,
or an explicit decision to postpone. Never for a refactoring.
Template: `docs/decisions/_template.md`.

## Commands

Never guess a command. All of them live in `docs/runbook/daily.md` (`RUN-DAILY`):
tests, linters, migrations, management commands, pre-commit checklist.

First run from scratch — `docs/runbook/setup.md`.
Something broke — `docs/runbook/troubleshooting.md`, entries are indexed by symptom.

## Code intelligence

If `.codegraph/` exists, use CodeGraph MCP tools to locate code and trace
dependencies instead of fanning out with grep and full-file reads:

- `codegraph_explore` — how does X work, how does X reach Y
- `codegraph_callers` / `codegraph_impact` — what breaks if this changes

Use it for **where the code is**. Use `docs/` for **why it is that way**.

## Project-specific traps

- Legacy applications render through a separate component, serializer and PDF
  template. A change to the normal path does not affect legacy — and vice versa.
- The snapshot of computed values is written **before** the stage status
  changes. Never reorder this.
- `pdf-service` accepts a raw dict without validation, so backend may ship a new
  field before the template is updated. Always ship backend first.

## Verification

Скажи агенту `/docs-check`.
