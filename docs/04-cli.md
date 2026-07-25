# 04 — CLI

| Команда | Что делает | Модель |
|---|---|:---:|
| `repomind init` | разворачивает всю обвязку в проекте | ❌ |
| `repomind task` | забирает ТЗ из inbox, заводит задачу | ❌ |
| `repomind plan` | технический разбор + оценка + summary | ✅ |
| `repomind sync` | обновляет документацию по diff | ✅ |
| `repomind check` | валидация | ❌ |
| `repomind index` | пересобирает `_index.json` | ❌ |

Четыре команды из шести работают без всякого ИИ.

---

## `repomind init`

Отвечает на вопрос «а откуда возьмутся скиллы, ADR и всё остальное».
Одна команда разворачивает всё:

```bash
uvx repomind init
```

### Что появляется в проекте

```text
✔ AGENTS.md                              правила для агентов (шаблон под твой стек)
✔ CLAUDE.md                              одна строка: @AGENTS.md

✔ .agents/skills/docs-plan/SKILL.md      скилл планирования
✔ .agents/skills/docs-sync/SKILL.md      скилл синхронизации
✔ .agents/skills/docs-sync/schemas/      JSON Schema для ответа модели
✔ .claude/skills/docs-plan  → symlink
✔ .claude/skills/docs-sync  → symlink
✔ .claude/settings.json                  хук dirty-флага

✔ .repomind/config.yml                   настройки проекта
✔ .gitignore                             += .repomind/dirty, .codegraph/

✔ docs/README.md                         навигация
✔ docs/_index.json                       пустой индекс
✔ docs/product/          + README.md
✔ docs/architecture/     + README.md
✔ docs/contracts/        + README.md
✔ docs/decisions/README.md               ЧТО ТАКОЕ ADR и когда его писать
✔ docs/decisions/_template.md            болванка ADR
✔ docs/runbook/setup.md                  каркас: как поднять проект
✔ docs/runbook/daily.md                  каркас: тесты, линтеры, миграции
✔ docs/runbook/troubleshooting.md        пустой, заполняется по мере поломок
✔ docs/runbook/release.md                каркас: порядок выкатки
✔ docs/requirements/inbox/.gitkeep       сюда кидать .docx
✔ docs/requirements/original/.gitkeep
✔ docs/tasks/.gitkeep
✔ docs/now/current-task.md               заглушка
```

Скиллы — это **обычные markdown-файлы**, они физически копируются из пакета в
твой проект. После этого они твои: правь под свой процесс, коммить в git,
ревьюй в PR. Никакой скрытой магии, всё лежит на диске.

То же с ADR: `docs/decisions/README.md` объясняет, зачем нужны решения и когда
их писать, `_template.md` — форма, которую копируешь.

Файлы `runbook/` создаются **каркасом с угаданными командами**: `init` смотрит
на `Makefile`, `package.json`, `manage.py`, `docker-compose.yml` и подставляет
то, что нашёл. Дальше правишь руками — это твои команды, никто их лучше тебя
не знает.

### `init` — инспектор, а не установщик

Главное свойство: **команда смотрит, что уже есть, и дозаполняет только
недостающее.** Ничего не перезаписывает, ничего не удаляет, не пересобирает
то, что можно досинхронизировать.

Из этого следует, что запускать её на уже настроенном проекте не только
безопасно, но и полезно — она работает как диагностика:

```text
$ repomind init

Структура
  = AGENTS.md, CLAUDE.md — на месте
  + docs/runbook/release.md — не хватало, создал
  = .claude/skills/ — symlinks целы

CodeGraph
  ⟳ индекс отставал на 47 файлов — досинхронизировал за 2с
  = MCP прописан для claude, codex

Ничего не сломано. Дозаполнено: 2 пункта.
```

`=` уже было · `+` добавлено · `⟳` обновлено · `⚠` требует внимания ·
`—` пропущено по настройке.

### CodeGraph поднимается здесь же

Если [CodeGraph](07-codegraph.md) установлен, `init` делает за тебя то, что
иначе пришлось бы руками: `codegraph init` (фоном, параллельно разворачиванию
структуры) и `codegraph install` для MCP.

Но он **учитывает, что уже могло быть сделано до него** — CodeGraph часто
появляется в проекте раньше RepoMind:

| Что нашёл | Что делает |
|---|---|
| индекса нет | строит фоном |
| индекс свежий | ничего, только сообщает |
| индекс устарел | `codegraph sync` — инкрементально, **не пересборка** |
| MCP уже прописан | пропускает |
| `enabled: off` в конфиге | **уважает выбор**, пропускает всё |
| `.codegraph/` закоммичен в git | предупреждает, команду печатает, сам не выполняет |

Полная матрица состояний —
[07 — Что уже могло быть в проекте](07-codegraph.md#что-уже-могло-быть-в-проекте).

Если CodeGraph **не установлен** — печатает команду и идёт дальше. Сам не
ставит: глобальный пакет это решение пользователя, а исполнять удалённый скрипт
через `curl | sh` от чужого имени инструмент не должен в принципе.

### Флаги

```bash
repomind init --agents claude,codex          # для кого делать скиллы (по умолчанию оба)
repomind init --no-symlink                   # копировать скиллы вместо symlink (Windows)
repomind init --codegraph auto|skip|rebuild  # см. 07
repomind init --with-ci                      # + GitHub Actions workflow (см. 05-roadmap)
repomind init --force                        # перезаписать существующие файлы
```

`--force` перезаписывает только файлы-каркасы RepoMind. Индекс CodeGraph он
не трогает — для этого отдельный `--codegraph rebuild`, чтобы случайно не
запустить пересборку на миллион файлов.

---

## Загрузка ТЗ

Главный сценарий: **ТЗ приходит в Word**. Никаких длинных команд.

### Способ 1 — inbox (основной)

```text
1. Перетаскиваешь ABSHTRUE-657.docx в docs/requirements/inbox/
2. repomind task
```

Всё. Никаких аргументов.

Что происходит внутри:

```text
docs/requirements/inbox/ABSHTRUE-657.docx
        │
        ├─ определить ID          из имени файла по шаблону [A-Z]+-\d+
        ├─ конвертировать         .docx → markdown (таблицы, списки, картинки)
        ├─ картинки               → requirements/original/ABSHTRUE-657.assets/
        │
        ├─ сохранить оригинал     → requirements/original/ABSHTRUE-657.docx
        ├─ сохранить markdown     → requirements/original/ABSHTRUE-657.md
        ├─ создать папку задачи   → tasks/ABSHTRUE-657/request.md
        ├─ обновить               → now/current-task.md
        └─ очистить inbox
```

Оригинальный `.docx` **сохраняется рядом** — если конвертация что-то потеряла
(сложная таблица, схема), всегда можно открыть исходник.

Кинул пять файлов сразу — обработаются все пять.

### Определение номера задачи

По порядку, до первого успеха:

1. имя файла — `ABSHTRUE-657.docx`, `ТЗ ABSHTRUE-657 v2.docx`, `abshtrue-657.docx`;
2. первые 20 строк текста — ищем тот же шаблон;
3. спрашиваем в терминале.

Шаблон настраивается в `.repomind/config.yml`:

```yaml
task:
  id_pattern: "[A-Z]+-\\d+"
  jira_base_url: "https://jira.company.ru/browse/"
```

### Способ 2 — явный ID

Файл лежит не в inbox или назван криво:

```bash
repomind task ABSHTRUE-657 путь/к/файлу.docx
```

### Способ 3 — просто текст

ТЗ прислали в мессенджере:

```bash
repomind task ABSHTRUE-657
```

Если файла нет — открывается `$EDITOR`, вставляешь текст, сохраняешь.

Или через stdin:

```bash
pbpaste | repomind task ABSHTRUE-657
```

### Форматы

| Формат | Чем конвертируется |
|---|---|
| `.docx` | `markitdown` (основной), `mammoth` (запасной) |
| `.pdf` | `markitdown` |
| `.xlsx` | `markitdown` — таблицы требований |
| `.md` `.txt` | как есть |

Основная зависимость — `markitdown` от Microsoft: держит таблицы, списки,
заголовки и вытаскивает картинки. Ставится вместе с пакетом.

### Чего конвертация не умеет

Честно, чтобы не было сюрпризов:

- **схемы и диаграммы** из Word превращаются в картинку — текст с них не
  считывается;
- **сложные объединённые ячейки** могут поехать;
- **комментарии на полях** и правки в режиме рецензирования теряются.

Поэтому оригинал и лежит рядом. Если ТЗ важное — глянь `request.md` глазами
перед `plan`, это тридцать секунд.

---

## Остальные команды

```bash
repomind plan  <TASK-ID> [--base <ref>]
repomind sync  [<TASK-ID>] [--base <ref>] [--check-only] [--dry-run]
repomind check [--strict] [--format text|json]
repomind index [--write]
```

Без `<TASK-ID>` команды берут текущую задачу из `docs/now/current-task.md`.
То есть в обычном дне это просто:

```bash
repomind plan
# ... работа ...
repomind sync
repomind check
```

### Флаги, которые реально нужны

| Флаг | Где | Смысл |
|---|---|---|
| `--base <ref>` | plan, sync | база для diff, по умолчанию `origin/main` |
| `--check-only` | sync | ничего не писать, только сказать что устарело |
| `--dry-run` | sync | показать операции модели, не применяя |
| `--strict` | check | предупреждения считаются ошибками |

### Коды возврата

| Код | Значение |
|---|---|
| 0 | всё хорошо / изменений не требуется |
| 1 | ошибки валидации |
| 2 | документация устарела (`sync --check-only`) |
| 3 | ошибка конфигурации или окружения |

---

## Вызов из агентов

| Агент | Планирование | Синхронизация |
|---|---|---|
| Claude Code | `/docs-plan ABSHTRUE-657` | `/docs-sync` |
| Codex | `$docs-plan ABSHTRUE-657` | `$docs-sync` |

Скилл внутри вызывает тот же CLI — логика не дублируется.

---

## Стек

```text
Python 3.11+
Typer            CLI
Pydantic         модели и валидация ответа модели
PyYAML           frontmatter
markdown-it-py   разбор markdown и поиск блоков
markitdown       docx / pdf / xlsx → markdown
Jinja2           шаблоны документов
JSON Schema      контракт structured output
git              через subprocess
```

Ни backend, ни базы, ни MCP в первой версии нет.

### Необязательные соседи

| | Что даёт | Если нет |
|---|---|---|
| [CodeGraph](07-codegraph.md) | точный отбор документов по графу вызовов, дешёвый `plan`, честная проверка `evidence` | работают маски путей и текстовый поиск |

Жёсткой зависимости нет: `codegraph.enabled: auto` включает связку, только если
индекс и бинарь на месте.

## Установка

```bash
uvx repomind init      # разово, без установки
pipx install repomind  # насовсем
```
