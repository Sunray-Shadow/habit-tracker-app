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
  input.value = currentValue ?? '';

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'log-stepper-btn';
  plus.setAttribute('aria-label', 'Increase');
  plus.innerHTML = ICONS.plus;

  wrap.appendChild(minus);
  wrap.appendChild(input);
  wrap.appendChild(plus);

  if (habit.target != null || habit.unit) {
    const meta = document.createElement('span');
    meta.className = 'log-number__meta';
    const parts = [];
    if (habit.target != null) parts.push(`/ ${habit.target}`);
    if (habit.unit) parts.push(habit.unit);
    meta.textContent = parts.join(' ');
    wrap.appendChild(meta);
  }

  const commit = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      onChange(null);
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num)) onChange(num);
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => commit(input.value), 400);
  });
  input.addEventListener('blur', () => {
    clearTimeout(timer);
    commit(input.value);
  });

  minus.addEventListener('click', () => {
    const cur = Number(input.value || 0);
    const next = Math.max(0, cur - 1);
    input.value = String(next);
    commit(next);
  });

  plus.addEventListener('click', () => {
    const cur = Number(input.value || 0);
    const next = cur + 1;
    input.value = String(next);
    commit(next);
  });

  return wrap;
}

function renderText(habit, currentValue, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'log-text';

  const textarea = document.createElement('textarea');
  textarea.className = 'log-text__input';
  textarea.placeholder = 'Write something…';
  textarea.rows = 2;
  textarea.value = currentValue ?? '';

  wrap.appendChild(textarea);

  let timer;
  const commit = () => {
    const v = textarea.value.trim();
    onChange(v || null);
  };
  textarea.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(commit, 500);
  });
  textarea.addEventListener('blur', () => {
    clearTimeout(timer);
    commit();
  });

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
