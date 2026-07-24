---
id: TASK-DEMO-657-RESULT
type: task
task: DEMO-657
---

# Результат

<!-- appended by: repomind sync --task DEMO-657 -->

Добавлена read-only колонка «Расход за этап»: сумма расходов по принятым
отчётам, период которых пересекается с периодом этапа. Не нарастающий итог.
На принятом этапе значение фиксируется снапшотом, для ранее принятых этапов
выполнена единоразовая доливка.

Затронуто:

- `backend/app/report/models/snapshots.py#StageExpenseSnapshot`
- `backend/app/report/services/expenses.py#calc_stage_expense`
- `backend/app/report/serializers/stages.py#StageExpenseSerializer`
- `backend/app/report/services/snapshots.py#save_snapshot_for_accepted_stage`
- `frontend/components/pages/report/tables/ExpensesTable.vue`
- `pdf-service/app/templates/report_sections.html`

Обновлённая постоянная документация:

- `PRODUCT-REPORTS` / новый блок `REPORT.STAGE_EXPENSE`
- `ARCH-BACKEND` / блок `BACKEND.COMPUTED_FIELDS` — добавлено упоминание второго
  снапшот-поля

ADR не создавался: архитектурных решений не принималось, задача сделана
симметрично существующему механизму (см. [ADR-002](../../decisions/ADR-002-snapshot-on-accept.md)).

Отклонение от плана: ориентация страницы PDF-отчёта изменена на альбомную,
подробности в [progress.md](progress.md).
