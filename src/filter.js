// ═══════════════════════════════════════════════════════
// filters.js — Фильтрация и сортировка таблиц
//
// Хранит активные фильтры и параметры сортировки.
// Экспортирует функции для применения к данным перед отрисовкой.
// ═══════════════════════════════════════════════════════

// ─── Состояние фильтров ──────────────────────────────
// Структура: { columnName: 'значение фильтра', ... }
const activeFilters = {
  projects:  {},  // фильтры таблицы проектов
  employees: {}   // фильтры таблицы сотрудников
};

// ─── Состояние сортировки ────────────────────────────
// { col: 'columnName', dir: 'asc' | 'desc' }
const sortState = {
  projects:  { col: null, dir: null },
  employees: { col: null, dir: null }
};

// ─── Текущий открытый фильтр-попап ──────────────────
// Нужно чтобы знать, к какой таблице/колонке применить фильтр
let currentFilterTarget = null; // { tableKey, colName, isDropdown }


// ════════════════════════════════════════════════════════
// ПРИМЕНЕНИЕ ФИЛЬТРОВ
// ════════════════════════════════════════════════════════

/**
 * Применяет активные фильтры к массиву строк проектов.
 * Возвращает отфильтрованный массив.
 */
function applyProjectFilters(projects) {
  const filters = activeFilters.projects;
  return projects.filter(p => {
    for (const [col, value] of Object.entries(filters)) {
      if (!value) continue;
      const v = value.toLowerCase();
      if (col === 'companyName' && !p.companyName.toLowerCase().includes(v)) return false;
      if (col === 'projectName' && !p.projectName.toLowerCase().includes(v)) return false;
    }
    return true;
  });
}

/**
 * Применяет активные фильтры к массиву сотрудников.
 */
function applyEmployeeFilters(employees) {
  const filters = activeFilters.employees;
  return employees.filter(emp => {
    for (const [col, value] of Object.entries(filters)) {
      if (!value) continue;
      const v = value.toLowerCase();
      if (col === 'name'    && !emp.name.toLowerCase().includes(v))    return false;
      if (col === 'surname' && !emp.surname.toLowerCase().includes(v)) return false;
      // Позиция — точное совпадение (dropdown)
      if (col === 'position' && emp.position !== value) return false;
    }
    return true;
  });
}


// ════════════════════════════════════════════════════════
// ПРИМЕНЕНИЕ СОРТИРОВКИ
// ════════════════════════════════════════════════════════

/**
 * Сортирует массив проектов по текущему sortState.projects.
 * Принимает дополнительный объект financials для сортировки по доходу/capacity.
 *
 * @param {object[]} projects
 * @param {Map}      projectsData — результаты calcAllFinancials
 */
function applyProjectSort(projects, projectsData) {
  const { col, dir } = sortState.projects;
  if (!col || !dir) return [...projects];

  return [...projects].sort((a, b) => {
    let valA, valB;

    switch (col) {
      case 'companyName': valA = a.companyName; valB = b.companyName; break;
      case 'projectName': valA = a.projectName; valB = b.projectName; break;
      case 'budget':      valA = a.budget;      valB = b.budget;      break;
      case 'capacity': {
        // Сортируем по использованной capacity
        const fa = projectsData.get(a.id);
        const fb = projectsData.get(b.id);
        valA = fa ? fa.totalEffective : 0;
        valB = fb ? fb.totalEffective : 0;
        break;
      }
      case 'income': {
        const fa = projectsData.get(a.id);
        const fb = projectsData.get(b.id);
        valA = fa ? fa.projectIncome : 0;
        valB = fb ? fb.projectIncome : 0;
        break;
      }
      default: return 0;
    }

    // Строки сравниваем через localeCompare
    if (typeof valA === 'string') {
      return dir === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    // Числа
    return dir === 'asc' ? valA - valB : valB - valA;
  });
}

/**
 * Сортирует массив сотрудников по текущему sortState.employees.
 */
function applyEmployeeSort(employees, employeesData) {
  const { col, dir } = sortState.employees;
  if (!col || !dir) return [...employees];

  return [...employees].sort((a, b) => {
    let valA, valB;

    switch (col) {
      case 'name':     valA = a.name;    valB = b.name;    break;
      case 'surname':  valA = a.surname; valB = b.surname; break;
      case 'age':      valA = calcAge(a.dob); valB = calcAge(b.dob); break;
      case 'position': valA = a.position; valB = b.position; break;
      case 'salary':   valA = a.salary;  valB = b.salary;  break;
      case 'payment': {
        const ea = employeesData.get(a.id);
        const eb = employeesData.get(b.id);
        valA = ea ? ea.estimatedPayment  : 0;
        valB = eb ? eb.estimatedPayment  : 0;
        break;
      }
      case 'projectedIncome': {
        const ea = employeesData.get(a.id);
        const eb = employeesData.get(b.id);
        valA = ea ? ea.projectedIncome : 0;
        valB = eb ? eb.projectedIncome : 0;
        break;
      }
      default: return 0;
    }

    if (typeof valA === 'string') {
      return dir === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }
    return dir === 'asc' ? valA - valB : valB - valA;
  });
}


// ════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ СОРТИРОВКОЙ — обработка клика по заголовку
// ════════════════════════════════════════════════════════

/**
 * Переключает направление сортировки при клике.
 * Первый клик → asc, второй → desc, третий → сброс.
 *
 * @param {string} tableKey — 'projects' | 'employees'
 * @param {string} col      — название колонки
 * @param {HTMLElement} th  — элемент заголовка
 */
function handleSortClick(tableKey, col, th) {
  const state = sortState[tableKey];

  if (state.col === col) {
    // Та же колонка: asc → desc → null
    if (state.dir === 'asc')  { state.dir = 'desc'; }
    else if (state.dir === 'desc') { state.col = null; state.dir = null; }
  } else {
    // Новая колонка — сбрасываем иконку предыдущей
    if (state.col) {
      const prevTh = document.querySelector(
        `#${tableKey === 'projects' ? 'projectsTable' : 'employeesTable'} th[data-col="${state.col}"]`
      );
      if (prevTh) updateSortIcon(prevTh, null);
    }
    state.col = col;
    state.dir = 'asc';
  }

  updateSortIcon(th, state.dir);
  // После изменения сортировки — перерисовываем таблицу
  renderCurrentTab();
}


// ════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ ФИЛЬТРАМИ
// ════════════════════════════════════════════════════════

/**
 * Открывает попап фильтра у заголовка таблицы.
 *
 * @param {string}      tableKey   — 'projects' | 'employees'
 * @param {string}      colName    — название колонки
 * @param {boolean}     isDropdown — true если фильтр-dropdown (для Position)
 * @param {HTMLElement} filterBtn  — кнопка ⌕ в заголовке
 */
function openFilterPopup(tableKey, colName, isDropdown, filterBtn) {
  const popup    = document.getElementById('filterPopup');
  const input    = document.getElementById('filterInput');
  const select   = document.getElementById('filterSelect');
  const applyBtn = document.getElementById('filterApplyBtn');

  // Запоминаем контекст
  currentFilterTarget = { tableKey, colName, isDropdown };

  // Показываем нужный элемент
  input.classList.toggle('hidden', isDropdown);
  select.classList.toggle('hidden', !isDropdown);

  // Устанавливаем текущее значение фильтра
  const currentValue = activeFilters[tableKey][colName] || '';
  if (isDropdown) {
    select.value = currentValue;
  } else {
    input.value = currentValue;
  }

  // Позиционируем попап рядом с кнопкой
  positionPopupNearButton(popup, filterBtn);
  popup.classList.remove('hidden');

  // Фокус на поле ввода
  setTimeout(() => {
    if (isDropdown) {
      // Dropdown применяется сразу при выборе
      select.onchange = () => applyCurrentFilter(select.value);
    } else {
      input.focus();
      // Enter для применения
      input.onkeydown = e => { if (e.key === 'Enter') applyCurrentFilter(input.value); };
    }
  }, 50);
}

/**
 * Применяет фильтр и закрывает попап.
 */
function applyCurrentFilter(value) {
  if (!currentFilterTarget) return;
  const { tableKey, colName } = currentFilterTarget;

  if (value) {
    activeFilters[tableKey][colName] = value;
  } else {
    delete activeFilters[tableKey][colName];
  }

  closeFilterPopup();
  renderCurrentTab();
  renderFilterChips(tableKey);
}

/**
 * Закрывает попап фильтра.
 */
function closeFilterPopup() {
  const popup = document.getElementById('filterPopup');
  popup.classList.add('hidden');
  currentFilterTarget = null;
}

/**
 * Удаляет один фильтр по колонке.
 */
function removeFilter(tableKey, colName) {
  delete activeFilters[tableKey][colName];
  renderCurrentTab();
  renderFilterChips(tableKey);
}

/**
 * Удаляет все фильтры таблицы.
 */
function clearAllFilters(tableKey) {
  activeFilters[tableKey] = {};
  renderCurrentTab();
  renderFilterChips(tableKey);
}

/**
 * Добавляет или обновляет фильтр программно (например, из "See at..." навигации).
 */
function setFilter(tableKey, colName, value) {
  if (value) {
    activeFilters[tableKey][colName] = value;
  } else {
    delete activeFilters[tableKey][colName];
  }
  renderFilterChips(tableKey);
}


// ════════════════════════════════════════════════════════
// ОТРИСОВКА ЧИПОВ ФИЛЬТРОВ
// ════════════════════════════════════════════════════════

/**
 * Перерисовывает чипы активных фильтров над таблицей.
 *
 * @param {string} tableKey — 'projects' | 'employees'
 */
function renderFilterChips(tableKey) {
  const containerId = tableKey === 'projects' ? 'projectFilterChips' : 'employeeFilterChips';
  const container   = document.getElementById(containerId);
  const filters     = activeFilters[tableKey];

  container.innerHTML = '';

  const entries = Object.entries(filters).filter(([, v]) => v);
  if (entries.length === 0) return;

  // Чип для каждого активного фильтра
  entries.forEach(([col, value]) => {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.innerHTML = `
      ${col}: <strong>${escapeHtml(value)}</strong>
      <button class="chip-remove" title="Remove filter">×</button>
    `;
    chip.querySelector('.chip-remove').addEventListener('click', () => {
      removeFilter(tableKey, col);
    });
    container.appendChild(chip);
  });

  // Кнопка "Clear Filters" появляется при 2+ фильтрах
  if (entries.length >= 2) {
    const clearChip = document.createElement('span');
    clearChip.className = 'filter-chip clear-chip';
    clearChip.textContent = '✕ Clear Filters';
    clearChip.addEventListener('click', () => clearAllFilters(tableKey));
    container.appendChild(clearChip);
  }
}


// ════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ ЗАГОЛОВКОВ ТАБЛИЦ
// ════════════════════════════════════════════════════════

/**
 * Навешивает обработчики на все th с data-sortable и data-filterable.
 * Вызывается один раз при инициализации приложения.
 */
function initTableHeaders() {
  // Проходим по обеим таблицам
  [
    { tableId: 'projectsTable',  tableKey: 'projects'  },
    { tableId: 'employeesTable', tableKey: 'employees' }
  ].forEach(({ tableId, tableKey }) => {
    const table = document.getElementById(tableId);
    if (!table) return;

    table.querySelectorAll('th').forEach(th => {
      const col        = th.dataset.col;
      const sortable   = th.hasAttribute('data-sortable');
      const filterable = th.hasAttribute('data-filterable');
      const isDropdown = th.dataset.filterType === 'dropdown';

      // Клик по th (не по кнопке фильтра) — сортировка
      if (sortable) {
        th.addEventListener('click', e => {
          // Если кликнули на кнопку фильтра — не сортируем
          if (e.target.classList.contains('filter-btn')) return;
          handleSortClick(tableKey, col, th);
        });
      }

      // Клик по кнопке фильтра
      if (filterable) {
        const filterBtn = th.querySelector('.filter-btn');
        if (filterBtn) {
          filterBtn.addEventListener('click', e => {
            e.stopPropagation(); // Не триггерим сортировку
            openFilterPopup(tableKey, col, isDropdown, filterBtn);
          });
        }
      }
    });
  });

  // Кнопки Apply/Cancel в попапе фильтра
  document.getElementById('filterApplyBtn').addEventListener('click', () => {
    const input = document.getElementById('filterInput');
    applyCurrentFilter(input.value);
  });

  document.getElementById('filterCancelBtn').addEventListener('click', () => {
    closeFilterPopup();
  });

  // Клик вне попапа — закрыть
  document.addEventListener('click', e => {
    const popup = document.getElementById('filterPopup');
    if (!popup.classList.contains('hidden') && !popup.contains(e.target)) {
      // Проверяем: не кнопка ли фильтра была нажата (она уже обработана)
      if (!e.target.classList.contains('filter-btn')) {
        closeFilterPopup();
      }
    }
  });
}
