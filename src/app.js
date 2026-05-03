// app.js — Точка входа приложения

import { currentYear, currentMonth, setCurrentYear, setCurrentMonth } from './state.js';
import { initSampleData } from './storage.js';
import { initUIHandlers, switchTab, renderCurrentTab } from './ui.js';
import { initTableHeaders, renderFilterChips } from './filter.js';
import { initProjectForm, initEmployeeForm, resetProjectForm, resetEmployeeForm, activatePositionEdit, activateSalaryEdit } from './forms.js';
import { initCalendar, openCalendar } from './calendar.js';

// ════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ ПЕРИОДОМ
// ════════════════════════════════════════════════════════

function updatePeriod() {
  setCurrentYear(parseInt(document.getElementById('yearSelect').value));
  setCurrentMonth(parseInt(document.getElementById('monthSelect').value));
  renderCurrentTab();
}

function syncPeriodSelectors() {
  document.getElementById('monthSelect').value = currentMonth;
  document.getElementById('yearSelect').value  = currentYear;
}

// ════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ
// ════════════════════════════════════════════════════════

function init() {
  initSampleData();

  const now = new Date();
  const nowYear  = now.getFullYear();
  const nowMonth = now.getMonth();

  if (nowYear >= 2025 && nowYear <= 2027) {
    setCurrentYear(nowYear);
    setCurrentMonth(nowMonth);
  } else {
    setCurrentYear(2026);
    setCurrentMonth(0);
  }

  syncPeriodSelectors();

  initUIHandlers();
  initTableHeaders();
  initProjectForm();
  initEmployeeForm();
  initCalendar();

  document.addEventListener('app:resetProjectForm', () => resetProjectForm());
  document.addEventListener('app:resetEmployeeForm', () => resetEmployeeForm());
  document.addEventListener('app:renderCurrentTab', () => renderCurrentTab());
  document.addEventListener('app:openCalendar', (e) => openCalendar(e.detail.empId));
  document.addEventListener('app:activatePositionEdit', (e) => activatePositionEdit(e.detail.cell, e.detail.empId, e.detail.current));
  document.addEventListener('app:activateSalaryEdit', (e) => activateSalaryEdit(e.detail.cell, e.detail.empId, e.detail.current));
  document.getElementById('monthSelect').addEventListener('change', updatePeriod);
  document.getElementById('yearSelect').addEventListener('change', updatePeriod);

  switchTab('projects');
  renderCurrentTab();

  renderFilterChips('projects');
  renderFilterChips('employees');
}

document.addEventListener('DOMContentLoaded', init);
