---
id: ARCH-PDF
type: architecture
code_paths:
  - pdf-service/**
  - backend/app/pdf/**
last_verified_commit: 7c3e910
---

# PDF-сервис

FastAPI + Jinja2 + WeasyPrint. Отдельный сервис в этом же монорепо,
`pdf-service/`, локально на `:8001`.

## Что он делает и чего не делает
<!-- block: PDF.SCOPE -->

Делает: принимает JSON, подставляет в Jinja-шаблон, отдаёт PDF.

Не делает: не ходит в базу, ничего не считает, не знает про Django.
Обоснование — [ADR-001](../decisions/ADR-001-pdf-service.md).

## Ручки
<!-- block: PDF.ENDPOINTS -->

| Ручка | Шаблон | Для чего |
|---|---|---|
| `POST /v1/render/report_sections` | `templates/report_sections.html` | обычный отчёт по этапу |
| `POST /v1/render/report_legacy` | `templates/report_legacy.html` | legacy-заявки |

Роутер: `pdf-service/app/api/v1/router.py`.

Ручка `report_sections` принимает **сырой `dict`** — pydantic-модели нет,
лишние поля не отбрасываются. Это позволяет backend добавлять поля в JSON
раньше обновления шаблона.

## Как добавить колонку в таблицу PDF
<!-- block: PDF.ADD_COLUMN -->

Типовая операция, поэтому описана по шагам.

1. Убедиться, что backend уже кладёт поле в JSON (`backend/app/pdf/builders.py`).
2. В шаблоне `pdf-service/app/templates/report_sections.html`:
   - добавить ячейку заголовка в `<thead>`;
   - добавить ячейку строки в `<tbody>` — **во всех повторах для уровней
     вложенности**, их шесть;
   - пересчитать проценты ширин колонок, сумма должна остаться 100.
3. Значение выводить через фильтр: `{{ row.field | default(0) }}` — тогда
   шаблон безопасен и при отсутствующем поле.

Самая частая ошибка — добавить ячейку только в первый уровень вложенности.
Таблица поедет на подстроках.

## Тесты
<!-- block: PDF.TESTS -->

`pdf-service/tests/` — pytest. Smoke-тесты рендера лежат в
`pdf-service/tests/test_render.py`: подают фикстуру-payload и проверяют, что
PDF собрался и содержит ожидаемый текст.

Локальный запуск сервиса для сквозной проверки: `make run` в `pdf-service/`,
backend поднимать с `PDF_SERVICE_URL=http://host.docker.internal:8001`.
