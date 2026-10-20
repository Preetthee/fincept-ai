# FINCEPT AI — current application architecture

Read CLAUDE.md and DESIGN_SYSTEM.md before coding. Implemented segments: vector-corrected Authentication, shared sidebar/topbar, full read-side Overview, full-stack Transactions, Wallets, Budgets, Financial Goals, Insights, AI Assistant, Planner, Debt & Loans and Financial Hub. Settings retains its explicit integration boundary.

## Shared shell

React Router's protected `AuthenticatedLayout` persists across authenticated routes, including `/auth/complete` and `/overview`. It owns one sidebar expansion state, lazily initialized from `fincept.sidebar.state`; only `expanded` enables expansion. Missing/invalid/blocked storage defaults to minimized. Normal-flow CSS Grid reserves 76px or 252px and `minmax(0,1fr)` for content; motion respects reduced-motion settings. Settings stays at the viewport bottom. Sidebar tooltips use portals and keyboard dismissal. Navigation registry is shared by all routes and page search.

The layout's `ApplicationPreferences` owns monetary privacy (non-sensitive boolean preference) and report label. `ApplicationHeader` supplies original-Figma search/Ask AI/privacy/notifications/profile controls. Browser text, semantic controls, native dialogs and local original SVGs are used, never screenshot UI.

## Features and requests

Authentication's existing provider, validation, requests, corrected SVG illustrations/wordmark and cookie-session security remain intact. Successful auth preserves `/auth/complete`; its explicit Open Overview link opens the dashboard. No dashboard-specific login bypass or simulated session was added.

`src/features/overview` contains typed presentation, query state, an abortable request client, independent retryable resources and server-side recent-record filters/paging. No monetary data is persisted to browser storage. `/overview`, `/transactions/*`, `/wallets/*`, `/budgets/*`, `/financial-goals`, `/insights/*` `/ai-assistant/*`, `/planner`, `/debt-loans` and `/financial-hub` are real; remaining unavailable settings actions are disclosed rather than fabricating success. `src/features/transactions` reuses the same shell, preferences, Dialog and Icon components. `TransactionForm` serves add/edit, with a bounded exact rational calculator; TransactionTools provides filters/category management/minimal wallet setup. Transactions requests use cookie auth, CSRF headers, timeouts, cancellation and existing safe error responses.

FastAPI reuses its authentication dependencies and SQLite connection architecture. Additive canonical finance schema and read routes live under `backend/app/finance`; the shared main lifespan initializes finance schema through version 7 and assistant schema version 8, preserving the canonical version-2 wallet/transaction columns and existing records. No separate dashboard data store duplicates transactions. Explicit sample workspaces are development-only and owner/dataset-isolated. See OVERVIEW.md for formulas, model contracts, endpoints, chart time-window semantics, sample behavior, and integration boundaries.

## Test boundaries

Sidebar-only tests use explicit session and empty-financial fixtures. Overview browser tests create actual accounts and actual persisted, separated sample records against the test API. Backend tests verify accounting reconciliation, ownership, transfer fees, invalid ranges, empty/negative values, zero targets and production restrictions. Existing auth tests still exercise real registration/login/logout. Shared layout is reused across all viewport and navigation tests.

## Transaction writes

`backend/app/finance/transactions.py` extends the existing finance router architecture. All queries are owner/dataset scoped. Integer minor-unit writes, optimistic versions and per-user idempotency receipts are persisted in SQLite. BEGIN IMMEDIATE and rollback keep principal, linked fee and ledger balances consistent. See TRANSACTIONS.md for endpoint contracts, category reassignment, historical balance checks, date-only summary versus table/export filtering, and migration details.

## Wallets and shared ledger

`src/features/wallets` reuses the shared shell/preferences/Dialog and existing transaction commands. `backend/app/finance/wallets.py` adds owned wallet metadata/lifecycle and non-income balance events. `ledger.py` is the single time-based integer balance calculation used by Wallets, Overview and transaction guards. v5 adds wallet_profiles/wallet_events without replacing canonical wallet/transaction columns. Transfers remain one canonical record; external transfers and adjustments are separate audit events, not income. See WALLETS.md for exact APIs, reconciliation, archive semantics and UI/activity boundaries.

## Budgets and shared allocation

`src/features/budgets` implements the existing frame using shared shell/dialog/fields/calendar/privacy. `finance/budgets.py` adds authenticated versioned/idempotent commands and queries over existing budgets; v6 budget_metadata is additive. `budget_service.py` owns expense allocation, raw utilization, status and risk, and is reused by Overview. New overlapping same-category periods are rejected; ambiguous legacy assignments are flagged and excluded, not guessed. Transaction history and wallet accounting remain untouched. See BUDGETS.md for explicit saved periods (no automatic recurrence), thresholds, APIs and migration rules.

## Financial Goals

`features/goals` presents actual plans and reviewed contributions; `/api/goals` writes through existing authenticated SQLite services. Additive v7 goal metadata/contribution audit extends canonical financial_goals. The single goal_service read model powers both Financial Goals and the preserved Overview widget. Wallet balances still come only from the canonical ledger. Existing allocations do not change assets; external deposits create one linked ledger event atomically. See GOALS.md for status, availability, shortfall, legacy and archive rules. Existing authentication, shared shell, budget rules and transaction accounting are preserved.


## Insights and AI Assistant

Insights uses existing deterministic financial services without a parallel ledger; see INSIGHTS.md. The Assistant adds an informational read-only layer under `backend/app/assistant` and `src/features/assistant`. Additive v8 conversation/request/message tables persist owner/dataset-scoped history and idempotent generation receipts; finance initialization remains through v7 and app startup then initializes v8. Short SQLite transactions commit before async provider I/O. A small Provider protocol has a server-configured OpenAI Chat Completions adapter; no provider key is exposed to Vite. Focused context reuses period/Insights/ledger/budget/goal calculations. No model SQL, arbitrary tools, financial writes or fabricated fallback replies. Without configuration, history and other finance pages remain usable. See ASSISTANT.md for API, retry leases, context bounds, conservative free-form display privacy and credential-gated test limitations. The calendar browser regression now awaits its existing requestAnimationFrame focus transition before the next arrow key; production calendar behavior is unchanged.

## Planner (schema v9)
`src/features/planner/` composes the existing shell, privacy, forms and canonical reviewed goal contributions. `backend/app/planner/{schema,routes}.py` adds authenticated task/calendar operations and occasion-specific metadata. A planner occasion's `goal_id` is its canonical financial_goals ID, with an owner/dataset composite FK; contributions are not copied. Planner tasks reference the same owned occasion. Existing Goals updates guard occasion date validity; contributions, pausing and archive continue through Goals. Startup initializes v9 additively after v8 Assistant. See `PLANNER.md` for exact endpoints, global-summary scope, civil-date/timezone semantics and unsupported reminder/prototype operations.


## Debt & Loans / Financial Hub (schema v10)
Startup initializes additive debt/shopping/FX-cache schema v10 after Planner v9. `debt/routes.py` owns debt terms, derived schedules and an immutable tracked-payment/reversal ledger, separate from wallet accounting. `hub/routes.py` reads canonical wallets and actual Planner/EMI activities; its owned shopping rows never become expenses implicitly. `hub/fx.py` fetches a fixed public HTTPS rate endpoint with validated timestamps and a bounded persistent cache. All writes retain session/CSRF/owner isolation, integer minor units, transactions, versions and idempotency. See DEBT_LOANS.md, FINANCIAL_HUB.md and debt-hub-qa/README.md for exact scope and executed verification.
