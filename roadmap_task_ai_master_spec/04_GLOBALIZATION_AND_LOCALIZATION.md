# Globalization and Localization Strategy
## Как превратить текущую платформу в международно готовый продукт

### Дата: 2026-03-18

---

# Что входит в localization / globalization
- UI localization
- content localization
- formatting localization
- regulatory / country localization
- commerce localization

# Что должно появиться
- localization service;
- translation registry;
- locale resolution service;
- currency/tax policy layer;
- country profile model;
- localized template rendering.

# Минимум следующей фазы
- централизованный i18n подход для web/mobile;
- locale and language preferences;
- multilingual catalog fields;
- locale-aware formatters;
- country and currency config model;
- translation fallback strategy;
- localized notifications/templates foundation.

# Запрещенные ошибки
- хардкодить тексты в компонентах и backend responses;
- привязывать одну валюту ко всему tenant без модели контекста;
- считать, что taxes одинаковы для всех стран;
- смешивать localization и branding в одну сущность;
- делать разные if/else по странам по всему коду без country policy layer.
