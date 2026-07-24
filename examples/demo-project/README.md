# Демо-проект

Так выглядит проект с настроенным RepoMind. Кода приложения тут нет — только
всё, что вокруг него. Файлы написаны руками; они показывают, **что должно
получаться**, когда CLI будет написан.

Система для примера: платформа приёма заявок на гранты. Монорепо из трёх
частей — Django backend, Vue frontend и FastAPI-сервис генерации PDF.
Специально взят такой состав, потому что на нём видны реальные сложности:
legacy-ветка, снапшоты вычисляемых значений, независимые релизы сервисов.

---

## Смотреть в этом порядке

### 1. Что агент читает всегда

[`AGENTS.md`](AGENTS.md) — 55 строк постоянных правил. Обрати внимание на
раздел «Project-specific traps»: три ловушки, на которых новый человек теряет
день, стоят три строки в файле.

[`CLAUDE.md`](CLAUDE.md) — одна строка `@AGENTS.md`.

### 2. Как выглядит архитектурная документация

[`docs/architecture/system.md`](docs/architecture/system.md) — начни отсюда.
Схема из трёх частей, границы ответственности, и главное — **практические
выводы**: «если в PDF надо показать новое значение — считает backend, в сервисе
меняется только шаблон».

Дальше по вкусу:
[backend](docs/architecture/backend.md) ·
[frontend](docs/architecture/frontend.md) ·
[pdf-service](docs/architecture/pdf-service.md) ·
[auth](docs/architecture/auth.md)

Каждый документ размечен блоками `<!-- block: ... -->` и имеет `code_paths`
во frontmatter — по ним система понимает, какой документ задет изменением.

### 3. Как выглядит решение

[`docs/decisions/README.md`](docs/decisions/README.md) — что такое ADR и когда
его писать. **Этот файл создаёт `repomind init`**, вместе с
[`_template.md`](docs/decisions/_template.md).

[`ADR-001`](docs/decisions/ADR-001-pdf-service.md) — почему PDF вынесен
в отдельный сервис. Секция «Альтернативы» — самая ценная: она закрывает вопрос
«а вы вообще думали про X?».

[`ADR-002`](docs/decisions/ADR-002-snapshot-on-accept.md) — почему значения
фиксируются снапшотом. На него потом ссылается разбор задачи.

### 4. Как проходит задача — DEMO-657

Задача: добавить read-only колонку «Расход за этап».

| Шаг | Файл | Что смотреть |
|---|---|---|
| ТЗ приехало в Word | [request.md](docs/tasks/DEMO-657/request.md) | сконвертировано, оригинал сохранён рядом |
| Технический разбор | [**deep-dive.md**](docs/tasks/DEMO-657/deep-dive.md) | ← **главный файл примера** |
| Оценка | [estimate.md](docs/tasks/DEMO-657/estimate.md) | 16 часов с разбивкой и допущениями |
| Для менеджера | [summary.md](docs/tasks/DEMO-657/summary.md) | 3 абзаца, ни одного пути к файлу |
| Ход работы | [progress.md](docs/tasks/DEMO-657/progress.md) | отмеченные пункты + зафиксированные отклонения |
| Итог | [result.md](docs/tasks/DEMO-657/result.md) | дописан командой `sync` |

**`deep-dive.md` — то, ради чего всё затевается.** Там: как работает сейчас
с путями и номерами строк, готовый код к написанию, список «что не трогаем»,
семь пронумерованных рисков, план по частям, команды проверки и ручной сценарий.

Отдельно обрати внимание на раздел **«не трогаем»** — он снимает вопросы
«а не надо ли ещё вот тут?» и ловит мёртвый код заранее.

### 5. Что делает синхронизация

Сравни [`result.md`](docs/tasks/DEMO-657/result.md) и блок
`REPORT.STAGE_EXPENSE` в [`docs/product/reports.md`](docs/product/reports.md).

Изменился **один блок** в постоянной документации. Файл
[`docs/architecture/auth.md`](docs/architecture/auth.md) не тронут вообще —
`backend/app/auth/**` не пересёкся с diff. Он в примере существует именно для
того, чтобы показать, что его **не читают и не переписывают**.

### 6. Куда кидать ТЗ

[`docs/requirements/inbox/`](docs/requirements/inbox/README.md) — перетащил
`.docx`, набрал `repomind task`, всё. Без аргументов и путей.

---

## Что показывает пример

| Идея | Где смотреть |
|---|---|
| атомарные блоки | любой документ в `architecture/` |
| стабильные ID и `code_paths` | frontmatter постоянных документов |
| ссылки `path#Symbol` | постоянная документация |
| номера строк допустимы в разборе задачи | `deep-dive.md` |
| каталог генерируется скриптом | [`_index.json`](docs/_index.json) |
| отбор контекста по diff | `auth.md`, который не читали |
| structured output вместо записи в файлы | [docs-sync/SKILL.md](.agents/skills/docs-sync/SKILL.md) |
| планка качества разбора | [docs-plan/SKILL.md](.agents/skills/docs-plan/SKILL.md) |
| ADR только на решения | `decisions/` |
| один скилл на двух агентов | `.agents/skills/` + symlinks в `.claude/skills/` |
| дешёвый хук + дорогой sync | [.claude/settings.json](.claude/settings.json) |

## Symlinks

```bash
ls -la .claude/skills/
# docs-plan -> ../../.agents/skills/docs-plan
# docs-sync -> ../../.agents/skills/docs-sync
```

Настоящие файлы лежат в `.agents/skills/` (оттуда их читает Codex), Claude Code
видит их через ссылку. Всё это делает `repomind init`; на Windows — копирует.

## Чего в примере нет

**GitHub Actions.** Сознательно: CI не входит в первую версию, чтобы не
усложнять старт. Включается одной командой `repomind init --with-ci` в любой
момент — см. [05-roadmap](../../docs/05-roadmap.md#ci--можно-включить-в-любой-момент).
