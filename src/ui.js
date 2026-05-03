// ═══════════════════════════════════════════════════════
// ui.js — Отрисовка таблиц и всех попапов
//
// Этот файл — самый большой. Он отвечает за:
//  - Рендер таблицы проектов
//  - Рендер таблицы сотрудников
//  - Попап "Show Employees" (сотрудники проекта)
//  - Попап "Show Assignments" (назначения сотрудника)
//  - Попап назначения (Assign) со слайдерами
//  - Попап редактирования назначения (Edit)
//  - Попап подтверждения снятия (Unassign)
//  - Попап удаления (Delete)
//  - Попап Seed Data
//  - Контекстное меню ссылок (Action Menu)
//  - Управление модальными окнами (open/close)
//  - Управление slide-in панелями
// ═══════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ
// ════════════════════════════════════════════════════════

/**
 * Открывает модальное окно и показывает backdrop.
 * @param {string} modalId — ID элемента модалки
 */
function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

/**
 * Закрывает модальное окно.
 * Backdrop скрывается только если нет других открытых модалок.
 */
function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');

  // Проверяем: есть ли ещё открытые модалки?
  const anyOpen = document.querySelectorAll(
    '.modal:not(.hidden), .assign-popup:not(.hidden)'
  ).length > 0;

  if (!anyOpen) {
    document.getElementById('modalBackdrop').classList.add('hidden');
  }
}

/**
 * Закрывает все модальные окна и backdrop.
 */
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('assignPopup').classList.add('hidden');
  document.getElementById('modalBackdrop').classList.add('hidden');
}

// ════════════════════════════════════════════════════════
// УПРАВЛЕНИЕ SLIDE-IN ПАНЕЛЯМИ
// ════════════════════════════════════════════════════════

/**
 * Открывает выезжающую панель (добавление проекта/сотрудника).
 */
function openPanel(panelId) {
  document.getElementById(panelId).classList.add('open');
  document.getElementById('panelBackdrop').classList.remove('hidden');
}

/**
 * Закрывает панель.
 */
function closePanel(panelId) {
  document.getElementById(panelId).classList.remove('open');
  document.getElementById('panelBackdrop').classList.add('hidden');
}


// ════════════════════════════════════════════════════════
// РЕНДЕР ТАБЛИЦЫ ПРОЕКТОВ
// ════════════════════════════════════════════════════════

/**
 * Перерисовывает таблицу проектов с учётом фильтров и сортировки.
 * Также обновляет строку Total Estimated Income.
 */
function renderProjectsTable() {
  const { employees, projects } = getMonthData(currentYear, currentMonth);

  // Считаем все финансы за раз
  const { projectsData, totalEstimatedIncome } = calcAllFinancials(
    employees, projects, currentYear, currentMonth
  );

  // Применяем фильтры и сортировку
  let displayProjects = applyProjectFilters(projects);
  displayProjects     = applyProjectSort(displayProjects, projectsData);

  const tbody = document.getElementById('projectsTableBody');

  if (displayProjects.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          No projects found. Add your first project!
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = displayProjects.map(p => buildProjectRow(p, projectsData)).join('');
  }

  // Обновляем итоговую строку
  const totalEl = document.getElementById('totalIncomeValue');
  totalEl.textContent = formatCurrency(totalEstimatedIncome);
  totalEl.className = 'total-income-value ' +
    (totalEstimatedIncome >= 0 ? 'income-positive' : 'income-negative');

  // Навешиваем обработчики на новые строки
  attachProjectRowHandlers();
}

/**
 * Строит HTML одной строки таблицы проектов.
 *
 * @param {object} project
 * @param {Map}    projectsData — результат calcAllFinancials
 */
function buildProjectRow(project, projectsData) {
  const pf = projectsData.get(project.id) || {
    totalEffective: 0, projectIncome: 0,
    assignedEmployees: [], isOverCapacity: false
  };

  // Capacity: "использовано/всего"
  const usedCap   = parseFloat(pf.totalEffective.toFixed(2));
  const totalCap  = project.capacity;
  const capClass  = pf.isOverCapacity ? 'capacity-over' : '';
  const capStr    = `<span class="${capClass}">${usedCap}/${totalCap}</span>`;

  // Кнопка Show Employees с количеством
  const empCount  = pf.assignedEmployees.length;
  const empBtn    = `<button class="btn btn-sm btn-secondary show-employees-btn"
    data-project-id="${project.id}">
    Show Employees (${empCount})
  </button>`;

  // Доход
  const incomeHtml = coloredAmount(pf.projectIncome);

  return `
    <tr data-project-id="${project.id}">
      <td>${escapeHtml(project.companyName)}</td>
      <td>${escapeHtml(project.projectName)}</td>
      <td>${formatCurrency(project.budget)}</td>
      <td>${capStr}</td>
      <td>${empBtn}</td>
      <td>${incomeHtml}</td>
      <td>
        <button class="btn btn-sm btn-danger delete-project-btn"
          data-project-id="${project.id}"
          data-project-name="${escapeHtml(project.projectName)}">
          Delete
        </button>
      </td>
    </tr>`;
}

/**
 * Навешивает обработчики на кнопки в таблице проектов.
 * Вызывается после каждой перерисовки.
 */
function attachProjectRowHandlers() {
  // Show Employees
  document.querySelectorAll('.show-employees-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openProjectEmployeesModal(btn.dataset.projectId);
    });
  });

  // Delete Project
  document.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmDeleteProject(btn.dataset.projectId, btn.dataset.projectName);
    });
  });
}


// ════════════════════════════════════════════════════════
// РЕНДЕР ТАБЛИЦЫ СОТРУДНИКОВ
// ════════════════════════════════════════════════════════

/**
 * Перерисовывает таблицу сотрудников.
 */
function renderEmployeesTable() {
  const { employees, projects } = getMonthData(currentYear, currentMonth);

  const { employeesData } = calcAllFinancials(employees, projects, currentYear, currentMonth);

  let displayEmps = applyEmployeeFilters(employees);
  displayEmps     = applyEmployeeSort(displayEmps, employeesData);

  const tbody = document.getElementById('employeesTableBody');

  if (displayEmps.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          No employees found. Add your first employee!
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = displayEmps.map(emp =>
      buildEmployeeRow(emp, employeesData.get(emp.id))
    ).join('');
  }

  attachEmployeeRowHandlers(employees);
}

/**
 * Строит HTML одной строки таблицы сотрудников.
 */
function buildEmployeeRow(emp, empData) {
  if (!empData) return '';

  const age        = calcAge(emp.dob);
  const totalCap   = empData.totalCapacity;
  const atMax      = totalCap >= MAX_CAPACITY;

  // Кнопка Projects/Assignments
  const assignCount = emp.assignments.length;
  const assignBtn   = assignCount > 0
    ? `<button class="btn btn-sm btn-secondary show-assignments-btn"
        data-emp-id="${emp.id}">
        Show Assignments (${assignCount}) ${parseFloat(totalCap.toFixed(2))}/${MAX_CAPACITY}
       </button>`
    : `<span class="text-muted" style="font-size:12px">Not assigned</span>`;

  // Кнопка Assign — disabled если capacity ≥ 1.5
  const assignDisabled = atMax ? 'disabled title="Max capacity reached"' : '';

  return `
    <tr data-emp-id="${emp.id}">
      <td>${escapeHtml(emp.name)}</td>
      <td>${escapeHtml(emp.surname)}</td>
      <td>${age}</td>
      <td>
        <span class="editable-cell position-cell"
          data-emp-id="${emp.id}"
          data-current="${escapeHtml(emp.position)}">
          ${escapeHtml(emp.position)}
        </span>
      </td>
      <td>
        <span class="editable-cell salary-cell"
          data-emp-id="${emp.id}"
          data-current="${emp.salary}">
          ${formatCurrency(emp.salary)}
        </span>
      </td>
      <td>${coloredAmount(empData.estimatedPayment)}</td>
      <td>${assignBtn}</td>
      <td>${coloredAmount(empData.projectedIncome)}</td>
      <td class="row-actions">
        <button class="btn btn-xs btn-secondary availability-btn"
          data-emp-id="${emp.id}">📅</button>
        <button class="btn btn-xs btn-primary assign-btn"
          data-emp-id="${emp.id}" ${assignDisabled}>
          Assign
        </button>
        <button class="btn btn-xs btn-danger delete-emp-btn"
          data-emp-id="${emp.id}"
          data-emp-name="${escapeHtml(emp.name + ' ' + emp.surname)}">
          Del
        </button>
      </td>
    </tr>`;
}

/**
 * Навешивает обработчики на строки таблицы сотрудников.
 */
function attachEmployeeRowHandlers(allEmployees) {
  // Inline-редактирование позиции
  document.querySelectorAll('.position-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      activatePositionEdit(cell, cell.dataset.empId, cell.dataset.current);
    });
  });

  // Inline-редактирование зарплаты
  document.querySelectorAll('.salary-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      activateSalaryEdit(cell, cell.dataset.empId, parseFloat(cell.dataset.current));
    });
  });

  // Show Assignments
  document.querySelectorAll('.show-assignments-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openEmployeeAssignmentsModal(btn.dataset.empId);
    });
  });

  // Availability (календарь)
  document.querySelectorAll('.availability-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openCalendar(btn.dataset.empId);
    });
  });

  // Assign
  document.querySelectorAll('.assign-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      openAssignPopup(btn.dataset.empId, btn);
    });
  });

  // Delete Employee
  document.querySelectorAll('.delete-emp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmDeleteEmployee(btn.dataset.empId, btn.dataset.empName);
    });
  });
}


// ════════════════════════════════════════════════════════
// ПОПАП: СОТРУДНИКИ ПРОЕКТА (Show Employees)
// ════════════════════════════════════════════════════════

/**
 * Открывает попап со списком сотрудников проекта.
 */
function openProjectEmployeesModal(projectId) {
  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const { projectsData } = calcAllFinancials(employees, projects, currentYear, currentMonth);
  const pf = projectsData.get(projectId);

  document.getElementById('projectEmployeesTitle').textContent =
    `${project.projectName} — ${project.companyName}`;

  const body = document.getElementById('projectEmployeesBody');

  if (!pf || pf.assignedEmployees.length === 0) {
    body.innerHTML = '<p class="empty-state">No employees assigned to this project.</p>';
  } else {
    // Сортируем по имени
    const sorted = [...pf.assignedEmployees].sort((a, b) =>
      (a.employee.name + a.employee.surname).localeCompare(b.employee.name + b.employee.surname)
    );

    body.innerHTML = `
      <table class="popup-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Capacity</th>
            <th>Fit</th>
            <th>Vacation Days</th>
            <th>Effective Cap.</th>
            <th>Revenue</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(ae => buildProjectEmployeeRow(ae, project, employees)).join('')}
        </tbody>
      </table>`;
  }

  openModal('projectEmployeesModal');
  attachProjectEmployeeModalHandlers(projectId);
}

/**
 * Строит строку таблицы в попапе сотрудников проекта.
 */
function buildProjectEmployeeRow(ae, project, employees) {
  const emp     = ae.employee;
  const vacDays = emp.vacationDays ? emp.vacationDays.length : 0;

  return `
    <tr>
      <td>
        <button class="btn-link emp-link"
          data-emp-id="${emp.id}"
          data-project-id="${project.id}">
          ${escapeHtml(emp.name)} ${escapeHtml(emp.surname)}
        </button>
      </td>
      <td>${parseFloat(ae.assignment.capacity.toFixed(2))}</td>
      <td>${parseFloat(ae.assignment.fit.toFixed(2))}</td>
      <td>${vacDays}</td>
      <td>${ae.effectiveCapacity.toFixed(3)}</td>
      <td>${coloredAmount(ae.revenue)}</td>
      <td>${formatCurrency(ae.cost)}</td>
      <td>${coloredAmount(ae.profit)}</td>
      <td class="row-actions">
        <button class="btn btn-xs btn-secondary edit-assign-btn"
          data-emp-id="${emp.id}"
          data-project-id="${project.id}">
          Edit
        </button>
        <button class="btn btn-xs btn-danger unassign-btn"
          data-emp-id="${emp.id}"
          data-project-id="${project.id}">
          Unassign
        </button>
      </td>
    </tr>`;
}

/**
 * Навешивает обработчики внутри попапа сотрудников проекта.
 */
function attachProjectEmployeeModalHandlers(projectId) {
  const body = document.getElementById('projectEmployeesBody');

  body.querySelectorAll('.edit-assign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditAssignmentModal(btn.dataset.empId, btn.dataset.projectId);
    });
  });

  body.querySelectorAll('.unassign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openUnassignModal(btn.dataset.empId, btn.dataset.projectId, 'project');
    });
  });

  // Ссылки на имена сотрудников — открывают контекстное меню
  body.querySelectorAll('.emp-link').forEach(link => {
    link.addEventListener('click', e => {
      e.stopPropagation();
      openActionMenu(e, link.dataset.empId, link.dataset.projectId, 'fromProject');
    });
  });
}


// ════════════════════════════════════════════════════════
// ПОПАП: НАЗНАЧЕНИЯ СОТРУДНИКА (Show Assignments)
// ════════════════════════════════════════════════════════

/**
 * Открывает попап со списком назначений сотрудника.
 */
function openEmployeeAssignmentsModal(employeeId) {
  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return;

  const { employeesData } = calcAllFinancials(employees, projects, currentYear, currentMonth);
  const empData = employeesData.get(employeeId);

  document.getElementById('employeeAssignmentsTitle').textContent =
    `${emp.name} ${emp.surname} — Assignments`;

  const body = document.getElementById('employeeAssignmentsBody');

  if (!empData || empData.assignmentDetails.length === 0) {
    body.innerHTML = '<p class="empty-state">No assignments for this employee.</p>';
  } else {
    const vacDays = emp.vacationDays ? emp.vacationDays.length : 0;

    body.innerHTML = `
      <table class="popup-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Capacity</th>
            <th>Fit</th>
            <th>Vacation Days</th>
            <th>Effective Cap.</th>
            <th>Revenue</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${empData.assignmentDetails.map(det =>
            buildEmployeeAssignmentRow(det, emp, vacDays)
          ).join('')}
        </tbody>
      </table>`;
  }

  openModal('employeeAssignmentsModal');
  attachEmployeeAssignmentModalHandlers(employeeId);
}

function buildEmployeeAssignmentRow(det, emp, vacDays) {
  const project = det.project;
  return `
    <tr>
      <td>
        <button class="btn-link proj-link"
          data-project-id="${project.id}"
          data-emp-id="${emp.id}">
          ${escapeHtml(project.projectName)}
        </button>
      </td>
      <td>${parseFloat(det.assignment.capacity.toFixed(2))}</td>
      <td>${parseFloat(det.assignment.fit.toFixed(2))}</td>
      <td>${vacDays}</td>
      <td>${det.effectiveCapacity.toFixed(3)}</td>
      <td>${coloredAmount(det.revenue)}</td>
      <td>${formatCurrency(det.cost)}</td>
      <td>${coloredAmount(det.profit)}</td>
      <td class="row-actions">
        <button class="btn btn-xs btn-secondary edit-assign-btn"
          data-emp-id="${emp.id}"
          data-project-id="${project.id}">
          Edit
        </button>
        <button class="btn btn-xs btn-danger unassign-btn"
          data-emp-id="${emp.id}"
          data-project-id="${project.id}">
          Unassign
        </button>
      </td>
    </tr>`;
}

function attachEmployeeAssignmentModalHandlers(employeeId) {
  const body = document.getElementById('employeeAssignmentsBody');

  body.querySelectorAll('.edit-assign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditAssignmentModal(btn.dataset.empId, btn.dataset.projectId);
    });
  });

  body.querySelectorAll('.unassign-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openUnassignModal(btn.dataset.empId, btn.dataset.projectId, 'employee');
    });
  });

  body.querySelectorAll('.proj-link').forEach(link => {
    link.addEventListener('click', e => {
      e.stopPropagation();
      openActionMenu(e, link.dataset.empId, link.dataset.projectId, 'fromEmployee');
    });
  });
}


// ════════════════════════════════════════════════════════
// ПОПАП НАЗНАЧЕНИЯ (Assign со слайдерами)
// ════════════════════════════════════════════════════════

// Хранит обработчики событий scroll/resize для удаления при закрытии
let assignPopupScrollHandler  = null;
let assignPopupResizeHandler  = null;
let assignPopupTriggerBtn     = null; // кнопка, открывшая попап

/**
 * Открывает попап назначения у кнопки Assign.
 *
 * @param {string}      employeeId
 * @param {HTMLElement} triggerBtn — кнопка, рядом с которой открываем
 */
function openAssignPopup(employeeId, triggerBtn) {
  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return;

  assignPopupTriggerBtn = triggerBtn;

  const totalAssigned  = calcTotalAssignedCapacity(emp);
  const availableForNew = parseFloat((MAX_CAPACITY - totalAssigned).toFixed(2));

  // Проекты, на которые сотрудник ещё не назначен
  const unassignedProjects = projects.filter(p =>
    !emp.assignments.find(a => a.projectId === p.id)
  );

  const popup = document.getElementById('assignPopup');

  if (unassignedProjects.length === 0) {
    document.getElementById('assignPopupBody').innerHTML = `
      <div class="assign-popup-body">
        <p class="text-muted">All projects are already assigned to this employee.</p>
        <div style="text-align:right;margin-top:12px">
          <button class="btn btn-secondary btn-sm" id="assignCancelBtn">Close</button>
        </div>
      </div>`;
  } else {
    buildAssignPopupContent(emp, unassignedProjects, totalAssigned, availableForNew, projects);
  }

  // Позиционируем попап и показываем
  popup.classList.remove('hidden');
  document.getElementById('modalBackdrop').classList.remove('hidden');
  positionPopupNearButton(popup, triggerBtn);

  // Слушаем scroll и resize чтобы перепозиционировать
  assignPopupScrollHandler = () => positionPopupNearButton(popup, triggerBtn);
  assignPopupResizeHandler  = () => positionPopupNearButton(popup, triggerBtn);
  window.addEventListener('scroll',  assignPopupScrollHandler, true);
  window.addEventListener('resize',  assignPopupResizeHandler);

  // Обработчик кнопки Cancel
  const cancelBtn = document.getElementById('assignCancelBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeAssignPopup);
}

/**
 * Строит содержимое попапа назначения со слайдерами.
 */
function buildAssignPopupContent(emp, unassignedProjects, totalAssigned, availableForNew, allProjects) {
  const body = document.getElementById('assignPopupBody');

  // Начальные значения слайдеров
  const initCap = Math.min(0.5, availableForNew);
  const initFit = 0.8;

  body.innerHTML = `
    <div class="assign-popup-body">

      <div class="capacity-info">
        <span>Current: <strong>${parseFloat(totalAssigned.toFixed(2))}/${MAX_CAPACITY}</strong></span>
        <span>Available: <strong>${availableForNew}</strong></span>
      </div>

      <div class="form-group">
        <label class="form-label" style="font-size:12px;font-weight:600">Project</label>
        <select class="form-select" id="assignProjectSelect" style="font-size:13px;padding:7px">
          ${unassignedProjects.map(p =>
            `<option value="${p.id}">${escapeHtml(p.projectName)} (${escapeHtml(p.companyName)})</option>`
          ).join('')}
        </select>
        <div id="assignProjectInfo" class="text-muted" style="font-size:11px;margin-top:4px"></div>
      </div>

      <div class="slider-group">
        <div class="slider-label">
          <span>Capacity</span>
          <span class="slider-value" id="assignCapValue">${initCap.toFixed(1)}</span>
        </div>
        <input type="range" id="assignCapSlider"
          min="0" max="${MAX_CAPACITY}" step="0.1"
          value="${initCap}" />
      </div>

      <div class="slider-group">
        <div class="slider-label">
          <span>Project Fit</span>
          <span class="slider-value" id="assignFitValue">${initFit.toFixed(1)}</span>
        </div>
        <input type="range" id="assignFitSlider"
          min="0" max="1" step="0.1"
          value="${initFit}" />
      </div>

      <div id="assignCalcInfo" style="font-size:12px;color:var(--color-text-muted)"></div>
      <div id="assignValidationMsg"></div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
        <button class="btn btn-secondary btn-sm" id="assignCancelBtn">Cancel</button>
        <button class="btn btn-primary btn-sm" id="assignConfirmBtn">Assign</button>
      </div>
    </div>`;

  // Обновляем информацию о проекте и расчёты в реальном времени
  const updateInfo = () => {
    const cap      = parseFloat(document.getElementById('assignCapSlider').value);
    const fit      = parseFloat(document.getElementById('assignFitSlider').value);
    const projId   = document.getElementById('assignProjectSelect').value;
    const project  = allProjects.find(p => p.id === projId);

    document.getElementById('assignCapValue').textContent = cap.toFixed(1);
    document.getElementById('assignFitValue').textContent = fit.toFixed(1);

    if (project) {
      // Текущий used capacity проекта
      const { projectsData } = calcAllFinancials(
        getMonthData(currentYear, currentMonth).employees,
        allProjects, currentYear, currentMonth
      );
      const pf = projectsData.get(project.id);
      const currentUsed = pf ? pf.totalEffective : 0;

      document.getElementById('assignProjectInfo').textContent =
        `Project capacity: ${parseFloat(currentUsed.toFixed(2))}/${project.capacity} used`;

      // Effective capacity с vacation коэффициентом
      const { employees } = getMonthData(currentYear, currentMonth);
      const emp2 = employees.find(e => e.id === emp.id);
      const vacCoeff = calcVacationCoeff(currentYear, currentMonth, emp2 ? emp2.vacationDays : []);
      const effective = calcEffectiveCapacity(cap, fit, vacCoeff);

      document.getElementById('assignCalcInfo').innerHTML = `
        <div class="info-row">
          <span class="info-label">Effective capacity</span>
          <span class="info-value">${effective.toFixed(3)} (${cap}×${fit}×${vacCoeff.toFixed(2)})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Predicted total capacity</span>
          <span class="info-value">${(totalAssigned + cap).toFixed(2)}/${MAX_CAPACITY}</span>
        </div>`;
    }

    // Валидация
    const msgEl    = document.getElementById('assignValidationMsg');
    const newTotal = totalAssigned + parseFloat(document.getElementById('assignCapSlider').value);
    const project2 = allProjects.find(p => p.id === document.getElementById('assignProjectSelect').value);

    msgEl.innerHTML = '';

    if (newTotal > MAX_CAPACITY) {
      msgEl.innerHTML = `<div class="error-text">
        Employee capacity will exceed ${MAX_CAPACITY} (would be ${newTotal.toFixed(2)})
      </div>`;
      document.getElementById('assignConfirmBtn').disabled = true;
    } else {
      document.getElementById('assignConfirmBtn').disabled = false;

      // Предупреждение о превышении capacity проекта (не блокирует)
      if (project2) {
        const { projectsData: pd2 } = calcAllFinancials(
          getMonthData(currentYear, currentMonth).employees,
          allProjects, currentYear, currentMonth
        );
        const pf2 = pd2.get(project2.id);
        const capAfter = (pf2 ? pf2.totalEffective : 0) +
          parseFloat(document.getElementById('assignCapSlider').value);

        if (capAfter > project2.capacity) {
          msgEl.innerHTML = `<div class="warning-text">
            ⚠ Project will be over capacity (${capAfter.toFixed(2)}/${project2.capacity})
          </div>`;
        }
      }
    }
  };

  // Слушаем изменения слайдеров и выбора проекта
  document.getElementById('assignCapSlider').addEventListener('input', updateInfo);
  document.getElementById('assignFitSlider').addEventListener('input', updateInfo);
  document.getElementById('assignProjectSelect').addEventListener('change', updateInfo);

  // Кнопка подтверждения
  document.getElementById('assignConfirmBtn').addEventListener('click', () => {
    const cap    = parseFloat(document.getElementById('assignCapSlider').value);
    const fit    = parseFloat(document.getElementById('assignFitSlider').value);
    const projId = document.getElementById('assignProjectSelect').value;
    doAssign(emp.id, projId, cap, fit);
  });

  document.getElementById('assignCancelBtn').addEventListener('click', closeAssignPopup);

  // Первоначальное обновление информации
  updateInfo();
}

/**
 * Выполняет назначение сотрудника на проект и сохраняет.
 */
function doAssign(employeeId, projectId, capacity, fit) {
  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return;

  // Добавляем назначение
  emp.assignments.push({ projectId, capacity, fit });
  saveMonthData(currentYear, currentMonth, employees, projects);

  closeAssignPopup();
  renderCurrentTab();
}

/**
 * Закрывает попап назначения и очищает слушатели.
 */
function closeAssignPopup() {
  document.getElementById('assignPopup').classList.add('hidden');
  document.getElementById('modalBackdrop').classList.add('hidden');

  // Удаляем слушатели позиционирования
  if (assignPopupScrollHandler) {
    window.removeEventListener('scroll', assignPopupScrollHandler, true);
    assignPopupScrollHandler = null;
  }
  if (assignPopupResizeHandler) {
    window.removeEventListener('resize', assignPopupResizeHandler);
    assignPopupResizeHandler = null;
  }
}


// ════════════════════════════════════════════════════════
// ПОПАП РЕДАКТИРОВАНИЯ НАЗНАЧЕНИЯ
// ════════════════════════════════════════════════════════

/**
 * Открывает попап редактирования capacity и fit для существующего назначения.
 */
function openEditAssignmentModal(employeeId, projectId) {
  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const emp     = employees.find(e => e.id === employeeId);
  const project = projects.find(p => p.id === projectId);
  const assign  = emp ? emp.assignments.find(a => a.projectId === projectId) : null;

  if (!emp || !project || !assign) return;

  const otherCapacity = emp.assignments
    .filter(a => a.projectId !== projectId)
    .reduce((sum, a) => sum + a.capacity, 0);
  const maxCap = parseFloat((MAX_CAPACITY - otherCapacity).toFixed(2));

  const body = document.getElementById('editAssignmentBody');
  body.innerHTML = `
    <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:16px">
      <strong>${escapeHtml(emp.name)} ${escapeHtml(emp.surname)}</strong>
      → ${escapeHtml(project.projectName)}
    </p>

    <div class="slider-group">
      <div class="slider-label">
        <span>Capacity</span>
        <span class="slider-value" id="editCapValue">${assign.capacity.toFixed(1)}</span>
      </div>
      <input type="range" id="editCapSlider"
        min="0" max="${maxCap}" step="0.1"
        value="${assign.capacity}" />
    </div>

    <div class="slider-group" style="margin-top:14px">
      <div class="slider-label">
        <span>Project Fit</span>
        <span class="slider-value" id="editFitValue">${assign.fit.toFixed(1)}</span>
      </div>
      <input type="range" id="editFitSlider"
        min="0" max="1" step="0.1"
        value="${assign.fit}" />
    </div>

    <div id="editValidationMsg" style="margin-top:12px"></div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
      <button class="btn btn-secondary" data-close-modal="editAssignmentModal">Cancel</button>
      <button class="btn btn-primary" id="editAssignSaveBtn">Save</button>
    </div>`;

  // Обновление значений при движении слайдеров
  document.getElementById('editCapSlider').addEventListener('input', e => {
    document.getElementById('editCapValue').textContent = parseFloat(e.target.value).toFixed(1);
  });
  document.getElementById('editFitSlider').addEventListener('input', e => {
    document.getElementById('editFitValue').textContent = parseFloat(e.target.value).toFixed(1);
  });

  // Сохранение
  document.getElementById('editAssignSaveBtn').addEventListener('click', () => {
    const newCap = parseFloat(document.getElementById('editCapSlider').value);
    const newFit = parseFloat(document.getElementById('editFitSlider').value);

    assign.capacity = newCap;
    assign.fit      = newFit;
    saveMonthData(currentYear, currentMonth, employees, projects);

    closeModal('editAssignmentModal');
    renderCurrentTab();

    // Обновляем открытые детальные попапы
    const projModal = document.getElementById('projectEmployeesModal');
    if (!projModal.classList.contains('hidden')) openProjectEmployeesModal(projectId);

    const empModal = document.getElementById('employeeAssignmentsModal');
    if (!empModal.classList.contains('hidden')) openEmployeeAssignmentsModal(employeeId);
  });

  openModal('editAssignmentModal');
}


// ════════════════════════════════════════════════════════
// ПОПАП ПОДТВЕРЖДЕНИЯ СНЯТИЯ НАЗНАЧЕНИЯ
// ════════════════════════════════════════════════════════

// Запоминаем контекст для кнопки Confirm
let unassignContext = null;

/**
 * Открывает попап с финансовыми деталями перед снятием назначения.
 *
 * @param {string} employeeId
 * @param {string} projectId
 * @param {string} source — 'project' | 'employee' (откуда открыт)
 */
function openUnassignModal(employeeId, projectId, source) {
  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const emp     = employees.find(e => e.id === employeeId);
  const project = projects.find(p => p.id === projectId);
  const assign  = emp ? emp.assignments.find(a => a.projectId === projectId) : null;

  if (!emp || !project || !assign) return;

  // Текущие финансы
  const { projectsData, employeesData } = calcAllFinancials(
    employees, projects, currentYear, currentMonth
  );
  const pf      = projectsData.get(projectId);
  const empData = employeesData.get(employeeId);
  const aeData  = pf ? pf.assignedEmployees.find(ae => ae.employee.id === employeeId) : null;

  // Будущий доход проекта (без этого сотрудника)
  const incomeAfter = calcProjectIncomeWithout(project, employees, employeeId, currentYear, currentMonth);

  const body = document.getElementById('unassignBody');
  body.innerHTML = `
    <div class="financial-row">
      <span>Employee</span>
      <strong>${escapeHtml(emp.name)} ${escapeHtml(emp.surname)}</strong>
    </div>
    <div class="financial-row">
      <span>Project</span>
      <strong>${escapeHtml(project.projectName)}</strong>
    </div>
    <hr class="divider">
    <div class="financial-row">
      <span>Assigned Capacity</span>
      <span>${assign.capacity.toFixed(2)}</span>
    </div>
    <div class="financial-row">
      <span>Salary Share (salary × capacity)</span>
      <span>${formatCurrency(emp.salary * assign.capacity)}</span>
    </div>
    <div class="financial-row">
      <span>Budget Share</span>
      <span>${aeData ? formatCurrency(aeData.revenue) : '—'}</span>
    </div>
    <div class="financial-row">
      <span>Employee Income (this assignment)</span>
      <span class="${aeData && aeData.profit >= 0 ? 'text-success' : 'text-danger'}">
        ${aeData ? formatCurrency(aeData.profit) : '—'}
      </span>
    </div>
    <hr class="divider">
    <div class="financial-row">
      <span>Project Income (before)</span>
      <span class="${pf && pf.projectIncome >= 0 ? 'text-success' : 'text-danger'}">
        ${pf ? formatCurrency(pf.projectIncome) : '—'}
      </span>
    </div>
    <div class="financial-row">
      <span>Project Income (after unassign)</span>
      <span class="${incomeAfter >= 0 ? 'text-success' : 'text-danger'}">
        ${formatCurrency(incomeAfter)}
      </span>
    </div>`;

  unassignContext = { employeeId, projectId, source };
  openModal('unassignModal');
}

/**
 * Выполняет снятие назначения после подтверждения.
 */
function doUnassign() {
  if (!unassignContext) return;
  const { employeeId, projectId, source } = unassignContext;

  const { employees, projects } = getMonthData(currentYear, currentMonth);
  const emp = employees.find(e => e.id === employeeId);
  if (emp) {
    emp.assignments = emp.assignments.filter(a => a.projectId !== projectId);
    saveMonthData(currentYear, currentMonth, employees, projects);
  }

  closeModal('unassignModal');
  renderCurrentTab();

  // Обновляем открытые детальные попапы
  if (source === 'project') {
    const modal = document.getElementById('projectEmployeesModal');
    if (!modal.classList.contains('hidden')) openProjectEmployeesModal(projectId);
  } else {
    const modal = document.getElementById('employeeAssignmentsModal');
    if (!modal.classList.contains('hidden')) openEmployeeAssignmentsModal(employeeId);
  }

  unassignContext = null;
}


// ════════════════════════════════════════════════════════
// УДАЛЕНИЕ ПРОЕКТА И СОТРУДНИКА
// ════════════════════════════════════════════════════════

let deleteCallback = null; // Функция, вызываемая при подтверждении

function confirmDeleteProject(projectId, projectName) {
  document.getElementById('deleteModalMessage').textContent =
    `Delete project "${projectName}"? All employee assignments will be removed.`;

  deleteCallback = () => {
    const { employees, projects } = getMonthData(currentYear, currentMonth);

    // Снимаем всех сотрудников с этого проекта
    employees.forEach(emp => {
      emp.assignments = emp.assignments.filter(a => a.projectId !== projectId);
    });

    const updatedProjects = projects.filter(p => p.id !== projectId);
    saveMonthData(currentYear, currentMonth, employees, updatedProjects);

    closeModal('deleteModal');
    renderCurrentTab();
  };

  openModal('deleteModal');
}

function confirmDeleteEmployee(employeeId, employeeName) {
  document.getElementById('deleteModalMessage').textContent =
    `Delete employee "${employeeName}"? They will be unassigned from all projects.`;

  deleteCallback = () => {
    const { employees, projects } = getMonthData(currentYear, currentMonth);
    const updatedEmployees = employees.filter(e => e.id !== employeeId);
    saveMonthData(currentYear, currentMonth, updatedEmployees, projects);

    closeModal('deleteModal');
    renderCurrentTab();
  };

  openModal('deleteModal');
}


// ════════════════════════════════════════════════════════
// ПОПАП SEED DATA
// ════════════════════════════════════════════════════════

/**
 * Открывает попап выбора месяца-источника для копирования данных.
 */
function openSeedModal() {
  const currentKey  = monthKey(currentYear, currentMonth);
  const available   = getAvailableMonthKeys(currentKey);
  const { employees: curEmps, projects: curProjs } = getMonthData(currentYear, currentMonth);
  const body        = document.getElementById('seedModalBody');

  if (available.length === 0) {
    body.innerHTML = '<p class="empty-state">No other months with data available.</p>';
  } else {
    body.innerHTML = available.map(key => {
      // Парсим ключ "2026-3" → year=2026, month=3
      const [y, m]   = key.split('-').map(Number);
      const data      = getMonthData(y, m);
      const { totalEstimatedIncome } = calcAllFinancials(
        data.employees, data.projects, y, m
      );
      const incomeClass = totalEstimatedIncome >= 0 ? 'text-success' : 'text-danger';

      return `
        <div class="seed-month-item">
          <div class="seed-month-info">
            <div class="seed-month-name">${MONTH_NAMES[m]} ${y}</div>
            <div class="seed-month-stats">
              ${data.projects.length} projects · ${data.employees.length} employees
            </div>
            <div class="${incomeClass}" style="font-size:12px;font-weight:600">
              ${formatCurrency(totalEstimatedIncome)}
            </div>
          </div>
          <button class="btn btn-primary btn-sm seed-confirm-btn"
            data-source-key="${key}"
            data-source-label="${MONTH_NAMES[m]} ${y}">
            Seed
          </button>
        </div>`;
    }).join('');
  }

  openModal('seedModal');

  // Обработчики кнопок Seed
  body.querySelectorAll('.seed-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const label  = btn.dataset.sourceLabel;
      const target = `${MONTH_NAMES[currentMonth]} ${currentYear}`;
      const ok     = confirm(
        `Copy data from ${label} to ${target}?

Vacation days will be cleared.`
      );
      if (!ok) return;

      seedDataFromMonth(btn.dataset.sourceKey, currentYear, currentMonth);
      closeModal('seedModal');
      renderCurrentTab();
    });
  });
}


// ════════════════════════════════════════════════════════
// КОНТЕКСТНОЕ МЕНЮ (Action Menu для ссылок)
// ════════════════════════════════════════════════════════

let actionMenuContext = null;

/**
 * Открывает контекстное меню у ссылки на сотрудника/проект.
 *
 * @param {MouseEvent} e
 * @param {string} employeeId
 * @param {string} projectId
 * @param {string} source — 'fromProject' | 'fromEmployee'
 */
function openActionMenu(e, employeeId, projectId, source) {
  const menu    = document.getElementById('actionMenu');
  const seeBtn  = document.getElementById('actionSeeAt');
  const unBtn   = document.getElementById('actionUnassign');

  actionMenuContext = { employeeId, projectId, source };

  // Текст зависит от того, откуда открыт попап
  if (source === 'fromProject') {
    seeBtn.textContent = '👁 See at Employees';
  } else {
    seeBtn.textContent = '👁 See at Projects';
  }

  // Позиционируем меню у клика
  menu.style.top  = `${e.clientY}px`;
  menu.style.left = `${e.clientX}px`;
  menu.classList.remove('hidden');
}

/**
 * Выполняет навигацию "See at ..." — переключает таб и применяет фильтр.
 */
function doSeeAt() {
  if (!actionMenuContext) return;
  const { employeeId, projectId, source } = actionMenuContext;

  closeActionMenu();
  closeAllModals();

  const { employees, projects } = getMonthData(currentYear, currentMonth);

  if (source === 'fromProject') {
    // Из попапа проекта → идём на вкладку Employees, фильтруем по имени
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      switchTab('employees');
      // Очищаем старые фильтры
      activeFilters.employees = {};
      setFilter('employees', 'name', emp.name);
      setFilter('employees', 'surname', emp.surname);
      renderCurrentTab();
      renderFilterChips('employees');
    }
  } else {
    // Из попапа сотрудника → идём на вкладку Projects, фильтруем по имени проекта
    const project = projects.find(p => p.id === projectId);
    if (project) {
      switchTab('projects');
      activeFilters.projects = {};
      setFilter('projects', 'projectName', project.projectName);
      renderCurrentTab();
      renderFilterChips('projects');
    }
  }
}

function closeActionMenu() {
  document.getElementById('actionMenu').classList.add('hidden');
  actionMenuContext = null;
}


// ════════════════════════════════════════════════════════
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ════════════════════════════════════════════════════════

let currentTab = 'projects'; // 'projects' | 'employees'

/**
 * Переключает активную вкладку и перерисовывает контент.
 * @param {string} tab — 'projects' | 'employees'
 */
function switchTab(tab) {
  currentTab = tab;

  // Обновляем активный стиль табов в сайдбаре
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  // Показываем нужную секцию
  document.getElementById('projectsSection').classList.toggle('hidden', tab !== 'projects');
  document.getElementById('employeesSection').classList.toggle('hidden', tab !== 'employees');
}

/**
 * Перерисовывает активную вкладку.
 * Вызывается после любого изменения данных.
 */
function renderCurrentTab() {
  if (currentTab === 'projects') {
    renderProjectsTable();
  } else {
    renderEmployeesTable();
  }
}


// ════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ UI-ОБРАБОТЧИКОВ
// ════════════════════════════════════════════════════════

/**
 * Навешивает все "статичные" обработчики (один раз при старте).
 */
function initUIHandlers() {

  // ── Закрытие модалок по кнопкам [data-close-modal] ───
  document.addEventListener('click', e => {
    if (e.target.dataset.closeModal) {
      closeModal(e.target.dataset.closeModal);
    }
    if (e.target.dataset.close) {
      closePanel(e.target.dataset.close);
    }
  });

  // ── Клик по backdrop — закрыть всё ──────────────────
  document.getElementById('modalBackdrop').addEventListener('click', () => {
    // Не закрываем assign-popup через backdrop (он имеет свой обработчик)
    const assignPopup = document.getElementById('assignPopup');
    if (!assignPopup.classList.contains('hidden')) {
      closeAssignPopup();
      return;
    }
    closeAllModals();
  });

  document.getElementById('panelBackdrop').addEventListener('click', () => {
    // Закрываем открытую slide-in панель
    document.querySelectorAll('.slide-panel.open').forEach(p => {
      closePanel(p.id);
    });
  });

  // ── Кнопка подтверждения удаления ────────────────────
  document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
    if (deleteCallback) deleteCallback();
  });

  // ── Кнопка подтверждения Unassign ────────────────────
  document.getElementById('unassignConfirmBtn').addEventListener('click', doUnassign);

  // ── Кнопка Assign в попапе закрывает его ─────────────
  document.getElementById('assignPopupClose').addEventListener('click', closeAssignPopup);

  // ── Кнопки открытия панелей ───────────────────────────
  document.getElementById('addProjectBtn').addEventListener('click', () => {
    resetProjectForm();
    openPanel('addProjectPanel');
  });

  document.getElementById('addEmployeeBtn').addEventListener('click', () => {
    resetEmployeeForm();
    openPanel('addEmployeePanel');
  });

  // ── Seed Data ─────────────────────────────────────────
  document.getElementById('seedDataBtn').addEventListener('click', openSeedModal);

  // ── Action Menu ───────────────────────────────────────
  document.getElementById('actionSeeAt').addEventListener('click', doSeeAt);
  document.getElementById('actionUnassign').addEventListener('click', () => {
    if (actionMenuContext) {
      const { employeeId, projectId, source } = actionMenuContext;
      closeActionMenu();
      openUnassignModal(employeeId, projectId,
        source === 'fromProject' ? 'project' : 'employee');
    }
  });

  // Клик вне action-menu — закрывает его
  document.addEventListener('click', e => {
    const menu = document.getElementById('actionMenu');
    if (!menu.classList.contains('hidden') && !menu.contains(e.target)) {
      closeActionMenu();
    }
  });

  // ── Навигационные табы ────────────────────────────────
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
      renderCurrentTab();
    });
  });

  // ── Sidebar toggle ────────────────────────────────────
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebarOpenBtn');
    sidebar.classList.add('collapsed');
    openBtn.classList.remove('hidden');
  });

  document.getElementById('sidebarOpenBtn').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('sidebarOpenBtn');
    sidebar.classList.remove('collapsed');
    openBtn.classList.add('hidden');
  });
}
