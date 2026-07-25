---
name: docs-task
description: Turn a requirement document into a task folder — convert Word/PDF to markdown, derive the task ID, and set it as the current task. Use when a new requirement, ТЗ or specification arrives and needs to be registered.
---

# docs-task

Заводит задачу из ТЗ. Заменяет `repomind task`, пока CLI нет.

---

## Шаг 1. Найти файл

По порядку, до первого попадания:

1. Пользователь назвал путь — берём его.
2. `docs/requirements/inbox/` — забираем **все** необработанные файлы.
3. Пользователь вставил текст прямо в чат — работаем с ним.

Пусто и текста нет — спроси, где ТЗ.

## Шаг 2. Определить номер задачи

По порядку:

1. **Имя файла** — `ABSHTRUE-657.docx`, `ТЗ ABSHTRUE-657 v2.docx`.
   Шаблон в `.repomind/config.yml` → `task.id_pattern`, по умолчанию
   `[A-Z]+-\d+`.
2. **Первые 20 строк текста** — тот же шаблон.
3. **Спросить.**

## Шаг 3. Конвертировать

| Формат | Как |
|---|---|
| `.md` `.txt` | как есть |
| `.docx` `.pdf` `.xlsx` | `markitdown <файл>`, если доступен |
| нет конвертера | сказать об этом и попросить текст |

Сохрани **оригинал** в `docs/requirements/original/<ID>.<ext>` рядом
с конвертированным `<ID>.md`. Оригинал нужен, потому что конвертация теряет
схемы, сложные объединённые ячейки и правки в режиме рецензирования.

Картинки — в `docs/requirements/original/<ID>.assets/`.

⚠️ **Ничего не переписывай и не «улучшай».** `requirements/original/` — это
то, что попросили, слово в слово. Уточнения пойдут потом в `deep-dive.md`.

## Шаг 4. Создать папку задачи

```text
docs/tasks/<ID>/request.md
```

С шапкой и ссылкой на оригинал:

```md
---
id: TASK-<ID>-REQUEST
type: task
task: <ID>
source: docs/requirements/original/<ID>.md
created_by: docs-task skill
---

# <ID> — <короткое название>

> Сконвертировано из `<ID>.docx`. Оригинал лежит рядом.

## Что нужно сделать

<требования по пунктам, из ТЗ, без домысливания>
```

Пункты нумеруй так же, как в исходном ТЗ, — потом на них удобно ссылаться
из разбора.

## Шаг 5. Сделать задачу текущей

Перезапиши `docs/now/current-task.md`: номер, короткое название, ссылки
на файлы задачи, дата.

## Шаг 6. Прибрать и доложить

- Обработанные файлы из `inbox/` убрать.
- Отчёт:

```text
+ docs/requirements/original/ABSHTRUE-657.docx  оригинал сохранён
+ docs/requirements/original/ABSHTRUE-657.md    конвертировано
+ docs/tasks/ABSHTRUE-657/request.md            12 требований
= docs/now/current-task.md                      обновлено

⚠ В ТЗ есть схема на странице 3 — в markdown она не перенеслась,
  смотри оригинал.

Дальше: /docs-plan ABSHTRUE-657
```

Про потерянное при конвертации **говори явно**. Молчание тут дороже.

---

## Чего НЕ делать

- Не редактировать `requirements/original/`.
- Не додумывать требования, которых в ТЗ нет.
- Не начинать разбор — это работа `/docs-plan`.
- Не заводить несколько задач в одну папку, даже если ТЗ пришло одним файлом.
