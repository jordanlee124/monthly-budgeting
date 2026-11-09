import test from 'node:test';
import assert from 'node:assert/strict';
import { cents, shiftMonth, dueDate, totals, recordBill, budgetFor, calendarEntries, recordSalary, monthlyOverview } from './budget.mjs';

test('AUD values are exact to the cent', () => {
  assert.equal(cents('19.09'), 1909);
  assert.equal(cents('0.1'), 10);
  assert.throws(() => cents('1.005'));
});
test('month navigation and short-month bills', () => {
  assert.equal(shiftMonth('2025-12', 1), '2026-01');
  assert.equal(dueDate('2024-02', 31), '2024-02-29');
  assert.equal(dueDate('9999-12', 31), '9999-12-31');
});
test('monthly totals exclude other months and calculate cash left', () => {
  assert.deepEqual(totals([
    { date: '2026-01-01', type: 'income', amount: 500 },
    { date: '2026-01-31', type: 'expense', amount: 125 },
    { date: '2026-02-01', type: 'expense', amount: 300 }
  ], '2026-01'), { income: 500, expense: 125, balance: 375 });
});
test('monthly budgets honour overrides, including zero', () => {
  const category = { budget: 100, overrides: { '2026-01': 0 } };
  assert.equal(budgetFor(category, '2026-01'), 0);
  assert.equal(budgetFor(category, '2026-02'), 100);
});
test('a bill is recorded once per month and never before its start', () => {
  const bill = { id: 'b1', name: 'Internet', category: 'home', amount: 6000, day: 31, start: '2026-01' };
  assert.equal(recordBill([], bill, '2025-12'), null);
  const entry = recordBill([], bill, '2026-02');
  assert.equal(entry.date, '2026-02-28');
  assert.equal(recordBill([entry], bill, '2026-02'), null);
  assert.equal(recordBill([entry], bill, '2026-03').amount, 6000);
});
test('calendar shows scheduled income and bills once, replacing plans with recorded entries', () => {
  const salary = { id: 'salary', name: 'Pay', start: '2026-02', amount: 350000, day: 31 };
  const bill = { id: 'rent', name: 'Rent', start: '2026-02', amount: 170000, day: 10 };
  const other = { id: 'bonus', date: '2026-02-12', type: 'income', name: 'Bonus', amount: 60000 };
  const state = { salaries: [salary], bills: [bill], entries: [other] };
  assert.deepEqual(calendarEntries(state, '2026-01'), []);
  assert.deepEqual(calendarEntries(state, '2026-02').map(({ name, date, planned }) => [name, date, planned]), [
    ['Rent', '2026-02-10', true], ['Bonus', '2026-02-12', false], ['Pay', '2026-02-28', true]
  ]);
  const payment = recordSalary(state.entries, salary, '2026-02');
  state.entries.push({ ...payment, date: '2026-02-27' });
  assert.equal(recordSalary(state.entries, salary, '2026-02'), null);
  assert.equal(payment.type, 'income');
  assert.equal(calendarEntries(state, '2026-02').filter(entry => entry.name === 'Pay').length, 1);
  assert.equal(calendarEntries(state, '2026-02').at(-1).date, '2026-02-27');
  assert.equal(totals(state.entries, '2026-02').income, 410000);
  assert.equal(calendarEntries({ bills: [], entries: [other] }, '2026-02').length, 1);
});

test('weekly and fortnightly schedules keep their cadence across months', () => {
  const bill = { id: 'rent-weekly', name: 'Rent', frequency: 'weekly', firstDate: '2026-01-30', amount: 45000 };
  const salary = { id: 'pay-fortnightly', name: 'Pay', frequency: 'fortnightly', firstDate: '2026-01-30', amount: 220000 };
  const state = { entries: [], bills: [bill], salaries: [salary] };
  assert.deepEqual(calendarEntries(state, '2025-12'), []);
  assert.deepEqual(calendarEntries(state, '2026-02').filter(e => e.billId).map(e => e.date),
    ['2026-02-06', '2026-02-13', '2026-02-20', '2026-02-27']);
  assert.deepEqual(calendarEntries(state, '2026-03').filter(e => e.salaryId).map(e => e.date),
    ['2026-03-13', '2026-03-27']);
  assert.equal(recordBill([], bill, '2026-02', '2026-02-07'), null);
  const first = recordBill([], bill, '2026-02', '2026-02-06');
  const second = recordBill([first], bill, '2026-02', '2026-02-13');
  assert.notEqual(first.id, second.id);
  state.entries.push({ ...first, date: '2026-02-05' }, second);
  assert.equal(recordBill(state.entries, bill, '2026-02', '2026-02-06'), null);
  assert.deepEqual(calendarEntries(state, '2026-02').filter(e => e.billId).map(e => [e.date, e.planned]), [
    ['2026-02-05', false], ['2026-02-13', false], ['2026-02-20', true], ['2026-02-27', true]
  ]);
  assert.equal(totals(state.entries, '2026-02').expense, 90000);
});

test('overview includes scheduled pay and bills, then moves each occurrence into recorded totals', () => {
  const month = '2026-11';
  const salary = { id: 'pay', name: 'Pay', frequency: 'fortnightly', firstDate: '2026-11-09', amount: 125000 };
  const bill = { id: 'rent', name: 'Rent', frequency: 'weekly', firstDate: '2026-11-09', amount: 5400 };
  const state = { entries: [], bills: [bill], salaries: [salary] };
  const before = monthlyOverview(state, month);
  assert.deepEqual(before, {
    recorded: { income: 0, expense: 0, balance: 0 },
    scheduled: { income: 250000, expense: 21600, balance: 228400 },
    projectedBalance: 228400
  });
  state.entries.push(recordSalary([], salary, month, '2026-11-23'), recordBill([], bill, month, '2026-11-16'));
  const after = monthlyOverview(state, month);
  assert.deepEqual(after.recorded, { income: 125000, expense: 5400, balance: 119600 });
  assert.deepEqual(after.scheduled, { income: 125000, expense: 16200, balance: 108800 });
  assert.equal(after.projectedBalance, before.projectedBalance);
  assert.equal(monthlyOverview(state, '2026-10').projectedBalance, 0);
});
