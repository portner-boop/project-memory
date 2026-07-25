# RepoMind — шпаргалка

Одна страница. Всё остальное — в [`docs/`](docs/).

---

## Установка

```bash
npx repomind-skills          # в папке проекта, разово
```

| Скилл | Что делает |
|---|---|
| `/docs-init` | развернуть структуру под твой стек |
| `/docs-describe` | описать архитектуру и API по коду |
| `/docs-task` | ТЗ из Word → папка задачи |
| `/docs-plan ABC-123` | разбор кода, план, оценка в часах |
| `/docs-do` | выполнить план по шагам |
| `/docs-sync` | обновить документацию по diff |
| `/docs-check` | валидация + пересборка каталога |

Подробности — [skills/README.md](skills/README.md).

---

## Обычный день

```bash
# ТЗ пришло в Word — перетащил файл в docs/requirements/inbox/
/docs-task           # завёл задачу, ID взялся из имени файла
/docs-plan           # разбор + оценка + summary
# 👀 прочитал deep-dive.md, поставил reviewed: true
/docs-do             # выполнил план по шагам
/docs-sync           # обновил документацию по diff
/docs-check          # проверил
git diff                # посмотрел глазами
```

Без аргументов команды берут текущую задачу из `docs/now/current-task.md`.

## Все команды

```bash
/docs-init     # развернуть обвязку в проекте
/docs-task     # ТЗ из inbox → папка задачи
/docs-plan     # deep-dive + estimate + summary     ← модель
/docs-do       # выполнить план по шагам            ← модель
/docs-sync     # обновить документацию по diff      ← модель
/docs-check    # валидация
/docs-check    # пересобрать _index.json
```

Из агентов:

```text
Claude Code   /docs-plan DEMO-657    /docs-do    /docs-sync
Codex         $docs-plan DEMO-657    $docs-do    $docs-sync
```

## Флаги

| Флаг | Где | Смысл |
|---|---|---|
| `--base <ref>` | plan, sync | база diff, по умолчанию `origin/main` |
| `--from <N>` | do | начать с пункта N плана |
| `--only <N>` | do | выполнить ровно один пункт |
| `--skip-review` | do | не требовать reviewed: true |
| `--check-only` | sync | не писать, только сказать что устарело |
| `--dry-run` | sync | показать операции, не применяя |
| `--strict` | check | warning → ошибка |
| `--no-symlink` | init | копировать скиллы (Windows) |
| `--with-ci` | init | добавить GitHub Actions |

Коды возврата: `0` ок · `1` ошибки валидации · `2` документация устарела ·
`3` ошибка окружения

---

## Загрузка ТЗ

```text
1. кинуть файл в docs/requirements/inbox/
2. /docs-task
```

| Формат | |
|---|---|
| `.docx` | основной сценарий, таблицы и картинки сохраняются |
| `.pdf` `.xlsx` | поддерживаются |
| `.md` `.txt` | как есть |

Номер задачи: имя файла → первые строки текста → спросят.
Оригинал остаётся в `requirements/original/` рядом с конвертированным `.md`.

Другие способы:

```bash
/docs-task DEMO-657 путь/к/файлу.docx   # файл не в inbox
/docs-task DEMO-657                     # откроется $EDITOR
pbpaste | /docs-task DEMO-657           # из буфера
```

---

## Что создаёт `init`

```text
AGENTS.md  CLAUDE.md
.agents/skills/  init task plan do sync check   ← обычные .md файлы
.claude/skills/ → symlinks                       .claude/settings.json (хук)
.repomind/config.yml
docs/  product/ architecture/ contracts/ decisions/ requirements/ tasks/ now/
docs/decisions/README.md + _template.md  ← что такое ADR и болванка
```

Скиллы копируются в проект — дальше они твои: правь, коммить, ревьюй.

---

## Runbook — команды и подсказки

```text
docs/runbook/
├── setup.md            как поднять с нуля
├── daily.md            тесты, линтеры, миграции ← агент берёт команды ОТСЮДА
├── troubleshooting.md  симптом → причина → что делать
└── release.md          порядок выкатки, откат
```

Правило: **в `AGENTS.md` только 3–5 ловушек** (он грузится в каждую сессию),
всё подробное — в runbook, подтягивается по надобности.

Заголовок в troubleshooting — **симптом**, а не название проблемы.
Пополняется реактивно: потратил больше получаса на непонятное — записал.

| Что | Куда |
|---|---|
| ловушка, на которой теряют день | `AGENTS.md` |
| ловушка конкретного модуля | блок в его `architecture/` документе |
| «сломалось, что делать» | `runbook/troubleshooting.md` |
| «почему так сделано» | `decisions/` (ADR) |

---

## Связка с CodeGraph

```text
CodeGraph   ГДЕ код и как связан    ← из кода
RepoMind    ПОЧЕМУ так              ← из головы человека
```

Поднимать отдельно не надо — `/docs-init` сам запустит `codegraph init`
(фоном) и `codegraph install`. Не установлен — покажет команду и пойдёт дальше,
сам ставить не будет.

```bash
npm i -g @colbymchenry/codegraph    # если решил поставить
/docs-init                       # подхватит и настроит
```

**`init` — инспектор, а не установщик.** Запускать на настроенном проекте
безопасно, работает как диагностика:

| Что нашёл | Что делает |
|---|---|
| индекса нет | строит фоном |
| индекс устарел | `codegraph sync`, **не пересборка** |
| индекс свежий, MCP прописан | ничего |
| `enabled: off` в конфиге | уважает выбор, пропускает |
| `.codegraph/` закоммичен | предупредит, команду напечатает, сам не выполнит |

Полная пересборка индекса — только если попросишь явно.

| Что даёт | Команда |
|---|---|
| дешёвый сбор AS IS для `plan` | `codegraph explore "<вопрос>"` |
| задетые документы по графу, а не по маскам | `codegraph impact <symbol>` |
| честная проверка `path#Symbol` в `check` | `codegraph query <symbol>` |

Переиндексация в `sync` идёт **параллельно вызову модели** → по времени
бесплатно. Настройка: `codegraph.reindex_on_sync: parallel`.

Зависимость необязательная — нет индекса, работают маски путей.

---

## Анатомия документа

```md
---
id: PRODUCT-REPORTS
type: product
code_paths:
  - backend/app/report/**
last_verified_commit: 7c3e910
---

## Расход за этап
<!-- block: REPORT.STAGE_EXPENSE -->

Сумма расходов по принятым отчётам за период этапа.
Расчёт: `backend/app/report/services/expenses.py#calc_stage_expense`.
```

**ID документа** — `SCREAMING-KEBAB` · **ID блока** — `SCOPE.NAME` · не переименовываются.

`code_paths` — связь «документ ↔ код». По ней система понимает, что задето.

## Ссылки на код

```text
✅ backend/app/report/services/expenses.py#calc_stage_expense
❌ backend/app/report/services/expenses.py:142
```

Номера строк допустимы **только** внутри `docs/tasks/<ID>/deep-dive.md`.

---

## Состав папки задачи

| Файл | Кто пишет |
|---|---|
| `request.md` | `/docs-task` |
| `deep-dive.md` | `/docs-plan` — разбор + план |
| `estimate.md` | `/docs-plan` — часы |
| `summary.md` | `/docs-plan` — 3 абзаца для людей |
| `progress.md` | `/docs-do` — отмечает по ходу, а не в конце |
| `reviewed: true` | **ты** — в шапке `deep-dive.md` после прочитки |
| `result.md` | `/docs-sync` |

Структура `deep-dive.md`:

```text
Что нужно сделать · Короткий вывод · Как это работает сейчас ·
Рекомендуемая реализация · Что конкретно затронем (+ «не трогаем») ·
Риски · План реализации · Проверка · Файлы
```

---

## Обновлять документацию или нет

| ❌ Не трогать постоянную док-цию | ✅ Обновлять |
|---|---|
| переименование переменной | пользовательское поведение |
| форматирование | API |
| перенос функции без поведения | схема БД |
| опечатка | форматы событий |
| внутренний тест | конфигурация |
| мелкий рефакторинг | способы запуска |
| изменение комментария | архитектурные границы |
| | бизнес-правила |
| | внешние интеграции |
| | требования безопасности |
| | принятое техническое решение |

При обычном рефакторинге достаточно `docs/tasks/<ID>/result.md`.

## ADR — когда создавать

Только на **настоящее решение**: выбор технологии, смена хранилища, отказ от
принятого подхода, осознанная пауза. **Не на рефакторинг.**

Статусы: `proposed` → `accepted` → `superseded` / `rejected` / `on-hold`.
Отменённый ADR не удаляется — меняется статус.

---

## Операции, которые возвращает модель

Модель **не пишет файлы**. Она возвращает JSON:

| `action` | Обязательные поля |
|---|---|
| `replace_block` | `document_id`, `block_id`, `content`, `evidence` |
| `append_block` | `document_id`, `block_id`, `content`, `evidence` |
| `create_document` | `document_id`, `content`, `evidence` |
| `create_adr` | `content` |
| `append_task_result` | `task`, `content` |
| `mark_needs_review` | `document_id`, `block_id`, `reason` |

`status`: `no_changes` · `update_required` · `needs_review`

**Утверждение без `evidence` не применяется.**
Не выводится намерение из кода → `mark_needs_review`, а не догадка.

---

## Что уходит в модель, а что нет

| ✅ Отправляется | ❌ Не отправляется |
|---|---|
| текст задачи | весь репозиторий |
| хунки diff | вся документация |
| сигнатуры изменённых функций | другие задачи |
| **только связанные блоки** | git history |
| текущий deep-dive | |

→ расход токенов зависит от размера **изменения**, а не проекта.

---

## Skill / hook / MCP / субагент

| Механизм | Вопрос | Роль | В v1 |
|---|---|---|:---:|
| Skill | **как** сделать | ядро продукта | ✅ |
| Hook | **когда** запустить | удобство | ⏳ |
| MCP | откуда данные | только Jira/Confluence/GitHub | ⏳ |
| Субагент | кто параллельно | только крупные задачи | ❌ |

⚠️ **`Stop` в Claude Code срабатывает после каждого ответа модели.**
Полный sync туда вешать нельзя.

```text
правка файла   → PostToolUse   → touch .repomind/dirty    бесплатно
задача готова  → TaskCompleted → /docs-sync            1 вызов
перед коммитом → git pre-commit → /docs-check          бесплатно
```

---

## `/docs-check` проверяет (без модели)

уникальность document ID · уникальность block ID · существование
`path#Symbol` · битые markdown-ссылки · ссылки на удалённые файлы ·
обязательные файлы задачи · соответствие JSON Schema · протухший
`last_verified_commit` · слишком большие документы · конфликтующие активные ADR
