---
name: docs-plan
description: Produce a deep technical breakdown, an hour estimate and a short summary for a Jira task, by reading the real code of the affected modules. Use when starting work on a task ID, or when asked to analyse, estimate or plan a task.
---

# docs-plan

## Purpose

Turn a requirement document into three files a developer can act on
immediately — without reading the whole repository.

## Input

A task ID, e.g. `DEMO-657`. If none is given, read the current task from
`docs/now/current-task.md`.

## Steps

1. Read `docs/tasks/<TASK-ID>/request.md`.
2. Read `docs/_index.json`.
3. From the requirement text, infer which modules are affected.
4. Select **only** documents whose `code_paths` intersect those modules.
   Skip everything else and be ready to state what you skipped and why.
5. Read accepted ADRs in `docs/decisions/` that touch the affected area.
6. **Read the real code.** This is the step that creates the value: open the
   models, serializers, services, components and templates involved. A plan
   built from the requirement alone is worthless.
7. Write `deep-dive.md`, `estimate.md`, `summary.md`.
8. Put `reviewed: false` in the `deep-dive.md` frontmatter and hand it over
   for a human read-through. **Do not start implementing.**

## Handover

The plan is the cheapest place to catch a wrong approach — two pages beat
half a day of reworked code. So end like this:

```text
Разбор готов: docs/tasks/DEMO-657/deep-dive.md
Оценка: 16 часов — docs/tasks/DEMO-657/estimate.md

Прочитай, пожалуйста. Особенно два места:
  • «Короткий вывод» — правильно ли я понял, как это ложится на архитектуру
  • «Риски» №1 и №3 — их стоит проговорить с заказчиком до реализации

Согласен — поставь reviewed: true в шапке, дальше /docs-do.
Что-то не так — правь прямо в файле, я пойду по исправленному.
```

Назови **конкретные места**, которые стоит перечитать внимательно: спорные
допущения, риски, требующие подтверждения заказчиком, места, где пришлось
догадываться. Не «прочитай весь документ».

## Do not

- Do not read documents unrelated to the affected code paths.
- Do not read other tasks' folders.
- Do not modify permanent documentation at this stage.
- Do not invent file paths. Every path you name must exist.

## `deep-dive.md` — required structure

Sections in this exact order:

```text
## Что нужно сделать       requirements as a bullet list, from the request
## Короткий вывод          5-8 numbered claims: how it maps onto the architecture
## Как это работает сейчас AS IS, split by subsystem, with path:line references
## Рекомендуемая реализация numbered parts, each with the code to be written
## Что конкретно затронем  file lists per part + an explicit "не трогаем" list
## Риски                   numbered, each with its consequence
## План реализации         per part, step by step, tests included
## Проверка                commands + a manual end-to-end scenario
## Файлы                   final flat list, new files marked (новый)
```

### Quality bar

- **AS IS with references.** Every claim about current behaviour carries
  `path/to/file.py:120-134`. Inside a task deep-dive line numbers are fine —
  it is a snapshot document. In permanent documentation use `path#Symbol`.
- **Show the code.** In «Рекомендуемая реализация» give the actual function or
  template fragment to be written, not a description of it.
- **«Не трогаем» is mandatory.** List what looks related but must stay
  untouched, and why: dead code, legacy branches, adjacent modules. This
  section saves the most time during implementation and review.
- **Risks are specific.** Not «возможны проблемы с производительностью» but
  «расчёт идёт по prefetch-нутым объектам, N+1 не появляется; закрепить
  `assertNumQueries`».
- **Note what is deliberately out of scope**, with a reference to the
  requirement clause that says so.

## `estimate.md` — required structure

Grouped by part (backend / frontend / other services). Each item:
what is done, then the hours on its own line. Subtotal per part, then total.

Always end with two sections:

- **Ключевые допущения** — assumptions the estimate depends on;
- **Что может увеличить оценку** — named scenarios with their extra hours.

## `summary.md` — required structure

Three short paragraphs in plain language: what changes, what the user gains,
what happens to existing data. Then the total hours as a link to `estimate.md`.

**No file paths, no class names, no technology names.** If a manager cannot
read it aloud in a meeting, rewrite it.

## Verification

```bash
repomind check
```
