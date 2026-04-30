const ICONS = {
  check:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>',
  circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>',
  minus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
  plus:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
};

const EMOJI_OPTIONS = [
  { value: 'happy',   emoji: '\u{1F60A}', label: 'Happy' },
  { value: 'neutral', emoji: '\u{1F610}', label: 'Neutral' },
  { value: 'sad',     emoji: '\u{1F61E}', label: 'Sad' },
];

export function createLogInput(habit, currentValue, onChange) {
  switch (habit.type) {
    case 'toggle':  return renderToggle(habit, currentValue, onChange);
    case 'number':  return renderNumber(habit, currentValue, onChange);
    case 'text':    return renderText(habit, currentValue, onChange);
    case 'scale':   return renderScale(habit, currentValue, onChange);
    case 'choices': return renderChoices(habit, currentValue, onChange);
    case 'emoji':   return renderEmoji(habit, currentValue, onChange);
    default:        return document.createElement('div');
  }
}

function renderToggle(habit, currentValue, onChange) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'log-toggle';

  const apply = (done) => {
    btn.classList.toggle('log-toggle--done', done);
    btn.setAttribute('aria-pressed', String(done));
    btn.innerHTML = `
      <span class="log-toggle__icon">${done ? ICONS.check : ICONS.circle}</span>
      <span class="log-toggle__label">${done ? 'Done' : 'Mark done'}</span>
    `;
  };

  apply(currentValue === true);

  btn.addEventListener('click', () => {
    const done = !btn.classList.contains('log-toggle--done');
    apply(done);
    onChange(done ? true : null);
  });

  return btn;
}

function renderNumber(habit, currentValue, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'log-number';

  let pending = currentValue ?? null;

  const buildMeta = () => {
    if (habit.target == null && !habit.unit) return null;
    const meta = document.createElement('span');
    meta.className = 'log-number__meta';
    const parts = [];
    if (habit.target != null) parts.push(`/ ${habit.target}`);
    if (habit.unit) parts.push(habit.unit);
    meta.textContent = parts.join(' ');
    return meta;
  };

  const renderEdit = () => {
    wrap.replaceChildren();

    const row = document.createElement('div');
    row.className = 'log-number__row';

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'log-stepper-btn';
    minus.setAttribute('aria-label', 'Decrease');
    minus.innerHTML = ICONS.minus;

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'log-number__input';
    input.placeholder = '0';
    input.step = 'any';
    input.value = pending ?? '';

    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'log-stepper-btn';
    plus.setAttribute('aria-label', 'Increase');
    plus.innerHTML = ICONS.plus;

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'log-submit';
    save.textContent = 'Save';

    const updateSave = () => {
      const raw = input.value.trim();
      save.disabled = raw === '' || Number.isNaN(Number(raw));
    };

    const submit = () => {
      const raw = input.value.trim();
      if (raw === '') return;
      const num = Number(raw);
      if (Number.isNaN(num)) return;
      pending = num;
      onChange(num);
      renderDisplay();
    };

    save.addEventListener('click', submit);
    input.addEventListener('input', updateSave);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
    minus.addEventListener('click', () => {
      const cur = Number(input.value || 0);
      input.value = String(Math.max(0, cur - 1));
      updateSave();
    });
    plus.addEventListener('click', () => {
      const cur = Number(input.value || 0);
      input.value = String(cur + 1);
      updateSave();
    });

    updateSave();

    row.appendChild(minus);
    row.appendChild(input);
    row.appendChild(plus);
    row.appendChild(save);
    wrap.appendChild(row);

    const meta = buildMeta();
    if (meta) wrap.appendChild(meta);
  };

  const renderDisplay = () => {
    wrap.replaceChildren();
    const display = document.createElement('div');
    display.className = 'log-number__display';

    const value = document.createElement('span');
    value.className = 'log-number__value';
    value.textContent = String(pending);
    display.appendChild(value);

    const meta = buildMeta();
    if (meta) display.appendChild(meta);

    wrap.appendChild(display);
  };

  if (pending != null) renderDisplay();
  else renderEdit();

  return wrap;
}

function renderText(habit, currentValue, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'log-text';

  let pending = currentValue ?? null;

  const renderEdit = () => {
    wrap.replaceChildren();

    const textarea = document.createElement('textarea');
    textarea.className = 'log-text__input';
    textarea.placeholder = 'Write something… (Enter to save, Shift+Enter for new line)';
    textarea.rows = 2;
    textarea.value = pending ?? '';

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'log-submit';
    save.textContent = 'Save';

    const updateSave = () => {
      save.disabled = textarea.value.trim() === '';
    };

    const submit = () => {
      const v = textarea.value.trim();
      if (!v) return;
      pending = v;
      onChange(v);
      renderDisplay();
    };

    save.addEventListener('click', submit);
    textarea.addEventListener('input', updateSave);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });

    updateSave();

    wrap.appendChild(textarea);
    wrap.appendChild(save);
  };

  const renderDisplay = () => {
    wrap.replaceChildren();
    const display = document.createElement('p');
    display.className = 'log-text__display';
    display.textContent = pending;
    wrap.appendChild(display);
  };

  if (pending) renderDisplay();
  else renderEdit();

  return wrap;
}

function renderScale(habit, currentValue, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'log-scale';

  const min = habit.scale?.min ?? 1;
  const max = habit.scale?.max ?? 10;
  const initial = currentValue != null
    ? currentValue
    : Math.round((min + max) / 2);

  const value = document.createElement('div');
  value.className = 'log-scale__value';
  value.textContent = String(initial);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'log-scale__slider';
  slider.min = String(min);
  slider.max = String(max);
  slider.value = String(initial);

  const range = document.createElement('div');
  range.className = 'log-scale__range';
  const lo = document.createElement('span');
  lo.textContent = String(min);
  const hi = document.createElement('span');
  hi.textContent = String(max);
  range.appendChild(lo);
  range.appendChild(hi);

  wrap.appendChild(value);
  wrap.appendChild(slider);
  wrap.appendChild(range);

  let timer;
  slider.addEventListener('input', () => {
    value.textContent = slider.value;
    clearTimeout(timer);
    timer = setTimeout(() => onChange(Number(slider.value)), 200);
  });
  slider.addEventListener('change', () => {
    clearTimeout(timer);
    onChange(Number(slider.value));
  });

  return wrap;
}

function renderChoices(habit, currentValue, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'log-choices';

  const options = habit.options ?? [];

  for (const opt of options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'log-choice';
    btn.textContent = opt;
    if (opt === currentValue) {
      btn.classList.add('log-choice--selected');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.setAttribute('aria-pressed', 'false');
    }

    btn.addEventListener('click', () => {
      const wasSelected = btn.classList.contains('log-choice--selected');
      wrap.querySelectorAll('.log-choice').forEach((b) => {
        b.classList.remove('log-choice--selected');
        b.setAttribute('aria-pressed', 'false');
      });
      if (!wasSelected) {
        btn.classList.add('log-choice--selected');
        btn.setAttribute('aria-pressed', 'true');
      }
      onChange(wasSelected ? null : opt);
    });

    wrap.appendChild(btn);
  }

  return wrap;
}

function renderEmoji(habit, currentValue, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'log-emoji';

  for (const opt of EMOJI_OPTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'log-emoji-btn';
    btn.textContent = opt.emoji;
    btn.setAttribute('aria-label', opt.label);
    if (opt.value === currentValue) {
      btn.classList.add('log-emoji-btn--selected');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.setAttribute('aria-pressed', 'false');
    }

    btn.addEventListener('click', () => {
      const wasSelected = btn.classList.contains('log-emoji-btn--selected');
      wrap.querySelectorAll('.log-emoji-btn').forEach((b) => {
        b.classList.remove('log-emoji-btn--selected');
        b.setAttribute('aria-pressed', 'false');
      });
      if (!wasSelected) {
        btn.classList.add('log-emoji-btn--selected');
        btn.setAttribute('aria-pressed', 'true');
      }
      onChange(wasSelected ? null : opt.value);
    });

    wrap.appendChild(btn);
  }

  return wrap;
}
