---
id: ARCH-AUTH
type: architecture
code_paths:
  - backend/app/auth/**
last_verified_commit: a91d2f4
---

# Авторизация

## Выдача токена
<!-- block: AUTH.ACCESS_TOKEN -->

Access token выдаётся после проверки логина и пароля.
Основная реализация: `backend/app/auth/service.py#AuthService.login`.

Время жизни — 15 минут. Токен передаётся клиенту в теле ответа и
не сохраняется на сервере.

## Обновление токена
<!-- block: AUTH.REFRESH_TOKEN -->

Refresh token хранится в HTTP-only cookie.
Основная реализация: `backend/app/auth/service.py#AuthService.refresh`.

Время жизни — 30 дней. При каждом обновлении выдаётся новый refresh token,
предыдущий помечается использованным в `backend/app/auth/repository.py#TokenRepository.revoke`.

## Выход
<!-- block: AUTH.LOGOUT -->

При выходе refresh token отзывается, cookie очищается.
Основная реализация: `backend/app/auth/service.py#AuthService.logout`.
