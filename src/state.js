// state.js — Глобальное состояние приложения (текущий период)
// Все модули импортируют отсюда currentYear/currentMonth

export let currentYear  = new Date().getFullYear();
export let currentMonth = new Date().getMonth(); // 0-11

export function setCurrentYear(y)  { currentYear  = y; }
export function setCurrentMonth(m) { currentMonth = m; }
