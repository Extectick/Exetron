# Acceptance Criteria and Definition of Done Part 2

## Цель
Унифицировать критерии завершения задач и фаз для post-baseline roadmap.

## 1. DoD для задачи
Задача завершена, если:
- есть конкретный deliverable;
- deliverable соответствует scope текущей фазы;
- обозначено, что именно переиспользовано из baseline;
- проверены acceptance criteria;
- обновлены task board и progress tracker;
- зафиксированы ограничения и следующий шаг.

## 2. DoD для фичи
Фича завершена, если:
- описаны domain boundaries;
- описаны API, async или integration contracts;
- edge cases и failure modes не пропущены;
- не нарушены multi-tenant, localization и entitlement assumptions;
- понятно, как фича ложится в future phases.

## 3. DoD для фазы
Фаза завершена, если:
- все обязательные эпики закрыты;
- секция `Phase Exit Summary` отмечена;
- в `04_PROGRESS_TRACKER.md` отражен фактический статус;
- нет критических blockers;
- при необходимости создан новый ADR.

## 4. Формат acceptance criteria
Критерии должны быть:
- проверяемыми;
- короткими;
- без двусмысленности;
- привязанными к поведению, контракту или статусу документа.

Примеры:
- хорошо: `Определена country profile model без tenant-specific branches`
- хорошо: `Сформулирован refund flow поверх existing payments abstraction`
- плохо: `Система стала лучше`

## 5. Чеклист завершения итерации
- [ ] Прочитаны root roadmap docs
- [ ] Прочитан phase task board
- [ ] Прочитан progress tracker
- [ ] Выбрана следующая минимальная задача
- [ ] Deliverable реально создан
- [ ] Acceptance criteria проверены
- [ ] Task board обновлен
- [ ] Progress tracker обновлен
- [ ] Решения, риски и техдолг зафиксированы
