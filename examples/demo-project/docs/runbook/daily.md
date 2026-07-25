---
id: RUN-DAILY
type: runbook
code_paths:
  - Makefile
  - backend/manage.py
  - frontend/package.json
  - pdf-service/Makefile
last_verified_commit: 7c3e910
---

# Ежедневные команды

Единственный источник правды по командам. Агент берёт их отсюда, а не угадывает.

## Тесты
<!-- block: DAILY.TESTS -->

```bash
# backend — только в докере, Django 4 требует Postgres
docker compose run --rm backend python manage.py test app.report

# всё сразу
docker compose run --rm backend python manage.py test

# frontend
cd frontend && npm run test:unit

# pdf-service
cd pdf-service && pytest
```

⚠️ Backend-тесты **не запускаются на хосте** — нужен Postgres и системные
библиотеки. Всегда через `docker compose run`.

## Линтеры и форматирование
<!-- block: DAILY.LINT -->

```bash
docker compose run --rm backend ruff check app/
docker compose run --rm backend ruff format app/
cd frontend && npm run lint
cd frontend && npm run lint -- --fix
```

Перед PR должно быть чисто и там, и там.

## Миграции
<!-- block: DAILY.MIGRATIONS -->

```bash
docker compose run --rm backend python manage.py makemigrations app.report
docker compose run --rm backend python manage.py migrate

# проверить, что нет незакоммиченных изменений моделей
docker compose run --rm backend python manage.py makemigrations --check
```

Последняя команда обязательна перед PR — она ловит забытую миграцию.

## Management-команды
<!-- block: DAILY.COMMANDS -->

Все доливки данных по умолчанию в режиме `--dry-run`, пишут только с `--apply`:

```bash
docker compose run --rm backend python manage.py backfill_stage_expense
docker compose run --rm backend python manage.py backfill_stage_expense --apply
```

Сначала всегда прогоняй без `--apply` и смотри количество затронутых записей.

## Проверка PDF локально
<!-- block: DAILY.PDF -->

```bash
cd pdf-service && make run          # поднимет на :8001
```

Затем в `.env` backend: `PDF_SERVICE_URL=http://host.docker.internal:8001`
и перезапустить backend. Скачать PDF отчёта из UI.

Быстрее — дёрнуть сервис напрямую фикстурой, без backend:

```bash
curl -X POST http://localhost:8001/v1/render/report_sections \
  -H 'Content-Type: application/json' \
  -d @pdf-service/tests/fixtures/report_payload.json \
  --output /tmp/out.pdf && open /tmp/out.pdf
```

## Перед коммитом
<!-- block: DAILY.PRE_COMMIT -->

```bash
docker compose run --rm backend python manage.py makemigrations --check
docker compose run --rm backend ruff check app/
docker compose run --rm backend python manage.py test app.<изменённое>
cd frontend && npm run lint && npm run build
repomind check
```

## Сброс окружения
<!-- block: DAILY.RESET -->

Когда всё сломалось и проще снести:

```bash
docker compose down -v          # -v убивает том с базой
docker compose up -d postgres
docker compose run --rm backend python manage.py migrate
docker compose run --rm backend python manage.py loaddata fixtures/demo.json
```
