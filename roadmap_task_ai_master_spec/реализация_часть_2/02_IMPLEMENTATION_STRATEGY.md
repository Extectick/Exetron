# Implementation Strategy
## Стратегия прохождения `PHASE 11 -> PHASE 20`

## Основной принцип
Разработка должна идти по фазам в порядке `11 -> 20`.
Причина: каждая следующая фаза опирается на операционные, глобализационные или коммерческие предпосылки предыдущих.

## Порядок движения
1. Stabilize
   - `PHASE 11`
2. Globalize
   - `PHASE 12`
3. Expand customer channels
   - `PHASE 13`
   - `PHASE 14`
4. Deepen commerce operations
   - `PHASE 15`
   - `PHASE 16`
   - `PHASE 18`
5. Monetize and package
   - `PHASE 17`
6. Scale organizationally
   - `PHASE 19`
7. Open enterprise and ecosystem layer
   - `PHASE 20`

## Почему именно так
- без `PHASE 11` product fit и production discipline будут слабыми
- без `PHASE 12` online and enterprise layers будут локально зашиты
- без `PHASE 13` нельзя считать платформу unified commerce
- без `PHASE 14` and `PHASE 15` customer experience останется поверхностным
- без `PHASE 16` и `PHASE 17` продукт будет трудно продавать и внедрять
- без `PHASE 18` operational depth будет недостаточной
- `PHASE 19` и `PHASE 20` должны строиться на уже зрелой платформе

## Стратегия итераций внутри фазы
Для каждой фазы идти в одном и том же порядке:
1. domain and data first
2. runtime and API second
3. channel/UI surfaces third
4. integrations, security, async flows fourth
5. tests, docs and operations last

## Стратегия обновления документов
- task board обновляется после каждого существенного куска
- progress tracker обновляется в конце каждой завершенной итерации
- ADR дописывается при стратегическом решении
- prompt templates и protocol используются без локальных отклонений

## Правило переиспользования baseline
Новая фича сначала должна попытаться переиспользовать:
- existing auth and RBAC
- existing tenant/brand/store model
- existing settings and feature flags
- existing payments abstraction
- existing analytics and audit patterns
- existing channel runtimes

Только после этого допускается новый domain layer.

## Definition of phase success
Фаза считается успешно пройденной, если:
- закрыты обязательные deliverables task board;
- acceptance criteria отмечены;
- tracker переведен в актуальное состояние;
- есть phase exit summary;
- известные риски и техдолг зафиксированы.
