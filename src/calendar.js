// ═══════════════════════════════════════════════════════
// calendar.js — Календарь отпусков
//
// Отвечает за:
//  - Отрисовку календарной сетки для текущего периода
//  - Выбор/снятие дней отпуска кликом
//  - Подсчёт рабочих дней в реальном времени
//  - Форматирование диапазонов отпуска (DD.MM или DD.MM-DD.MM)
//  - Сохранение выбранных дней в объект сотрудника
// ═══════════════════════════════════════════════════════

// Состояние открытого календаря
const calendarState = {
  employeeId:    null,     // ID сотрудника, чей календарь открыт
  selectedDays:  new Set() // Множество выбранных дней (числа 1-31)
};


// ════════════════════════════════════════════════════════
// ОТКРЫТИЕ / ЗАКРЫТИЕ
// ════════════════════════════════════════════════════════

/**
 * Открывает календарь для конкретного сотрудника.
 *
 * @param {string} employeeId — ID сотрудника
 */
function openCalendar(employeeId) {
  const { employees } = getMonthData(currentYear, currentMonth);
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return;

  // Сохраняем состояние
  calendarState.employeeId   = employeeId;
  calendarState.selectedDays = new Set(employee.vacationDays || []);

  // Заголовок: "Availability — Alice Johnson (January 2026)"
  document.getElementById('calendarTitle').textContent =
    `Availability — ${employee.name} ${employee.surname} (${MONTH_NAMES[currentMonth]} ${currentYear})`;

  // Рисуем сетку
  renderCalendarGrid();

  // Открываем модальное окно
  openModal('calendarModal');
}

/**
 * Сохраняет выбранные дни отпуска и закрывает календарь.
 * Пересчитывает все финансы после сохранения.
 */
function saveVacation() {
  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const employee = employees.find(e => e.id === calendarState.employeeId);
  if (!employee) return;

  // Сортируем дни для аккуратного хранения
  employee.vacationDays = Array.from(calendarState.selectedDays).sort((a, b) => a - b);

  saveMonthData(currentYear, currentMonth, employees, projects);

  closeModal('calendarModal');
  renderCurrentTab(); // Обновляем таблицы — изменились расчёты
}


// ════════════════════════════════════════════════════════
// ОТРИСОВКА КАЛЕНДАРНОЙ СЕТКИ
// ════════════════════════════════════════════════════════

/**
 * Строит HTML-сетку календаря и вставляет в modalBody.
 * Также обновляет информацию о рабочих днях.
 */
function renderCalendarGrid() {
  const body = document.getElementById('calendarBody');

  // Определяем первый день месяца (0=Вс, 1=Пн, ..., 6=Сб)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Общее количество дней в месяце
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Сегодняшняя дата — для подсветки "today"
  const today      = new Date();
  const isCurrentMonth =
    today.getFullYear() === currentYear && today.getMonth() === currentMonth;
  const todayDate  = today.getDate();

  // ── Строим HTML ──────────────────────────────────────
  let html = '<div class="calendar-grid">';

  // Заголовки дней недели
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  dayNames.forEach(name => {
    html += `<div class="calendar-day-name">${name}</div>`;
  });

  // Пустые ячейки до первого дня месяца
  for (let i = 0; i < firstDayOfMonth; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  // Ячейки дней
  for (let d = 1; d <= daysInMonth; d++) {
    const date    = new Date(currentYear, currentMonth, d);
    const dow     = date.getDay(); // 0=Вс, 6=Сб
    const weekend = dow === 0 || dow === 6;
    const isToday = isCurrentMonth && d === todayDate;
    const onVac   = calendarState.selectedDays.has(d);

    // Собираем классы CSS
    let classes = 'calendar-day';
    if (weekend) classes += ' weekend';
    if (isToday)  classes += ' today';
    if (onVac)    classes += ' vacation';

    html += `<div class="${classes}" data-day="${d}">${d}</div>`;
  }

  html += '</div>';
  body.innerHTML = html;

  // Навешиваем обработчики кликов на каждый день
  body.querySelectorAll('.calendar-day[data-day]').forEach(cell => {
    cell.addEventListener('click', () => {
      const day = parseInt(cell.dataset.day);
      toggleVacationDay(day, cell);
    });
  });

  // Обновляем счётчик рабочих дней и список дат
  updateWorkingDaysInfo();
}

/**
 * Переключает день: если был в отпуске — убирает, иначе добавляет.
 * Обновляет визуальный класс и информацию о рабочих днях.
 */
function toggleVacationDay(day, cell) {
  if (calendarState.selectedDays.has(day)) {
    calendarState.selectedDays.delete(day);
    cell.classList.remove('vacation');
  } else {
    calendarState.selectedDays.add(day);
    cell.classList.add('vacation');
  }
  updateWorkingDaysInfo();
}


// ════════════════════════════════════════════════════════
// ИНФОРМАЦИЯ О РАБОЧИХ ДНЯХ
// ════════════════════════════════════════════════════════

/**
 * Пересчитывает и отображает:
 *  - Рабочие дни с учётом отпуска / Всего рабочих дней
 *  - Форматированные диапазоны отпускных дней
 */
function updateWorkingDaysInfo() {
  const totalWorking   = countWorkingDaysInMonth(currentYear, currentMonth);
  const vacDays        = Array.from(calendarState.selectedDays).sort((a, b) => a - b);
  const vacWorking     = countVacationWorkingDays(currentYear, currentMonth, vacDays);
  const actualWorking  = totalWorking - vacWorking;

  // Строка "Working Days: X/Y days"
  document.getElementById('workingDaysInfo').textContent =
    `Working Days: ${actualWorking}/${totalWorking} days`;

  // Форматированные диапазоны
  document.getElementById('vacationDisplay').textContent =
    vacDays.length > 0
      ? formatVacationRanges(vacDays, currentYear, currentMonth)
      : 'No vacation days selected';
}


// ════════════════════════════════════════════════════════
// ФОРМАТИРОВАНИЕ ДИАПАЗОНОВ ОТПУСКА
// ════════════════════════════════════════════════════════

/**
 * Преобразует массив дней в строку диапазонов.
 *
 * Правило: Если между двумя рабочими отпускными днями
 * стоят ТОЛЬКО выходные — они считаются одним диапазоном.
 *
 * Примеры:
 *   [3, 4, 5]         → "03.01-05.01"
 *   [10]              → "10.01"
 *   [3, 4, 5, 10]     → "03.01-05.01, 10.01"
 *   [3, 4, 5, 6, 7, 8]→ "03.01-08.01" (6,7 = выходные между 5 и 8)
 *
 * @param {number[]} days  — отсортированные номера дней
 * @param {number}   year
 * @param {number}   month — 0-11
 */
function formatVacationRanges(days, year, month) {
  if (!days || days.length === 0) return '';

  // Форматирует день как "DD.MM"
  const fmt = d => String(d).padStart(2, '0') + '.' + String(month + 1).padStart(2, '0');

  const ranges = [];
  let rangeStart = days[0];
  let rangeEnd   = days[0];

  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1];
    const curr = days[i];

    // Проверяем: все дни между prev и curr — это выходные?
    let allWeekendsBetween = true;
    for (let d = prev + 1; d < curr; d++) {
      const date = new Date(year, month, d);
      if (!isWeekend(date)) {
        allWeekendsBetween = false;
        break;
      }
    }

    if (allWeekendsBetween) {
      // Продолжаем текущий диапазон
      rangeEnd = curr;
    } else {
      // Закрываем предыдущий диапазон
      ranges.push(rangeStart === rangeEnd ? fmt(rangeStart) : `${fmt(rangeStart)}-${fmt(rangeEnd)}`);
      rangeStart = curr;
      rangeEnd   = curr;
    }
  }

  // Добавляем последний диапазон
  ranges.push(rangeStart === rangeEnd ? fmt(rangeStart) : `${fmt(rangeStart)}-${fmt(rangeEnd)}`);

  return ranges.join(', ');
}


// ════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ════════════════════════════════════════════════════════

/**
 * Навешивает обработчик на кнопку "Set Vacation".
 * Вызывается один раз при старте приложения.
 */
function initCalendar() {
  document.getElementById('setVacationBtn').addEventListener('click', saveVacation);
}
