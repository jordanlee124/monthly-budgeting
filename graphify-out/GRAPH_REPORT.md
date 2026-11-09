# Graph Report - monthly-budgeting  (2026-11-09)

## Corpus Check
- 7 files · ~6,669 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: .css 1)

## Summary
- 74 nodes · 219 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- app.mjs
- budget.mjs
- collection
- t
- overview
- Harbour Ledger
- i18n.mjs
- calendarView
- render

## God Nodes (most connected - your core abstractions)
1. `collection()` - 20 edges
2. `t()` - 16 edges
3. `overview()` - 16 edges
4. `calendarView()` - 13 edges
5. `transactionList()` - 10 edges
6. `spending()` - 10 edges
7. `esc()` - 9 edges
8. `action()` - 9 edges
9. `openEditor()` - 9 edges
10. `money()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `t()` --calls--> `translate()`  [EXTRACTED]
  app.mjs → i18n.mjs
- `spending()` --calls--> `money()`  [EXTRACTED]
  app.mjs → budget.mjs
- `cashFlow()` --calls--> `money()`  [EXTRACTED]
  app.mjs → budget.mjs
- `cashFlow()` --calls--> `shiftMonth()`  [EXTRACTED]
  app.mjs → budget.mjs
- `cashFlow()` --calls--> `totals()`  [EXTRACTED]
  app.mjs → budget.mjs

## Import Cycles
- None detected.

## Communities (9 total, 1 thin omitted)

### Community 0 - "app.mjs"
Cohesion: 0.24
Nodes (10): amountField(), categoryName(), categoryOf(), currentMonth, dollars(), editor, editorNames, field() (+2 more)

### Community 1 - "budget.mjs"
Cohesion: 0.28
Nodes (14): aud, budgetFor(), calendarEntries(), cents(), dueDate(), monthlyOverview(), pendingOccurrences(), recordBill() (+6 more)

### Community 2 - "collection"
Cohesion: 0.31
Nodes (11): collection(), colour(), dot(), empty(), entriesFor(), esc(), heading(), meter() (+3 more)

### Community 3 - "t"
Cohesion: 0.50
Nodes (5): categoryOptions(), notice(), openEditor(), select(), t()

### Community 4 - "overview"
Cohesion: 0.31
Nodes (10): action(), link(), metrics(), overview(), setTheme(), shortDate(), transactionList(), money() (+2 more)

### Community 5 - "Harbour Ledger"
Cohesion: 0.40
Nodes (4): Harbour Ledger, Run locally, Run tests, Using Harbour Ledger

### Community 7 - "calendarView"
Cohesion: 0.60
Nodes (5): calendarView(), cashFlow(), dateFormat(), monthName(), today()

### Community 8 - "render"
Cohesion: 0.50
Nodes (4): commit(), locale(), render(), setLanguage()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `collection()` connect `collection` to `app.mjs`, `budget.mjs`, `t`, `overview`, `calendarView`, `render`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `dueDate()` connect `budget.mjs` to `app.mjs`, `collection`, `t`, `calendarView`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `app.mjs`, `collection`, `overview`, `i18n.mjs`, `calendarView`, `render`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._