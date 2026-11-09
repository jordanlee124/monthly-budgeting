# Harbour Ledger

Harbour Ledger is a local monthly budgeting web app with Australian dates and AUD amounts. It uses plain HTML, CSS and JavaScript.

## Run locally

1. Install Python 3 if you don't have it.
2. Open a terminal in this project folder and run:

   ```powershell
   python -m http.server 8000 --bind 127.0.0.1
   ```

   On Windows, use `py` if `python` is unavailable. On macOS or Linux, use `python3`.
3. Open [Harbour Ledger](http://127.0.0.1:8000) in a modern browser. Keep the terminal open while using the app.

## Using Harbour Ledger

- **Overview** shows recorded income, expenses and balance for the selected month. The projected month-end balance adds unrecorded scheduled income and subtracts unrecorded scheduled bills. Cash flow compares recorded amounts for the selected month and the previous two.
- **Transactions** lets you add, edit and delete income or expenses. The transaction date determines which month it belongs to.
- **Budgets** lets you create and rename spending categories, set default monthly limits and override a limit for the selected month. Clearing an override restores the default.
- **Recurring bills** can repeat weekly, fortnightly or monthly. Weekly and fortnightly schedules repeat every 7 or 14 days from the first due date. Monthly schedules use a day of the month and fall on the last day when the month is shorter. **Record payment** adds an expense for that occurrence. Edit the transaction to adjust the amount or payment date within the month, or delete it to reopen that occurrence.
- **Salary & income** lets you set a weekly, fortnightly or monthly take-home pay schedule or log one-off income. Use **Record income** for each payday when you receive it.
- **Calendar** shows scheduled and recorded paydays and recurring bills, along with other recorded income. Change months using the top bar. Select an event to edit its schedule or transaction. On smaller screens the calendar displays as a dated agenda.
- Use **한국어** or **English** in the top bar to change the interface language. Dates follow the selected language, and amounts remain in AUD.
- The **Night mode** button in the top bar saves your appearance preference in the browser.
- **Savings goals** track the amount saved against a target across months. Update the saved amount as you go. Goal changes are tracked separately from monthly income and expenses.

The first visit shows sample data. Use **Start fresh** before entering your own records if you want an empty workspace. This permanently clears the workspace after confirmation.

Records are saved in the browser on this device. Use the same browser profile and URL each time. Clearing browser site data removes your budget.

## Run tests

With Node.js 22 or newer, run `node --test` from the project folder.
