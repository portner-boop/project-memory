---
id: TASK-DEMO-657-PROGRESS
type: task
task: DEMO-657
---

# Ход работы

## Backend

- [x] поле `stage_expense` + миграция `0042_stage_expense`
- [x] хелпер `calc_stage_expense` в `services/expenses.py`
- [x] `get_stage_expense` в `StageExpenseSerializer`
- [x] расширен `save_snapshot_for_accepted_stage`
- [x] команда `backfill_stage_expense`
- [x] тесты, включая `assertNumQueries`

## Frontend

- [x] `ExpensesTable.vue` — заголовок, ячейка, `colspan`, стили

## PDF-service

- [x] `report_sections.html` — 1 ячейка заголовка + 6 ячеек строк
- [x] smoke-тест `/v1/render/report_sections`

## Отклонения от плана

**Ширины колонок в PDF.** План предполагал пересчёт с 30/25/25/20 на четыре
колонки. По факту при пяти колонках таблица переставала помещаться в A4 —
сменили ориентацию страницы отчёта на альбомную (`@page { size: A4 landscape }`).
Согласовано с заказчиком.

**Границы пересечения.** Риск 2 из разбора закрыт: заказчик подтвердил
включительные границы. Отдельного решения не потребовалось — поведение совпало
с уже существующим `overlaps`.

## Появившиеся решения

Нет. Архитектурных решений не принималось, новый ADR не заводился.
