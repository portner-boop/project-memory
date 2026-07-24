# Project instructions

## Repository

- `frontend/` — Vue application.
- `backend/` — FastAPI application.
- `docs/` — project knowledge and task documentation.

## Documentation workflow

Before implementing a task:

1. Determine the Jira task ID.
2. Read `docs/_index.json`.
3. Read only documents connected to affected code paths.
4. Create or update `docs/tasks/<TASK-ID>/implementation-plan.md`.

After implementation:

1. Run `repomind sync --task <TASK-ID>`.
2. Update permanent documentation only when behavior, contracts,
   data structures or architectural decisions changed.
3. Do not rewrite whole documents.
4. Every documentation statement must reference changed code,
   a requirement or an explicit decision.
5. When intent cannot be determined from code, mark the item
   as `needs_review` instead of guessing.

## Code references

Reference code by path and symbol, never by line number:

- Good: `backend/app/auth/service.py#AuthService.refresh`
- Bad: `backend/app/auth/service.py:142`

## Decisions

Create an ADR in `docs/decisions/` only for a real architectural decision:
technology choice, storage change, dropping a previously accepted approach,
or an explicit decision to postpone. Never for a refactoring.

## Verification

Run:

```bash
repomind check
```
