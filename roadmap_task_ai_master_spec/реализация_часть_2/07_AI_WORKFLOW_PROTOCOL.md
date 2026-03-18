# AI Workflow Protocol Part 2
## Протокол работы ИИ для `PHASE 11 -> PHASE 20`

## 1. Обязательный старт каждой сессии
1. Прочитать:
   - `roadmap_task_ai_master_spec/01_MASTER_TARGET_VISION.md`
   - `roadmap_task_ai_master_spec/02_CURRENT_BASELINE_AND_TARGET_GAP.md`
   - `roadmap_task_ai_master_spec/03_EVOLUTION_ROADMAP.md`
   - `roadmap_task_ai_master_spec/07_AI_ENGINEERING_DIRECTIVE.md`
   - `roadmap_task_ai_master_spec/08_AI_SESSION_PROTOCOL.md`
2. Прочитать:
   - `01_MASTER_IMPLEMENTATION_SPEC.md`
   - `03_PHASE_BREAKDOWN.md`
   - `04_PROGRESS_TRACKER.md`
3. Определить активную фазу
4. Открыть task board фазы
5. Выбрать следующую минимальную логичную задачу

## 2. Что ИИ должен сформулировать в начале работы
- где находится проект сейчас;
- какой target state у текущей задачи;
- в какую фазу и волну попадает работа;
- что уже есть в baseline и что будет переиспользовано;
- нужен ли новый ADR.

## 3. Обязательный формат рабочего ответа
## Context Check
- текущая фаза
- что уже сделано
- что осталось

## Next Step
- следующая задача
- почему именно она

## Plan
- шаги реализации

## Deliverable
- что будет создано или изменено

## Acceptance Check
- как проверить завершение

## Status Update
- что обновить в task board и tracker

## 4. Что ИИ не должен делать
- не перепрыгивать через фазы;
- не смешивать scope разных phase boards;
- не редактировать старые ADR как замену новому решению;
- не создавать tenant-specific or country-specific hacks в core;
- не считать задачу завершенной без обновления статуса.

## 5. Когда обязателен новый ADR
Новый ADR обязателен, если решение:
- меняет архитектурный слой;
- добавляет новый стратегический домен;
- меняет customization, localization or entitlement rules;
- влияет на future phases beyond current phase;
- меняет external integration boundary or deployment model.

## 6. Как отмечать прогресс
После каждого завершенного куска работы ИИ обязан:
- перенести завершенные задачи в `Done`;
- убрать их из `In Progress`, если они были там;
- обновить `Next`;
- обновить `04_PROGRESS_TRACKER.md`;
- дописать решения, риски и техдолг;
- при закрытии фазы отметить `Phase Exit Summary`.
