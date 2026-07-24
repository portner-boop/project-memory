---
id: TASK-DEMO-657-DEEPDIVE
type: task
task: DEMO-657
base: origin/main
created_by: repomind plan
---

# DEMO-657 — технический разбор

## Что нужно сделать

Новая read-only колонка «Расход за этап» в обеих таблицах расходов отчёта:

- значение = сумма расходов по принятым отчётам, период которых пересекается
  с периодом текущего этапа;
- **не нарастающий итог** — только за период этапа;
- нет пересечений → `0`;
- существующая «Расход всего» не меняется;
- на непринятом этапе пересчитывается, на принятом — снапшот;
- считается для всех заявок, включая legacy; в UI и PDF legacy не показывается;
- доливка для ранее принятых этапов;
- в PDF (кроме legacy) колонка **перед** блоком «Итого по этапу»;
- открытие этапа не должно замедлиться.

## Короткий вывод

Задача ложится на существующую архитектуру почти идеально — новая колонка
делается **полностью симметрично** существующей «Расход всего».

1. Данные уже есть: `Expense.amount` по отчётам. В отчётах ничего менять не надо.
2. Текущий «Расход всего» — это `SerializerMethodField`, который на непринятом
   этапе суммирует расходы по принятым отчётам (фильтр по `deadline_at <=`),
   а на принятом читает снапшот.
3. Новый «Расход за этап» = такой же `SerializerMethodField`, только фильтр —
   **пересечение периодов**, плюс параллельное снапшот-поле в той же модели.
4. Снапшот при принятии этапа уже существует
   (`save_snapshot_for_accepted_stage`) — расширяется на одно поле.
5. Доливка — management-команда по готовому образцу `_base_backfill.py`.
6. Frontend: обе таблицы рендерит **один** компонент `ExpensesTable.vue` —
   правка в одном файле. Legacy использует другой компонент, поэтому требование
   «не показывать в legacy» выполняется автоматически, без единого `v-if`.
7. PDF: не-legacy собирается из тех же сериализаторов, поле поедет в JSON само.
   Меняется только Jinja-шаблон.
8. Готовая функция пересечения периодов в проекте уже есть — писать не нужно.

Весь скоуп закрывается тремя частями монорепо: `backend` + `frontend` +
`pdf-service`.

---

## Как это работает сейчас (AS IS)

### Данные расходов

- `backend/app/expense/models.py:22-58` — `Expense`:
  `report FK(report.Report, related_name='expenses')`,
  `category FK(expense.Category)`, `amount = DecimalField(max_digits=12, decimal_places=2)`.
- Отчёт: `backend/app/report/models/reports.py:14-49` — `Report`,
  `stage FK(report.Stage, related_name='reports')`.

### Периоды и статусы

- Этап и отчёт наследуют `backend/app/common/models.py:88-141` — `BasePeriod`:
  `begins_at` (`:92`), `ends_at` (`:95`) — **оба NOT NULL**,
  `deadline_at` (`:98`, nullable).
- `backend/app/report/constants.py:9-24` — `StageStatus`;
  `ACCEPTED_STATUSES = frozenset({ACCEPTED, ACCEPTED_WITH_NOTES})` (`:27-30`).
  Ровно то множество, которое требует ТЗ.

### Расчёт текущей колонки «Расход всего»

`backend/app/report/serializers/stages.py:204-247` —
`StageExpenseSerializer.get_total_expense`:

```python
if stage.status in ACCEPTED_STATUSES:
    snapshot = self._get_snapshot(obj, stage)
    return snapshot.total_expense
# живая ветка — нарастающий итог:
return sum(
    expense.amount
    for report in obj.reports.all()
    if report.is_accepted and report.deadline_at <= stage.deadline_at
    for expense in report.expenses.all()
)
```

Пересчёт при принятии отчёта происходит сам собой: сигналов нет, расчёт ленивый,
на каждом чтении.

⚠️ В файле есть ещё `LegacyStageExpenseSerializer` (`:290-340`) с дублирующим
`get_total_expense` — из активного кода **недостижим**, мёртвый код. Не трогать
и не путать.

### Снапшот при принятии этапа

- Модель: `backend/app/report/models/snapshots.py:11-38` —
  `StageExpenseSnapshot`, поля `stage`, `category`,
  `total_expense = DecimalField(default=0)` (`:24-28`).
  `related_name` на этапе: `expense_snapshots`.
- Триггер: `backend/app/report/views/stages.py:96-131`, action `set_status`
  (`PUT /api/v1/stages/{pk}/status/`). При переходе в `ACCEPTED_STATUSES`
  вызывается `save_snapshot_for_accepted_stage(stage)` (`:118-119`) **ДО**
  смены статуса — поэтому сериализатор в момент снапшота ещё работает по
  живой ветке.
- Писатель: `backend/app/report/services/snapshots.py:31-77` —
  рендерит `StageRetrieveSerializer(stage).data["expenses"]` и пишет
  `update_or_create(..., defaults={"total_expense": item["total_expense"]})`.

### Готовая функция пересечения периодов

`backend/app/common/periods.py:18-24`:

```python
def overlaps(first_begins, first_ends, second_begins, second_ends) -> bool:
    return first_begins <= second_ends and second_begins <= first_ends
```

Границы **включительные** — совпадение в один день считается пересечением.
В ТЗ границы не оговорены; трактовку стоит явно зафиксировать с заказчиком.

### Запросы к БД

`backend/app/report/repository.py:64-118` — `StageRepository.retrieve` уже
prefetch-ит `reports`, `reports__expenses`, `expense_snapshots`.
Для нового расчёта **дополнительных запросов не нужно**: `begins_at`/`ends_at`
уже на prefetch-нутых объектах.

### Legacy

- Флаг: `backend/app/application/models.py:77-80` — `Application.legacy`.
- **UI**: `frontend/pages/application/detail.vue:38-44` редиректит legacy на
  `pages/application/legacy.vue`, который рендерит таблицы через `LegacyForm.vue`,
  а не через `ExpensesTable.vue`. Правка `ExpensesTable.vue` legacy не затрагивает.
- **PDF**: `backend/app/pdf/builders.py:52-70` — ветвление по `legacy`:
  legacy → ручка `/v1/render/report_legacy`, обычные → `/v1/render/report_sections`.
- Расчёт от legacy **не зависит** — сериализатор отработает и там, значит
  требование «считать для всех, включая legacy» выполняется само.

### PDF

- Сборка JSON: `backend/app/pdf/builders.py:88-140` — `build_report_payload`,
  берёт `StageRetrieveSerializer(stage).data`.
- Фильтрация полей: `backend/app/pdf/builders.py:142-158` —
  `_filter_payload`. **Проверить, что новое поле не отфильтровывается.**
- Шаблон: `pdf-service/app/templates/report_sections.html` — таблица расходов
  на `:210-318`, заголовок `:214-222`, строки повторены для шести уровней
  вложенности (`:228`, `:238`, `:248`, `:258`, `:268`, `:278`).

### Выгрузка в «Статистике»

`backend/app/statistic/services/export.py:412-498` — xlsx-выгрузка **вообще не
содержит таблиц расходов**, только сводные суммы. Добавлять колонку некуда,
по ТЗ (п. 12) не входит в скоуп. Фиксируем и не делаем.

---

## Рекомендуемая реализация

Подход — полная симметрия с «Расход всего»: `SerializerMethodField` +
параллельное снапшот-поле + расширение существующего снапшот-сервиса.
Минимум новых сущностей, ноль новых запросов к БД, ноль изменений контракта
(только добавление поля).

### 1. Модель: снапшот-поле

`backend/app/report/models/snapshots.py` — добавить в `StageExpenseSnapshot`:

```python
stage_expense = models.DecimalField(
    verbose_name='Расход за этап на момент принятия',
    max_digits=12,
    decimal_places=2,
    null=True,
)
```

Миграция нужна: да, одно новое nullable-поле.

Почему `null=True`, а не `default=0` как у `total_expense`: `NULL` = «снапшот ещё
не записан» (этап принят до внедрения, доливка не прошла). Сериализатор в этом
случае делает фолбэк на живой расчёт, а доливка становится идемпотентной —
заполняем только `NULL`. При этом `0` остаётся валидным бизнес-значением
«пересечений нет».

### 2. Общий расчёт за период

`backend/app/report/services/expenses.py` (новый файл):

```python
from decimal import Decimal
from app.common.periods import overlaps
from app.report.constants import ACCEPTED_STATUSES


def calc_stage_expense(stage, reports) -> Decimal:
    """Сумма расходов по принятым отчётам, пересекающимся с периодом этапа."""
    return sum(
        (
            expense.amount
            for report in reports
            if report.status in ACCEPTED_STATUSES
            and overlaps(report.begins_at, report.ends_at,
                         stage.begins_at, stage.ends_at)
            for expense in report.expenses.all()
        ),
        Decimal("0.00"),
    )
```

- `reports` — уже prefetch-нутые `obj.reports.all()`, те же, что использует
  `get_total_expense`;
- `begins_at`/`ends_at` NOT NULL у обоих — сравнение безопасно, в отличие от
  `deadline_at` в текущем коде;
- ноль запросов к БД, чистый проход по памяти → требование п. 11 выполняется.

### 3. Сериализатор

`backend/app/report/serializers/stages.py`, в `StageExpenseSerializer`:

- добавить `stage_expense = serializers.SerializerMethodField()` и поле в `Meta.fields`;
- `get_stage_expense` зеркалит `get_total_expense`:

```python
def get_stage_expense(self, obj):
    stage = self.context["stage"]
    if stage.status in ACCEPTED_STATUSES:
        snapshot = self._get_snapshot(obj, stage)
        if snapshot and snapshot.stage_expense is not None:
            return snapshot.stage_expense
        # принят до внедрения, доливка не прошла — фолбэк на живой расчёт
    return calc_stage_expense(stage, obj.reports.all())
```

Мёртвый `LegacyStageExpenseSerializer` не трогаем.

### 4. Снапшот при принятии

`backend/app/report/services/snapshots.py:31-77` — добавить второе поле
в `defaults`:

```python
defaults={
    "total_expense": item["total_expense"],
    "stage_expense": item.get("stage_expense"),
},
```

Порядок вызова в `views/stages.py:118-119` (снапшот ДО смены статуса)
сохраняется как есть — именно он гарантирует фиксацию живого значения.

### 5. Доливка для ранее принятых этапов (п. 8 ТЗ)

Management-команда
`backend/app/report/management/commands/backfill_stage_expense.py`
по образцу `_base_backfill.py`:

1. выбрать все этапы в `ACCEPTED_STATUSES`;
2. для каждой категории расходов посчитать `calc_stage_expense` по текущим
   принятым отчётам;
3. `update_or_create` в `StageExpenseSnapshot`, заполняя только `stage_expense`
   (`total_expense` НЕ трогать);
4. идемпотентность: по умолчанию только записи с `stage_expense IS NULL`,
   `--force` для перезаписи;
5. `--dry-run` по умолчанию, `--apply` для записи, всё в `transaction.atomic()`;
6. этапы без отчётов — пропускать, не падать.

Выполняется для всех заявок, включая legacy.

### 6. Frontend

Весь скоуп — **один файл**:
`frontend/components/pages/report/tables/ExpensesTable.vue`
(рендерит обе таблицы, они различаются только подписью в
`generics/report-fields.js:18-35`).

1. `headers` (`:142-170`) — вставить перед блоком «Итого по этапу»:

```js
{ label: "Расход за этап", style: { minWidth: '11rem', maxWidth: '11rem' } },
```

Без жёлтого фона — жёлтый зарезервирован за итоговыми колонками.

2. `colspan="4"` → `colspan="5"` (`:38`).

3. В теле строки — read-only ячейка **перед** блоком итогов (`:74`),
   по образцу существующих:

```html
<VInput
  is-numbers
  label="Расход за этап"
  :value="`${item.stage_expense ?? ''}`"
  readonly
/>
```

Фолбэк `?? ''` покрывает ответы backend без поля.

4. SCSS: ширина колонки по аналогии с `&__value-inputs` (`:266-298`);
   не задевать `&__total-inputs` (`:300-322`).

### 7. PDF

1. **backend** — доработок почти нет, поле попадает в JSON автоматически.
   Проверить `_filter_payload` (`backend/app/pdf/builders.py:142-158`).
2. **pdf-service** — единственный файл
   `pdf-service/app/templates/report_sections.html`:
   - в заголовок таблицы расходов вставить `<td rowspan="2">Расход за этап</td>`
     между названием категории (`:216`) и «Итого по этапу» (`:217`);
   - пересчитать проценты ширин (сейчас 30/25/25/20);
   - в строках — ячейку
     `<td style="text-align:right">{{ row.stage_expense | default(0) }}</td>`
     **в шести местах** (уровни вложенности `:228`, `:238`, `:248`, `:258`,
     `:268`, `:278`);
   - фильтр `| default(0)` рендерит `0` для отсутствующего/`NULL` значения —
     шаблон безопасен и со старым backend, и до доливки.
3. Legacy-ручка `/v1/render/report_legacy` и `report_legacy.html` — не трогаем.

### 8. Контракт backend ↔ frontend

```text
GET /api/v1/stages/{id}/  →  expenses[]:
    category, planned_amount, total_expense, + stage_expense
```

Безопасное изменение: поле добавляется, старые не удаляются, старый frontend не
ломается. pdf-service до обновления шаблона лишнее поле в JSON игнорирует
(ручка принимает сырой `dict`), обновлённый шаблон без поля рендерит `0` —
рассинхрон релизов не опасен. Катить backend первым.

---

## Что конкретно затронем

### Backend

- `backend/app/report/models/snapshots.py` — новое поле;
- `backend/app/report/migrations/*` — новая миграция;
- `backend/app/report/serializers/stages.py` — `stage_expense` в `StageExpenseSerializer`;
- `backend/app/report/services/expenses.py` — новый файл, хелпер расчёта;
- `backend/app/report/services/snapshots.py` — второе поле в `defaults`;
- `backend/app/report/management/commands/backfill_stage_expense.py` — новый;
- `backend/app/report/tests/` — юнит и API-тесты.

Не трогаем: `app/expense/` (данные уже есть), `app/report/constants.py`,
prefetch в `repository.py` (уже покрывает), legacy-ветки, мёртвый
`LegacyStageExpenseSerializer`.

### Frontend

- `frontend/components/pages/report/tables/ExpensesTable.vue` — единственный файл.

Не трогаем: legacy-компоненты, Vuex, API-слой — новых запросов нет.

### PDF-service

- `pdf-service/app/templates/report_sections.html` — единственный файл
  (1 ячейка заголовка + 6 ячеек строк);
- `pdf-service/tests/test_render.py` — smoke-тест.

Не трогаем: `router.py`, `report_legacy.html`, код сервиса.

---

## Риски

1. **Две семантики связи «этап ↔ отчёт».** «Расход всего» считается по
   `deadline_at <=`, новая колонка — по пересечению `[begins_at, ends_at]`.
   При криво настроенных периодах колонки могут выглядеть несогласованно
   (отчёт попадает в период, но с более поздним дедлайном). ТЗ это допускает,
   но кейс стоит проговорить с заказчиком на примерах.
2. **Границы пересечения.** `overlaps` в проекте — включительные (касание в один
   день = пересечение). В ТЗ не оговорено. Зафиксировать до реализации.
3. **Доливка против исторического снапшота.** Для этапов, принятых до внедрения,
   доливка считает по **текущим** данным, а старый `total_expense` зафиксирован
   на момент принятия. Если отчёт приняли позже принятия этапа, новая колонка
   его учтёт, а старая — нет: две колонки одной строки будут «из разных моментов
   времени». Это прямое следствие п. 8 ТЗ, но лучше подтвердить у заказчика.
4. **Порядок снапшота.** Снапшот выполняется ДО смены статуса
   (`views/stages.py:118-119`). При рефакторинге порядок не менять, иначе
   зафиксируются нули. См. [ADR-002](../../decisions/ADR-002-snapshot-on-accept.md).
5. **Тип данных.** `amount` — `DecimalField(12,2)`. Новое поле делаем таким же;
   складывать через `Decimal`, не через `float`, иначе поедут копейки.
6. **Шесть уровней вложенности в шаблоне PDF.** Ячейку легко добавить только в
   первый уровень — таблица поедет на подстроках. Проверять на отчёте
   с вложенными категориями.
7. **Производительность.** Один дополнительный проход по уже prefetch-нутым
   объектам в памяти, новых запросов нет, N+1 не появляется. В тестах закрепить
   `assertNumQueries`, чтобы будущий рефакторинг не сломал.

---

## План реализации

### Backend

1. Поле `stage_expense` в `StageExpenseSnapshot` + миграция.
2. Хелпер `calc_stage_expense` (пересечение периодов, только `ACCEPTED_STATUSES`).
3. `get_stage_expense` в `StageExpenseSerializer` + `Meta.fields`.
4. Расширить `save_snapshot_for_accepted_stage` вторым полем.
5. Management-команда доливки (dry-run/apply, идемпотентная).
6. Тесты:
   - живой расчёт: пересечение одного и нескольких отчётов, границы «в один день»;
   - непринятый отчёт не учитывается;
   - нет пересечений → `0`;
   - не нарастающий итог: на следующем этапе только его период;
   - снапшот при принятии и чтение из снапшота после;
   - фолбэк на живой расчёт при `NULL` в снапшоте;
   - доливка: заполняет, идемпотентна, `total_expense` не трогает;
   - legacy-заявка считается так же;
   - `assertNumQueries` — число запросов retrieve не выросло.

### Frontend

1. `ExpensesTable.vue`: заголовок, read-only ячейка, `colspan=5`, стили.
2. Проверить: непринятый этап (нули и значения), принятый этап (снапшот),
   отсутствие поля в ответе (фолбэк), legacy-заявка (колонки нет).

### PDF-service

1. `report_sections.html`: ячейка заголовка + ячейка строки в шести местах,
   пересчитать ширины.
2. Smoke-тест ручки с payload с полем и без него.
3. Сквозная проверка: PDF обычной заявки с новой колонкой, legacy — без изменений.

---

## Проверка

Backend (в Docker):

```bash
docker compose run --rm backend python manage.py test app.report
docker compose run --rm backend python manage.py makemigrations --check
docker compose run --rm backend python manage.py backfill_stage_expense
docker compose run --rm backend python manage.py backfill_stage_expense --apply
```

Frontend:

```bash
npm run lint
npm run build
```

PDF-service:

```bash
cd pdf-service && pytest
make run   # локально на :8001 для сквозной проверки
```

**Ручной сценарий.** Грантополучателем заполнить отчёт с расходами → куратором
принять отчёт → открыть этап, сверить «Расход за этап» (пересечение) и
«Расход всего» (нарастающий итог) → принять этап → принять ещё один отчёт за
пересекающийся период → убедиться, что на принятом этапе значение не изменилось,
а на следующем этапе считается только его период → скачать PDF (backend с
`PDF_SERVICE_URL=http://host.docker.internal:8001`) → открыть legacy-заявку и
убедиться, что колонки нет.

---

## Файлы

### Backend

- `backend/app/report/models/snapshots.py`
- `backend/app/report/migrations/00XX_stage_expense.py` (новый)
- `backend/app/report/serializers/stages.py`
- `backend/app/report/services/expenses.py` (новый)
- `backend/app/report/services/snapshots.py`
- `backend/app/report/management/commands/backfill_stage_expense.py` (новый)
- `backend/app/report/tests/test_stage_expense.py` (новый)

### Frontend

- `frontend/components/pages/report/tables/ExpensesTable.vue`

### PDF-service

- `pdf-service/app/templates/report_sections.html`
- `pdf-service/tests/test_render.py`
