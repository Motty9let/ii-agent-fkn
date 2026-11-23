export function seedTasks() {
  return [
    {id: 'reading', title: 'Чтение', hours: 2, done: true},
    {id: 'practice', title: 'Практика', hours: 4, done: false},
    {id: 'review', title: 'Повторение', hours: 2, done: false}
  ];
}

export function validateTask(input) {
  const errors = {};
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) errors.title = 'Введите название задачи.';
  const raw = input.hours;
  const allowedType = typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '');
  const hours = allowedType ? Number(raw) : NaN;
  if (!Number.isFinite(hours) || hours < 0.5 || hours > 24 || !Number.isInteger(hours * 2)) {
    errors.hours = 'Укажите от 0,5 до 24 часов с шагом 0,5.';
  }
  if (Object.keys(errors).length) {
    const error = new Error(Object.values(errors).join(' '));
    error.fields = errors;
    throw error;
  }
  return {title, hours};
}

export function addTask(tasks, input) {
  const data = validateTask(input);
  let counter = 1;
  while (tasks.some(task => task.id === `task-${counter}`)) counter++;
  return [...tasks, {id: `task-${counter}`, ...data, done: false}];
}
export function toggleTask(tasks, id) {
  return tasks.map(task => task.id === id ? {...task, done: !task.done} : task);
}
export function deleteTask(tasks, id) {
  return tasks.filter(task => task.id !== id);
}
export function metrics(tasks) {
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  const doneHours = tasks.reduce((sum, task) => sum + (task.done ? task.hours : 0), 0);
  return {totalHours, doneHours, progress: totalHours === 0 ? 0 : Math.round(100 * doneHours / totalHours)};
}
export function filterTasks(tasks, filter) {
  return tasks.filter(task => filter === 'active' ? !task.done : filter === 'done' ? task.done : true);
}
