import { mountTodayScreen, mountHabitsScreen } from './habits.js';

const page = document.body.dataset.page;

if (page === 'today') {
  mountTodayScreen();
} else if (page === 'habits') {
  mountHabitsScreen();
}
