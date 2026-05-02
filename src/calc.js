// ═══════════════════════════════════════════════════════
// calc.js — Все финансовые расчёты приложения
//
// Этот модуль содержит ТОЛЬКО чистые функции.
// Никаких обращений к DOM или localStorage здесь нет.
// Функции принимают данные и возвращают результат.
//
// Формулы (согласно требованиям):
//
//  Vacation coefficient:
//    workingDays        = кол-во будних дней в месяце
//    vacationWorkingDays= кол-во отпускных дней, попавших на будни
//    vacationCoeff      = (workingDays - vacationWorkingDays) / workingDays
//
//  Effective capacity (вклад сотрудника в проект):
//    effectiveCapacity  = assignedCapacity × fit × vacationCoeff
//
//  Revenue:
//    usedEffective      = сумма effectiveCapacity всех сотрудников проекта
//    capacityForRevenue = max(projectCapacity, usedEffective)
//    revenuePerUnit     = budget / capacityForRevenue
//    employeeRevenue    = revenuePerUnit × employeeEffectiveCapacity
//
//  Cost:
//    employeeCost       = salary × max(0.5, assignedCapacity)
//    benchCost          = salary × 0.5  (для ненаначенных)
//
//  Profit:
//    profit             = revenue - cost
// ═══════════════════════════════════════════════════════


// ────────────────────────────────────────────────────────
// 1. РАБОЧИЕ ДНИ И ОТПУСКНОЙ КОЭФФИЦИЕНТ
// ────────────────────────────────────────────────────────

/**
 * Возвращает массив всех дат в указанном месяце.
 *
 * @param {number} year
 * @param {number} month — 0-11
 * @returns {Date[]}
 */
function getDaysInMonth(year, month) {
  const days = [];
  // Получаем кол-во дней: day=0 следующего месяца = последний день текущего
  const count = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= count; d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

/**
 * Проверяет, является ли дата выходным днём (суббота или воскресенье).
 */
function isWeekend(date) {
  const dow = date.getDay(); // 0 = воскресенье, 6 = суббота
  return dow === 0 || dow === 6;
}

/**
 * Подсчитывает количество рабочих дней в месяце (без учёта отпуска).
 *
 * @param {number} year
 * @param {number} month — 0-11
 * @returns {number}
 */
function countWorkingDaysInMonth(year, month) {
  return getDaysInMonth(year, month).filter(d => !isWeekend(d)).length;
}

/**
 * Подсчитывает, сколько из переданных отпускных дней попали на рабочие дни.
 *
 * @param {number}   year
 * @param {number}   month
 * @param {number[]} vacationDays — массив чисел дней (1-31)
 * @returns {number}
 */
function countVacationWorkingDays(year, month, vacationDays) {
  if (!vacationDays || vacationDays.length === 0) return 0;
  const vacSet = new Set(vacationDays);
  return getDaysInMonth(year, month).filter(d => {
    return vacSet.has(d.getDate()) && !isWeekend(d);
  }).length;
}

/**
 * Вычисляет отпускной коэффициент сотрудника.
 * Если у сотрудника нет отпуска — коэффициент = 1 (работает полный месяц).
 *
 * @param {number}   year
 * @param {number}   month
 * @param {number[]} vacationDays
 * @returns {number} — значение от 0 до 1
 */
function calcVacationCoeff(year, month, vacationDays) {
  const totalWorking   = countWorkingDaysInMonth(year, month);
  if (totalWorking === 0) return 1; // на всякий случай (если в месяце одни выходные)

  const vacWorking = countVacationWorkingDays(year, month, vacationDays);
  return (totalWorking - vacWorking) / totalWorking;
}


// ────────────────────────────────────────────────────────
// 2. РАСЧЁТЫ ДЛЯ ОДНОГО НАЗНАЧЕНИЯ
// ────────────────────────────────────────────────────────

/**
 * Вычисляет effective capacity одного сотрудника в одном проекте.
 *
 * effectiveCapacity = assignedCapacity × fit × vacationCoeff
 */
function calcEffectiveCapacity(assignedCapacity, fit, vacationCoeff) {
  return assignedCapacity * fit * vacationCoeff;
}

/**
 * Вычисляет стоимость сотрудника для нанимателя (employer cost).
 * Минимум — 0.5 × salary (даже если capacity < 0.5).
 */
function calcEmployeeCost(salary, assignedCapacity) {
  return salary * Math.max(BENCH_FACTOR, assignedCapacity);
}


// ────────────────────────────────────────────────────────
// 3. РАСЧЁТЫ ДЛЯ ПРОЕКТА
// ────────────────────────────────────────────────────────

/**
 * Собирает полную финансовую картину проекта.
 *
 * @param {object}   project  — объект проекта { id, budget, capacity, ... }
 * @param {object[]} employees — все сотрудники текущего месяца
 * @param {number}   year
 * @param {number}   month
 *
 * @returns {object} {
 *   assignedEmployees,   — массив { employee, assignment, effectiveCapacity, cost, revenue, profit }
 *   totalEffective,      — суммарная effective capacity по всем сотрудникам
 *   totalRevenue,        — суммарный доход проекта
 *   totalCost,           — суммарные затраты на сотрудников
 *   projectIncome,       — income = revenue - cost
 *   isOverCapacity       — используется capacity > проектной
 * }
 */
function calcProjectFinancials(project, employees, year, month) {
  // Находим всех сотрудников, назначенных на этот проект
  const assignedEmployees = [];

  employees.forEach(emp => {
    const assignment = emp.assignments.find(a => a.projectId === project.id);
    if (!assignment) return;

    const vacationCoeff  = calcVacationCoeff(year, month, emp.vacationDays);
    const effectiveCap   = calcEffectiveCapacity(assignment.capacity, assignment.fit, vacationCoeff);
    const cost           = calcEmployeeCost(emp.salary, assignment.capacity);

    assignedEmployees.push({
      employee:          emp,
      assignment,
      vacationCoeff,
      effectiveCapacity: effectiveCap,
      cost,
      revenue: 0,  // заполним ниже, когда узнаем revenuePerUnit
      profit:  0
    });
  });

  // Суммарная effective capacity по проекту
  const totalEffective = assignedEmployees.reduce((sum, ae) => sum + ae.effectiveCapacity, 0);

  // Capacity для расчёта дохода = max(projectCapacity, используемое)
  const capacityForRevenue = Math.max(project.capacity, totalEffective);

  // Доход на единицу effective capacity
  const revenuePerUnit = capacityForRevenue > 0
    ? project.budget / capacityForRevenue
    : 0;

  // Заполняем revenue и profit для каждого сотрудника
  assignedEmployees.forEach(ae => {
    ae.revenue = revenuePerUnit * ae.effectiveCapacity;
    ae.profit  = ae.revenue - ae.cost;
  });

  const totalRevenue = assignedEmployees.reduce((sum, ae) => sum + ae.revenue, 0);
  const totalCost    = assignedEmployees.reduce((sum, ae) => sum + ae.cost, 0);

  return {
    assignedEmployees,
    totalEffective,
    totalRevenue,
    totalCost,
    projectIncome:  totalRevenue - totalCost,
    isOverCapacity: totalEffective > project.capacity
  };
}


// ────────────────────────────────────────────────────────
// 4. РАСЧЁТЫ ДЛЯ СОТРУДНИКА
// ────────────────────────────────────────────────────────

/**
 * Вычисляет финансовые показатели одного сотрудника
 * по всем его назначениям.
 *
 * @param {object}   employee — объект сотрудника
 * @param {object[]} projects — все проекты месяца
 * @param {number}   year
 * @param {number}   month
 *
 * @returns {object} {
 *   totalCapacity,     — суммарная назначенная capacity
 *   estimatedPayment,  — сумма, которую платим сотруднику
 *   projectedIncome,   — суммарная прибыль по всем назначениям
 *   assignmentDetails  — детали по каждому проекту
 * }
 */
function calcEmployeeFinancials(employee, projects, year, month) {
  const vacationCoeff = calcVacationCoeff(year, month, employee.vacationDays);

  // Если нет назначений — сотрудник на "скамейке"
  if (!employee.assignments || employee.assignments.length === 0) {
    return {
      totalCapacity:    0,
      estimatedPayment: employee.salary * BENCH_FACTOR,
      projectedIncome:  -(employee.salary * BENCH_FACTOR), // скамейка = убыток
      assignmentDetails: [],
      isBench: true
    };
  }

  // Собираем детали по каждому назначению
  const assignmentDetails = employee.assignments.map(assignment => {
    const project = projects.find(p => p.id === assignment.projectId);
    if (!project) return null;

    // Считаем финансы всего проекта, чтобы узнать revenuePerUnit
    const projectFinancials = calcProjectFinancials(project, [employee], year, month);

    // Находим данные этого сотрудника в расчёте
    const aeData = projectFinancials.assignedEmployees[0];

    // Но revenuePerUnit нужно считать от ВСЕХ сотрудников проекта (не только этого)
    // Поэтому сделаем отдельный вызов... нет, лучше вернём только revenue/cost/profit
    return {
      project,
      assignment,
      vacationCoeff,
      effectiveCapacity: aeData ? aeData.effectiveCapacity : 0,
      cost:    aeData ? aeData.cost    : 0,
      revenue: 0,  // заполним снаружи, когда будем считать с учётом всех
      profit:  0
    };
  }).filter(Boolean);

  const totalCapacity = employee.assignments.reduce((sum, a) => sum + a.capacity, 0);
  const estimatedPayment = employee.assignments.reduce((sum, a) => {
    return sum + calcEmployeeCost(employee.salary, a.capacity);
  }, 0);

  return {
    totalCapacity,
    estimatedPayment,
    projectedIncome:  0, // считается снаружи через calcAllFinancials
    assignmentDetails,
    isBench: false
  };
}


// ────────────────────────────────────────────────────────
// 5. ОБЩИЙ РАСЧЁТ — все проекты и сотрудники вместе
// ────────────────────────────────────────────────────────

/**
 * Главная функция — считает финансы для всего месяца сразу.
 * Именно её результаты используются для заполнения таблиц.
 *
 * @param {object[]} employees
 * @param {object[]} projects
 * @param {number}   year
 * @param {number}   month
 *
 * @returns {object} {
 *   projectsData:  Map<projectId, projectFinancials>,
 *   employeesData: Map<employeeId, employeeFinancials>,
 *   totalEstimatedIncome  — итог под таблицей проектов
 * }
 */
function calcAllFinancials(employees, projects, year, month) {
  // ── 1. Считаем финансы каждого проекта ──────────────
  const projectsData = new Map();

  projects.forEach(project => {
    const financials = calcProjectFinancials(project, employees, year, month);
    projectsData.set(project.id, financials);
  });

  // ── 2. Считаем финансы каждого сотрудника ───────────
  // Для дохода сотрудника нам нужен revenuePerUnit из ПОЛНОГО расчёта проекта
  const employeesData = new Map();

  employees.forEach(emp => {
    const vacationCoeff = calcVacationCoeff(year, month, emp.vacationDays);

    if (!emp.assignments || emp.assignments.length === 0) {
      // Скамейка
      employeesData.set(emp.id, {
        totalCapacity:    0,
        estimatedPayment: emp.salary * BENCH_FACTOR,
        projectedIncome:  -(emp.salary * BENCH_FACTOR),
        assignmentDetails: [],
        isBench: true
      });
      return;
    }

    // Собираем детали по каждому проекту этого сотрудника
    const assignmentDetails = [];
    let estimatedPayment = 0;
    let projectedIncome  = 0;
    let totalCapacity    = 0;

    emp.assignments.forEach(assignment => {
      const project = projects.find(p => p.id === assignment.projectId);
      if (!project) return;

      // Получаем уже посчитанные данные проекта
      const projFinancials = projectsData.get(project.id);
      if (!projFinancials) return;

      // Находим данные этого сотрудника внутри проектных расчётов
      const aeData = projFinancials.assignedEmployees.find(
        ae => ae.employee.id === emp.id
      );
      if (!aeData) return;

      const cost    = aeData.cost;
      const revenue = aeData.revenue;
      const profit  = aeData.profit;

      totalCapacity    += assignment.capacity;
      estimatedPayment += cost;
      projectedIncome  += profit;

      assignmentDetails.push({
        project,
        assignment,
        vacationCoeff,
        effectiveCapacity: aeData.effectiveCapacity,
        cost,
        revenue,
        profit
      });
    });

    employeesData.set(emp.id, {
      totalCapacity,
      estimatedPayment,
      projectedIncome,
      assignmentDetails,
      isBench: false
    });
  });

  // ── 3. Суммарный доход: все проекты минус скамейка ──
  let totalEstimatedIncome = 0;

  // Доход от проектов
  projectsData.forEach(pf => {
    totalEstimatedIncome += pf.projectIncome;
  });

  // Минус расходы на ненаначенных сотрудников (скамейка)
  employees.forEach(emp => {
    const empData = employeesData.get(emp.id);
    if (empData && empData.isBench) {
      totalEstimatedIncome -= emp.salary * BENCH_FACTOR;
    }
  });

  return { projectsData, employeesData, totalEstimatedIncome };
}


// ────────────────────────────────────────────────────────
// 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ПОПАПОВ
// ────────────────────────────────────────────────────────

/**
 * Считает суммарную назначенную capacity сотрудника.
 * Используется чтобы проверить: можно ли ещё назначить?
 */
function calcTotalAssignedCapacity(employee) {
  if (!employee.assignments || employee.assignments.length === 0) return 0;
  return employee.assignments.reduce((sum, a) => sum + a.capacity, 0);
}

/**
 * Предварительный расчёт — что будет с проектом
 * ПОСЛЕ снятия назначения сотрудника.
 * Возвращает { projectIncome } для попапа подтверждения.
 */
function calcProjectIncomeWithout(project, employees, excludeEmpId, year, month) {
  // Временно убираем назначение этого сотрудника
  const modifiedEmployees = employees.map(emp => {
    if (emp.id !== excludeEmpId) return emp;
    return {
      ...emp,
      assignments: emp.assignments.filter(a => a.projectId !== project.id)
    };
  });
  const result = calcProjectFinancials(project, modifiedEmployees, year, month);
  return result.projectIncome;
}
