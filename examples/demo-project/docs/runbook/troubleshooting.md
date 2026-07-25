---
id: RUN-TROUBLE
type: runbook
code_paths:
  - docker-compose.yml
  - backend/config/settings.py
  - pdf-service/app/**
last_verified_commit: 7c3e910
---

# Что делать, когда сломалось

Формат каждой записи: **симптом → причина → что делать**.
Дописывай сюда каждый раз, когда потратил больше получаса на непонятное.

## PDF не генерируется, backend отдаёт 502
<!-- block: TROUBLE.PDF_502 -->

**Причина в 9 случаях из 10:** неверный `PDF_SERVICE_URL`.

| Откуда запущен backend | Куда должен смотреть |
|---|---|
| docker → docker | `http://pdf-service:8001` |
| хост → docker | `http://localhost:8001` |
| docker → хост | `http://host.docker.internal:8001` |

Проверить, что сервис вообще жив: `curl http://localhost:8001/health`.

## PDF собрался, но новая колонка пустая
<!-- block: TROUBLE.PDF_EMPTY_COLUMN -->

**Причина:** поле не доехало до шаблона. Ищи по порядку:

1. Поле есть в ответе API? — `curl .../api/v1/stages/1/ | jq .expenses[0]`
2. Поле не отфильтровано в `backend/app/pdf/builders.py#_filter_payload`?
3. В шаблоне ячейка добавлена **во все шесть уровней вложенности**?

Третий пункт — самая частая причина. Колонка есть в первой строке и пропадает
в подстроках.

## Таблица в PDF поехала после добавления колонки
<!-- block: TROUBLE.PDF_LAYOUT -->

**Причина:** сумма процентов ширин колонок больше 100, либо таблица не влезает
в портретную A4.

Пересчитай ширины. Если колонок стало больше пяти — переводи страницу в
альбомную: `@page { size: A4 landscape }` в шапке шаблона.

## Frontend не стартует, `ERR_OSSL_EVP_UNSUPPORTED`
<!-- block: TROUBLE.NODE_VERSION -->

**Причина:** Node 20+, а Nuxt 2 с ним не дружит.

Ставь Node 18. `NODE_OPTIONS=--openssl-legacy-provider` заведёт dev-сервер,
но продакшен-сборка всё равно упадёт — это не решение.

## Значение в принятом этапе «замёрзло» нулём
<!-- block: TROUBLE.SNAPSHOT_ZERO -->

**Причина:** снапшот записался **после** смены статуса, а не до. Сериализатор
к этому моменту уже ушёл в снапшот-ветку и зафиксировал пустоту.

Смотри порядок вызовов в
`backend/app/report/views/stages.py#StageViewSet.set_status`: сначала
`save_snapshot_for_accepted_stage`, потом смена статуса. Обоснование —
[ADR-002](../decisions/ADR-002-snapshot-on-accept.md).

Починить уже испорченные записи: management-команда доливки с `--force`.

## Правка в UI не появилась у старой заявки
<!-- block: TROUBLE.LEGACY_BRANCH -->

**Причина:** заявка legacy, она рендерится **другим компонентом**.

Правка в `ExpensesTable.vue` legacy не затрагивает — там `LegacyForm.vue`,
отдельный роут и отдельный PDF-шаблон. См.
[ARCH-SYSTEM](../architecture/system.md#legacy-ветка).

Это работает в обе стороны: если требование звучит «не показывать в legacy» —
делать ничего не нужно, оно выполняется само.

## Тесты падают локально, в CI зелено
<!-- block: TROUBLE.TESTS_LOCAL -->

**Причина:** запустил на хосте, а не в докере. Нужен Postgres и системные
библиотеки.

```bash
docker compose run --rm backend python manage.py test
```

## Миграция конфликтует после мержа
<!-- block: TROUBLE.MIGRATION_CONFLICT -->

**Причина:** две ветки создали миграции с одинаковым номером.

```bash
docker compose run --rm backend python manage.py makemigrations --merge
```

Если конфликт по смыслу, а не по номеру — удали свою миграцию, подтяни master,
сгенерируй заново.
