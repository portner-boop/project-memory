---
id: ARCH-SYSTEM
type: architecture
code_paths:
  - backend/**
  - frontend/**
  - pdf-service/**
  - docker-compose.yml
last_verified_commit: 7c3e910
---

# Общая архитектура

## Из чего состоит система
<!-- block: SYSTEM.PARTS -->

Монорепо из трёх независимо релизящихся частей:

```text
                      ┌──────────────┐
   браузер  ─────────▶│   frontend   │  Nuxt 2 / Vue 2
                      └──────┬───────┘
                             │ REST, cookie-сессия
                      ┌──────▼───────┐
                      │   backend    │  Django 4 + DRF
                      └──┬────────┬──┘
              PostgreSQL │        │ HTTP, JSON
                 ┌───────▼──┐  ┌──▼───────────┐
                 │ postgres │  │ pdf-service  │  FastAPI + WeasyPrint
                 └──────────┘  └──────────────┘
```

| Часть | Стек | Порт | Где живёт |
|---|---|---|---|
| `backend/` | Django 4, DRF, PostgreSQL | 8000 | основная бизнес-логика и данные |
| `frontend/` | Nuxt 2, Vue 2, Vuex | 3000 | весь UI |
| `pdf-service/` | FastAPI, Jinja2, WeasyPrint | 8001 | только рендер PDF |

Запуск: `docker compose up`. Конфигурация — `.env`, образец в `.env.example`.

## Границы ответственности
<!-- block: SYSTEM.BOUNDARIES -->

**Правило:** бизнес-логика живёт только в `backend/`.

- `frontend/` не считает ничего, что влияет на данные, — только отображает
  и валидирует ввод.
- `pdf-service/` не ходит в базу и ничего не считает. Он получает готовый JSON
  и рендерит Jinja-шаблон. Решение зафиксировано в [ADR-001](../decisions/ADR-001-pdf-service.md).

Из этого следует практическое правило, которое экономит время на каждой задаче:
**если в PDF надо показать новое значение — его считает backend и кладёт в JSON,
а в pdf-service меняется только шаблон.**

## Как части общаются
<!-- block: SYSTEM.INTEGRATION -->

- `frontend` → `backend`: REST, `/api/v1/**`, сессия в HTTP-only cookie.
  Контракт: `docs/contracts/api.md`.
- `backend` → `pdf-service`: `POST /v1/render/{template}`, тело — сырой `dict`,
  без валидации схемы на стороне сервиса.
  Адрес в `PDF_SERVICE_URL` (`backend/config/settings.py#PDF_SERVICE_URL`).

Отсутствие валидации на стороне pdf-service — **сознательное решение**: backend
может добавить в JSON новое поле раньше, чем обновится шаблон, и ничего не
сломается. Обратный порядок тоже безопасен — Jinja-фильтр `| default(0)`
отрендерит отсутствующее поле нулём.

Практический вывод: **релизы backend и pdf-service не связаны жёстко.**
Рекомендуемый порядок — backend первым.

## Legacy-ветка
<!-- block: SYSTEM.LEGACY -->

Заявки, созданные до 2024 года, помечены флагом
`backend/app/application/models.py#Application.legacy`.

Для них работает **отдельная ветка во всех трёх частях**:

| Часть | Обычная заявка | Legacy |
|---|---|---|
| frontend | `pages/application/detail.vue` | редирект на `pages/application/legacy.vue` |
| backend | `ApplicationSerializer` | `LegacyApplicationSerializer` |
| pdf | шаблон `report_sections.html` | шаблон `report_legacy.html` |

Ветки **не пересекаются**. Поэтому требование вида «не показывать новое поле в
legacy» обычно выполняется само собой, без единого условия в коде — достаточно
править только не-legacy компонент.

Это самая частая ловушка для новых людей: правку делают в общем компоненте,
не заметив, что legacy рендерится другим.
