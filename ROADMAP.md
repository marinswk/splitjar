# Roadmap

splitjar is intentionally small. Anything not in this list is probably out of scope.

## v0.1 — MVP (current)

- [x] Groups with name + currency
- [x] Members (soft-delete)
- [x] Expenses: single payer, percentage shares, formula-aware amount
- [x] Expense list with month filter
- [x] Stats: per-member balances + minimal settlement transfers
- [x] Single Docker container, persistent volume
- [x] Home Assistant iframe support
- [x] Responsive mobile + desktop UI

## v0.2 — quality-of-life

- [ ] Edit expense (UI; API already supports it)
- [ ] CSV / JSON export per group
- [ ] Optional dark mode toggle
- [ ] "Settle up" action that records a transfer as a zero-net expense
- [ ] First-run welcome screen with a demo group

## v0.3 — nice-to-haves

- [ ] Equal-split UI mode (in addition to percentage)
- [ ] Exact-amount split mode
- [ ] Backup / restore the SQLite file from the UI

## Explicitly **not** planned

- Authentication / user accounts
- Multi-currency conversion
- Recurring expenses
- Mobile native apps
- Cloud-hosted multi-tenant deployment
