# 09 — Автоматизация: hooks и CI

## Локальный режим

```bash
repomind plan ABSHTRUE-657
repomind sync ABSHTRUE-657
repomind check
```

Из агентов:

```text
Claude Code:  /docs-plan ABSHTRUE-657    /docs-sync ABSHTRUE-657
Codex:        $docs-plan ABSHTRUE-657    $docs-sync ABSHTRUE-657
```

## Hooks: где ставить триггеры

| Событие                  | Действие                         | Стоимость |
| ------------------------ | -------------------------------- | --------- |
| `PostToolUse` (правка файлов) | пометить проект как `dirty`  | ~0        |
| `TaskCompleted`          | полный `repomind sync`           | 1 LLM-вызов |
| `pre-commit`             | `repomind check`                 | 0         |
| CI на PR                 | `check` + `sync --check-only`    | 0–1 вызов |

⚠️ **Не вешать полный sync на `Stop`.** В Claude Code `Stop` срабатывает после
каждого ответа модели, а не только по завершении задачи. Это будет дорого и
шумно. Подробнее — [05 — Интеграция](05-agent-integration.md#hook--когда-запустить-скрипт).

### Схема «dirty flag»

```text
правка файла  →  hook пишет .repomind/dirty
                        ↓
TaskCompleted / pre-commit / ручной вызов
                        ↓
              repomind sync (читает dirty, чистит его)
```

Дешёвая часть срабатывает часто, дорогая — редко.

## CI-режим

Claude Code можно запускать программно через `claude -p`, а Codex — через
`codex exec`. Оба режима подходят для скриптов и CI. Для Codex также существует
официальный GitHub Action.

GitHub Actions умеет запускать workflow только при изменении определённых путей —
это важно, чтобы не гонять проверку на каждый чих.

```yaml
on:
  pull_request:
    paths:
      - "frontend/**"
      - "backend/**"
      - "docs/**"

jobs:
  documentation:
    steps:
      - checkout
      - install repomind
      - run: repomind check
      - run: repomind sync --check-only --base origin/main
```

Полный рабочий файл — [`examples/demo-project/.github/workflows/documentation.yml`](../examples/demo-project/.github/workflows/documentation.yml).

## Два режима CI

**CI не должен автоматически менять основную ветку.**

| Режим        | Что делает                                          | Когда включать        |
| ------------ | --------------------------------------------------- | --------------------- |
| **Check mode** | сообщает, какие документы устарели; проваливает PR | всегда                |
| **Fix mode**   | создаёт патч в текущей ветке или отдельный PR     | по метке / вручную    |

Fix mode удобно вешать на label `docs:autofix` или на комментарий в PR —
так у человека остаётся контроль над тем, когда модель пишет в репозиторий.

## Источники

- [Claude Code — Headless mode (`claude -p`)](https://code.claude.com/docs/en/headless)
- [GitHub Actions — Events that trigger workflows](https://docs.github.com/actions/using-workflows/events-that-trigger-workflows)
