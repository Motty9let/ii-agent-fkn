import test from 'node:test';
import assert from 'node:assert/strict';
import { seedTasks, validateTask, metrics, filterTasks, addTask, toggleTask, deleteTask } from '../domain.mjs';

test('T1: исходные 3 задачи, 8 часов, 2 выполнено, 25%', () => {
  const tasks = seedTasks();
  assert.equal(tasks.length, 3);
  assert.deepEqual(tasks.map(({id,title,hours,done})=>({id,title,hours,done})), [
    {id:'reading',title:'Чтение',hours:2,done:true},
    {id:'practice',title:'Практика',hours:4,done:false},
    {id:'review',title:'Повторение',hours:2,done:false}
  ]);
  assert.deepEqual(metrics(tasks), {totalHours:8,doneHours:2,progress:25});
});
test('T2: переключение Практики даёт 75%, обратное — 25%', () => {
  const original = seedTasks(); const before=structuredClone(original);
  const next = toggleTask(original, 'practice');
  assert.deepEqual(metrics(next), {totalHours:8,doneHours:6,progress:75});
  assert.deepEqual(metrics(toggleTask(next, 'practice')), {totalHours:8,doneHours:2,progress:25});
  assert.deepEqual(original,before);
});
test('T3: фильтры меняют список, но не исходные данные и метрики', () => {
  const tasks=seedTasks(); const before=structuredClone(tasks);
  assert.deepEqual(filterTasks(tasks,'active').map(t=>t.id), ['practice','review']);
  assert.deepEqual(filterTasks(tasks,'done').map(t=>t.id), ['reading']);
  assert.equal(filterTasks(tasks,'all').length, 3);
  assert.deepEqual(tasks,before);
  assert.deepEqual(metrics(tasks), {totalHours:8,doneHours:2,progress:25});
});
test('T4: пустые названия и пробелы отклоняются', () => {
  for (const title of ['', '   ', '\t']) {
    assert.throws(()=>validateTask({title,hours:2}));
    assert.throws(()=>addTask(seedTasks(),{title,hours:2}));
  }
});
test('T4: пустые, отрицательные, выходящие за границы и неверный шаг часов отклоняются', () => {
  for (const hours of ['', '   ', -1, 0, 0.25, 0.7, 24.5, 25, NaN, Infinity, null, false, true, 'abc']) {
    assert.throws(()=>validateTask({title:'Задача',hours}), String(hours));
    assert.throws(()=>addTask(seedTasks(),{title:'Задача',hours}), String(hours));
  }
});
test('T4: 0.5 и 24 принимаются, название очищается trim, вход не меняется', () => {
  for (const hours of [0.5, 1, 1.5, 24, '0.5', '24']) {
    const input={title:'  Новая задача  ',hours}; const before=structuredClone(input);
    assert.deepEqual(validateTask(input),{title:'Новая задача',hours:Number(hours)});
    assert.deepEqual(input,before);
  }
});
test('R1: добавление создаёт активные задачи с уникальными ID', () => {
  const tasks=seedTasks(); const before=structuredClone(tasks);
  const next=addTask(tasks,{title:'  Новая  ',hours:'0.5'});
  const next2=addTask(next,{title:'Ещё одна',hours:1});
  assert.equal(next2.length,5);
  assert.equal(new Set(next2.map(t=>t.id)).size,5);
  assert.equal(next[3].title,'Новая'); assert.equal(next[3].done,false); assert.equal(next[3].hours,0.5);
  assert.deepEqual(metrics(next),{totalHours:8.5,doneHours:2,progress:24});
  assert.deepEqual(tasks,before);
});
test('T5: удаление всех задач даёт 0 часов и 0%, затем можно добавить задачу', () => {
  const initial=seedTasks(); let tasks=initial;
  for (const {id} of initial) tasks=deleteTask(tasks,id);
  assert.deepEqual(tasks,[]);
  assert.deepEqual(metrics(tasks),{totalHours:0,doneHours:0,progress:0});
  assert.ok(Number.isFinite(metrics(tasks).progress));
  assert.equal(initial.length,3);
  assert.deepEqual(metrics(addTask(tasks,{title:'После удаления',hours:2})),{totalHours:2,doneHours:0,progress:0});
});
