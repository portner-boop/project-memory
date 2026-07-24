---
id: ARCH-FRONTEND
type: architecture
code_paths:
  - frontend/**
last_verified_commit: 7c3e910
---

# Frontend

Nuxt 2 + Vue 2 + Vuex.

## Структура
<!-- block: FRONTEND.STRUCTURE -->

```text
frontend/
├── pages/                    роуты Nuxt
├── components/pages/         компоненты, привязанные к конкретной странице
├── components/ui/            переиспользуемые примитивы (VInput, VTable…)
├── store/                    Vuex-модули, по одному на предметную область
└── generics/                 описания полей и таблиц, общие для страниц
```

## Таблицы отчёта
<!-- block: FRONTEND.REPORT_TABLES -->

Ключевой факт, который экономит время на каждой задаче про отчёты:

**Все таблицы расходов рендерит один компонент** —
`frontend/components/pages/report/tables/ExpensesTable.vue`.

Таблицы «Прямые расходы» и «Косвенные расходы» различаются **только подписью**
из `frontend/generics/report-fields.js#expenseTables`. Поэтому правка колонок
делается в одном файле и попадает в обе таблицы сразу.

Legacy-заявки рендерятся другим компонентом —
`frontend/components/pages/application/legacy/LegacyForm.vue` — и правку
`ExpensesTable.vue` не видят. См. [ARCH-SYSTEM](system.md#legacy-ветка).

## Работа с данными
<!-- block: FRONTEND.DATA -->

- HTTP только через `frontend/store/**` — компоненты не вызывают API напрямую.
- Данные отчёта приходят одним ответом `getReport`; отдельных запросов на
  вычисляемые поля нет.
- Новое поле в ответе backend не требует изменений в Vuex — компонент читает
  его из уже загруженного объекта.

Практический вывод: добавление read-only колонки в таблицу — это правка
**одного** `.vue`-файла, без API, без стора.

## Соглашения
<!-- block: FRONTEND.CONVENTIONS -->

- Read-only значения показываем через `VInput` с атрибутом `readonly`,
  а не текстом — чтобы колонки визуально совпадали с редактируемыми.
- Фолбэк для отсутствующего поля: `item.field ?? ''`. Это защищает UI, когда
  frontend уехал в прод раньше backend.
- Жёлтый фон (`$yellow`) зарезервирован за итоговыми колонками. Обычные
  вычисляемые колонки — без фона.
