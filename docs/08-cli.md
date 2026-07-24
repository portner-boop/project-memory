# 08 — CLI

## Команды

| Команда           | Что делает                                              | LLM |
| ----------------- | ------------------------------------------------------- | :-: |
| `repomind init`   | создаёт `docs/`, `AGENTS.md`, `CLAUDE.md`, skills, хуки  | ❌  |
| `repomind task`   | заводит `docs/tasks/<ID>/` и обновляет `docs/now/`       | ❌  |
| `repomind plan`   | строит implementation plan и PM-summary                  | ✅  |
| `repomind sync`   | инкрементально обновляет документацию по diff            | ✅  |
| `repomind check`  | валидирует документацию                                  | ❌  |
| `repomind index`  | пересобирает `docs/_index.json`                          | ❌  |

Только две команды из шести обращаются к модели.

## Сигнатуры

```bash
repomind init [--agents claude,codex] [--no-symlink]

repomind task <TASK-ID> [--source <path>] [--title <text>]

repomind plan <TASK-ID> [--base <ref>]

repomind sync [--task <TASK-ID>] [--base <ref>] [--check-only] [--dry-run]

repomind check [--strict] [--format text|json]

repomind index [--write] [--format json]
```

### Важные флаги

| Флаг            | Где            | Смысл                                                     |
| --------------- | -------------- | --------------------------------------------------------- |
| `--base <ref>`  | `plan`, `sync` | база для diff, по умолчанию `origin/main`                  |
| `--check-only`  | `sync`         | не писать файлы, только сообщить, что устарело (для CI)    |
| `--dry-run`     | `sync`         | показать операции модели, не применяя их                   |
| `--strict`      | `check`        | предупреждения считаются ошибками (exit code ≠ 0)          |
| `--no-symlink`  | `init`         | копировать skills вместо symlink (Windows)                 |

## Коды возврата

| Код | Значение                                          |
| --- | ------------------------------------------------- |
| 0   | всё хорошо / изменений не требуется               |
| 1   | найдены ошибки валидации                          |
| 2   | документация устарела (`sync --check-only`)       |
| 3   | ошибка конфигурации или окружения                 |

## Стек версии 1

```text
Python
Typer            — CLI
Pydantic         — модели и валидация ответа LLM
PyYAML           — frontmatter
markdown-it-py   — разбор Markdown и блоков
Git через subprocess
Jinja2           — шаблоны документов
JSON Schema      — контракт structured output
```

Без backend, PostgreSQL и MCP.

## Распространение

```bash
uvx repomind init
```

или

```bash
pipx install repomind
```

## Вызов из агентов

| Агент       | Планирование                 | Синхронизация                |
| ----------- | ---------------------------- | ---------------------------- |
| Claude Code | `/docs-plan ABSHTRUE-657`    | `/docs-sync ABSHTRUE-657`    |
| Codex       | `$docs-plan ABSHTRUE-657`    | `$docs-sync ABSHTRUE-657`    |

Skill внутри вызывает тот же CLI — логика не дублируется.

## Что делают скрипты, а не модель

Это список задач, где **LLM не нужна вообще**:

- построение `_index.json` из frontmatter;
- проверка ссылок;
- существование файлов;
- уникальность ID;
- корректность frontmatter;
- поиск пустых разделов;
- проверка структуры Jira-папок;
- определение изменённых файлов;
- применение операций к Markdown;
- сравнение `last_verified_commit` с текущим HEAD.
