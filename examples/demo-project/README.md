# Демо-проект RepoMind

Минимальный, но полный пример того, как выглядит проект с настроенной
инкрементальной памятью. Кода приложения здесь нет — только всё, что вокруг него.

## Что внутри

```text
demo-project/
├── AGENTS.md                        # правила для агентов (единственный источник)
├── CLAUDE.md                        # одна строка: @AGENTS.md
├── .agents/skills/                  # настоящие skills
│   ├── docs-plan/SKILL.md
│   └── docs-sync/SKILL.md + schemas/
├── .claude/
│   ├── skills/                      # symlinks на .agents/skills
│   └── settings.json                # hook: пометить проект dirty
├── .github/workflows/documentation.yml
└── docs/
    ├── _index.json                  # генерируется repomind index
    ├── product/contests.md          # PRODUCT-CONTESTS, 3 блока
    ├── architecture/auth.md         # ARCH-AUTH, 3 блока
    ├── decisions/ADR-014-*.md
    ├── requirements/original/
    ├── tasks/ABSHTRUE-657/          # полный цикл задачи
    └── now/current-task.md
```

## Сквозной сценарий: задача ABSHTRUE-657

Задача — «сверху списка должны быть свежие конкурсы». Пройди по файлам в этом
порядке, и станет видно, как контекст сужается на каждом шаге.

### 1. Задача заводится

```bash
repomind task ABSHTRUE-657 \
  --source docs/requirements/original/ABSHTRUE-657.md
```

→ [`docs/tasks/ABSHTRUE-657/request.md`](docs/tasks/ABSHTRUE-657/request.md)
→ [`docs/now/current-task.md`](docs/now/current-task.md)

### 2. Планирование

```bash
repomind plan ABSHTRUE-657      # или /docs-plan ABSHTRUE-657
```

→ [`analysis.md`](docs/tasks/ABSHTRUE-657/analysis.md) — **здесь главное**:
видно, что из двух документов прочитан только `PRODUCT-CONTESTS`, а `ARCH-AUTH`
пропущен, потому что `backend/app/auth/**` не пересекается с diff.

→ [`implementation-plan.md`](docs/tasks/ABSHTRUE-657/implementation-plan.md) — для разработчика
→ [`pm-summary.md`](docs/tasks/ABSHTRUE-657/pm-summary.md) — для PM, без единого пути к файлу

### 3. Разработка

→ [`progress.md`](docs/tasks/ABSHTRUE-657/progress.md) — отмеченные пункты
и зафиксированное отклонение от плана.

### 4. Синхронизация

```bash
repomind sync --task ABSHTRUE-657 --base origin/main
```

Модель возвращает **операции**, а не текст файлов:

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
    { "action": "append_task_result", "task": "ABSHTRUE-657", "content": "..." }
  ]
}
```

Схема, которой обязан соответствовать ответ:
[`sync-operations.schema.json`](.agents/skills/docs-sync/schemas/sync-operations.schema.json)

Результат применения:
→ обновлён **один блок** в [`docs/product/contests.md`](docs/product/contests.md)
→ дописан [`result.md`](docs/tasks/ABSHTRUE-657/result.md)

Файл [`docs/architecture/auth.md`](docs/architecture/auth.md) не тронут вообще —
он в этом сценарии существует именно для того, чтобы показать, что его не
читают и не переписывают.

### 5. Проверка

```bash
repomind check
```

## Что показывает пример

| Идея                              | Где смотреть                                    |
| --------------------------------- | ----------------------------------------------- |
| атомарные блоки                   | `docs/product/contests.md`, `docs/architecture/auth.md` |
| стабильные ID и `code_paths`      | frontmatter любого постоянного документа        |
| ссылки `path#Symbol`              | везде; ни одного номера строки                  |
| каталог генерируется скриптом     | `docs/_index.json`                              |
| отбор контекста по diff           | `docs/tasks/ABSHTRUE-657/analysis.md`           |
| structured output вместо записи   | `.agents/skills/docs-sync/`                     |
| ADR только для решений            | `docs/decisions/ADR-014-redis-streams.md`       |
| один skill на двух агентов        | `.agents/skills/` + symlinks в `.claude/skills/`|
| дешёвый hook + дорогой sync       | `.claude/settings.json`                         |
| CI без записи в ветку             | `.github/workflows/documentation.yml`           |

## Symlinks на Windows

```bash
ln -s ../../.agents/skills/docs-sync .claude/skills/docs-sync
```

Если symlink недоступен — установщик копирует директорию:
`repomind init --no-symlink`.
