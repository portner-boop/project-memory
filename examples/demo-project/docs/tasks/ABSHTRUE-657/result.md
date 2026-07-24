---
id: TASK-ABSHTRUE-657-RESULT
type: task
task: ABSHTRUE-657
---

# Результат

<!-- appended by: repomind sync --task ABSHTRUE-657 -->

Изменена сортировка конкурсов: по умолчанию список упорядочен по дате начала
приёма заявок по убыванию, записи без даты — в конце.

Затронуто:

- `backend/app/contest/repository.py#ContestRepository.list`
- `backend/app/contest/service.py#ContestService.get_all`
- `frontend/src/pages/ContestsPage.vue#defaultSort`

Обновлённая постоянная документация:

- `PRODUCT-CONTESTS` / блок `CONTEST.DEFAULT_SORTING`

ADR не создавался: архитектурного решения не принималось.
