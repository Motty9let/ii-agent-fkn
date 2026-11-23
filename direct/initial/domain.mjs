export function seedTasks() {
  return [
    { id: 'reading', title: 'Чтение', hours: 2, done: true },
    { id: 'practice', title: 'Практика', hours: 4, done: false },
    { id: 'review', title: 'Повторение', hours: 2, done: false },
  ];
}

export function validateTask({ title, hours }) {
  if (typeof title !== 'string' || !title.trim()) {
    throw new Error('Введите название задачи.');
  }
  if (!['number', 'string'].includes(typeof hours) ||
      (typeof hours === 'string' && !hours.trim())) {
    throw new Error('Укажите часы от 0,5 до 24 с шагом 0,5.');
  }
  const value = Number(hours);
  if (!Number.isFinite(value) || value < 0.5 || value > 24 || !Number.isInteger(value * 2)) {
    throw new Error('Укажите часы от 0,5 до 24 с шагом 0,5.');
  }
  return { title: title.trim(), hours: value };
}

export function metrics(tasks) {
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  const doneHours = tasks.reduce((sum, task) => sum + (task.done ? task.hours : 0), 0);
  return { totalHours, doneHours, progress: totalHours === 0 ? 0 : Math.round(100 * doneHours / totalHours) };
}

export function filterTasks(tasks, filter) {
  if (!['all', 'active', 'done'].includes(filter)) throw new Error('Неизвестный фильтр.');
  return tasks.filter(task => filter === 'all' || (filter === 'done' ? task.done : !task.done));
}

export function addTask(tasks, input) {
  const valid = validateTask(input);
  const ids = new Set(tasks.map(task => task.id));
  let sequence = 1;
  while (ids.has(`task-${sequence}`)) sequence += 1;
  return [...tasks, { id: `task-${sequence}`, ...valid, done: false }];
}

export function toggleTask(tasks, id) {
  return tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
}

export function deleteTask(tasks, id) {
  return tasks.filter(task => task.id !== id);
}
