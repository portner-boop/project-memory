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
✔ .gitignore                             += .repomind/dirty

✔ docs/README.md                         навигация
✔ docs/_index.json                       пустой индекс
✔ docs/product/          + README.md
✔ docs/architecture/     + README.md
✔ docs/contracts/        + README.md
✔ docs/decisions/README.md               ЧТО ТАКОЕ ADR и когда его писать
✔ docs/decisions/_template.md            болванка ADR
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

### Флаги

```bash
repomind init --agents claude,codex   # для кого делать скиллы (по умолчанию оба)
repomind init --no-symlink            # копировать скиллы вместо symlink (Windows)
repomind init --with-ci               # + GitHub Actions workflow (см. 05-roadmap)
repomind init --force                 # перезаписать существующие файлы
```

`init` идемпотентен: повторный запуск ничего не ломает и дописывает только
недостающее.

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

## Установка

```bash
uvx repomind init      # разово, без установки
pipx install repomind  # насовсем
```
