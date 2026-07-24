---
id: PRODUCT-REPORTS
type: product
code_paths:
  - backend/app/report/**
  - backend/app/expense/**
  - frontend/components/pages/report/**
last_verified_commit: 7c3e910
---

# Отчёты по этапам

## Что это
<!-- block: REPORT.DEFINITION -->

Грантополучатель отчитывается по каждому этапу проекта: загружает финансовый
отчёт со строками расходов, куратор его проверяет и принимает.

Модель этапа: `backend/app/report/models/stages.py#Stage`.
Строка расхода: `backend/app/expense/models.py#Expense`.

## Жизненный цикл этапа
<!-- block: REPORT.LIFECYCLE -->

```text
draft → submitted → review → accepted
                          └→ accepted_with_notes
```

Оба принятых статуса равносильны: «принят с замечаниями» отличается только
наличием комментария куратора и на расчёты не влияет.

После принятия этап нельзя редактировать, а вычисляемые значения фиксируются
(см. [ADR-002](../decisions/ADR-002-snapshot-on-accept.md)).

## Колонка «Расход всего»
<!-- block: REPORT.TOTAL_EXPENSE -->

Нарастающий итог: сумма расходов по **всем** принятым отчётам, дедлайн которых
не позже дедлайна текущего этапа.

Расчёт: `backend/app/report/serializers/stages.py#StageExpenseSerializer.get_total_expense`.

Колонка read-only, грантополучатель значение не вводит.

## Колонка «Расход за этап»
<!-- block: REPORT.STAGE_EXPENSE -->

Сумма расходов по принятым отчётам, период которых **пересекается** с периодом
текущего этапа. В отличие от «Расход всего» — **не нарастающий итог**: на
следующем этапе показывается сумма только за период того этапа.

Пересечения нет — показывается `0`. Границы включительные: совпадение в один
день считается пересечением.

Расчёт: `backend/app/report/services/expenses.py#calc_stage_expense`.
Отображение: `frontend/components/pages/report/tables/ExpensesTable.vue`.

У legacy-заявок колонка не отображается ни в UI, ни в печатной форме, но
значение всё равно считается и сохраняется.

## Сортировка списка отчётов
<!-- block: REPORT.DEFAULT_SORTING -->

По умолчанию отчёты выводятся в порядке добавления в базу.

Backend: `backend/app/report/repository.py#ReportRepository.list`.

## Печатная форма
<!-- block: REPORT.PDF -->

Отчёт по этапу выгружается в PDF. Состав колонок печатной формы совпадает с
экранной таблицей.

Legacy-заявки печатаются по отдельному шаблону с урезанным составом колонок —
см. [ARCH-SYSTEM](../architecture/system.md#legacy-ветка).
