# RepoMind — шпаргалка

Одна страница. Всё остальное — в [`docs/`](docs/).

---

## Команды

```bash
repomind init                    # каркас docs/, AGENTS.md, CLAUDE.md, skills
repomind task ABSHTRUE-657       # завести задачу
repomind plan ABSHTRUE-657       # план + PM-summary          ← LLM
repomind sync --task ABSHTRUE-657  # обновить документацию    ← LLM
repomind check                   # валидация
repomind index                   # пересобрать _index.json
```

Из агентов:

```text
Claude Code   /docs-plan ABSHTRUE-657     /docs-sync ABSHTRUE-657
Codex         $docs-plan ABSHTRUE-657     $docs-sync ABSHTRUE-657
```

## Флаги, которые реально нужны

| Флаг           | Где    | Смысл                                        |
| -------------- | ------ | -------------------------------------------- |
| `--base <ref>` | plan, sync | база diff, по умолчанию `origin/main`    |
| `--check-only` | sync   | ничего не писать, только сказать что устарело |
| `--dry-run`    | sync   | показать операции модели, не применяя         |
| `--strict`     | check  | warning → ошибка                              |
| `--no-symlink` | init   | копировать skills (Windows)                   |

## Коды возврата

`0` ок · `1` ошибки валидации · `2` документация устарела · `3` ошибка окружения

---

## Анатомия документа

```md
---
id: ARCH-AUTH
type: architecture
code_paths:
  - backend/app/auth/**
last_verified_commit: a91d2f4
---

# Авторизация

## Обновление токена
<!-- block: AUTH.REFRESH_TOKEN -->

Refresh token хранится в HTTP-only cookie.
Основная реализация: `backend/app/auth/service.py#AuthService.refresh`.
```

**ID документа** — `SCREAMING-KEBAB` · **ID блока** — `SCOPE.NAME` · не переименовываются.

## Ссылки на код

```text
✅ backend/app/auth/service.py#AuthService.refresh
❌ backend/app/auth/service.py:142
```

---

## Обновлять документацию или нет

| ❌ Не обновлять постоянную док-цию | ✅ Обновлять                    |
| ---------------------------------- | ------------------------------- |
| переименование переменной          | пользовательское поведение      |
| форматирование                     | API                             |
| перенос функции без поведения      | схема БД                        |
| опечатка                           | форматы событий                 |
| внутренний тест                    | конфигурация                    |
| мелкий рефакторинг                 | способы запуска                 |
| изменение комментария              | архитектурные границы           |
|                                    | бизнес-правила                  |
|                                    | внешние интеграции              |
|                                    | требования безопасности         |
|                                    | принятое техническое решение    |

При обычном рефакторинге достаточно `docs/tasks/<ID>/result.md`.
Постоянные архитектурные документы не трогаются.

## ADR — когда создавать

Только при **реальном архитектурном решении**: выбор технологии, смена
хранилища, отказ от принятого подхода, осознанная пауза.
**Не на каждый рефакторинг.**

Статусы: `proposed` → `accepted` → `superseded` / `rejected` / `on-hold`

---

## Операции, которые возвращает модель

Модель **не пишет файлы**. Она возвращает JSON:

| `action`             | Обязательные поля                          |
| -------------------- | ------------------------------------------ |
| `replace_block`      | `document_id`, `block_id`, `content`, `evidence` |
| `append_block`       | `document_id`, `block_id`, `content`, `evidence` |
| `create_document`    | `document_id`, `content`, `evidence`       |
| `create_adr`         | `content`                                  |
| `append_task_result` | `task`, `content`                          |
| `mark_needs_review`  | `document_id`, `block_id`, `reason`        |

`status`: `no_changes` · `update_required` · `needs_review`

Правило: **утверждение без `evidence` не применяется.**
Не выводится намерение из кода → `mark_needs_review`, не выдумка.

---

## Что уходит в модель, а что нет

| ✅ Отправляется                        | ❌ Не отправляется        |
| -------------------------------------- | ------------------------- |
| Jira-задача                            | весь репозиторий          |
| изменённые фрагменты кода              | вся документация          |
| сигнатуры изменённых классов и функций | все предыдущие задачи     |
| связанные блоки документации           | полный Git history        |
| текущий implementation plan            |                           |

→ расход токенов зависит от размера **изменения**, а не проекта.

---

## Skill / hook / MCP / субагент

| Механизм | Вопрос          | Роль                      | В v1 |
| -------- | --------------- | ------------------------- | :--: |
| Skill    | **как** сделать | ядро продукта             | ✅   |
| Hook     | **когда** запустить | удобство, не ядро     | ⏳   |
| MCP      | откуда данные   | только Jira/Confluence/GitHub | ⏳ |
| Субагент | кто параллельно | только крупные задачи     | ❌   |

⚠️ **`Stop` в Claude Code срабатывает после каждого ответа модели.**
Полный sync туда вешать нельзя — дорого и шумно.

Правильно:

```text
правка файла        → hook помечает .repomind/dirty   (бесплатно, часто)
TaskCompleted / pre-commit / вручную → repomind sync  (дорого, редко)
CI                  → repomind check + sync --check-only
```

---

## Раскладка проекта

```text
AGENTS.md                  ← единственный источник правил
CLAUDE.md                  ← @AGENTS.md, и всё
.agents/skills/<name>/     ← настоящий skill (Codex читает отсюда)
.claude/skills/<name>      ← symlink на него (Claude читает отсюда)
docs/
  _index.json              ← генерируется, не редактируется
  product/ architecture/ contracts/   ← постоянное
  decisions/               ← ADR, append-only
  requirements/original/   ← неизменяемое
  tasks/<JIRA-ID>/         ← временное
  now/current-task.md      ← указатель на активную задачу
```

```bash
mkdir -p .claude/skills
ln -s ../../.agents/skills/docs-sync .claude/skills/docs-sync
```

Лимиты: `AGENTS.md` — 32 KiB на все проектные инструкции ·
`CLAUDE.md` — держать короче ~200 строк.

---

## `repomind check` проверяет (без LLM)

уникальность document ID · уникальность block ID · существование code
references · битые Markdown-ссылки · ссылки на удалённые файлы · наличие
обязательных task-файлов · соответствие JSON Schema · устаревшие
`last_verified_commit` · слишком большие документы · конфликтующие активные решения

---

## Полный цикл одной задачи

```bash
repomind task ABSHTRUE-657 --source docs/requirements/original/ABSHTRUE-657.md
repomind plan ABSHTRUE-657
# ... разработка по implementation-plan.md ...
repomind sync --task ABSHTRUE-657 --base origin/main
repomind check
git diff        # ← человек ревьюит документацию как обычный код
```
