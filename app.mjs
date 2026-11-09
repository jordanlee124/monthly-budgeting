import { money, cents, today, shiftMonth, dueDate, totals, budgetFor, recordBill, recordSalary, calendarEntries, pendingOccurrences, frequencies, monthlyOverview, sample } from './budget.mjs';
import { icon } from './icons.mjs';
import { translate } from './i18n.mjs';

const $ = id => document.getElementById(id);
// Storage keys stay stable across the rebrand so existing budgets and preferences still load.
const key = 'gumleaf-budget-v1';
const languageKey = 'gumleaf-language';
let language = 'en';
try { if (localStorage.getItem(languageKey) === 'ko') language = 'ko'; } catch {}
const t = (message, values) => translate(language, message, values);
const locale = () => language === 'ko' ? 'ko-KR' : 'en-AU';
const currentMonth = today().slice(0, 7);
const pages = { overview: 'Overview', entries: 'Transactions', calendar: 'Calendar', salaries: 'Salary & income', categories: 'Budgets', bills: 'Recurring bills', goals: 'Savings goals' };
let page = 'overview', month = currentMonth, editing, noticeTimer, loadFailed = false;
let state;
try {
  const saved = localStorage.getItem(key);
  state = saved ? JSON.parse(saved) : sample(currentMonth);
  state.salaries ??= [];
  if (!['entries', 'categories', 'bills', 'goals', 'salaries'].every(list => Array.isArray(state?.[list]))) throw new Error('Invalid workspace');
} catch {
  loadFailed = true;
  state = sample(currentMonth);
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const colour = value => /^#[a-f\d]{6}$/i.test(value) ? value : '#315a9f';
const dateFormat = (date, options) => new Intl.DateTimeFormat(locale(), { ...options, timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
const monthName = (value, format = 'long') => dateFormat(value + '-01', { month: format, year: 'numeric' });
const shortDate = date => dateFormat(date, { day: 'numeric', month: 'short' });
const categoryOf = id => state.categories.find(item => item.id === id);
const categoryName = entry => entry.type === 'income' ? t('Income') : categoryOf(entry.category)?.name ?? t('Uncategorised');
const entriesFor = period => state.entries.filter(entry => entry.date.startsWith(period)).sort((a, b) => b.date.localeCompare(a.date));
const spent = id => entriesFor(month).filter(e => e.type === 'expense' && e.category === id).reduce((sum, e) => sum + e.amount, 0);
const empty = message => `<p class="empty">${message}</p>`;
const action = (name, label, glyph, id = '', style = '', date = '') => `<button class="${style}" data-action="${name}" data-id="${esc(id)}"${date ? ` data-date="${date}" aria-label="${esc(t('{action} for {date}', { action: label, date: shortDate(date) }))}"` : ''}>${glyph ? icon(glyph) : ''}${label}</button>`;
const link = (target, label) => action('page', label, 'arrow', target, 'text-button arrow-link');
const dot = value => `<i class="dot" style="--dot:${colour(value)}"></i>`;
const meter = (amount, max, hue, label) => `<div class="meter" role="progressbar" aria-label="${esc(label)}" aria-valuenow="${max > 0 ? Math.min(100, Math.round(amount * 100 / max)) : 0}"><span style="--progress:${max > 0 ? Math.min(100, amount * 100 / max) : 0}%;--fill:${colour(hue)}"></span></div>`;
const heading = (title, subtitle, control = '') => `<div class="section-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${control}</div>`;

function notice(message) {
  $('notice').textContent = t(message);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $('notice').textContent = ''; }, 4500);
}
function commit(change) {
  if (loadFailed) throw new Error('The saved workspace could not be read. Changes are disabled to protect your data.');
  const next = structuredClone(state);
  change(next);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    throw new Error('This browser could not save the changes. Check that local storage is available.');
  }
  state = next;
  render();
}

function transactionList(entries, message = t('No transactions for this month yet.')) {
  if (!entries.length) return empty(message);
  return `<ul class="rows">${entries.map(entry => `
    <li><button class="row transaction" data-action="entries" data-id="${esc(entry.id)}" aria-label="${esc(t('Edit {name}', { name: entry.name }))}">
      <span class="row-icon ${entry.type === 'income' ? 'sky' : ''}">${icon(entry.type === 'income' ? 'income' : 'wallet')}</span>
      <span class="row-name"><strong>${esc(entry.name)}</strong><small>${esc(categoryName(entry))}</small></span>
      <span class="row-date">${shortDate(entry.date)}</span>
      <strong class="amount ${entry.type === 'income' ? 'positive' : ''}">${entry.type === 'income' ? '+' : '−'}${money(entry.amount)}</strong>
      <span class="row-chevron">${icon('right')}</span>
    </button></li>`).join('')}</ul>`;
}
function spending() {
  const groups = new Map();
  for (const entry of entriesFor(month).filter(e => e.type === 'expense')) {
    const category = categoryOf(entry.category);
    const id = category?.id ?? '';
    const group = groups.get(id) ?? { name: category?.name ?? t('Uncategorised'), colour: category?.colour ?? '#7789a8', amount: 0 };
    group.amount += entry.amount;
    groups.set(id, group);
  }
  const slices = [...groups.values()].sort((a, b) => b.amount - a.amount);
  const total = slices.reduce((sum, group) => sum + group.amount, 0);
  let position = 0;
  const stops = slices.map(group => {
    const start = position;
    position += group.amount / total * 100;
    return colour(group.colour) + ' ' + start + '% ' + position + '%';
  });
  return `<div class="spending"><div class="donut" style="--chart:${total ? 'conic-gradient(' + stops.join(',') + ')' : 'var(--track)'}"><div><small>${t('TOTAL SPENT')}</small><strong>${money(total)}</strong></div></div>
    <div class="legend">${slices.length ? slices.map(group => `<div>${dot(group.colour)}<span>${esc(group.name)}</span><strong>${money(group.amount)}</strong></div>`).join('') : empty(t('No expenses to chart yet.'))}</div></div>`;
}
function cashFlow() {
  const periods = [-2, -1, 0].map(offset => shiftMonth(month, offset));
  const values = periods.map(period => totals(state.entries, period));
  const max = Math.max(1, ...values.flatMap(value => [value.income, value.expense]));
  return `<div class="flow-key"><span><i class="dot flow-income"></i>${t('Income')}</span><span><i class="dot flow-expense"></i>${t('Expenses')}</span></div>
    <div class="flow">${periods.map((period, i) => {
      const label = dateFormat(period + '-01', { month: 'short' });
      const { income, expense } = values[i];
      const details = t('{month}. Income {income}. Expenses {expense}.', { month: monthName(period), income: money(income), expense: money(expense) });
      return `<div class="flow-column" role="img" aria-label="${details}" title="${details}"><div class="bars"><i style="--bar:${income / max * 100}%"></i><i style="--bar:${expense / max * 100}%"></i></div><span>${label}</span></div>`;
    }).join('')}</div>`;
}
const metrics = (recorded, scheduled, allocated) => [
  ['income', t('Recorded income'), recorded.income, t('{amount} scheduled income', { amount: money(scheduled.income) }), 'sky'],
  ['expense', t('Recorded expenses'), recorded.expense, t('{amount} scheduled bills', { amount: money(scheduled.expense) }), 'amber'],
  ['categories', t('Budget allocated'), allocated, t('Across all spending categories'), 'lavender']
].map(([glyph, title, value, hint, tone]) => `<article class="card metric"><div class="metric-heading"><span class="row-icon ${tone}">${icon(glyph)}</span>${title}</div><strong>${money(value)}</strong><small>${hint}</small></article>`).join('');

function overview() {
  const { recorded, scheduled, projectedBalance } = monthlyOverview(state, month);
  const allocated = state.categories.reduce((sum, category) => sum + budgetFor(category, month), 0);
  return `
    <div class="page-title overview-title"><div><span class="eyebrow"><i></i> ${monthName(month)}</span><h1>${t('Monthly overview')}</h1><p>${t('See where your money goes and what you have left.')}</p></div>
      ${action('page', t('View calendar'), 'calendar', 'calendar', 'calendar-shortcut')}</div>
    <section class="hero" aria-label="${t('Monthly balance')}">
      <svg class="hero-art" viewBox="0 0 590 220" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <g fill="none" stroke="#99cafa" stroke-opacity=".24">
          <path d="M-20 219C121 197 137 81 295 93s211 34 315-64M-20 233C134 211 154 100 300 110s209 35 311-64M-17 246c157-22 186-125 324-120s210 32 305-63M-13 263c168-24 198-123 329-121s204 24 296-62M-5 279c168-25 216-119 334-119s198 17 283-62"/>
          <circle cx="452" cy="101" r="92"/><circle cx="452" cy="101" r="73" stroke-dasharray="2 5"/><circle cx="452" cy="101" r="52"/>
          <path d="M452 0v201M349 101h206M400 49l104 104m0-104L400 153"/>
        </g>
        <path d="m483 68-18 46-45 20 19-47z" fill="#89bdf4" fill-opacity=".14" stroke="#a7d2fc" stroke-opacity=".7"/>
        <path d="m483 68-31 33-13-14z" fill="#efbd7e" fill-opacity=".85"/>
        <circle cx="452" cy="101" r="3" fill="#f2c890"/>
      </svg>
      <div class="hero-body"><span class="hero-label">${icon('wallet')} ${t('RECORDED BALANCE')}</span><strong>${money(recorded.balance)}</strong><p>${t('Recorded income minus expenses for {month}', { month: monthName(month) })}</p>
        <div class="hero-forecast"><span>${t('Projected month-end balance')}</span><b>${money(projectedBalance)}</b></div>
        <p>${t('Includes scheduled income and bills')}</p></div>
      <span class="hero-badge">AUD</span>
    </section>
    <section class="metric-grid" aria-label="${t('Monthly totals')}">${metrics(recorded, scheduled, allocated)}</section>
    <div class="chart-grid">
      <section class="card panel">${heading(t('Spending breakdown'), t('Recorded expenses by category'), link('categories', t('View budgets')))}${spending()}</section>
      <section class="card panel">${heading(t('Cash flow'), t('Recorded income and expenses over 3 months'))}${cashFlow()}</section>
    </div>
    <section class="card panel recent">${heading(t('Recent transactions'), t('Latest activity for this month'), link('entries', t('All transactions')))}${transactionList(entriesFor(month).slice(0, 5))}</section>`;
}

function calendarView() {
  const events = calendarEntries(state, month);
  const first = new Date(month + '-01T00:00:00Z');
  const offset = (first.getUTCDay() + 6) % 7;
  const lastDay = Number(dueDate(month, 31).slice(-2));
  const weekdays = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')];
  const cells = Array.from({ length: Math.ceil((offset + lastDay) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > lastDay) return '<div class="calendar-blank" aria-hidden="true"></div>';
    const date = dueDate(month, day);
    const items = events.filter(entry => entry.date === date);
    const label = dateFormat(date, { weekday: 'short', day: 'numeric', month: 'short' });
    return `<section class="calendar-day ${items.length ? 'has-events' : ''}" aria-label="${label}">
      <time datetime="${date}" ${date === today() ? 'aria-current="date"' : ''}><span class="calendar-number">${day}</span><span class="agenda-date">${label}</span></time>
      ${items.map(entry => {
        const type = entry.type === 'income' ? 'incoming' : 'outgoing';
        const command = entry.planned ? (entry.salaryId ? 'salaries' : 'bills') : 'entries';
        const id = entry.planned ? (entry.salaryId ?? entry.billId) : entry.id;
        const category = entry.billId ? categoryOf(entry.category)?.name : '';
        return `<button class="calendar-event ${type}" data-action="${command}" data-id="${esc(id)}">
          <strong>${esc(entry.name)}</strong><span>${entry.type === 'income' ? '+' : '−'}${money(entry.amount)}</span>
          <small>${entry.planned ? t('Scheduled') : t('Recorded')}${category ? ' · ' + esc(category) : ''}</small></button>`;
      }).join('')}</section>`;
  }).join('');
  return `<div class="page-title"><span class="eyebrow"><i></i> ${monthName(month)}</span><h1>${t('Cash-flow calendar')}</h1>
    <p>${t('See recorded income and recurring bill payments alongside upcoming and unpaid schedules.')}</p></div>
    <section class="card panel calendar-panel">
      <div class="section-head"><div><h2>${monthName(month)}</h2><p>${t('Scheduled amounts enter your balance when recorded.')}</p></div>${link('salaries', t('Manage income'))}</div>
      ${events.length ? '' : empty(t('No income or recurring bills for this month.'))}
      <div class="calendar-grid">${weekdays.map(day => `<div class="weekday" aria-hidden="true">${day}</div>`).join('')}${cells}</div>
    </section>`;
}

function collection() {
  const headings = {
    entries: [t('Transactions'), t('Review and update your income and expenses.'), t('Add transaction'), 'entries'],
    categories: [t('Budgets'), t('Set spending limits and see how much you have used this month.'), t('Add category'), 'categories'],
    salaries: [t('Salary & income'), t('Schedule regular pay or log one-off income.'), t('Add salary schedule'), 'salaries'],
    bills: [t('Recurring bills'), t('Track recurring bills and record each payment when it happens.'), t('Add bill'), 'bills'],
    goals: [t('Savings goals'), t('Set a target and update your saved amount as you go.'), t('Add goal'), 'goals']
  };
  const [title, subtitle, label, target] = headings[page];
  const titleBlock = `<div class="page-title collection-title"><div><span class="eyebrow"><i></i> ${page === 'goals' ? t('ALL MONTHS') : monthName(month)}</span><h1>${title}</h1><p>${subtitle}</p></div>${page === 'entries' ? '' : action(target, label, 'plus', '', 'primary')}</div>`;
  if (page === 'entries') return titleBlock + `<section class="card panel">${transactionList(entriesFor(month))}</section>`;
  if (page === 'categories') return titleBlock + `<div class="item-grid">${state.categories.map(item => {
    const used = spent(item.id), limit = budgetFor(item, month);
    return `<article class="card panel item"><div class="item-top"><h2>${dot(item.colour)}${esc(item.name)}</h2>${action('categories', t('Edit'), 'edit', item.id, 'small')}</div>
      <div class="item-amount"><strong>${money(used)}</strong><small> ${t('of {amount} budgeted', { amount: money(limit) })}</small></div>
      ${meter(used, limit, used > limit ? '#ad4f34' : item.colour, t('{name} budget used', { name: item.name }))}
      <p class="${used > limit ? 'negative' : 'muted'}">${t(used > limit ? '{amount} over budget' : '{amount} remaining', { amount: money(Math.abs(limit - used)) })}</p></article>`;
  }).join('') || empty(t('Add a category to set your first spending limit.'))}</div>`;
  if (page === 'goals') return titleBlock + `<div class="item-grid">${state.goals.map(goal => `
    <article class="card panel item"><div class="item-top"><h2>${dot(goal.colour)}${esc(goal.name)}</h2>${action('goals', t('Edit'), 'edit', goal.id, 'small')}</div>
      <div class="item-amount"><strong>${money(goal.saved)}</strong><small> ${t('of {amount} saved', { amount: money(goal.target) })}</small></div>
      ${meter(goal.saved, goal.target, goal.colour, t('{name} progress', { name: goal.name }))}
      <p class="muted">${goal.saved >= goal.target ? t('Goal reached') : t('{amount} to go', { amount: money(goal.target - goal.saved) })}</p></article>`).join('') || empty(t('Add a goal to start tracking your savings.'))}</div>`;
  const salaryPage = page === 'salaries';
  const kind = salaryPage ? 'salary' : 'bill';
  const schedules = state[page];
  const recorded = entriesFor(month);
  const recordedIncome = salaryPage ? `<section class="card panel recent">${heading(t('Recorded income'), t('Income received in {month}', { month: monthName(month) }), action('add-income', t('Add income'), 'plus', '', 'small'))}
    ${transactionList(entriesFor(month).filter(entry => entry.type === 'income'), t('No income recorded for this month.'))}</section>` : '';
  return titleBlock + `<div class="item-grid">${schedules.map(schedule => {
    const frequency = schedule.frequency ?? 'monthly';
    const next = pendingOccurrences(state.entries, schedule, month, kind).map(entry => ({ ...entry, planned: true }));
    const paid = recorded.filter(entry => entry[kind + 'Id'] === schedule.id);
    const occurrences = [...next, ...paid].sort((a, b) => a.date.localeCompare(b.date));
    const start = frequency === 'monthly' ? dueDate(schedule.start, schedule.day) : schedule.firstDate;
    return `<article class="card panel item"><div class="item-top"><h2>${dot(categoryOf(schedule.category)?.colour)}${esc(schedule.name)}</h2>${action(page, t('Edit'), 'edit', schedule.id, 'small')}</div>
      <div class="item-amount"><strong>${money(schedule.amount)}</strong><small> · ${t(frequencies[frequency])}</small></div>
      ${occurrences.map(entry => `<div class="bill-foot"><span>${shortDate(entry.date)}${entry.planned ? '' : ' · ' + money(entry.amount)}</span>
        ${entry.planned ? action(salaryPage ? 'record-salary' : 'record', salaryPage ? t('Record income') : t('Record payment'), 'check', schedule.id, 'small', entry.date) : `<span class="tag">${t('Recorded')}</span>`}</div>`).join('') ||
        `<p class="muted">${month < start.slice(0, 7) ? t('Starts {date}', { date: dateFormat(start, { year: 'numeric', month: 'short', day: 'numeric' }) }) : t('No occurrences this month.')}</p>`}</article>`;
  }).join('') || empty(salaryPage ? t('Add a salary schedule to see your next payday.') : t('Add a recurring bill to see when it is due.'))}</div>` + recordedIncome;
}

function render() {
  $('month').value = month;
  $('month-text').textContent = monthName(month);
  $('crumb').textContent = t(pages[page]);
  document.querySelector('[data-action="prev"]').disabled = month === '1900-01';
  document.querySelector('[data-action="next"]').disabled = month === '9999-12';
  $('demo').hidden = !state.demo || loadFailed;
  for (const button of $('nav').querySelectorAll('button')) {
    if (button.dataset.id === page) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  $('content').innerHTML = (loadFailed ? `<p role="alert" class="error-banner">${t('The saved workspace could not be read. This preview is read-only to protect your data.')}</p>` : '') +
    (page === 'overview' ? overview() : page === 'calendar' ? calendarView() : collection());
}

const editor = $('editor');
const field = (label, name, value, type = 'text', attributes = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${attributes} required></label>`;
const select = (label, name, value, options) => `<label class="field"><span>${label}</span><select name="${name}">${options.map(([id, title]) => `<option value="${esc(id)}" ${value === id ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select></label>`;
const dollars = amount => amount == null ? '' : (amount / 100).toFixed(2);
const amountField = (label, name, value) => field(label, name, dollars(value), 'text', 'inputmode="decimal" maxlength="12" placeholder="0.00"');
const categoryOptions = () => [['', t('Uncategorised')], ...state.categories.map(category => [category.id, category.name])];
const editorNames = { entries: 'transaction', categories: 'category', bills: 'bill', goals: 'goal', salaries: 'salary schedule' };

function openEditor(list, id, defaultType = 'expense') {
  const item = state[list].find(row => row.id === id);
  editing = { list, item };
  $('editor-title').textContent = t((item ? 'Edit ' : 'Add ') + editorNames[list]);
  $('form-error').textContent = '';
  editor.querySelector('[data-action="delete"]').hidden = !item;
  const name = field(list === 'entries' ? t('Description') : t('Name'), 'name', item?.name, 'text', 'maxlength="80"');
  const category = select(t('Category'), 'category', item?.category ?? '', categoryOptions());
  const scheduledMonth = item?.billMonth ?? item?.salaryMonth;
  const dateLimits = scheduledMonth
    ? `min="${scheduledMonth}-01" max="${dueDate(scheduledMonth, 31)}"`
    : 'min="1900-01-01" max="9999-12-31"';
  const hues = ['#315a9f', '#629ed0', '#d09555', '#8d83be', '#409596', '#a05f83'];
  const colourField = field(t('Colour'), 'colour', item?.colour ?? hues[state[list].length % hues.length], 'color');
  const type = item?.type ?? defaultType;
  const firstDate = item?.firstDate ?? (item?.start ? dueDate(item.start, item.day) : (month === currentMonth ? today() : month + '-01'));
  const scheduleFields = select(t('Frequency'), 'frequency', item?.frequency ?? 'monthly', Object.entries(frequencies).map(([id, name]) => [id, t(name)])) +
    '<fieldset id="monthly-fields">' +
    field(list === 'bills' ? t('Due day of the month') : t('Payday of the month'), 'day', item?.day ?? Number(firstDate.slice(-2)), 'number', 'min="1" max="31"') +
    field(t('First month'), 'start', item?.start ?? firstDate.slice(0, 7), 'month', 'min="1900-01" max="9999-12"') + '</fieldset>' +
    '<fieldset id="interval-fields">' +
    field(list === 'bills' ? t('First due date') : t('First payday'), 'firstDate', firstDate, 'date', dateLimits) + '</fieldset>';
  const forms = {
    entries: name + select(t('Type'), 'type', type, item?.salaryId || defaultType === 'income' ? [['income', t('Income')]] : item?.billId ? [['expense', t('Expense')]] : [['expense', t('Expense')], ['income', t('Income')]]) +
      '<div id="entry-category">' + category + '</div>' +
      amountField(t('Amount (AUD)'), 'amount', item?.amount) + field(t('Date'), 'date', item?.date ?? (month === currentMonth ? today() : month + '-01'), 'date', dateLimits),
    categories: name + colourField + amountField(t('Default monthly budget (AUD)'), 'budget', item?.budget ?? 0) +
      (item ? amountField(t('Budget for {month} (AUD, optional)', { month: monthName(month) }), 'override', item.overrides?.[month]).replace(' required', '') : '') +
      `<p class="field-hint">${t('The default applies every month unless you set a monthly override.')}</p>`,
    bills: name + category + amountField(t('Amount per payment (AUD)'), 'amount', item?.amount) + scheduleFields,
    salaries: name + amountField(t('Take-home pay per payday (AUD)'), 'amount', item?.amount) + scheduleFields,
    goals: name + colourField + amountField(t('Target (AUD)'), 'target', item?.target) + amountField(t('Already saved (AUD)'), 'saved', item?.saved ?? 0)
  };
  $('fields').innerHTML = forms[list];
  const typeInput = $('form').elements.namedItem('type');
  if (typeInput) {
    const update = () => { $('entry-category').hidden = typeInput.value === 'income'; };
    typeInput.addEventListener('change', update);
    update();
  }
  const frequency = $('form').elements.namedItem('frequency');
  if (frequency) {
    const update = () => {
      const monthly = frequency.value === 'monthly';
      $('monthly-fields').hidden = $('monthly-fields').disabled = !monthly;
      $('interval-fields').hidden = $('interval-fields').disabled = monthly;
    };
    frequency.addEventListener('change', update);
    update();
  }
  editor.showModal();
  $('form').elements.namedItem('name').focus();
}
function readEditor(data) {
  const { list, item } = editing;
  const name = data.get('name').trim();
  if (!name) throw new Error('Enter a name or description.');
  const getAmount = (field, positive = false) => {
    const amount = cents(data.get(field).trim());
    if (positive && !amount) throw new Error('Enter an amount greater than zero.');
    return amount;
  };
  const base = { ...item, id: item?.id ?? crypto.randomUUID(), name };
  const category = data.get('category');
  if (list === 'entries') {
    const type = data.get('type');
    return { ...base, type, category: type === 'income' ? '' : category, date: data.get('date'), amount: getAmount('amount', true) };
  }
  if (list === 'bills' || list === 'salaries') {
    const frequency = data.get('frequency');
    const schedule = { id: base.id, name, category: category ?? '', amount: getAmount('amount', true), frequency };
    return frequency === 'monthly'
      ? { ...schedule, day: Number(data.get('day')), start: data.get('start') }
      : { ...schedule, firstDate: data.get('firstDate') };
  }
  const hue = colour(data.get('colour'));
  if (list === 'goals') return { ...base, colour: hue, target: getAmount('target', true), saved: getAmount('saved') };
  const overrides = { ...item?.overrides };
  if (data.get('override')?.trim()) overrides[month] = getAmount('override');
  else delete overrides[month];
  return { ...base, colour: hue, budget: getAmount('budget'), overrides };
}
$('form').addEventListener('invalid', event => {
  if (language !== 'ko') return;
  event.preventDefault();
  const field = event.target;
  if (field !== $('form').querySelector('input:invalid, select:invalid')) return;
  $('form-error').textContent = t('Check the value for {field}.', { field: field.labels[0]?.firstElementChild.textContent ?? '' });
  field.focus();
}, true);
$('form').addEventListener('input', () => { $('form-error').textContent = ''; });
$('form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const updated = readEditor(new FormData(event.currentTarget));
    const { list, item } = editing;
    commit(next => {
      if (item) next[list] = next[list].map(row => row.id === item.id ? updated : row);
      else next[list].push(updated);
    });
    editor.close();
    const moved = list === 'entries' && !updated.date.startsWith(month);
    notice(moved ? t('Transaction saved to {month}.', { month: monthName(updated.date.slice(0, 7)) }) : t('Changes saved.'));
  } catch (error) {
    $('form-error').textContent = t(error.message);
  }
});

function setLanguage(value) {
  language = value === 'ko' ? 'ko' : 'en';
  document.documentElement.lang = locale();
  document.title = t('Harbour Ledger | Monthly budget');
  for (const node of document.querySelectorAll('[data-text]')) node.textContent = t(node.dataset.text);
  for (const node of document.querySelectorAll('[data-label]')) {
    const label = t(node.dataset.label);
    node.setAttribute('aria-label', label);
    if (node.hasAttribute('title')) node.title = label;
  }
  const toggle = $('language');
  const option = toggle.firstElementChild;
  option.textContent = language === 'ko' ? 'English' : '한국어';
  option.lang = language === 'ko' ? 'en' : 'ko';
  toggle.setAttribute('aria-label', t('Language') + ': ' + option.textContent);
  $('nav').innerHTML = Object.entries(pages).map(([id, title]) =>
    action('page', t(title), id === 'overview' ? 'grid' : id === 'salaries' ? 'income' : id, id)).join('');
  render();
}
$('language').addEventListener('click', () => {
  setLanguage(language === 'ko' ? 'en' : 'ko');
  try { localStorage.setItem(languageKey, language); }
  catch { notice('This browser could not save your language preference.'); }
});
document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
$('month').addEventListener('change', event => {
  if (event.target.validity.valid && event.target.value) month = event.target.value;
  render();
});
$('demo').addEventListener('click', () => {
  if (!confirm(t('Start with an empty workspace? This permanently deletes all transactions, categories, bills, salary schedules and goals, including any changes you made.'))) return;
  try {
    commit(next => Object.assign(next, { demo: false, categories: [], entries: [], bills: [], salaries: [], goals: [] }));
    notice(t('Your workspace is ready.'));
  } catch (error) {
    notice(error.message);
  }
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action: command, id, date } = button.dataset;
  if (command === 'prev' || command === 'next') {
    month = shiftMonth(month, command === 'prev' ? -1 : 1);
    render();
  } else if (command === 'page') {
    page = id;
    render();
    $('content').querySelector('h1').setAttribute('tabindex', '-1');
    $('content').querySelector('h1').focus();
    window.scrollTo(0, 0);
  } else if (command === 'close') {
    editor.close();
  } else if (command === 'delete') {
    const { list, item } = editing;
    const detail = list === 'categories' ? t('Related transactions and bills will become uncategorised.') :
      list === 'bills' || list === 'salaries' ? t('Recorded transactions will stay in your ledger.') : '';
    if (!confirm([t('Delete “{name}”?', { name: item.name }), detail].filter(Boolean).join(' '))) return;
    try {
      commit(next => {
        next[list] = next[list].filter(row => row.id !== item.id);
        if (list === 'categories') {
          for (const row of [...next.entries, ...next.bills]) if (row.category === item.id) row.category = '';
        }
      });
      editor.close();
      notice(t('Item deleted.'));
    } catch (error) {
      $('form-error').textContent = t(error.message);
    }
  } else if (command === 'add-income') {
    openEditor('entries', '', 'income');
  } else if (command === 'record' || command === 'record-salary') {
    try {
      const salary = command === 'record-salary';
      const schedule = (salary ? state.salaries : state.bills).find(item => item.id === id);
      const entry = (salary ? recordSalary : recordBill)(state.entries, schedule, month, date);
      if (entry) {
        commit(next => next.entries.push(entry));
        notice(t(salary ? 'Income recorded for {date}.' : 'Payment recorded for {date}.', { date: shortDate(entry.date) }));
      }
    } catch (error) {
      notice(error.message);
    }
  } else if (Object.hasOwn(editorNames, command)) {
    openEditor(command, id);
  }
});
const themeKey = 'gumleaf-theme';
function setTheme(night) {
  document.documentElement.dataset.theme = night ? 'night' : 'light';
  $('theme').setAttribute('aria-pressed', String(night));
  $('theme').innerHTML = icon(night ? 'sun' : 'moon');
}
try { setTheme(localStorage.getItem(themeKey) === 'night'); } catch { setTheme(false); }
$('theme').addEventListener('click', () => {
  const night = $('theme').getAttribute('aria-pressed') !== 'true';
  setTheme(night);
  try { localStorage.setItem(themeKey, night ? 'night' : 'light'); }
  catch { notice(t('This browser could not save your theme preference.')); }
});
window.addEventListener('storage', event => {
  if (event.key === themeKey || event.key === null) setTheme(event.newValue === 'night');
  if (event.key === languageKey || event.key === null) {
    if (editor.open) editor.close();
    setLanguage(event.newValue);
  }
  if (event.key !== key && event.key !== null) return;
  if (editor.open) editor.close();
  try {
    state = event.newValue ? JSON.parse(event.newValue) : sample(currentMonth);
    state.salaries ??= [];
    loadFailed = false;
  } catch {
    loadFailed = true;
  }
  render();
  notice(t('The workspace changed in another tab.'));
});
setLanguage(language);
