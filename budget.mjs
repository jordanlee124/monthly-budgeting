const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
export const money = amount => aud.format(amount / 100);
export function cents(value) {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a valid AUD amount with up to two decimal places.');
  const [dollars, fraction = ''] = String(value).split('.');
  return Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
}

export const today = () => {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((v, i) => String(v).padStart(i ? 2 : 4, '0')).join('-');
};
export function shiftMonth(month, offset) {
  const date = new Date(month + '-01T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function dueDate(month, day) {
  const end = new Date(month + '-01T00:00:00Z');
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  const last = end.getUTCDate();
  return month + '-' + String(Math.min(day, last)).padStart(2, '0');
}
export function totals(entries, month) {
  let income = 0, expense = 0;
  for (const entry of entries.filter(entry => entry.date.startsWith(month))) {
    if (entry.type === 'income') income += entry.amount;
    else expense += entry.amount;
  }
  return { income, expense, balance: income - expense };
}
export const budgetFor = (category, month) => category.overrides?.[month] ?? category.budget;
export const frequencies = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly' };

function scheduledDates(schedule, month) {
  const interval = { weekly: 7, fortnightly: 14 }[schedule.frequency];
  if (!interval) return month < schedule.start ? [] : [dueDate(month, schedule.day)];
  const period = interval * 86400000;
  const anchor = Date.parse(schedule.firstDate);
  const first = Date.parse(month + '-01');
  const last = Date.parse(dueDate(month, 31));
  const dates = [];
  for (let day = anchor + Math.max(0, Math.ceil((first - anchor) / period)) * period; day <= last; day += period) {
    dates.push(new Date(day).toISOString().slice(0, 10));
  }
  return dates;
}

export function pendingOccurrences(entries, schedule, month, kind) {
  const idKey = kind + 'Id', monthKey = kind + 'Month', dueKey = kind + 'Due';
  const monthly = !schedule.frequency || schedule.frequency === 'monthly';
  const monthlyId = kind + '-' + schedule.id + '-' + month;
  const recorded = entries.filter(entry => entry[idKey] === schedule.id && entry[monthKey] === month);
  return scheduledDates(schedule, month).filter(date => !recorded.some(entry => {
    if (monthly && (entry.id === monthlyId || !entry[dueKey])) return true;
    return (entry[dueKey] ?? entry.date) === date;
  })).map(date => ({
    id: monthly ? monthlyId : kind + '-' + schedule.id + '-' + date,
    [idKey]: schedule.id, [monthKey]: month, [dueKey]: date,
    name: schedule.name, category: schedule.category ?? '', type: kind === 'bill' ? 'expense' : 'income',
    amount: schedule.amount, date
  }));
}
function recordOccurrence(entries, schedule, month, kind, date) {
  return pendingOccurrences(entries, schedule, month, kind).find(entry => !date || entry.date === date) ?? null;
}
export const recordBill = (entries, bill, month, date) => recordOccurrence(entries, bill, month, 'bill', date);
export const recordSalary = (entries, salary, month, date) => recordOccurrence(entries, salary, month, 'salary', date);

export function calendarEntries({ entries, bills, salaries = [] }, month) {
  const recorded = entries.filter(entry => entry.date.startsWith(month) && (entry.type === 'income' || entry.billId));
  const plans = [
    ...bills.flatMap(bill => pendingOccurrences(entries, bill, month, 'bill')),
    ...salaries.flatMap(salary => pendingOccurrences(entries, salary, month, 'salary'))
  ].map(entry => ({ ...entry, planned: true }));
  return [...recorded.map(entry => ({ ...entry, planned: false })), ...plans].sort((a, b) => a.date.localeCompare(b.date));
}

export function monthlyOverview(state, month) {
  const recorded = totals(state.entries, month);
  const scheduled = totals(calendarEntries(state, month).filter(entry => entry.planned), month);
  return { recorded, scheduled, projectedBalance: recorded.balance + scheduled.balance };
}

export function sample(month) {
  const categories = [
    ['home', 'Housing', 1800, '#315a9f'], ['food', 'Groceries', 600, '#629ed0'],
    ['life', 'Lifestyle', 450, '#d09555'], ['travel', 'Transport', 300, '#8d83be'],
    ['utilities', 'Utilities', 250, '#409596'], ['other', 'Other', 200, '#a05f83']
  ].map(([id, name, budget, colour]) => ({ id, name, budget: budget * 100, colour }));
  const rows = [
    ['Salary', 'income', '', 5850, 1], ['Apartment rent', 'expense', 'home', 1650, 1],
    ['Woolworths', 'expense', 'food', 142.80, 3], ['Opal top-up', 'expense', 'travel', 50, 4],
    ['Weekend brunch', 'expense', 'life', 68.50, 6], ['ALDI', 'expense', 'food', 96.40, 8],
    ['Electricity', 'expense', 'utilities', 114.20, 9], ['Petrol', 'expense', 'travel', 82, 10],
    ['Dinner with friends', 'expense', 'life', 126, 12], ['Coles', 'expense', 'food', 128.60, 13]
  ];
  return {
    demo: true, categories,
    entries: [month, shiftMonth(month, -1), shiftMonth(month, -2)].flatMap((period, index) =>
      rows.map(([name, type, category, amount, day], row) => ({
        id: period + '-' + row, name, type, category,
        ...(index === 0 && row === 0 ? { salaryId: 'sample-pay', salaryMonth: period } : {}), amount: Math.round(amount * 100 * [1, .91, .83][index]), date: dueDate(period, day)
      }))),
    salaries: [{ id: 'sample-pay', name: 'Salary', amount: 585000, day: 1, start: month }],
    bills: [
      { id: 'net', name: 'Home internet', amount: 7900, day: 18, category: 'utilities', start: month },
      { id: 'phone', name: 'Mobile plan', amount: 3900, day: 23, category: 'utilities', start: month },
      { id: 'gym', name: 'Gym membership', amount: 5500, day: 27, category: 'life', start: month }
    ],
    goals: [
      { id: 'emergency', name: 'Emergency fund', target: 800000, saved: 465000, colour: '#315a9f' },
      { id: 'holiday', name: 'Summer holiday', target: 320000, saved: 124000, colour: '#b47435' }
    ]
  };
}
