import {
  listHabits,
  createHabit,
  updateHabit,
  archiveHabit,
  isHabitDueOn,
  dateKey,
  getLogEntry,
  setLogEntry,
  clearLogEntry,
} from './store.js';
import { createLogInput } from './log.js';

const TYPE_LABELS = {
  toggle: 'Yes / No',
  number: 'Number',
  text: 'Note',
  scale: 'Scale',
  choices: 'Options',
  emoji: 'Mood',
};

const DAY_SHORT = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu',
  5: 'Fri', 6: 'Sat', 7: 'Sun',
};

let sheetMode = 'create';
let sheetHabitId = null;
let menuDocListenerAttached = false;

// --- mounts ---------------------------------------------------------------

export function mountTodayScreen() {
  const listEl = document.getElementById('habit-list');
  const emptyEl = document.getElementById('today-empty');
  const fabEl = document.getElementById('add-habit-fab');
  const sheetEl = document.getElementById('habit-sheet');

  if (!listEl || !fabEl || !sheetEl) return;

  ensureMenuDocListener();

  const refresh = () => renderList(listEl, emptyEl, sheetEl);
  bindSheet(sheetEl, refresh);
  fabEl.addEventListener('click', () => openSheet(sheetEl));
  refresh();
}

export function mountHabitsScreen() {
  const listEl = document.getElementById('habits-list');
  const emptyEl = document.getElementById('habits-empty');
  const fabEl = document.getElementById('add-habit-fab');
  const sheetEl = document.getElementById('habit-sheet');

  if (!listEl || !fabEl || !sheetEl) return;

  ensureMenuDocListener();

  const refresh = () => renderHabitsList(listEl, emptyEl, sheetEl);
  bindSheet(sheetEl, refresh);
  fabEl.addEventListener('click', () => openSheet(sheetEl));
  refresh();
}

// --- frequency ranking ----------------------------------------------------

function frequencyScore(habit) {
  const s = habit.schedule;
  if (!s) return 0;
  switch (s.kind) {
    case 'daily':    return 7;
    case 'weekdays': return Array.isArray(s.days) ? s.days.length : 0;
    case 'weekly':   return s.count ?? 1;
    case 'monthly':  return (s.count ?? 1) / 4.33;
    default:         return 0;
  }
}

function sortByFrequency(habits) {
  return habits.slice().sort((a, b) => {
    const diff = frequencyScore(b) - frequencyScore(a);
    if (diff !== 0) return diff;
    return (a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1;
  });
}

// --- list rendering -------------------------------------------------------

function renderList(listEl, emptyEl, sheetEl) {
  const today = new Date();
  const todayKey = dateKey(today);
  const habits = sortByFrequency(
    listHabits().filter((h) => isHabitDueOn(h, today))
  );

  listEl.replaceChildren();

  if (habits.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    listEl.hidden = true;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  listEl.hidden = false;

  const refresh = () => renderList(listEl, emptyEl, sheetEl);

  for (const habit of habits) {
    listEl.appendChild(habitListItem(habit, todayKey, sheetEl, refresh));
  }
}

function renderHabitsList(listEl, emptyEl, sheetEl) {
  const habits = sortByFrequency(listHabits());

  listEl.replaceChildren();

  if (habits.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    listEl.hidden = true;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  listEl.hidden = false;

  const refresh = () => renderHabitsList(listEl, emptyEl, sheetEl);

  for (const habit of habits) {
    listEl.appendChild(manageCardItem(habit, sheetEl, refresh));
  }
}

function habitListItem(habit, todayKey, sheetEl, refresh) {
  const li = document.createElement('li');
  li.className = 'habit-list__item';

  const card = document.createElement('article');
  card.className = 'habit-card';

  const { wrap: actions, checkBtn } = buildCardActions(habit, sheetEl, refresh, { withCheck: true });
  card.appendChild(actions);

  const name = document.createElement('h3');
  name.className = 'habit-card__name';
  name.textContent = habit.name;
  card.appendChild(name);

  const meta = document.createElement('p');
  meta.className = 'habit-card__meta';
  meta.textContent = formatMeta(habit);
  card.appendChild(meta);

  const inputWrap = document.createElement('div');
  inputWrap.className = 'habit-card__log';
  card.appendChild(inputWrap);

  const setLoggedState = (val) => {
    const isLogged = val !== null && val !== false && val !== '';
    card.classList.toggle('habit-card--logged', isLogged);
    if (checkBtn) checkBtn.hidden = !isLogged;
  };

  const renderInput = () => {
    const entry = getLogEntry(todayKey, habit.id);
    const initialValue = entry?.value ?? null;
    setLoggedState(initialValue);

    inputWrap.replaceChildren();
    inputWrap.appendChild(
      createLogInput(habit, initialValue, (newValue) => {
        if (newValue === null || newValue === '') {
          clearLogEntry(todayKey, habit.id);
        } else {
          setLogEntry(todayKey, habit.id, newValue);
        }
        setLoggedState(newValue);
      })
    );
  };

  renderInput();

  if (checkBtn) {
    checkBtn.addEventListener('click', () => {
      clearLogEntry(todayKey, habit.id);
      renderInput();
    });
  }

  li.appendChild(card);
  return li;
}

function manageCardItem(habit, sheetEl, refresh) {
  const li = document.createElement('li');
  li.className = 'habit-list__item';

  const card = document.createElement('article');
  card.className = 'habit-card habit-card--manage';

  const { wrap: actions } = buildCardActions(habit, sheetEl, refresh, { withCheck: false });
  card.appendChild(actions);

  const name = document.createElement('h3');
  name.className = 'habit-card__name';
  name.textContent = habit.name;
  card.appendChild(name);

  const meta = document.createElement('p');
  meta.className = 'habit-card__meta';
  meta.textContent = formatMeta(habit);
  card.appendChild(meta);

  li.appendChild(card);
  return li;
}

function formatMeta(habit) {
  const measurement = TYPE_LABELS[habit.type] ?? habit.type;
  const cadence = formatSchedule(habit.schedule);
  return cadence ? `${measurement} · ${cadence}` : measurement;
}

function formatSchedule(schedule) {
  if (!schedule) return '';
  switch (schedule.kind) {
    case 'daily':
      return 'Every day';
    case 'weekdays': {
      const days = (schedule.days ?? []).slice().sort((a, b) => a - b);
      if (days.length === 7) return 'Every day';
      return days.map((d) => DAY_SHORT[d]).filter(Boolean).join(' · ');
    }
    case 'weekly':
      return schedule.count ? `${schedule.count}× per week` : 'A few times a week';
    case 'monthly':
      return schedule.count ? `${schedule.count}× per month` : 'A few times a month';
    default:
      return '';
  }
}

// --- per-card actions menu (Edit / Archive) -------------------------------

function buildCardActions(habit, sheetEl, refresh, { withCheck }) {
  const wrap = document.createElement('div');
  wrap.className = 'habit-card__actions';

  let checkBtn = null;
  if (withCheck) {
    checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'habit-card__check';
    checkBtn.setAttribute('aria-label', `Undo log for ${habit.name}`);
    checkBtn.title = 'Undo';
    checkBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';
    checkBtn.hidden = true;
    wrap.appendChild(checkBtn);
  }

  const menuWrap = document.createElement('div');
  menuWrap.className = 'habit-card__menu-wrap';

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'habit-card__menu';
  menuBtn.setAttribute('aria-label', `${habit.name} menu`);
  menuBtn.setAttribute('aria-haspopup', 'menu');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/></svg>';

  const menu = document.createElement('div');
  menu.className = 'habit-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;

  const editItem = document.createElement('button');
  editItem.type = 'button';
  editItem.className = 'habit-menu__item';
  editItem.setAttribute('role', 'menuitem');
  editItem.dataset.action = 'edit';
  editItem.textContent = 'Edit';

  const archiveItem = document.createElement('button');
  archiveItem.type = 'button';
  archiveItem.className = 'habit-menu__item habit-menu__item--danger';
  archiveItem.setAttribute('role', 'menuitem');
  archiveItem.dataset.action = 'archive';
  archiveItem.textContent = 'Archive';

  menu.appendChild(editItem);
  menu.appendChild(archiveItem);

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasHidden = menu.hidden;
    closeAllMenus();
    if (wasHidden) {
      menu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  });

  editItem.addEventListener('click', () => {
    openSheetForEdit(sheetEl, habit, refresh);
  });

  archiveItem.addEventListener('click', () => {
    confirmArchive(habit, refresh);
  });

  menuWrap.appendChild(menuBtn);
  menuWrap.appendChild(menu);
  wrap.appendChild(menuWrap);

  return { wrap, checkBtn };
}

function closeAllMenus() {
  document.querySelectorAll('.habit-menu:not([hidden])').forEach((menu) => {
    menu.hidden = true;
    const btn = menu.parentElement?.querySelector('.habit-card__menu');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}

function ensureMenuDocListener() {
  if (menuDocListenerAttached) return;
  menuDocListenerAttached = true;
  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllMenus();
  });
}

function confirmArchive(habit, refresh) {
  const ok = window.confirm(
    `Archive "${habit.name}"?\n\nIt will disappear from Today and Habits, but its log history is kept.`
  );
  if (!ok) return;
  archiveHabit(habit.id);
  refresh();
}

// --- sheet: open / close --------------------------------------------------

function openSheet(sheetEl) {
  sheetMode = 'create';
  sheetHabitId = null;

  const form = sheetEl.querySelector('form');
  form.reset();
  resetSheetUi(sheetEl);

  sheetEl.querySelector('.sheet__title').textContent = 'New habit';
  const saveBtn = sheetEl.querySelector('[data-save]');
  saveBtn.textContent = 'Save habit';
  saveBtn.hidden = true;

  const stage = sheetEl.querySelector('[data-stage="after-type"]');
  if (stage) stage.hidden = true;

  sheetEl.hidden = false;
  document.body.classList.add('is-sheet-open');

  requestAnimationFrame(() => {
    sheetEl.querySelector('input[name="name"]')?.focus();
  });
}

function openSheetForEdit(sheetEl, habit, onSaved) {
  sheetMode = 'edit';
  sheetHabitId = habit.id;

  const form = sheetEl.querySelector('form');
  form.reset();
  resetSheetUi(sheetEl);

  sheetEl.querySelector('.sheet__title').textContent = 'Edit habit';
  const saveBtn = sheetEl.querySelector('[data-save]');
  saveBtn.textContent = 'Save changes';
  saveBtn.hidden = false;

  form.querySelector('input[name="name"]').value = habit.name;

  setPickerSelection(sheetEl, 'type', habit.type);
  showFields(sheetEl, 'type', habit.type);
  sheetEl.querySelector('[data-picker="type"]').classList.add('picker--locked');

  if (habit.type === 'number' && (habit.unit || habit.target != null)) {
    const toggle = sheetEl.querySelector('[data-extras-toggle="number"]');
    const content = sheetEl.querySelector('[data-extras-content="number"]');
    toggle.setAttribute('aria-expanded', 'true');
    content.hidden = false;
    if (habit.unit) form.querySelector('input[name="unit"]').value = habit.unit;
    if (habit.target != null) form.querySelector('input[name="target"]').value = habit.target;
  } else if (habit.type === 'scale' && habit.scale) {
    const min = form.querySelector('input[name="scale-min"]');
    const max = form.querySelector('input[name="scale-max"]');
    min.value = habit.scale.min;
    max.value = habit.scale.max;
    min.disabled = true;
    max.disabled = true;
  } else if (habit.type === 'choices' && Array.isArray(habit.options)) {
    const list = form.querySelector('[data-options-list]');
    list.replaceChildren();
    for (const opt of habit.options) {
      const row = document.createElement('div');
      row.className = 'options-input__row';
      row.dataset.optionRow = '';

      const input = document.createElement('input');
      input.className = 'field__input';
      input.type = 'text';
      input.name = 'option';
      input.value = opt;
      input.disabled = true;

      row.appendChild(input);
      list.appendChild(row);
    }
    sheetEl.querySelector('[data-add-option]').hidden = true;
  }

  setPickerSelection(sheetEl, 'schedule', habit.schedule.kind);
  showFields(sheetEl, 'schedule', habit.schedule.kind);

  if (habit.schedule.kind === 'weekdays' && Array.isArray(habit.schedule.days)) {
    sheetEl.querySelectorAll('[data-day]').forEach((b) => {
      const day = Number(b.dataset.day);
      if (habit.schedule.days.includes(day)) {
        b.classList.add('day-picker__day--selected');
        b.setAttribute('aria-pressed', 'true');
      }
    });
  } else if (habit.schedule.kind === 'weekly' && habit.schedule.count != null) {
    form.querySelector('input[name="weekly-count"]').value = habit.schedule.count;
  } else if (habit.schedule.kind === 'monthly' && habit.schedule.count != null) {
    form.querySelector('input[name="monthly-count"]').value = habit.schedule.count;
  }

  const stage = sheetEl.querySelector('[data-stage="after-type"]');
  if (stage) stage.hidden = false;

  sheetEl.hidden = false;
  document.body.classList.add('is-sheet-open');

  // Stash the post-save callback so submit knows what to refresh.
  sheetEl.__onSaved = onSaved;
}

function closeSheet(sheetEl) {
  sheetEl.hidden = true;
  document.body.classList.remove('is-sheet-open');
}

function resetSheetUi(sheetEl) {
  sheetEl.querySelectorAll('.picker__option--selected').forEach((b) => {
    b.classList.remove('picker__option--selected');
    b.setAttribute('aria-pressed', 'false');
  });
  sheetEl.querySelectorAll('[data-type-field], [data-schedule-field]').forEach((el) => {
    el.hidden = true;
  });
  sheetEl.querySelectorAll('.day-picker__day').forEach((b) => {
    b.classList.remove('day-picker__day--selected');
    b.setAttribute('aria-pressed', 'false');
  });
  sheetEl.querySelectorAll('[data-extras-toggle]').forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
  });
  sheetEl.querySelectorAll('[data-extras-content]').forEach((el) => {
    el.hidden = true;
  });

  resetOptionsList(sheetEl.querySelector('form'));
  hideError(sheetEl.querySelector('form'));

  sheetEl.querySelector('[data-picker="type"]').classList.remove('picker--locked');

  sheetEl.querySelectorAll('input[name="scale-min"], input[name="scale-max"]').forEach((i) => {
    i.disabled = false;
  });

  const addOption = sheetEl.querySelector('[data-add-option]');
  if (addOption) addOption.hidden = false;
}

// --- sheet: bind handlers (once) ------------------------------------------

function bindSheet(sheetEl, onSaved) {
  if (sheetEl.dataset.bound === '1') {
    sheetEl.__onSaved = onSaved;
    return;
  }
  sheetEl.dataset.bound = '1';
  sheetEl.__onSaved = onSaved;

  const form = sheetEl.querySelector('form');

  sheetEl.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => closeSheet(sheetEl));
  });

  document.addEventListener('keydown', (e) => {
    if (!sheetEl.hidden && e.key === 'Escape') closeSheet(sheetEl);
  });

  sheetEl.querySelector('[data-picker="type"]').addEventListener('click', (e) => {
    if (sheetMode === 'edit') return; // type is locked while editing
    const btn = e.target.closest('[data-value]');
    if (!btn) return;
    setPickerSelection(sheetEl, 'type', btn.dataset.value);
    showFields(sheetEl, 'type', btn.dataset.value);
    revealStage(sheetEl, 'after-type');
  });

  sheetEl.querySelector('[data-picker="schedule"]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-value]');
    if (!btn) return;
    setPickerSelection(sheetEl, 'schedule', btn.dataset.value);
    showFields(sheetEl, 'schedule', btn.dataset.value);
    revealSave(sheetEl);
  });

  sheetEl.querySelector('[data-day-picker]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-day]');
    if (!btn) return;
    const selected = !btn.classList.contains('day-picker__day--selected');
    btn.classList.toggle('day-picker__day--selected', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });

  sheetEl.querySelector('[data-options-list]').addEventListener('click', (e) => {
    if (e.target.matches('[data-remove-option]')) {
      e.target.closest('[data-option-row]')?.remove();
    }
  });

  sheetEl.querySelector('[data-add-option]').addEventListener('click', () => {
    addOptionRow(form);
  });

  sheetEl.querySelectorAll('[data-extras-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.extrasToggle;
      const content = sheetEl.querySelector(`[data-extras-content="${name}"]`);
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if (content) content.hidden = expanded;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = readForm(form);
    if (!input) return;
    if (sheetMode === 'edit' && sheetHabitId) {
      updateHabit(sheetHabitId, input);
    } else {
      createHabit(input);
    }
    closeSheet(sheetEl);
    sheetEl.__onSaved?.();
  });
}

function revealStage(sheetEl, name) {
  const stage = sheetEl.querySelector(`[data-stage="${name}"]`);
  if (stage) stage.hidden = false;
}

function revealSave(sheetEl) {
  const saveBtn = sheetEl.querySelector('[data-save]');
  if (saveBtn) saveBtn.hidden = false;
}

function setPickerSelection(sheetEl, picker, value) {
  sheetEl.querySelectorAll(`[data-picker="${picker}"] [data-value]`).forEach((btn) => {
    const sel = btn.dataset.value === value;
    btn.classList.toggle('picker__option--selected', sel);
    btn.setAttribute('aria-pressed', String(sel));
  });
}

function showFields(sheetEl, kind, value) {
  const attr = kind === 'type' ? 'data-type-field' : 'data-schedule-field';
  sheetEl.querySelectorAll(`[${attr}]`).forEach((el) => {
    el.hidden = el.getAttribute(attr) !== value;
  });
}

function addOptionRow(form) {
  const list = form.querySelector('[data-options-list]');
  const row = document.createElement('div');
  row.className = 'options-input__row';
  row.dataset.optionRow = '';

  const input = document.createElement('input');
  input.className = 'field__input';
  input.type = 'text';
  input.name = 'option';
  input.placeholder = 'e.g., Good';
  input.maxLength = 40;
  input.autocomplete = 'off';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'options-input__remove';
  remove.dataset.removeOption = '';
  remove.setAttribute('aria-label', 'Remove option');
  remove.textContent = '×';

  row.appendChild(input);
  row.appendChild(remove);
  list.appendChild(row);
  input.focus();
}

function resetOptionsList(form) {
  const list = form.querySelector('[data-options-list]');
  list.replaceChildren();
  addOptionRow(form);
  addOptionRow(form);
}

function readForm(form) {
  const name = form.querySelector('input[name="name"]').value.trim();
  const type = form.querySelector('[data-picker="type"] .picker__option--selected')?.dataset.value;
  const scheduleKind = form.querySelector('[data-picker="schedule"] .picker__option--selected')?.dataset.value;

  const errors = [];
  if (!type) errors.push('Pick a measurement type.');
  if (!name) errors.push('Name is required.');
  if (!scheduleKind) errors.push('Pick a schedule.');

  if (errors.length) {
    showError(form, errors.join('\n'));
    return null;
  }

  const habit = { name, type, schedule: { kind: scheduleKind } };

  if (type === 'number') {
    const unit = form.querySelector('input[name="unit"]').value.trim();
    const target = form.querySelector('input[name="target"]').value.trim();
    habit.unit = unit || null;
    habit.target = target !== '' ? Number(target) : null;
  } else if (type === 'scale') {
    const min = Number(form.querySelector('input[name="scale-min"]').value);
    const max = Number(form.querySelector('input[name="scale-max"]').value);
    if (Number.isNaN(min) || Number.isNaN(max) || min >= max) {
      showError(form, 'Scale minimum must be less than maximum.');
      return null;
    }
    habit.scale = { min, max };
  } else if (type === 'choices') {
    const options = Array.from(form.querySelectorAll('input[name="option"]'))
      .map((i) => i.value.trim())
      .filter(Boolean);
    if (options.length < 2) {
      showError(form, 'Add at least 2 options.');
      return null;
    }
    habit.options = options;
  }

  if (scheduleKind === 'weekdays') {
    const days = Array.from(form.querySelectorAll('[data-day].day-picker__day--selected'))
      .map((b) => Number(b.dataset.day));
    if (days.length === 0) {
      showError(form, 'Pick at least one day of the week.');
      return null;
    }
    habit.schedule.days = days;
  } else if (scheduleKind === 'weekly') {
    const raw = form.querySelector('input[name="weekly-count"]').value.trim();
    if (raw !== '') {
      const count = Number(raw);
      if (!count || count < 1 || count > 7) {
        showError(form, 'Times per week must be between 1 and 7.');
        return null;
      }
      habit.schedule.count = count;
    }
  } else if (scheduleKind === 'monthly') {
    const raw = form.querySelector('input[name="monthly-count"]').value.trim();
    if (raw !== '') {
      const count = Number(raw);
      if (!count || count < 1 || count > 31) {
        showError(form, 'Times per month must be between 1 and 31.');
        return null;
      }
      habit.schedule.count = count;
    }
  }

  return habit;
}

function showError(form, message) {
  const errorEl = form.querySelector('.form-error');
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideError(form) {
  const errorEl = form.querySelector('.form-error');
  errorEl.textContent = '';
  errorEl.hidden = true;
}
