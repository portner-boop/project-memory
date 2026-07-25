---
id: RUN-SETUP
type: runbook
code_paths:
  - docker-compose.yml
  - .env.example
  - backend/requirements*.txt
  - frontend/package.json
  - pdf-service/pyproject.toml
last_verified_commit: 7c3e910
---

# Запуск с нуля

Для человека, который сегодня первый день. Должно занять 20 минут.

## Что нужно поставить заранее
<!-- block: SETUP.PREREQUISITES -->

| | Версия | Проверить |
|---|---|---|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2 | `docker compose version` |
| Node.js | 18 LTS | `node --version` |
| Python | 3.11 | только если поднимаешь backend вне докера |

⚠️ Node 20 и выше **не заводится** с Nuxt 2 — падает на `ERR_OSSL_EVP_UNSUPPORTED`.
Ставь ровно 18. Обход через `NODE_OPTIONS=--openssl-legacy-provider` работает,
но ломает сборку продакшена.

## Первый запуск
<!-- block: SETUP.FIRST_RUN -->

```bash
git clone <repo> && cd <repo>
cp .env.example .env
docker compose up -d postgres
docker compose run --rm backend python manage.py migrate
docker compose run --rm backend python manage.py loaddata fixtures/demo.json
docker compose up
```

Что поднимется:

| Сервис | Адрес |
|---|---|
| frontend | http://localhost:3000 |
| backend | http://localhost:8000 |
| pdf-service | http://localhost:8001 |
| postgres | localhost:5432 |

## Тестовые учётки
<!-- block: SETUP.CREDENTIALS -->

Приезжают вместе с `fixtures/demo.json`:

| Роль | Логин |
|---|---|
| грантополучатель | `applicant@example.local` |
| куратор | `curator@example.local` |

Пароли лежат в `.env.example` рядом с фикстурой. **Только для локальной
разработки** — на стендах учётки другие, спрашивай у команды.

## Переменные окружения
<!-- block: SETUP.ENV -->

Полный список — в `.env.example`, там же комментарии. Важные:

| Переменная | Зачем | Значение локально |
|---|---|---|
| `PDF_SERVICE_URL` | адрес сервиса генерации PDF | `http://pdf-service:8001` |
| `DATABASE_URL` | подключение к БД | из `.env.example` как есть |
| `DEBUG` | подробные ошибки Django | `True` |

⚠️ Если поднимаешь backend **вне докера**, а pdf-service внутри —
`PDF_SERVICE_URL` меняется на `http://localhost:8001`. Из докера в докер —
`http://pdf-service:8001`. Это самая частая причина «PDF не генерируется».

## Проверить, что всё живо
<!-- block: SETUP.SMOKE -->

```bash
curl -s http://localhost:8000/api/v1/health/ | grep ok
curl -s http://localhost:8001/health | grep ok
open http://localhost:3000
```

Зайти куратором, открыть любую заявку, скачать PDF отчёта. Если PDF скачался —
работают все три части сразу, дальше можно не проверять.
