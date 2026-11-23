import {seedTasks, addTask, toggleTask, deleteTask, filterTasks, metrics} from './domain.mjs';
let tasks = seedTasks();
let filter = 'all';
const form = document.querySelector('#task-form');
const list = document.querySelector('#task-list');
const empty = document.querySelector('#empty');
const format = value => new Intl.NumberFormat('ru-RU').format(value);

function render() {
  const {totalHours, doneHours, progress} = metrics(tasks);
  document.querySelector('#hours-summary').textContent = `Выполнено ${format(doneHours)} из ${format(totalHours)} ч`;
  document.querySelector('#progress-value').textContent = `${progress}%`;
  document.querySelector('#progress').value = progress;
  document.querySelector('#task-count').textContent = `Всего: ${tasks.length}`;
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  const visible = filterTasks(tasks, filter);
  list.replaceChildren();
  for (const task of visible) {
    const item = document.createElement('li');
    item.className = `task${task.done ? ' done' : ''}`;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => { tasks = toggleTask(tasks, task.id); render(); });
    const copy = document.createElement('span');
    copy.className = 'task-copy';
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    const hours = document.createElement('span');
    hours.className = 'hint';
    hours.textContent = `${format(task.hours)} ч`;
    copy.append(title, hours);
    label.append(checkbox, copy);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = 'Удалить';
    remove.setAttribute('aria-label', `Удалить задачу «${task.title}»`);
    remove.addEventListener('click', () => { tasks = deleteTask(tasks, task.id); render(); });
    item.append(label, remove);
    list.append(item);
  }
  empty.hidden = visible.length !== 0;
  empty.textContent = tasks.length ? 'В этом фильтре пока нет задач.' : 'Пока нет задач. Добавьте первую выше.';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  for (const field of ['title', 'hours']) {
    document.querySelector(`#${field}-error`).textContent = '';
    form.elements[field].removeAttribute('aria-invalid');
  }
  try {
    tasks = addTask(tasks, {title: form.elements.title.value, hours: form.elements.hours.value});
    form.reset();
    render();
    form.elements.title.focus();
  } catch (error) {
    const fields = error.fields || {};
    for (const [field, message] of Object.entries(fields)) {
      document.querySelector(`#${field}-error`).textContent = message;
      form.elements[field].setAttribute('aria-invalid', 'true');
    }
    const first = Object.keys(fields)[0];
    if (first) form.elements[first].focus();
  }
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; render(); }));
render();
