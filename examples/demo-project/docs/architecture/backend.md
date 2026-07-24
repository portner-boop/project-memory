---
id: ARCH-BACKEND
type: architecture
code_paths:
  - backend/**
last_verified_commit: 7c3e910
---

# Backend

Django 4 + DRF. Разбит на приложения по предметным областям.

## Приложения
<!-- block: BACKEND.APPS -->

| Приложение | Отвечает за |
|---|---|
| `backend/app/application/` | заявка на грант, её паспорт и этапы |
| `backend/app/report/` | финансовые отчёты по этапам |
| `backend/app/expense/` | строки расходов внутри отчёта |
| `backend/app/auth/` | аутентификация, см. [ARCH-AUTH](auth.md) |
| `backend/app/pdf/` | сборка JSON для pdf-service |

## Слои внутри приложения
<!-- block: BACKEND.LAYERS -->

```text
views/        DRF ViewSet — только HTTP: права, статусы, вызов сервиса
serializers/  преобразование модель ⇄ JSON, вычисляемые поля
services/     бизнес-логика, транзакции
repository/   доступ к данным, все ORM-запросы и prefetch
models/       схема БД
```

Правило: **ViewSet не обращается к ORM напрямую.** Все запросы — в
`repository/`, чтобы prefetch-и лежали в одном месте и не размножались N+1.

## Вычисляемые поля и снапшоты
<!-- block: BACKEND.COMPUTED_FIELDS -->

Часть значений в отчётах не хранится, а считается на лету через
`SerializerMethodField`. Пока этап не принят — значение пересчитывается при
каждом чтении; в момент принятия этапа оно **фиксируется снапшотом** в
отдельное поле модели.

Пример — колонка «Расход всего»:

- живой расчёт: `backend/app/report/serializers/stages.py#StageExpenseSerializer.get_total_expense`;
- снапшот пишется в `backend/app/report/models/snapshots.py#StageExpenseSnapshot.total_expense`;
- момент фиксации: `backend/app/report/services/snapshots.py#save_snapshot_for_accepted_stage`.

Причины такого устройства — в [ADR-002](../decisions/ADR-002-snapshot-on-accept.md).

⚠️ Снапшот пишется **до** смены статуса этапа
(`backend/app/report/views/stages.py#StageViewSet.set_status`). Порядок важен:
после смены статуса сериализатор уйдёт в снапшот-ветку и зафиксирует нули.
При рефакторинге порядок не менять.

## Статусы этапов
<!-- block: BACKEND.STAGE_STATUSES -->

`backend/app/report/constants.py#StageStatus`:

```text
draft → submitted → review → accepted
                          └→ accepted_with_notes
```

`ACCEPTED_STATUSES` — фроузенсет из `accepted` и `accepted_with_notes`.
Везде, где нужно «принятый этап», используется он, а не сравнение со строкой.

## Периоды
<!-- block: BACKEND.PERIODS -->

Этапы заявки и отчётные периоды наследуют
`backend/app/common/models.py#BasePeriod`: поля `begins_at`, `ends_at`
(оба NOT NULL) и `deadline_at` (nullable).

Готовый хелпер пересечения периодов —
`backend/app/common/periods.py#overlaps`. Границы **включительные**: касание
в один день считается пересечением.

## Management-команды
<!-- block: BACKEND.COMMANDS -->

Одноразовые доливки данных оформляются management-командами по общему образцу
`backend/app/common/management/commands/_base_backfill.py`:

- `--dry-run` по умолчанию, запись только с `--apply`;
- всё внутри `transaction.atomic()`;
- идемпотентность: заполняем только пустые значения, перезапись — по `--force`;
- в лог — количество затронутых записей.
