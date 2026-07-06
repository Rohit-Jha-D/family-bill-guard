# Family Bill Tracker

A clean, from-scratch implementation of a Family Bill Tracker: track bills across
multiple household accounts (nicknamed "My House", "Parents' Home", etc.), get
staged reminders as due dates approach, and pay directly via official UPI/portal
links — no third-party payment gateways in the middle.

> Built independently from the feature spec — this is not extracted from any
> third-party preview app, since no source code was accessible from that link.

## Stack

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`, zero external DB setup)
- **Frontend:** Single-file React app (via CDN) + Tailwind CSS — no build step required
- **Scheduler:** `node-cron` mock job simulating daily notification sweeps

## Project structure

```
family-bill-tracker/
├── backend/
│   ├── server.js              # Express entry point
│   ├── db.js                  # SQLite schema
│   ├── seed.js                # Sample data
│   ├── routes/bills.js        # All API routes
│   ├── services/
│   │   ├── notifications.js   # 4-phase notification logic
│   │   ├── payments.js        # Secure UPI/portal deep-link generator
│   │   └── cron.js            # Mock cron job + instant alert cancellation
│   └── data/                  # SQLite .db file lives here (gitignored)
└── frontend/
    └── index.html             # Dashboard UI (React + Tailwind, no build step)
```

## Running locally

### 1. Backend

```bash
cd backend
npm install
npm run seed     # populates sample accounts/bills/history
npm start        # starts API on http://localhost:4000
```

You should see:

```
🚀 Family Bill Tracker API running at http://localhost:4000
⏰ Mock cron job started (runs every minute; use '0 8 * * *' in production).
```

Watch the terminal — the mock cron job will log notification phases as they
trigger, and log instantly when an alert is cancelled after a bill is paid.

### 2. Frontend

No build tooling needed — it's a single static HTML file.

```bash
cd frontend
# Any static file server works, e.g.:
npx serve .
# or simply open frontend/index.html directly in your browser
```

Then open the URL it gives you (e.g. `http://localhost:3000`). The dashboard
talks to the backend at `http://localhost:4000/api` (edit the `API_BASE`
constant at the top of `index.html` if you change the backend port).

## API reference

| Method | Route | Description |
|---|---|---|
| GET | `/api/accounts` | List all account nicknames + raw account rows |
| GET | `/api/bills?nickname=My House` | Bills for a nickname, enriched with notification phase + `zero_pending` flag |
| GET | `/api/history?nickname=My House` | Payment history ledger for a nickname |
| GET | `/api/bills/:id/payment-link` | Generates a secure UPI/official-portal hand-off link |
| POST | `/api/bills/:id/pay` | Marks a bill paid, logs history, cancels alerts instantly |

### Example: filtering bills by nickname

```bash
curl "http://localhost:4000/api/bills?nickname=My%20House"
```

```json
{
  "nickname": "My House",
  "zero_pending": false,
  "total_bills": 2,
  "pending_count": 1,
  "bills": [
    {
      "id": 1,
      "amount": 1420.5,
      "due_date": "2026-07-07",
      "status": "pending",
      "late_fine_amount": 100,
      "notification_phase": "URGENT",
      "days_remaining": 1,
      "show_fine_warning": true,
      "amount_breakdown": { "standard_amount": 1420.5, "fine_amount": 100, "total_with_fine": 1520.5 }
    }
  ]
}
```

## Notification phases

Computed purely from `due_date - current_date` in `services/notifications.js`:

| Phase | Trigger | UI treatment |
|---|---|---|
| `GENERATED` | Bill just created, > 7 days out | Neutral badge |
| `EARLY` | ≤ 7 days remaining | Blue badge |
| `ACTION` | ≤ 3 days remaining | Orange alert box, shows Standard vs Standard+Fine |
| `URGENT` | ≤ 24 hours remaining | Red banner, urgent card styling |
| `OVERDUE` | Past due date | Red banner, fine applied |
| — | `status = 'paid'` | **All alerts cancelled instantly**, regardless of date |

The cron job (`services/cron.js`) re-sweeps every bill on an interval (every
minute for the demo — switch the cron expression to `'0 8 * * *'` for a real
daily run) and only re-notifies when a bill's phase changes, so you don't get
duplicate alerts.

## Payment security model

`services/payments.js` only ever builds a link from data already trusted in
your own `accounts` table:

- If the account has a `provider_vpa`, it generates a `upi://pay?pa=...` intent
  link that opens the user's own UPI app directly against the official biller.
- If no VPA is on file, it falls back to the account's `provider_portal_url`
  (the biller's own website).
- If neither exists, it refuses to generate a link rather than guessing one.

No aggregator, wallet, or third-party gateway URL is ever constructed by this
code path.

## Notes on the "Historical Ledger"

`payment_history` is intentionally separate from `bills` so that once a bill
is marked paid, its payment details are simultaneously (a) reflected on the
current bill card as "Paid", and (b) permanently recorded in the ledger tab —
even if you later delete or archive old `bills` rows.
