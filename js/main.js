import { mountTodayScreen, mountHabitsScreen } from './habits.js';

const page = document.body.dataset.page;

if (page === 'today') {
  mountTodayScreen();
} else if (page === 'habits') {
  mountHabitsScreen();
}

document.querySelectorAll('[data-today-date]').forEach((el) => {
  const today = new Date();
  el.textContent = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
});
