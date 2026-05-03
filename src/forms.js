import { POSITIONS, generateId, calcAge } from './constants.js';
import { getMonthData, saveMonthData } from './storage.js';
import { currentYear, currentMonth } from './state.js';
function renderCurrentTab() {
  document.dispatchEvent(new CustomEvent('app:renderCurrentTab'));
}

// ═══════════════════════════════════════════════════════
// forms.js — Валидация и обработка форм
//
// Содержит:
//  - Правила валидации для каждого поля
//  - Real-time проверку при вводе
//  - Обработчики submit для форм добавления
//  - Inline-редактирование (позиция и зарплата в таблице)
// ═══════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════
// ПРАВИЛА ВАЛИДАЦИИ
// ════════════════════════════════════════════════════════

/**
 * Проверяет одно поле по заданным правилам.
 * Возвращает строку с ошибкой или пустую строку если всё ОК.
 *
 * @param {string} fieldId  — ID поля
 * @param {string} value    — текущее значение
 * @returns {string} сообщение об ошибке или ''
 */
function validateField(fieldId, value) {
  switch (fieldId) {

    // ── Проект ──────────────────────────────────────────
    case 'proj_projectName':
      if (!value.trim()) return 'Project name is required';
      if (value.trim().length < 3) return 'Minimum 3 characters';
      if (!/^[a-zA-Z0-9\s]+$/.test(value.trim())) return 'Only letters, numbers and spaces';
      return '';

    case 'proj_companyName':
      if (!value.trim()) return 'Company name is required';
      if (value.trim().length < 2) return 'Minimum 2 characters';
      if (!/^[a-zA-Z0-9\s]+$/.test(value.trim())) return 'Only letters, numbers and spaces';
      return '';

    case 'proj_budget':
      if (!value) return 'Budget is required';
      if (isNaN(value) || Number(value) <= 0) return 'Must be a positive number';
      return '';

    case 'proj_capacity':
      if (!value) return 'Capacity is required';
      if (!Number.isInteger(Number(value)) || Number(value) < 1) return 'Must be an integer ≥ 1';
      return '';

    // ── Сотрудник ───────────────────────────────────────
    case 'emp_name':
      if (!value.trim()) return 'Name is required';
      if (value.trim().length < 3) return 'Minimum 3 characters';
      if (!/^[a-zA-Z]+$/.test(value.trim())) return 'Letters only';
      return '';

    case 'emp_surname':
      if (!value.trim()) return 'Surname is required';
      if (value.trim().length < 3) return 'Minimum 3 characters';
      if (!/^[a-zA-Z]+$/.test(value.trim())) return 'Letters only';
      return '';

    case 'emp_dob': {
      if (!value) return 'Date of birth is required';
      const age = calcAge(value);
      if (age < 18) return 'Employee must be at least 18 years old';
      return '';
    }

    case 'emp_position':
      if (!value) return 'Position is required';
      return '';

    case 'emp_salary':
      if (!value) return 'Salary is required';
      if (isNaN(value) || Number(value) <= 0) return 'Must be a positive number';
      return '';

    default:
      return '';
  }
}

/**
 * Показывает или скрывает ошибку под полем.
 * Добавляет/убирает класс .invalid на поле.
 *
 * @param {string} fieldId — ID поля (без префикса err_)
 * @param {string} message — текст ошибки ('' = нет ошибки)
 */
function showFieldError(fieldId, message) {
  const field    = document.getElementById(fieldId);
  const errorEl  = document.getElementById('err_' + fieldId);
  if (!field || !errorEl) return;

  errorEl.textContent = message;
  field.classList.toggle('invalid', !!message);
}

/**
 * Проверяет все поля формы и обновляет кнопку Submit.
 * Возвращает true если форма валидна.
 *
 * @param {string[]} fieldIds  — массив ID полей
 * @param {string}   submitId  — ID кнопки submit
 */
function validateForm(fieldIds, submitId) {
  let allValid = true;

  fieldIds.forEach(id => {
    const el    = document.getElementById(id);
    if (!el) return;
    const error = validateField(id, el.value);
    if (error) allValid = false;
    // Не показываем ошибки до первого взаимодействия (только через showFieldError)
  });

  const submitBtn = document.getElementById(submitId);
  if (submitBtn) submitBtn.disabled = !allValid;

  return allValid;
}


// ════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ ФОРМЫ ПРОЕКТА
// ════════════════════════════════════════════════════════

export function initProjectForm() {
  const fieldIds  = ['proj_projectName', 'proj_companyName', 'proj_budget', 'proj_capacity'];
  const submitId  = 'addProjectSubmit';
  const form      = document.getElementById('addProjectForm');

  // Real-time валидация при каждом нажатии клавиши
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // 'input' — срабатывает при любом изменении
    el.addEventListener('input', () => {
      const error = validateField(id, el.value);
      showFieldError(id, error);
      validateForm(fieldIds, submitId);
    });

    // 'blur' — когда пользователь уходит с поля
    el.addEventListener('blur', () => {
      const error = validateField(id, el.value);
      showFieldError(id, error);
      validateForm(fieldIds, submitId);
    });
  });

  // Обработка отправки формы
  form.addEventListener('submit', e => {
    e.preventDefault();

    // Финальная проверка всех полей с показом ошибок
    let allValid = true;
    fieldIds.forEach(id => {
      const el    = document.getElementById(id);
      const error = validateField(id, el.value);
      showFieldError(id, error);
      if (error) allValid = false;
    });

    if (!allValid) return;

    // Создаём объект проекта
    const newProject = {
      id:          generateId(),
      projectName: document.getElementById('proj_projectName').value.trim(),
      companyName: document.getElementById('proj_companyName').value.trim(),
      budget:      parseFloat(parseFloat(document.getElementById('proj_budget').value).toFixed(2)),
      capacity:    parseInt(document.getElementById('proj_capacity').value)
    };

    // Сохраняем в текущий месяц
    const { employees, projects } = getMonthData(currentYear, currentMonth);
    projects.push(newProject);
    saveMonthData(currentYear, currentMonth, employees, projects);

    // Сбрасываем форму и закрываем панель
    resetProjectForm();
    closePanel('addProjectPanel');

    // Обновляем таблицу
    renderCurrentTab();
  });
}

/**
 * Сбрасывает форму проекта в исходное состояние.
 */
export function resetProjectForm() {
  ['proj_projectName', 'proj_companyName', 'proj_budget', 'proj_capacity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('invalid'); }
    const errEl = document.getElementById('err_' + id);
    if (errEl) errEl.textContent = '';
  });
  document.getElementById('addProjectSubmit').disabled = true;
}


// ════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ ФОРМЫ СОТРУДНИКА
// ════════════════════════════════════════════════════════

export function initEmployeeForm() {
  const fieldIds = ['emp_name', 'emp_surname', 'emp_dob', 'emp_position', 'emp_salary'];
  const submitId = 'addEmployeeSubmit';
  const form     = document.getElementById('addEmployeeForm');

  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('input', () => {
      const error = validateField(id, el.value);
      showFieldError(id, error);
      validateForm(fieldIds, submitId);
    });

    el.addEventListener('blur', () => {
      const error = validateField(id, el.value);
      showFieldError(id, error);
      validateForm(fieldIds, submitId);
    });

    // Для select 'change' вместо 'input'
    el.addEventListener('change', () => {
      const error = validateField(id, el.value);
      showFieldError(id, error);
      validateForm(fieldIds, submitId);
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();

    let allValid = true;
    fieldIds.forEach(id => {
      const el    = document.getElementById(id);
      const error = validateField(id, el.value);
      showFieldError(id, error);
      if (error) allValid = false;
    });

    if (!allValid) return;

    const newEmployee = {
      id:           generateId(),
      name:         document.getElementById('emp_name').value.trim(),
      surname:      document.getElementById('emp_surname').value.trim(),
      dob:          document.getElementById('emp_dob').value,
      position:     document.getElementById('emp_position').value,
      salary:       parseFloat(parseFloat(document.getElementById('emp_salary').value).toFixed(2)),
      assignments:  [],
      vacationDays: []
    };

    const { employees, projects } = getMonthData(currentYear, currentMonth);
    employees.push(newEmployee);
    saveMonthData(currentYear, currentMonth, employees, projects);

    resetEmployeeForm();
    closePanel('addEmployeePanel');
    renderCurrentTab();
  });
}

export function resetEmployeeForm() {
  ['emp_name', 'emp_surname', 'emp_dob', 'emp_position', 'emp_salary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = el.tagName === 'SELECT' ? '' : ''; el.classList.remove('invalid'); }
    const errEl = document.getElementById('err_' + id);
    if (errEl) errEl.textContent = '';
  });
  document.getElementById('addEmployeeSubmit').disabled = true;
}


// ════════════════════════════════════════════════════════
// INLINE-РЕДАКТИРОВАНИЕ
// ════════════════════════════════════════════════════════

/**
 * Активирует inline-редактирование позиции сотрудника.
 * Заменяет текст ячейки на <select>.
 *
 * @param {HTMLElement} cell       — td ячейка таблицы
 * @param {string}      employeeId
 * @param {string}      currentPos — текущая позиция
 */
export function activatePositionEdit(cell, employeeId, currentPos) {
  // Уже редактируется?
  if (cell.querySelector('select')) return;

  const select = document.createElement('select');
  select.className = 'inline-select';

  POSITIONS.forEach(pos => {
    const opt      = document.createElement('option');
    opt.value      = pos;
    opt.textContent = pos;
    if (pos === currentPos) opt.selected = true;
    select.appendChild(opt);
  });

  cell.textContent = '';
  cell.appendChild(select);
  select.focus();

  // Сохраняем при выборе или потере фокуса
  const save = () => {
    const newPos = select.value;
    saveEmployeeField(employeeId, 'position', newPos);
    renderCurrentTab();
  };

  select.addEventListener('change', save);
  select.addEventListener('blur', save);
}

/**
 * Активирует inline-редактирование зарплаты сотрудника.
 * Заменяет текст ячейки на <input type="number">.
 *
 * @param {HTMLElement} cell       — td ячейка таблицы
 * @param {string}      employeeId
 * @param {number}      currentSalary
 */
export function activateSalaryEdit(cell, employeeId, currentSalary) {
  if (cell.querySelector('input')) return;

  const input = document.createElement('input');
  input.type      = 'number';
  input.className = 'inline-input';
  input.value     = currentSalary;
  input.min       = '0.01';
  input.step      = '0.01';

  cell.textContent = '';
  cell.appendChild(input);
  input.focus();
  input.select();

  // Сохраняем при потере фокуса или Enter
  const save = () => {
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) {
      saveEmployeeField(employeeId, 'salary', parseFloat(val.toFixed(2)));
    }
    renderCurrentTab();
  };

  const cancel = () => {
    renderCurrentTab(); // Просто перерисовываем без изменений
  };

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { save();   input.blur(); }
    if (e.key === 'Escape') { cancel(); }
  });
}

/**
 * Сохраняет одно поле сотрудника в localStorage.
 *
 * @param {string} employeeId
 * @param {string} field       — 'position' | 'salary'
 * @param {*}      value
 */
function saveEmployeeField(employeeId, field, value) {
  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const emp = employees.find(e => e.id === employeeId);
  if (emp) {
    emp[field] = value;
    saveMonthData(currentYear, currentMonth, employees, projects);
  }
}
