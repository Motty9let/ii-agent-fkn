import { seedTasks, validateTask, metrics, filterTasks, addTask, toggleTask, deleteTask } from './domain.mjs';

let tasks = seedTasks();
let filter = 'all';
const byId = id => document.getElementById(id);
const number = new Intl.NumberFormat('ru-RU');
const form = byId('task-form');
const titleInput = byId('title');
const hoursInput = byId('hours');

function announce(message) { byId('announcement').textContent = message; }
function setError(input, message) {
  byId(`${input.id}-error`).textContent = message;
  input.setAttribute('aria-invalid', String(Boolean(message)));
}

function render() {
  const summary = metrics(tasks);
  byId('done-hours').textContent = number.format(summary.doneHours);
  byId('total-hours').textContent = number.format(summary.totalHours);
  byId('progress-text').textContent = `${summary.progress}%`;
  byId('progress').value = summary.progress;
  byId('progress').textContent = `${summary.progress}%`;
  byId('task-count').textContent = tasks.length;
  const visible = filterTasks(tasks, filter);
  const list = byId('task-list');
  list.replaceChildren();
  for (const task of visible) {
    const row = document.createElement('li');
    row.className = `task${task.done ? ' done' : ''}`;
    const label = document.createElement('label');
    label.className = 'task-label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      const nextVisibleId = visible[visible.indexOf(task) + 1]?.id;
      tasks = toggleTask(tasks, task.id);
      render();
      const target = document.getElementById(`check-${task.id}`) || document.getElementById(`check-${nextVisibleId}`);
      (target || document.querySelector('[data-filter][aria-pressed="true"]')).focus();
      announce(`Задача «${task.title}»: ${task.done ? 'снова активна' : 'готова'}.`);
    });
    checkbox.id = `check-${task.id}`;
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    label.append(checkbox, title);
    const hours = document.createElement('span');
    hours.className = 'task-hours';
    hours.textContent = `${number.format(task.hours)} ч`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Удалить задачу «${task.title}»`);
    remove.addEventListener('click', () => {
      const index = visible.indexOf(task);
      const neighborId = visible[index + 1]?.id || visible[index - 1]?.id;
      tasks = deleteTask(tasks, task.id);
      render();
      (document.getElementById(`check-${neighborId}`) || titleInput).focus();
      announce(`Задача «${task.title}» удалена.`);
    });
    row.append(label, hours, remove);
    list.append(row);
  }
  byId('empty-state').hidden = visible.length > 0;
  byId('empty-state').textContent = tasks.length === 0
    ? 'Пока нет задач. Добавь первую — начнём с малого.'
    : filter === 'active' ? 'Все задачи готовы. Можно выдохнуть!' : 'Готовых задач пока нет. Всё впереди.';
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
  });
}

form.addEventListener('submit', event => {
  event.preventDefault();
  let firstInvalid = null;
  for (const [input, probe] of [
    [titleInput, { title: titleInput.value, hours: 1 }],
    [hoursInput, { title: 'Проверка часов', hours: hoursInput.value }],
  ]) {
    try {
      validateTask(probe);
      setError(input, '');
    } catch (error) {
      setError(input, error.message);
      firstInvalid ||= input;
    }
  }
  if (firstInvalid) { firstInvalid.focus(); return; }
  tasks = addTask(tasks, { title: titleInput.value, hours: hoursInput.value });
  form.reset();
  filter = 'all';
  render();
  titleInput.focus();
  announce('Задача добавлена. Показаны все задачи.');
});

document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    render();
    announce(`Показано задач: ${filterTasks(tasks, filter).length}.`);
  });
});

render();
