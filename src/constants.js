// ═══════════════════════════════════════════════════════
// constants.js — Общие константы и вспомогательные функции
//
// Этот файл подключается первым.
// Здесь нет никакой бизнес-логики — только данные и утилиты,
// которые используются во всех остальных модулях.
// ═══════════════════════════════════════════════════════

// ─── Должности сотрудников ───────────────────────────
const POSITIONS = ['Junior', 'Middle', 'Senior', 'Lead', 'Architect', 'BO'];

// ─── Названия месяцев (индекс = значение Date.getMonth()) ───
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ─── Минимальная доля зарплаты на «скамейке запасных» ───
// Если сотрудник не назначен ни на один проект, он получает 50% зарплаты.
// Если назначен с capacity < 0.5, мы всё равно платим 0.5 × salary.
const BENCH_FACTOR = 0.5;

// ─── Максимальная нагрузка одного сотрудника ─────────
const MAX_CAPACITY = 1.5;

// ════════════════════════════════════════════════════════
// УТИЛИТЫ — чистые функции без побочных эффектов
// ════════════════════════════════════════════════════════

/**
 * Генерирует простой уникальный ID на основе времени + случайности.
 * Не UUID, но достаточно для localStorage.
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Форматирует число как валюту с 2 знаками после запятой.
 * Пример: 1234.5 → "$1,234.50"
 */
function formatCurrency(value) {
  return '$' + Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Форматирует число с фиксированным количеством знаков.
 * Пример: formatFixed(1.6667, 2) → "1.67"
 */
function formatFixed(value, decimals = 2) {
  return Number(value).toFixed(decimals);
}

/**
 * Вычисляет возраст из даты рождения (строка "YYYY-MM-DD").
 * Учитывает, был ли уже день рождения в этом году.
 */
function calcAge(dob) {
  if (!dob) return 0;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  // Если день рождения ещё не наступил в этом году — вычитаем 1
  const hasHadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthday) age--;
  return age;
}

/**
 * Возвращает ключ месяца для хранилища.
 * Формат: "YYYY-M" (например, "2026-0" для января 2026)
 *
 * @param {number} year  — полный год (2025, 2026, 2027)
 * @param {number} month — индекс месяца (0 = январь, 11 = декабрь)
 */
function monthKey(year, month) {
  return `${year}-${month}`;
}

/**
 * Позиционирует попап рядом с кнопкой, оставаясь в границах viewport.
 *
 * @param {HTMLElement} popup    — элемент попапа
 * @param {HTMLElement} button   — кнопка-якорь
 */
function positionPopupNearButton(popup, button) {
  // Сначала делаем попап видимым, чтобы получить его размеры
  popup.style.visibility = 'hidden';
  popup.classList.remove('hidden');

  const btnRect   = button.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const vw        = window.innerWidth;
  const vh        = window.innerHeight;
  const margin    = 8; // отступ от края экрана

  // Пробуем разместить снизу от кнопки
  let top  = btnRect.bottom + 8;
  let left = btnRect.left;

  // Если не помещается снизу — ставим сверху
  if (top + popupRect.height > vh - margin) {
    top = btnRect.top - popupRect.height - 8;
  }

  // Если уходит за правый край — выравниваем по правому краю кнопки
  if (left + popupRect.width > vw - margin) {
    left = btnRect.right - popupRect.width;
  }

  // Не уходим за левый и верхний края
  left = Math.max(margin, left);
  top  = Math.max(margin, top);

  popup.style.top  = `${top}px`;
  popup.style.left = `${left}px`;
  popup.style.visibility = 'visible';
}

/**
 * Подсвечивает иконку сортировки в нужном направлении.
 *
 * @param {HTMLElement} th        — элемент заголовка <th>
 * @param {'asc'|'desc'|null} dir — направление или null (сброс)
 */
function updateSortIcon(th, dir) {
  const icon = th.querySelector('.sort-icon');
  if (!icon) return;
  icon.textContent = dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '⇅';
  icon.className = 'sort-icon' + (dir ? ` ${dir}` : '');
}

/**
 * Добавляет CSS-класс к числовому значению в зависимости от знака.
 * Возвращает строку с <span class="income-positive/negative">
 */
function coloredAmount(value) {
  const cls = value >= 0 ? 'income-positive' : 'income-negative';
  return `<span class="${cls}">${formatCurrency(value)}</span>`;
}

/**
 * Экранирует HTML-символы, чтобы избежать XSS при вставке пользовательского текста.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
