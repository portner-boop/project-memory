# 05 — Интеграция с Claude Code и Codex

## Общий источник инструкций

Сделай `AGENTS.md` главным файлом.

Codex автоматически читает `AGENTS.md` перед выполнением работы. Он поддерживает
вложенные файлы и приоритет инструкций от корня к текущей директории. Общий лимит
проектных инструкций по умолчанию — **32 KiB**, поэтому туда нельзя складывать
всю документацию.

`CLAUDE.md` делаем почти пустым:

```md
@AGENTS.md
```

Claude Code поддерживает импорт файлов через `@path`. Anthropic рекомендует
держать каждый `CLAUDE.md` **короче примерно 200 строк**, поскольку он
загружается в каждую сессию и постоянно расходует контекст.

Итог:

```text
Codex      ──читает──▶ AGENTS.md
Claude Code ──читает──▶ CLAUDE.md ──импортирует──▶ AGENTS.md
```

Правила не дублируются.

## Пример `AGENTS.md`

`````md
# Project instructions

## Repository

- `frontend/` — Vue application.
- `backend/` — FastAPI application.
- `docs/` — project knowledge and task documentation.

## Documentation workflow

Before implementing a task:

1. Determine the Jira task ID.
2. Read `docs/_index.json`.
3. Read only documents connected to affected code paths.
4. Create or update `docs/tasks/<TASK-ID>/implementation-plan.md`.

After implementation:

1. Run `repomind sync --task <TASK-ID>`.
2. Update permanent documentation only when behavior, contracts,
   data structures or architectural decisions changed.
3. Do not rewrite whole documents.
4. Every documentation statement must reference changed code,
   a requirement or an explicit decision.
5. When intent cannot be determined from code, mark the item
   as `needs_review` instead of guessing.

## Verification

Run:

```bash
repomind check
```
`````

Обрати внимание на пункт 5: **агенту прямо запрещено угадывать**. Если намерение
не выводится из кода — ставится `needs_review`, и это увидит человек в diff.

## Общий skill для обоих агентов

```text
.agents/skills/docs-sync/     ← настоящий skill
.claude/skills/docs-sync      ← symlink на него
```

Skill загружается **только при использовании**, а не занимает контекст
постоянно. Именно повторяемые процедуры Anthropic рекомендует выносить из
`CLAUDE.md` в skills.

Вызов:

| Агент       | Планирование              | Синхронизация             |
| ----------- | ------------------------- | ------------------------- |
| Claude Code | `/docs-plan ABSHTRUE-657` | `/docs-sync ABSHTRUE-657` |
| Codex       | `$docs-plan ABSHTRUE-657` | `$docs-sync ABSHTRUE-657` |
| CLI         | `repomind plan ABSHTRUE-657` | `repomind sync ABSHTRUE-657` |

---

## Skill, hook, MCP и субагент — в чём разница

Это главный источник путаницы, поэтому разбираем по отдельности.

### Skill — **как** выполнить задачу

Например:

- как создать план;
- как обновить документацию;
- какие файлы читать;
- какой JSON вернуть;
- какие проверки запустить.

**Это основа продукта.**

### Hook — **когда** запустить скрипт

Например:

- после завершения задачи;
- перед коммитом;
- после изменения файлов;
- при завершении сессии.

Hooks хорошо подходят для Claude Code, но **не должны быть ядром продукта**,
иначе решение будет зависеть от одного агента.

⚠️ **Важная ловушка.** У Claude Code есть события `PostToolUse`, `TaskCompleted`,
`Stop`, `SessionEnd` и другие. При этом `Stop` вызывается **после каждого ответа
Claude**, а не только после завершения всей задачи. Запускать полный
documentation sync на `Stop` нельзя — это будет дорого и шумно.

Правильная схема:

| Момент                              | Действие                          |
| ----------------------------------- | --------------------------------- |
| после каждого изменения файлов      | только пометить проект как `dirty` |
| `TaskCompleted` / перед коммитом / вручную | полный `repomind sync`      |
| CI                                  | окончательная проверка            |

### MCP — доступ к внешней системе

Понадобится, когда захочется:

- самостоятельно забирать Jira-задачи;
- читать Confluence;
- отправлять PM-summary в Jira;
- работать с GitHub API;
- подключать корпоративный каталог.

**Для локального Git-репозитория MCP не нужен.** В первой версии он только
усложнит установку.

### Субагенты — параллельное исследование

Полезны, когда нужно параллельно:

- изучить frontend;
- изучить backend;
- проверить документацию;
- найти архитектурные последствия.

Но запускать четыре субагента после каждой правки дорого. Claude Code и Codex
поддерживают делегирование отдельным агентам, однако это стоит использовать
**для больших задач, а не для обычного sync**.

### Сводка

| Механизм  | Отвечает на вопрос | Роль в RepoMind          | В версии 1 |
| --------- | ------------------ | ------------------------ | ---------- |
| Skill     | как                | ядро продукта            | ✅ да      |
| Hook      | когда              | удобство, не ядро        | ⏳ v2      |
| MCP       | откуда данные      | только внешние источники | ⏳ v3      |
| Субагент  | кто параллельно    | только крупные задачи    | ❌ нет     |

---

## Источники

- [Codex — AGENTS.md](https://developers.openai.com/codex/agent-configuration/agents-md)
- [Claude Code — Memory / CLAUDE.md](https://docs.anthropic.com/en/docs/claude-code/memory)
- [Claude Code — Skills](https://docs.anthropic.com/en/docs/claude-code/skills)
- [Claude Code — Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)
- [Claude Code — Sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)
