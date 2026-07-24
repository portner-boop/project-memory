# 04 — Структура репозитория

## Целевая раскладка проекта

```text
project/
├── AGENTS.md                  # единственный источник правил для агентов
├── CLAUDE.md                  # почти пустой, импортирует AGENTS.md
│
├── frontend/
├── backend/
│
├── docs/
│   ├── README.md
│   ├── _index.json            # генерируется скриптом, не руками
│   │
│   ├── product/
│   │   ├── overview.md
│   │   └── business-rules.md
│   │
│   ├── architecture/
│   │   ├── system.md
│   │   ├── backend.md
│   │   ├── frontend.md
│   │   ├── data-storage.md
│   │   └── auth.md
│   │
│   ├── contracts/
│   │   ├── api.md
│   │   └── events.md
│   │
│   ├── decisions/
│   │   ├── ADR-001-qdrant.md
│   │   └── ADR-002-document-storage.md
│   │
│   ├── requirements/
│   │   └── original/          # исходные ТЗ «как пришли», не редактируются
│   │
│   ├── tasks/
│   │   └── ABSHTRUE-657/
│   │       ├── request.md
│   │       ├── analysis.md
│   │       ├── implementation-plan.md
│   │       ├── pm-summary.md
│   │       ├── progress.md
│   │       └── result.md
│   │
│   └── now/
│       └── current-task.md
│
├── .agents/
│   └── skills/
│       ├── docs-plan/
│       │   └── SKILL.md
│       └── docs-sync/
│           ├── SKILL.md
│           ├── schemas/
│           └── scripts/
│
├── .claude/
│   ├── skills/
│   │   ├── docs-plan -> ../../.agents/skills/docs-plan
│   │   └── docs-sync -> ../../.agents/skills/docs-sync
│   └── settings.json
│
└── .github/
    └── workflows/
        └── documentation.yml
```

## Почему именно так

### `.agents/skills/` — источник правды для skills

Codex ищет repository skills в `.agents/skills`, Claude Code использует
`.claude/skills`. Оба поддерживают skill как директорию с `SKILL.md`, и оба
умеют работать с символическими ссылками.

Поэтому делаем **один настоящий skill** и symlink для Claude:

```bash
mkdir -p .claude/skills

ln -s ../../.agents/skills/docs-sync \
  .claude/skills/docs-sync
```

Для Windows установщик может **копировать директорию** вместо создания symlink.

### `docs/tasks/<JIRA-ID>/` — папка на задачу

Имя директории = Jira ID. Это уже работает в текущем flow и менять не нужно.
Состав файлов фиксирован, `repomind check` проверяет наличие обязательных.

| Файл                     | Кто пишет | Когда                    |
| ------------------------ | --------- | ------------------------ |
| `request.md`             | `repomind task` | при заведении задачи |
| `analysis.md`            | агент     | этап планирования        |
| `implementation-plan.md` | агент     | этап планирования        |
| `pm-summary.md`          | агент     | этап планирования        |
| `progress.md`            | агент     | во время разработки      |
| `result.md`              | `repomind sync` | после реализации   |

### `docs/now/current-task.md`

Указатель на активную задачу. Агент читает его в начале сессии, чтобы не
спрашивать «над чем мы работаем». Один файл, обновляется `repomind task`.

### `docs/_index.json`

Генерируется командой `repomind index` (и неявно — внутри `sync` и `check`).
В Git его **коммитим**: так агент может прочитать индекс, не запуская CLI,
а PR-ревьюер видит, что структура документации изменилась.

### `docs/requirements/original/`

Исходные ТЗ хранятся как есть и не редактируются никогда. Всё, что «уточнили
по ходу», живёт в `docs/tasks/<ID>/analysis.md`. Это разделение позволяет
позже увидеть, насколько итог разошёлся с первоначальной постановкой.
