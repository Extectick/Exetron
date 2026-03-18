# Monetization and Licensing Model
## Как продукт должен зарабатывать и как это влияет на архитектуру

### Дата: 2026-03-18

---

# Подходящие модели монетизации
- subscription by tenant
- per store pricing
- per device pricing
- per module pricing
- usage-based pricing
- setup / onboarding fee
- custom work / enterprise services
- reseller / partner / franchise model

# Тарифные уровни
## Starter
- одна точка
- базовые продажи
- ограниченное число устройств

## Growth
- multi-store
- kiosk
- kitchen/board
- richer analytics
- branded UI
- delivery basic

## Pro / Network
- advanced org model
- loyalty
- storefront
- advanced reporting
- advanced rules
- integration packs

## Enterprise
- SSO
- advanced security
- premium support
- custom integrations
- dedicated options later

# Необходимые сущности
- plan
- subscription
- entitlement
- usage record
- invoice
- billing account
- add-on
- reseller account
- contract profile

# Вывод для ИИ
Новые модули нужно проектировать так, чтобы потом можно было ответить:
- можно ли это продавать отдельно?
- можно ли это включать по тарифу?
- можно ли это ограничить по количеству?
- можно ли это открыть только части клиентов?
- можно ли это вынести как premium/enterprise capability?
