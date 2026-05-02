// ═══════════════════════════════════════════════════════
// storage.js — Работа с localStorage
//
// Вся логика сохранения/загрузки данных сосредоточена здесь.
// Остальные модули вызывают функции этого файла и никогда
// не обращаются к localStorage напрямую.
//
// Структура данных в localStorage (ключ "monthlyData"):
// {
//   "2026-0": {                  ← ключ "год-месяц"
//     employees: [ Employee ],   ← массив сотрудников
//     projects:  [ Project ]     ← массив проектов
//   },
//   "2026-1": { ... },
//   ...
// }
//
// Employee = {
//   id:          string,
//   name:        string,
//   surname:     string,
//   dob:         string,           // "YYYY-MM-DD"
//   position:    string,
//   salary:      number,
//   assignments: [                 // проекты, куда назначен
//     { projectId, capacity, fit }
//   ],
//   vacationDays: [number]         // массив номеров дней (1-31)
// }
//
// Project = {
//   id:          string,
//   projectName: string,
//   companyName: string,
//   budget:      number,
//   capacity:    number            // целое число ≥ 1
// }
// ═══════════════════════════════════════════════════════

const STORAGE_KEY = 'monthlyData';

// ─── Загрузить все данные из localStorage ────────────

/**
 * Возвращает объект { "2026-0": { employees, projects }, ... }
 * Если данных нет — возвращает пустой объект.
 */
function loadAllData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to parse localStorage data:', e);
    return {};
  }
}

// ─── Сохранить все данные в localStorage ─────────────

/**
 * Записывает весь объект monthlyData в localStorage.
 * Вызывается после каждого изменения данных.
 */
function saveAllData(allData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
}

// ─── Получить данные конкретного месяца ──────────────

/**
 * Возвращает { employees, projects } для нужного месяца.
 * Если месяц ещё не существует — создаёт пустую структуру.
 *
 * @param {number} year
 * @param {number} month — 0-11
 */
function getMonthData(year, month) {
  const all = loadAllData();
  const key = monthKey(year, month);
  // Если данных для этого месяца нет — возвращаем пустые массивы
  return all[key] || { employees: [], projects: [] };
}

// ─── Сохранить данные конкретного месяца ─────────────

/**
 * Сохраняет employees и projects для указанного месяца.
 * Не затрагивает данные других месяцев.
 */
function saveMonthData(year, month, employees, projects) {
  const all = loadAllData();
  const key = monthKey(year, month);
  all[key] = { employees, projects };
  saveAllData(all);
}

// ─── Seed Data: скопировать данные из другого месяца ─

/**
 * Копирует employees и projects из sourceKey в текущий месяц.
 * При копировании ОЧИЩАЕТ vacationDays (отпуска уникальны для каждого месяца).
 * Назначения (assignments) сохраняются — они относятся к проектам, не к месяцу.
 *
 * @param {string} sourceKey — ключ источника, например "2025-11"
 * @param {number} year      — целевой год
 * @param {number} month     — целевой месяц
 */
function seedDataFromMonth(sourceKey, year, month) {
  const all = loadAllData();
  const source = all[sourceKey];
  if (!source) return;

  // Глубокая копия через JSON, чтобы не было ссылок на один объект
  const copied = JSON.parse(JSON.stringify(source));

  // Очищаем отпуска у всех скопированных сотрудников
  copied.employees.forEach(emp => {
    emp.vacationDays = [];
  });

  // Сохраняем в целевой месяц
  const targetKey = monthKey(year, month);
  all[targetKey] = copied;
  saveAllData(all);
}

// ─── Получить список месяцев с данными ───────────────

/**
 * Возвращает массив ключей всех месяцев, которые уже имеют данные.
 * Используется в попапе Seed Data.
 *
 * @param {string} excludeKey — ключ текущего месяца (не включаем его в список)
 */
function getAvailableMonthKeys(excludeKey) {
  const all = loadAllData();
  return Object.keys(all).filter(key => {
    if (key === excludeKey) return false;
    // Показываем только месяцы, у которых есть хоть что-то
    const data = all[key];
    return data && (data.employees.length > 0 || data.projects.length > 0);
  });
}

// ─── Начальные демонстрационные данные ───────────────

/**
 * Создаёт тестовые данные для января 2026 (если localStorage пуст).
 * Позволяет сразу видеть как работает приложение.
 */
function initSampleData() {
  const all = loadAllData();

  // Проверяем: если уже есть хоть какие-то данные — ничего не делаем
  if (Object.keys(all).length > 0) return;

  // Создаём проекты
  const project1 = {
    id: generateId(),
    projectName: 'Alpha Platform',
    companyName:  'TechCorp Inc',
    budget:       50000,
    capacity:     3
  };
  const project2 = {
    id: generateId(),
    projectName: 'Mobile App',
    companyName:  'StartupXYZ',
    budget:       30000,
    capacity:     2
  };
  const project3 = {
    id: generateId(),
    projectName: 'Legacy Migration',
    companyName:  'BigBank Ltd',
    budget:       80000,
    capacity:     4
  };

  // Создаём сотрудников с назначениями
  const emp1 = {
    id: generateId(),
    name: 'Alice',
    surname: 'Johnson',
    dob: '1990-03-15',
    position: 'Senior',
    salary: 8000,
    vacationDays: [6, 7, 8],
    assignments: [
      { projectId: project1.id, capacity: 0.8, fit: 0.9 },
      { projectId: project2.id, capacity: 0.5, fit: 0.8 }
    ]
  };
  const emp2 = {
    id: generateId(),
    name: 'Bob',
    surname: 'Smith',
    dob: '1988-07-22',
    position: 'Lead',
    salary: 10000,
    vacationDays: [],
    assignments: [
      { projectId: project1.id, capacity: 1.0, fit: 1.0 }
    ]
  };
  const emp3 = {
    id: generateId(),
    name: 'Carol',
    surname: 'Williams',
    dob: '1995-11-08',
    position: 'Middle',
    salary: 5500,
    vacationDays: [20, 21, 22, 23, 24],
    assignments: [
      { projectId: project3.id, capacity: 1.0, fit: 0.85 }
    ]
  };
  const emp4 = {
    id: generateId(),
    name: 'David',
    surname: 'Brown',
    dob: '1992-05-30',
    position: 'Junior',
    salary: 3500,
    vacationDays: [],
    assignments: [] // Этот сотрудник на «скамейке» — без назначений
  };
  const emp5 = {
    id: generateId(),
    name: 'Eva',
    surname: 'Davis',
    dob: '1987-09-14',
    position: 'Architect',
    salary: 12000,
    vacationDays: [],
    assignments: [
      { projectId: project1.id, capacity: 0.7, fit: 0.95 },
      { projectId: project3.id, capacity: 0.5, fit: 0.9 }
    ]
  };

  // Сохраняем в январь 2026
  const key = monthKey(2026, 0);
  all[key] = {
    employees: [emp1, emp2, emp3, emp4, emp5],
    projects:  [project1, project2, project3]
  };

  // Также заполняем февраль 2026, чтобы Seed Data мог оттуда копировать
  const key2 = monthKey(2026, 1);
  all[key2] = {
    employees: [
      { ...emp1, id: generateId(), assignments: [], vacationDays: [] },
      { ...emp2, id: generateId(), assignments: [], vacationDays: [] }
    ],
    projects: [
      { ...project1, id: generateId() }
    ]
  };

  saveAllData(all);
}
