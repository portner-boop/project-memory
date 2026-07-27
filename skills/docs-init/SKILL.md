---
name: docs-init
description: Set up RepoMind project memory in this repository — inspect the stack, create the docs/ structure, and write AGENTS.md plus a runbook filled with the project's real commands. Use when asked to set up, initialise or bootstrap project documentation, project memory or RepoMind.
---

# docs-init

Разворачивает память проекта: осматривает репозиторий и создаёт структуру
под его стек.

Запускается **один раз на проект**. Повторный запуск безопасен — работает как
диагностика и дозаполняет недостающее.

---

## Железные правила

1. **Никогда не перезаписывай существующий файл.** Если файл есть — оставь как
   есть и отметь в отчёте как `=`. Исключение — только если пользователь явно
   сказал «перезапиши».
2. **Не выдумывай команды.** Каждая команда в runbook берётся из реального
   `Makefile`, `package.json`, `pyproject.toml`, `docker-compose.yml`.
   Не нашёл — пиши `TODO: заполнить`, а не правдоподобную выдумку.
3. **Различай факт и намерение.** Архитектуру и контракты можно и нужно
   описать по коду (шаг 7) — со ссылкой на каждое утверждение. А вот *почему*
   так сделано, в коде нет: такое не пиши, собери в вопросы.
4. **Не задавай больше трёх вопросов.** Всё остальное определи сам из проекта.
5. **В конце — отчёт** с пометками `=` было, `+` создано, `⚠` внимание.

---

## Шаг 1. Осмотреть проект

Молча, без вопросов. Определи:

| Что | Где искать |
|---|---|
| части проекта | папки верхнего уровня, `docker-compose.yml`, workspaces |
| язык и фреймворк | `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, `Gemfile` |
| как запускается | `Makefile`, `docker-compose.yml`, скрипты в `package.json` |
| чем тестируется | те же места: `test`, `pytest`, `jest`, `go test` |
| линтер | `.eslintrc`, `ruff.toml`, `.golangci.yml`, секции в конфигах |
| существующая документация | `docs/`, `doc/`, `README.md`, `wiki/`, `*.md` в корне |
| уже есть RepoMind? | `docs/_index.json`, `AGENTS.md`, `.agents/skills/` |
| есть ли CodeGraph | папка `.codegraph/`, бинарь `codegraph` в PATH |
| система задач | префиксы в `git log --oneline -50` вида `ABC-123` |

Загляни в `git log` — префикс задач оттуда пригодится для `docs/tasks/`.

## Шаг 2. Спросить — максимум три вопроса

Спрашивай **только то, что не смог определить**. Если всё понял — не спрашивай
ничего, сразу делай.

1. Если частей проекта несколько и назначение неочевидно:
   «Правильно ли я понял: `backend/` — API, `frontend/` — веб-интерфейс?»
2. Если нашлась существующая документация:
   «Нашёл `docs/architecture.md` и `README.md`. Переносить их в новую
   структуру или оставить на месте?»
3. Если префикс задач не вывелся из git:
   «Как называются задачи в трекере — например `ABC-123`?»

Задавай их **все сразу, одним сообщением**, а не по одному.

## Шаг 3. Создать структуру

```text
docs/
├── README.md
├── product/README.md
├── architecture/README.md      ← НАВИГАЦИЯ по папке, не содержимое
├── contracts/README.md         ← то же
├── decisions/README.md
├── decisions/_template.md
├── runbook/setup.md
├── runbook/daily.md
├── runbook/troubleshooting.md
├── runbook/release.md
├── requirements/inbox/README.md
├── requirements/original/.gitkeep
├── tasks/.gitkeep
└── now/current-task.md
```

Существующие файлы **не трогай**.

`README.md` внутри `product/`, `architecture/`, `contracts/` — это **навигация
по папке**: что здесь лежит и по какому принципу. Не заводи в них `id` и не
пиши туда содержимое — оно пойдёт в именованные файлы на шаге 7
(`architecture/system.md`, `contracts/api.md` и т.п.).

## Шаг 4. `AGENTS.md` и `CLAUDE.md`

`CLAUDE.md` — ровно одна строка:

```md
@AGENTS.md
```

Если `CLAUDE.md` уже есть и в нём есть содержимое — **не перезаписывай**.
Добавь `@AGENTS.md` первой строкой, остальное оставь.

`AGENTS.md` — по этому шаблону, с подставленными реальными данными проекта.
Держи в пределах 120 строк: файл грузится в каждую сессию.

```md
# Project instructions

## Repository

- `<папка>/` — <что это, одна строка>
- `docs/` — project knowledge and task documentation.

## Commands

Never guess a command. All of them live in `docs/runbook/daily.md`.
First run from scratch — `docs/runbook/setup.md`.
Something broke — `docs/runbook/troubleshooting.md`, indexed by symptom.

## Documentation workflow

Before implementing a task:

1. Determine the task ID (or read `docs/now/current-task.md`).
2. Read `docs/_index.json`.
3. Read only documents whose `code_paths` intersect the affected code.
4. Read the real code of those modules before proposing anything.

After implementation:

1. Update permanent documentation only when behavior, contracts,
   data structures or architectural decisions changed.
2. Do not rewrite whole documents — update individual blocks.
3. Every documentation statement must reference changed code,
   a requirement or an explicit decision.
4. When intent cannot be determined from code, mark the item
   as `needs_review` instead of guessing.

## Code references

Reference code by path and symbol, never by line number:

- Good: `<реальный пример из этого проекта>`
- Bad: `<тот же файл>:142`

## Decisions

Create an ADR in `docs/decisions/` only for a real architectural decision.
Never for a refactoring. Template: `docs/decisions/_template.md`.

## Project-specific traps

<!-- 3-5 ловушек, на которых теряют день. Заполняется по мере обнаружения. -->
```

Раздел «traps» оставь с комментарием, если пока нечего написать. **Не
придумывай ловушки.**

## Шаг 5. Runbook с настоящими командами

Самая полезная часть. Возьми команды **из проекта**, не из головы.

`docs/runbook/daily.md`:

```md
---
id: RUN-DAILY
type: runbook
code_paths:
  - <файлы, откуда взяты команды: Makefile, package.json…>
---

# Ежедневные команды

Единственный источник правды по командам.

## Тесты
<!-- block: DAILY.TESTS -->

```bash
<реальная команда>
```

## Линтеры
<!-- block: DAILY.LINT -->

```bash
<реальная команда>
```

## Перед коммитом
<!-- block: DAILY.PRE_COMMIT -->

```bash
<последовательность из команд выше>
```
```

Добавляй только те разделы, для которых нашлись команды. Не нашёл линтер —
не создавай пустой раздел, лучше его не будет вовсе.

`docs/runbook/setup.md` — по тому же принципу: версии из `.nvmrc`,
`pyproject.toml`, `go.mod`; шаги запуска из `docker-compose.yml` и README.

`docs/runbook/troubleshooting.md` — создай **пустым**, с шапкой и объяснением
формата:

```md
# Что делать, когда сломалось

Формат записи: **симптом → причина → что делать**.

Заголовок — то, что человек видит на экране, а не название проблемы.
Пополняется реактивно: потратил больше получаса на непонятное — запиши.

<!-- Пока пусто. Первая запись появится при первой поломке. -->
```

Это единственный документ, который **правильно** оставить пустым.

## Шаг 6. Разметить существующую документацию

Если пользователь на шаге 2 согласился переносить:

1. Перенеси файлы в `docs/product/`, `docs/architecture/`, `docs/contracts/`
   по смыслу. **Текст не переписывай.**
2. Каждому добавь frontmatter:

```yaml
---
id: ARCH-BACKEND          # SCREAMING-KEBAB, уникальный
type: architecture        # product | architecture | contract | runbook
code_paths:
  - backend/**            # какой код описывает этот документ
---
```

3. В документах длиннее экрана расставь маркеры блоков перед заголовками:

```md
## Авторизация
<!-- block: AUTH.OVERVIEW -->
```

`code_paths` — самое важное поле. Если не уверен, какой код описывает
документ, поставь широкую маску и отметь в отчёте как требующее проверки.

## Шаг 7. Описать архитектуру и контракты по коду

Каркасы из шага 3 пустые. Но **архитектура и контракты выводятся из кода** —
в отличие от решений, которых там нет никогда. Значит, их можно написать сразу.

Спроси одной строкой:

```text
Описать архитектуру и API по коду прямо сейчас? Это займёт несколько минут
и даст черновик, который останется вычитать. (да / позже)
```

Согласился — выполни [`docs-describe`](../docs-describe/SKILL.md) целиком,
он для этого и существует. Коротко, три уровня:

| | Пример | Что делать |
|---|---|---|
| ✅ факт из кода | части, стек, слои, endpoints, модели, статусы | писать со ссылкой `path#Symbol` |
| ⚠️ наблюдение | «логика только в backend» | писать, но помечать `needs_review` |
| ❌ намерение | почему выбрали Redis, «не переставляй порядок» | **не писать**, собрать в вопросы |

Сгенерированным документам ставь в шапку `generated: true` и `reviewed: false`.

Отказался или проект большой — оставь каркасы пустыми и скажи, что можно
запустить `/docs-describe` потом, в том числе на одном модуле.

## Шаг 8. Собрать `docs/_index.json`

Пройди по всем документам с frontmatter и собери:

```json
{
  "generated_by": "docs-init skill",
  "schema_version": 1,
  "documents": {
    "<id>": {
      "path": "docs/...",
      "type": "...",
      "code_paths": ["..."],
      "blocks": ["...", "..."]
    }
  },
  "decisions": {},
  "tasks": {}
}
```

`blocks` — список из маркеров `<!-- block: ... -->` в порядке появления
в файле. Порядок важен.

## Шаг 9. CodeGraph, если он есть

Проверь наличие и действуй по состоянию:

| Что нашёл | Что делать |
|---|---|
| бинаря нет | напечатать `npm i -g @colbymchenry/codegraph`, **не ставить** |
| бинарь есть, `.codegraph/` нет | предложить `codegraph init`, запустить с согласия |
| `.codegraph/` есть | ничего не делать, сообщить |
| `.codegraph/` отслеживается git | предупредить, напечатать `git rm -r --cached .codegraph/` |

**Ничего не устанавливай сам** и не выполняй `curl … | sh`. Печатай команду,
решает человек.

Добавь в `.gitignore`, если строк ещё нет:

```gitignore
.codegraph/
.repomind/dirty
```

## Шаг 10. Отчёт

```text
Осмотр
  backend/  — Django 4 + DRF
  frontend/ — Nuxt 2
  задачи    — префикс ABSHTRUE-

Структура
  + docs/ — 8 каталогов
  = AGENTS.md — уже был, не трогал
  + CLAUDE.md
  + docs/runbook/daily.md — команды взяты из Makefile и package.json
  + docs/runbook/troubleshooting.md — пустой, заполняется по ходу

Документация
  + перенесено 3 файла, проставлен frontmatter
  ⚠ docs/architecture/legacy.md — не понял, какой код описывает,
    поставил широкую маску, проверь code_paths

Описано по коду
  + docs/architecture/system.md   ARCH-SYSTEM   4 блока
  + docs/contracts/api.md         CONTRACT-API  23 endpoint
  ⚠ 2 блока помечены needs_review — наблюдения, нужно подтвердить
  ? 3 кандидата в ADR — вопросы, на которые код не отвечает

CodeGraph
  ✖ не установлен — npm i -g @colbymchenry/codegraph

Дальше:
  1. Проверь команды в docs/runbook/daily.md
  2. Допиши «Project-specific traps» в AGENTS.md, когда наткнёшься
  3. Первый ADR заводи, когда кто-то спросит «а почему тут так?»
```

Обозначения: `=` было · `+` создано · `⚠` требует внимания · `✖` отсутствует.

---

## Чего НЕ делать

- Не наполнять архитектурные документы выдуманным содержимым: факты со
  ссылками — можно, намерения — нет.
- Не создавать ADR задним числом. Они пишутся вперёд.
- Не переписывать существующие тексты при переносе.
- Не создавать разделы runbook, для которых не нашлось команд.
- Не ставить сторонний софт.
