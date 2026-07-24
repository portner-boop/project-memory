---
id: PRODUCT-CONTESTS
type: product
code_paths:
  - backend/app/contest/**
  - frontend/src/pages/ContestsPage.vue
last_verified_commit: 7c3e910
---

# Конкурсы

## Что такое конкурс
<!-- block: CONTEST.DEFINITION -->

Конкурс — это период приёма заявок с фиксированными датами начала и окончания.
Модель: `backend/app/contest/models.py#Contest`.

## Сортировка по умолчанию
<!-- block: CONTEST.DEFAULT_SORTING -->

По умолчанию конкурсы сортируются по дате начала приёма заявок по убыванию:
сначала пользователь видит самые новые конкурсы.

Backend: `backend/app/contest/service.py#ContestService.get_all`.
Frontend: `frontend/src/pages/ContestsPage.vue#defaultSort`.

Записи без даты начала помещаются в конец списка.

## Статусы
<!-- block: CONTEST.STATUSES -->

`draft` → `open` → `review` → `closed`.

Переходы: `backend/app/contest/service.py#ContestService.transition`.
Пользователю в публичном списке видны только `open` и `review`.
