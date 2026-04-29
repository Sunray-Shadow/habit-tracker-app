import { mountTodayScreen } from './habits.js';

const page = document.body.dataset.page;

if (page === 'today') {
  mountTodayScreen();
}

document.querySelectorAll('[data-today-date]').forEach((el) => {
  const today = new Date();
  el.textContent = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
});
