# Prompt Templates Part 2

## 1. Session Start
Используй:
- `01_MASTER_TARGET_VISION.md`
- `02_CURRENT_BASELINE_AND_TARGET_GAP.md`
- `03_EVOLUTION_ROADMAP.md`
- `07_AI_ENGINEERING_DIRECTIVE.md`
- `08_AI_SESSION_PROTOCOL.md`
- `реализация_часть_2/01_MASTER_IMPLEMENTATION_SPEC.md`
- `реализация_часть_2/04_PROGRESS_TRACKER.md`

Определи:
- где проект сейчас;
- какая фаза активна;
- что уже переиспользуем из baseline;
- какая следующая минимальная задача логична.

Не перепрыгивай через фазы и не меняй архитектурные решения без ADR.

---

## 2. Phase Planning
Используй task board текущей фазы и progress tracker.
Сначала перечисли:
- scope фазы;
- reusable baseline;
- обязательные deliverables;
- риски смешения scope с соседними фазами.

Потом составь порядок реализации по эпикам:
1. Domain & Data
2. Runtime & API
3. UI/Channel Surfaces
4. Integrations/Security/Async
5. Tests/Docs/Ops

---

## 3. Task Execution
Используй root roadmap docs, progress tracker и task board фазы.
Определи следующую минимальную задачу.
Сначала дай:
- context check
- next step
- plan

Потом реализуй задачу.
В конце обнови:
- `Done`
- `In Progress`
- `Blocked`
- `Next`
- `Phase Exit Summary`
- `04_PROGRESS_TRACKER.md`

---

## 4. Status Update
Используй `04_PROGRESS_TRACKER.md` и task board текущей фазы.
Обнови только фактический статус.
Сделай секции:
1. Что завершено
2. Что в работе
3. Что заблокировано
4. Что дальше
5. Какие решения и риски появились

Не придумывай выполненные задачи.

---

## 5. ADR Creation
Используй:
- `09_ARCHITECTURE_DECISIONS.md`
- текущий phase task board
- root roadmap docs

Определи:
- почему текущее решение стратегическое;
- какой новый ADR номер идет следующим;
- что принято;
- почему это не должно остаться implicit decision.

Добавь новый ADR, не переписывая старые.

---

## 6. Phase Completion Review
Используй:
- task board текущей фазы
- `06_ACCEPTANCE_AND_DOD.md`
- `04_PROGRESS_TRACKER.md`

Проверь:
1. закрыты ли обязательные deliverables;
2. все ли acceptance criteria отмечены;
3. есть ли blockers;
4. готова ли фаза к передаче дальше;
5. что войдет в `Phase Exit Summary`.
