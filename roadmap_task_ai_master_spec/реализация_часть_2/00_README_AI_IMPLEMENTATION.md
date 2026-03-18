# AI Implementation Pack Part 2
## Документы для ИИ по `PHASE 11 -> PHASE 20`

## Назначение
Этот пакет переводит post-baseline roadmap в исполнимый набор документов для ИИ.

Пакет нужен, чтобы ИИ:
- работал от реального baseline `PHASE 0 -> PHASE 10`;
- не терял связь с target vision из корневого roadmap;
- двигался по фазам `11 -> 20` без пропусков и смешения scope;
- фиксировал статус, решения, техдолг и итог фазы в одном формате.

## Источник истины
Перед любой реализацией ИИ обязан сверяться с файлами в `roadmap_task_ai_master_spec`:
- `01_MASTER_TARGET_VISION.md`
- `02_CURRENT_BASELINE_AND_TARGET_GAP.md`
- `03_EVOLUTION_ROADMAP.md`
- `07_AI_ENGINEERING_DIRECTIVE.md`
- `08_AI_SESSION_PROTOCOL.md`

## Базовый статус проекта на входе
- `PHASE 0 -> PHASE 10` завершены
- реализован baseline на `NestJS + Prisma + PostgreSQL + Redis + Next.js + Expo`
- следующий активный контур: `PHASE 11`
- этот пакет не меняет архитектуру сам по себе, а задает execution layer для ИИ

## Рекомендуемый порядок чтения
1. `01_MASTER_IMPLEMENTATION_SPEC.md`
2. `03_PHASE_BREAKDOWN.md`
3. `04_PROGRESS_TRACKER.md`
4. `09_ARCHITECTURE_DECISIONS.md`
5. task board текущей фазы

## Как использовать пакет
1. Определить текущую фазу в `04_PROGRESS_TRACKER.md`
2. Открыть task board этой фазы
3. Выбрать следующую минимальную логичную задачу
4. Выполнить задачу
5. Обновить:
   - `Done`
   - `In Progress`
   - `Blocked`
   - `Next`
   - `Phase Exit Summary`
   - `04_PROGRESS_TRACKER.md`
6. Если решение стратегическое, дописать новый ADR в `09_ARCHITECTURE_DECISIONS.md`

## Состав пакета
- `01_MASTER_IMPLEMENTATION_SPEC.md` - исполнимое master-ТЗ для post-baseline фаз
- `02_IMPLEMENTATION_STRATEGY.md` - стратегия прохождения фаз и порядок внедрения
- `03_PHASE_BREAKDOWN.md` - краткая разбивка фаз `11 -> 20`
- `04_PROGRESS_TRACKER.md` - единый статусный трекер
- `05_TASK_BOARD_TEMPLATE.md` - обязательный шаблон task board
- `06_ACCEPTANCE_AND_DOD.md` - критерии готовности
- `07_AI_WORKFLOW_PROTOCOL.md` - рабочий протокол ИИ
- `08_PROMPT_TEMPLATES.md` - готовые промпты
- `09_ARCHITECTURE_DECISIONS.md` - продолжение ADR-реестра с `ADR-026`
- `10_PHASE_11_TASK_BOARD.md` - Product Maturity & Production Fit
- `11_PHASE_12_TASK_BOARD.md` - Globalization & Localization
- `12_PHASE_13_TASK_BOARD.md` - Online Commerce
- `13_PHASE_14_TASK_BOARD.md` - Delivery & Fulfillment
- `14_PHASE_15_TASK_BOARD.md` - Loyalty / CRM / Promotions
- `15_PHASE_16_TASK_BOARD.md` - Integrations & Hardware
- `16_PHASE_17_TASK_BOARD.md` - Billing / Plans / Monetization
- `17_PHASE_18_TASK_BOARD.md` - Inventory & Supply
- `18_PHASE_19_TASK_BOARD.md` - Network / Multi-business / White-label
- `19_PHASE_20_TASK_BOARD.md` - Enterprise / Compliance / Ecosystem

## Важные правила
- этот пакет предназначен только для разработки под ИИ
- здесь не фиксируется "сделано", если работа реально не выполнена
- статус фазы обновляется только по факту
- checkbox-стиль единый: `[x]` завершено, `[ ]` не завершено
- active/blocker состояние отражается только в секциях `In Progress` и `Blocked`
