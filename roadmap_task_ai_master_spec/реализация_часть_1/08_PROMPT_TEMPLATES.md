# Prompt Templates

## 1. Запуск нового этапа
Используй master spec, phase breakdown и progress tracker.
Сначала определи активный этап, перечисли незавершенные задачи и предложи лучший порядок реализации.
Потом составь план этапа, deliverables, риски и acceptance criteria.
Не перепрыгивай через этапы и не меняй архитектурные решения без явной фиксации.

---

## 2. Реализация подэтапа
Используй master spec, phase breakdown, progress tracker и task board текущего этапа.
Определи следующую минимальную логичную задачу.
Сначала дай краткий анализ и план.
Потом реализуй задачу.
В конце обнови статусы:
- Done
- In Progress
- Blocked
- Next
И зафиксируй решения и техдолг.

---

## 3. Обновление статуса проекта
Используй progress tracker и task board.
Проанализируй что завершено, что в работе, что заблокировано.
Обнови текущий этап, общий прогресс, done/in progress/blocked/next и решения.
Не придумывай выполненные задачи, отмечай только то, что реально завершено.

---

## 4. Проверка готовности этапа
Используй phase breakdown, acceptance criteria и progress tracker.
Проверь, можно ли считать этап завершенным.
Сделай 4 секции:
1. Что готово
2. Что не готово
3. Что блокирует завершение
4. Можно ли переходить дальше

---

## 5. Генерация задач для sprint
На основе master spec, phase breakdown и progress tracker сформируй sprint backlog для текущего этапа.
Разбей задачи на:
- backend
- frontend
- data model
- api
- tests
- docs
Для каждой задачи укажи:
- цель
- deliverable
- dependencies
- acceptance criteria
