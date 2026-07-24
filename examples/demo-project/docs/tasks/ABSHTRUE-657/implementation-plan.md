---
id: TASK-ABSHTRUE-657-PLAN
type: task
task: ABSHTRUE-657
---

# План реализации

## Изменяемые компоненты

- `backend/app/contest/service.py`
- `backend/app/contest/repository.py`
- `frontend/src/pages/ContestsPage.vue`

## Изменение поведения

Конкурсы по умолчанию сортируются по дате начала приёма заявок
по убыванию.

## Риски

- старые записи без даты начала;
- изменение pagination;
- несовпадение backend и frontend сортировки.

## Проверка

- unit tests сортировки;
- API integration test;
- UI test начального состояния таблицы.

## Шаги

- [ ] `ContestRepository.list` — добавить `ORDER BY start_at DESC NULLS LAST`
- [ ] `ContestService.get_all` — не переупорядочивать результат
- [ ] `ContestsPage.vue#defaultSort` — начальное состояние таблицы
- [ ] тесты по списку выше
- [ ] `repomind sync --task ABSHTRUE-657`
