# 06 — Основной flow

Шесть этапов от Jira-задачи до Git diff.

```text
1. Получение задачи   repomind task
2. Планирование       repomind plan   → LLM (skill docs-plan)
3. Разработка         агент по implementation-plan.md
4. Incremental sync   repomind sync   → LLM (skill docs-sync)
5. Применение операций (без LLM)
6. Проверка           repomind check  (без LLM)
```

---

## Этап 1. Получение задачи

```bash
repomind task ABSHTRUE-657 \
  --source docs/requirements/original/ABSHTRUE-657.md
```

Создаются:

```text
docs/tasks/ABSHTRUE-657/
├── request.md
├── analysis.md
├── implementation-plan.md
└── pm-summary.md
```

Агент получает:

- исходное ТЗ;
- индекс документации;
- дерево затрагиваемых модулей;
- связанные архитектурные блоки;
- предыдущие ADR;
- бизнес-правила.

**Он не читает весь проект.**

---

## Этап 2. Планирование

Skill `docs-plan` формирует два уровня — технический и для PM.

### Технический (`implementation-plan.md`)

```md
## Изменяемые компоненты

- `backend/app/contest/service.py`
- `backend/app/contest/repository.py`
- `frontend/src/pages/ContestsPage.vue`

## Изменение поведения

Конкурсы по умолчанию сортируются по дате начала приёма заявок
по убыванию.

## Риски

- старые записи без даты начала;
- изменение pagination;
- несовпадение backend и frontend сортировки.

## Проверка

- unit tests сортировки;
- API integration test;
- UI test начального состояния таблицы.
```

### Для PM (`pm-summary.md`)

```md
Будет изменён порядок отображения конкурсов.

Сначала пользователи будут видеть самые новые конкурсы.
Архивные конкурсы больше не смогут случайно оказаться выше актуальных.

Оценка затрагивает backend, страницу конкурсов и автоматические тесты.
```

Разница принципиальная: PM-текст не содержит путей к файлам и названий классов.

---

## Этап 3. Разработка

Агент работает по `implementation-plan.md`. `AGENTS.md` требует:

- не менять план без фиксации;
- отмечать выполненные пункты;
- сохранять появившиеся решения;
- запускать тесты;
- после реализации выполнять `repomind sync`.

---

## Этап 4. Incremental sync

```bash
repomind sync \
  --task ABSHTRUE-657 \
  --base origin/main
```

### 4.1 Сначала обычный код собирает diff

```bash
git diff --name-status origin/main...HEAD
git diff --unified=3 origin/main...HEAD
```

### 4.2 Затем классификация изменений

```json
{
  "behavior": true,
  "api_contract": false,
  "database": false,
  "architecture": false,
  "configuration": false,
  "refactoring_only": false,
  "affected_paths": [
    "backend/app/contest/service.py",
    "frontend/src/pages/ContestsPage.vue"
  ]
}
```

### 4.3 Отбор контекста

Из `_index.json` выбираются **только связанные блоки** документации —
по совпадению `affected_paths` с `code_paths`.

**В модель отправляется:**

- Jira-задача;
- изменённые фрагменты кода;
- сигнатуры изменённых классов и функций;
- связанные блоки документации;
- текущий implementation plan.

**Не отправляется:**

- весь репозиторий;
- вся документация;
- все предыдущие задачи;
- полный Git history.

> Расход токенов зависит от размера изменения, а не от размера проекта.

---

## Этап 5. Структурированный ответ модели

**Модель не должна напрямую переписывать файлы.** Она возвращает операции:

```json
{
  "status": "update_required",
  "operations": [
    {
      "action": "replace_block",
      "document_id": "PRODUCT-CONTESTS",
      "block_id": "CONTEST.DEFAULT_SORTING",
      "content": "По умолчанию конкурсы сортируются...",
      "evidence": [
        "backend/app/contest/service.py#ContestService.get_all",
        "frontend/src/pages/ContestsPage.vue#defaultSort"
      ],
      "confidence": 0.94
    },
    {
      "action": "append_task_result",
      "task": "ABSHTRUE-657",
      "content": "Изменена сортировка конкурсов..."
    }
  ]
}
```

Python-код применяет операции. Это **безопаснее**, чем разрешать модели
произвольно переписывать Markdown: операция валидируется по JSON Schema,
`document_id` и `block_id` обязаны существовать в индексе, а `evidence`
проверяется на существование файла и символа.

### Набор действий

| `action`             | Что делает                                     |
| -------------------- | ---------------------------------------------- |
| `replace_block`      | заменяет содержимое блока целиком              |
| `append_block`       | дописывает в конец блока                       |
| `create_document`    | создаёт новый документ с frontmatter           |
| `create_adr`         | создаёт ADR в `docs/decisions/`                |
| `append_task_result` | дописывает `docs/tasks/<ID>/result.md`         |
| `mark_needs_review`  | помечает блок, когда намерение неясно из кода  |

### Статусы ответа

| `status`          | Смысл                                             |
| ----------------- | ------------------------------------------------- |
| `no_changes`      | документацию обновлять не нужно                   |
| `update_required` | есть операции к применению                        |
| `needs_review`    | изменения затрагивают документацию, но модель не уверена |

---

## Этап 6. Проверка

`repomind check` проверяет **без LLM**:

- уникальность document ID;
- уникальность block ID;
- существование code references;
- битые Markdown-ссылки;
- ссылки на удалённые файлы;
- наличие обязательных task-файлов;
- соответствие JSON Schema;
- устаревшие `last_verified_commit`;
- слишком большие документы;
- конфликтующие активные решения.

После этого **человек видит обычный Git diff**. Никакой особой UI-прослойки:
ревью документации происходит там же, где ревью кода.
