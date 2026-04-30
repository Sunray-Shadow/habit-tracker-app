// Data layer.
// localStorage is the *only* thing this module touches — when we move to a
// cloud backend later, only this file changes; the rest of the app stays put.

const KEY_HABITS = 'ht/habits';
const KEY_LOG = 'ht/log';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function nowIso() {
  return new Date().toISOString();
}

export function listHabits() {
  return read(KEY_HABITS, []).filter((h) => !h.archivedAt);
}

export function createHabit(input) {
  const habit = {
    id: uuid(),
    name: input.name,
    type: input.type,
    unit: input.unit ?? null,
    target: input.target ?? null,
    options: input.options ?? null,
    scale: input.scale ?? null,
    schedule: input.schedule,
    createdAt: nowIso(),
    archivedAt: null,
  };
  const habits = read(KEY_HABITS, []);
  habits.push(habit);
  write(KEY_HABITS, habits);
  return habit;
}

export function isHabitDueOn(habit, date) {
  const schedule = habit.schedule;
  if (!schedule) return true;
  if (schedule.kind === 'weekdays') {
    // ISO day numbers: 1 (Mon) ... 7 (Sun). JS Date.getDay() returns 0–6 (Sun–Sat).
    const iso = date.getDay() === 0 ? 7 : date.getDay();
    return Array.isArray(schedule.days) && schedule.days.includes(iso);
  }
  return true;
}

export function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLogEntry(key, habitId) {
  const log = read(KEY_LOG, {});
  return log[key]?.[habitId] ?? null;
}

export function setLogEntry(key, habitId, value) {
  const log = read(KEY_LOG, {});
  if (!log[key]) log[key] = {};
  log[key][habitId] = { value, loggedAt: nowIso() };
  write(KEY_LOG, log);
  return log[key][habitId];
}

export function clearLogEntry(key, habitId) {
  const log = read(KEY_LOG, {});
  if (!log[key]) return;
  delete log[key][habitId];
  if (Object.keys(log[key]).length === 0) delete log[key];
  write(KEY_LOG, log);
}
