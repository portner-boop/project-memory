---
id: TASK-ABSHTRUE-657-PROGRESS
type: task
task: ABSHTRUE-657
---

# Ход работы

- [x] `ContestRepository.list` — добавлен `ORDER BY start_at DESC NULLS LAST`
- [x] `ContestService.get_all` — убрана повторная сортировка в Python
- [x] `ContestsPage.vue#defaultSort` — начальное состояние таблицы
- [x] тесты: unit + API integration + UI
- [x] `repomind sync --task ABSHTRUE-657`

## Отклонения от плана

Pagination менять не потребовалось: `LIMIT/OFFSET` применяется после `ORDER BY`,
порядок страниц остался консистентным.

## Появившиеся решения

Нет. `ADR-014` относится к соседней задаче и здесь не создавался.
