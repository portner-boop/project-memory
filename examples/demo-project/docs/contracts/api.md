---
id: CONTRACT-API
type: contract
code_paths:
  - backend/app/**/views/**
  - backend/app/**/serializers/**
last_verified_commit: 7c3e910
---

# REST API

Префикс `/api/v1/`. Аутентификация — сессия в HTTP-only cookie,
см. [ARCH-AUTH](../architecture/auth.md).

## Этап отчёта
<!-- block: API.STAGE_RETRIEVE -->

```http
GET /api/v1/stages/{id}/
```

```json
{
  "id": 42,
  "status": "review",
  "begins_at": "2026-01-01",
  "ends_at": "2026-03-31",
  "expenses": [
    {
      "category": "Оборудование",
      "planned_amount": "150000.00",
      "total_expense": "120000.00",
      "stage_expense": "45000.00"
    }
  ]
}
```

| Поле | Смысл |
|---|---|
| `total_expense` | нарастающий итог с начала проекта |
| `stage_expense` | только за период этого этапа |

Оба поля read-only и вычисляются на сервере.

## Смена статуса этапа
<!-- block: API.STAGE_SET_STATUS -->

```http
PUT /api/v1/stages/{id}/status/
{ "status": "accepted" }
```

Доступно только куратору. При переходе в принятый статус сервер фиксирует
снапшот вычисляемых значений — до смены статуса, см.
[ADR-002](../decisions/ADR-002-snapshot-on-accept.md).

## Правила совместимости
<!-- block: API.COMPATIBILITY -->

- Добавление поля в ответ — **не ломающее** изменение, версия не поднимается.
- Удаление или переименование поля — только с новой версией префикса.
- Frontend обязан переживать отсутствие нового поля (`?? ''`), потому что может
  уехать в прод раньше backend.
