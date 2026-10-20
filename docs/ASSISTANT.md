# AI Financial Assistant

## Outcome and integration boundary

`/ai-assistant/*` is implemented in the existing React 19 / TypeScript / Vite / React Router / plain-CSS application with its existing FastAPI / SQLite backend. It reuses cookie authentication, CSRF/Origin protection, shared sidebar/header, global monetary privacy, local Manrope, Money, Icon, and button conventions. Previous financial pages and authentication are retained; there is no new project or alternative ledger.

**No AI credentials were configured in the implementation environment.** Real missing-configuration, persistence and error workflows were tested. Successful provider contracts are tested with explicit test doubles and HTTP mock transports; those are not live-provider evidence. The production adapter makes actual OpenAI requests when configured. No hardcoded reply, sample conversation, test provider, or fake success fallback exists in production code. A live paid integration test is opt-in and was skipped.

## Figma inspection and design mapping

Source file `kpEbLoKLaLiUcB8Q6xxgRl`, AI Assistant canvas `2001:7029`. The file was inspected read-only and never modified. Canvas metadata provided nested IDs and dimensions; screenshots covered Welcome `2001:86288`, Spending Conversation `2001:86624`, Conversation History `2001:86742` and Generation Failure `2001:87428`. Exact text was read for the unavailable/network/privacy/no-records/insufficient-data/budget/goals/cash-flow states and implementation handoff `2001:88723`. Component paints, typography and surfaces were queried read-only, including hover `125:29066`.

| Figma component | Source | React implementation |
|---|---|---|
| ChatHeader | `125:19669`, 1300×108; 48px icon; 28px/800 title; 44px actions | `Assistant` page header, shared application header above it |
| SuggestedQuestionCard | `125:19681`, 510×112, radius16; hover `125:29066` | `Welcome`, all four original titles/questions; selection populates composer |
| MessageComposer | `125:19688`, 76px input surface + keyboard/disclosure, radius14 | Real multiline textarea, Enter/Shift+Enter, disabled/pending/send behavior |
| ChatMessage / AI, User | `125:19695`, `125:19702`, radius16 | `ChatMessage`, escaped live text, role alignment and saved timestamp |
| FinancialSummaryCard | `125:19705`, 552×180, radius14 | `FinancialSummaryCard`, application-calculated values and dated scope |
| TypingIndicator | `125:19717`, 680×88 | `TypingIndicator`, tied to actual request state |
| ChatErrorState | `125:19723`, 680×144, pale-red surface | `ChatErrorState`, sanitized specific error and same-request retry |
| ConversationHistory | `125:19729`, 272×770, radius20 | Persistent account history, literal title search, selected row, paging, collapse/new/open |

Verified design colors: orange `#F9733B`, background/composer `#F7F7F4`, white surfaces, border `#E9E8E3`, muted `#777873`, peach `#FFF0E8`; original Manrope weights 500/700/800. Original welcome/suggestion sparkle SVGs are local under `public/assets/assistant`, validated and documented in ASSETS.md. No screenshot is used as runtime UI.

Tool limitations: the optional Figma design-to-code and figma-use skill resources were unavailable; Code Connect required an unavailable seat. Metadata, screenshot and asset tools plus strictly read-only `getNodeByIdAsync` property queries supplied the reference instead. An initial property read exceeded the response-size limit; it made no edits and was narrowed to exact text/style properties.

### Deliberate live-product differences

- Figma's illustrative ready-status, sample-history records and design-preview banner are replaced by truthful server configuration/data disclosures, never fake chats or connection health.
- Figma sample amounts are not inserted as real records. Summary cards use actual canonical data; dates are explicit. Default report period is this month.
- Shared `••••` masking is retained. Free-form message bodies and history titles/previews are **fully concealed** under privacy, rather than trying to detect every currency/spelled-out amount. Percentage text in structured cards is concealed too.
- At smaller desktop content widths, history opens above the workspace rather than squeezing text into an unusable narrow column. It remains collapsible. Message content scrolls independently; the composer stays within its bordered workspace. No mobile redesign is claimed.
- Timestamps, real data/period labels and specific failure disclosures can make message/card heights differ from fixed Figma samples. Native textarea resizing and browser font rasterization are not pixel-identical Figma rendering.

## Provider abstraction and configuration

`backend/app/assistant/provider.py` defines a small async `Provider` protocol, `ProviderConfig`, `ProviderError` and `OpenAIProvider`. Only the backend knows credentials. Fixed trusted endpoint: `https://api.openai.com/v1/chat/completions`, no user/model URL selection, redirects, arbitrary tools or SQL. HTTPX is now a pinned runtime dependency (previously only in test requirements). Response bodies are bounded to 256 KiB; usable output is 1–16,000 characters. No raw error body, credential, prompt or financial context is logged.

In **backend/.env**, configure privately and restart the backend:

```dotenv
AI_PROVIDER=openai
AI_MODEL=your-enabled-compatible-model-id
OPENAI_API_KEY=your-private-key
```

These are placeholders, not real credentials/model allowances. Use a model available to your account that supports Chat Completions and `max_completion_tokens`; no model name is guessed. No `VITE_` AI key or browser provider SDK exists. Empty, unsupported or incomplete configuration makes the assistant unavailable, without preventing normal app startup or use of other pages. No alternate-provider/fallback integration is claimed; replace the protocol implementation to add one.

Application policy uses a 25-second HTTP timeout, 30-second overall generation deadline, and 1,000 maximum completion tokens per request. These are explicit application budgets, not assertions about a provider's limits. There is no automatic retry that could unexpectedly bill multiple model calls. `store:false` is requested; provider-side processing/retention still depends on the provider/account agreement. This is not a zero-retention guarantee.

`GET /status` reports configuration readiness and `connection_verified:false`; it is not an invented health check and does not incur a model call. Only a successful generation proves that request worked. Invalid credentials, unavailable/incompatible models and upstream failures are reported safely at send time.

## Persistence and migration

App startup runs the existing finance initializer (through v7), then the additive assistant initializer **v8**. It never replaces canonical wallets, transactions, budgets or goals.

- `assistant_conversations`: UUID, owner, live/demo dataset, bounded first-question title, created/updated UTC timestamps.
- `assistant_requests`: UUID idempotency key, owned conversation/dataset, original content, pending/failed/completed state, attempt lease token, sanitized error code, timestamps.
- `assistant_messages`: ordered integer sequence + UUID, owned conversation/dataset, request FK, user/assistant role, escaped-on-display content, optional JSON deterministic summary snapshot, provider/model provenance, UTC timestamp. Unique `(request_id, role)` prevents duplicated user/assistant rows.

Foreign keys and composite owner/dataset conversation references protect integrity. All API reads/writes enforce the authenticated owner and dataset. An inaccessible ID returns 404. Changing an ID or prompting for another user never changes authorization. Chat history is not kept solely in React/localStorage. The URL identifies the open saved conversation, and reopening/restoring a session reads SQLite again. Stored summary snapshots represent the calculation at response time; later financial edits do not rewrite old answers.

History returns 30 rows/page with title search and bounded offset; messages return the latest 50 and allow earlier-page loading. Conversations are capped at 500 messages, with a 1,000-conversation account storage cap. No rename/delete/archive control was present in the inspected history design, so no nonfunctional action was added. Retention/deletion/export administration is a future product requirement, not claimed implemented. SQLite content is not separately encrypted at rest; protect filesystem/database backups in deployment.

## APIs

All routes require the existing HttpOnly session; POSTs require `X-Fincept-Request: 1` and the existing Origin policy. `dataset=live` is default; demo is explicitly isolated and rejected in production. Requests are JSON; UUID validation and extra-field rejection are server-side. Existing body-size/secret-safe validation handling is retained.

| Method / path | Contract |
|---|---|
| GET `/api/assistant/status` | Config readiness, no secret or fake health verification |
| POST `/api/assistant/conversations` | `{id: UUID}`; repeat same owned ID safely reopens the same conversation |
| GET `/api/assistant/conversations?q=&offset=0` | Bounded owned title search, preview, updated time, paging |
| GET `/api/assistant/conversations/{id}?before=sequence` | Ordered persisted messages, earlier-page cursor and unresolved request state |
| POST `/api/assistant/conversations/{id}/messages` | `{request_key: UUID, content: string}`; 1–4,000 trimmed readable characters |

Generation success returns the completed request and its two stored messages. Provider failure returns a specific 429/502/503/504, sanitized message/code, failed request and the single stored user message. Authentication is 401; inaccessible IDs are 404; invalid input 422; changed-key payload/conflicting pending question 409. Raw exception/provider details never reach the browser. Request headers/responses retain existing CSRF, no-store and security middleware.

## Reliable send/retry lifecycle

1. The browser generates stable conversation/request UUIDs; duplicate input is synchronously locked. New-conversation tracking is updated before URL navigation, so an immediate network failure retains its original retry command rather than depending on a later render.
2. Backend authenticates, checks ownership/dataset, validates content and idempotency, and rate-limits generation attempts to **15 per authenticated user per 60 seconds** using the existing persisted `rate_limits` table.
3. A short `BEGIN IMMEDIATE` persists one user message and pending request, then commits **before any network call**. The UI does not claim a sent message until a backend receipt/read confirms it. While sending, a one-second owned detail poll can display the accepted user message.
4. Owner-scoped financial context and up to 10 completed history messages (at most 12,000 history characters) are gathered. The provider receives focused policy/context and current question.
5. Actual generation runs asynchronously with an overall deadline. Successful assistant text and structured snapshot are persisted once. Failures persist a safe code and leave the original question intact.
6. Retrying uses the same request key/content; a completed receipt is returned without another model call. Reusing that key with altered text is rejected. Concurrent retries return a pending conflict rather than another generation.
7. Only one unresolved question is permitted in a conversation; retry it or start a new conversation. A process-interrupted pending attempt becomes retryable after 45 seconds; the attempt token fences late completions. A provider crash in that narrow window can cause a later re-call upstream, but it cannot duplicate stored message rows. Exactly-once external billing after a server crash is not guaranteed.
8. Reopening pending work polls durable state every two seconds. Failed reads remove the indefinite typing state and allow safe retry. Network errors preserve the draft; a new chat clears it intentionally. Navigating away does not erase persisted chat work.

The UI has no artificial delays and does not simulate replies. This is tested request/response, **not streaming or provider cancellation**. A browser disconnect does not guarantee canceling a request already received by the backend; re-open/retry the same ID to inspect the result.

## Financial grounding and minimization

The provider never has database credentials, arbitrary SQL, tool execution, cross-user selection or financial writes. `context.py` scopes every query to the authenticated user and requested dataset. It uses existing `period_range`, Insights `totals/grouped/cash_flow`, ledger `wallets`, `budget_service.evaluate`, and `goal_service.goals/summary`; no conflicting finance models are introduced. Money stays integer paisa internally and is converted to exact decimal BDT strings in provider facts without float arithmetic.

An intentionally small English intent router chooses relevant context, not an agent framework:

- Default/current-month, last month, last 3 months (including current), and this-year phrases use the shared inclusive period rules. Each request names its actual start/end/label. Other arbitrary/natural-language ranges and follow-up date inheritance are **not implemented**; the system policy requires clarification instead of silently claiming the requested period was calculated. A follow-up without dates defaults to this month.
- Every request receives a compact selected-period income/expense/net/savings-rate summary and record count.
- Spending questions add at most 12 category aggregates, total/omitted counts.
- Budget questions add at most 20 evaluated budgets, full unprorated limits, intersected spending, status/dates and ambiguous-allocation count.
- Goals add up to 20 unarchived goal records with states and an explicitly dated active-goal current allocation summary; goals are not additional assets/income.
- Wallet questions add up to 20 unarchived wallet balances from the canonical timeline, with explicit current scope, currency/status. No account identifiers/notes are sent.
- Recent-transaction questions add only the latest 8 income/expense rows in the period, without free-form titles/descriptions/notes.
- Trend questions provide existing bucket calculations for the explicit selected period, with a warning that insufficient comparable records do not establish a trend.

Names/labels remain untrusted data and the model is told so; they cannot change backend access. No email/password/session/account identifiers are supplied as financial context. Only bounded relevant facts, not every raw transaction, are sent to the model. A structured Financial Summary card is attached by the backend only to a relevant successful summary/spending/trend answer with recorded transactions. It is not parsed/trusted from model output. No-income, no-records and missing budgets/goals are represented honestly; the model must explain missing/insufficient data. Model-generated prose can still be wrong and is visibly distinguished from calculated data.

Transfer principal is excluded. A linked transfer fee already classified as an expense counts once. Wallet openings/events and goal earmarks do not become income/expense. Budgets retain their existing conflict/exact-category/full-limit rules. Current wallet/goal snapshots are explicitly not selected-period cash flow. Existing finances are never mutated by chat.

## Privacy, rendering, accessibility and motion

The one shared global eye toggle is used. `Money` masks structured amounts; structured savings rate is masked too. Because arbitrary AI/user prose can express money in words or unrecognized formats, complete message text, history titles and previews are concealed in privacy mode and not inserted into DOM/ARIA as hidden raw copies. Composer text is visually obscured; it remains the user's editable form value, not a secure vault. This mode changes presentation only: stored records, model context and API responses remain unchanged. Before sending financial data, deployers must establish appropriate user disclosures/provider terms; visual privacy is not a consent or authorization substitute.

React renders user/model content as escaped text with preserved paragraphs/bullet lines; no `dangerouslySetInnerHTML`, markdown HTML execution, model-provided links or scripts. Long text wraps; messages scroll inside their panel. Empty/whitespace input is disabled; IME composition does not accidentally send; Enter sends and Shift+Enter adds a line. Labels, live pending/error statuses, timestamps, keyboard focus and disabled states are semantic. Existing page search/profile/privacy/sidebar remain shared.

Buttons/cards/composer/history have 140–180ms hover/press/focus transitions, subtle 180ms message appearance and restrained pending dots. Shared native dialogs retain their existing focus/200ms transitions where used globally. No new unrelated modal or animation library. Reduced-motion disables decorative animation/transitions; request completion never waits for animation.

## Verification

See `assistant-qa/verification.json`, saved logs and `IMPLEMENTATION_STATUS.md` for final executed counts and commands. Backend coverage includes missing config, input/CSRF/auth, cross-owner/dataset isolation, actual canonical demo totals/minimization, persisted history/restart, safe errors, rate limits, replay/retry/concurrent duplicate fencing, total timeout recovery, and explicit HTTP transport contracts. Unit coverage checks suggestions, escaping, structured summary, privacy and receipt merging. Browser coverage exercises real unavailable backend/history/refresh, draft/error/retry, search, global privacy, keyboard, desktop overflow and both sidebar states. One clearly labeled UI-only test fixture covers delayed/successful rendering; it is not a live-model or persistence claim.

For an authorized paid real-provider check after configuring the backend environment:

```sh
cd backend
RUN_LIVE_AI_TEST=1 .venv/bin/python -m pytest -q tests/test_assistant.py -k real_configured_provider_opt_in
```

The live opt-in test sends only a greeting, not financial data. End-to-end financial advice quality still needs a configured provider/account and human review. Do not infer a live-provider pass from fixture success. Current limitations also include no streaming/cancel, no model-driven financial changes, no bank sync/market feed, limited English period/intent parsing, no history rename/delete/archival or at-rest encryption, and no production deployment certification.
