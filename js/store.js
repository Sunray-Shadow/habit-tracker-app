// Data layer.
// localStorage is the *only* thing this module touches — when we move to a
// cloud backend later, only this file changes; the rest of the app stays put.

const KEY_HABITS = 'ht/habits';

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
