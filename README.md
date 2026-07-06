# 🛡️ Family Bill Guard — Fine Prevention Sentinel

A clean, from-scratch full-stack implementation of an Indian household utility statement organizer and automation pipeline. This application actively tracks consumer lines across state utility portals, manages payment cycles, applies multi-criteria filter matrices, calculates dynamic late-fine notification phases, and facilitates instant native UPI or direct portal routing without third-party aggregator middleman markup.

![Application Dashboard Preview](images/{Dashboard with Bill Status preview}.png)

---

## 🚀 Key Architectural Features
* **Dual-Engine Tracking:** Blends background automated headless browser execution with manual direct-portal fallbacks for strict captcha security validation gates.
* **Dynamic Matrix Filtering:** Client-side state control filters items instantly by unique property nicknames, provider service categories, and payment statuses.
* **Risk-Phased Alerts:** Automatically scales invoice urgency badges (`STATEMENT ACTIVE` ➔ `FINE WINDOW OPEN` ➔ `URGENT DEADLINE`) based on localized target dates.
* **Account Inventory Matrix:** A dedicated master management panel allowing direct database registry manipulation and cascade deletions.

---

## 🛠️ System Architecture & Tech Stack
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (React Client)                │
│    Tailwind CSS Engine  │  Dynamic Matrix Control Grid  │
└────────────────────┬──────────────▲─────────────────────┘
                     │              │
           REST Requests (JSON)   State Synchronization
                     │              │
┌────────────────────▼──────────────┴─────────────────────┐
│               BACKEND (Express Node Server)             │
│  API Routing Matrix │ Cron Scheduler │ Browser Engine   │
└────────────────────┬──────────────▲─────────────────────┘
                     │              │
                  SQL Queries    Database Rows
                     │              │
┌────────────────────▼──────────────┴─────────────────────┐
│                  DATABASE (SQLite Engine)               │
│       Accounts Records    │    Bills Ledger Sheets      │
└─────────────────────────────────────────────────────────┘

* **Frontend Interface:** Single-page architecture built using React 18, utilizing Tailwind CSS for high-contrast dark-mode matrices and unified slate typography tokens—completely free of heavy local build tools or bundler configurations.
* **Backend Server:** Node.js framework running Express middleware to handle strict REST API parameters.
* **Automation Driver:** Playwright (Chromium engine) orchestrating background portal navigation, form inputs, and selector text scraper extraction.
* **Persistent Storage:** SQLite database file (`db.js`) executing relational row adjustments without the overhead of external server containers.

---

## 🔄 Core Application Workflows

### 1. Account Profile Registration Workflow
* **Step A:** The user clicks `➕ Add Account` on the interface and inputs reference details (Nickname, Category, Consumer ID Number, Portal URL, and UPI VPA payee details).
* **Step B:** The client sends a `POST` request to `/api/bills/accounts`.
* **Step C:** The backend updates the SQLite tables and instantly activates a background worker process to scrape any existing outstanding statement entries for that line.

### 2. Automated Real-Time Scraper Sync Workflow
* **Step A:** The sync cycle triggers either via an automatic timed system cron or manually by clicking the `⚙️ Run Cron` control button.
* **Step B:** The engine loops through accounts and spins up a sandboxed Playwright browser context.
* **Step C:** For sites like **NBPDCL (North Bihar)**, it fills out forms automatically, hits selectors, and reads the live due balance right off the screen.
* **Step D:** For secure visual validation portals like **TNPDCL/TANGEDCO (Tamil Nadu)**, the engine logs a safe tracking bypass notice. This prevents timeout flags, keeping your backend green while smoothly routing users to their 5-second manual captcha dashboard check.

### 3. Settle & Payment History Ledger Workflow
* **Step A:** Clicking `Pay Now` calculates the net balances and launches the Outbound Direct Handoff Link Modal.
* **Step B:** Selecting `Launch Native UPI App Intent` builds a secure `upi://pay` custom URI with exact URL parameters (`pa`, `pn`, `am`, `cu=INR`) to execute on mobile devices. Clicking `Maps Official Provider Portal` opens the provider page directly.
* **Step C:** The action flags a `POST` query to `/api/bills/:id/pay`, automatically archiving the bill row as `paid`, assigning a confirmation timestamp, and purging active warnings instantly.

### 4. Master Account Inventory Deletion Workflow
* **Step A:** Navigating to the `🛠️ Manage Accounts` workspace exposes all registered utility profiles directly from the core relational tables.
* **Step B:** Clicking `🗑️ Remove Account` triggers a confirmation banner.
* **Step C:** On approval, an HTTP `DELETE` instruction lands at `/api/bills/accounts/:id`. The database cleans out the account row and launches a cascade delete to clear any pending, unpaid statements tied to that reference ID.

---
## 📂 Project Directory Structure

```
family-bill-tracker/
├── backend/
│   ├── server.js              # Express app entry point & middleware configurations
│   ├── db.js                  # SQLite database connection & schema configuration
│   ├── seed.js                # Initial database population file
│   ├── bills.db               # Local SQLite database file (Gitignored)
│   ├── routes/
│   │   └── bills.js          # Main router (Automation engine, CRUD endpoints, and DELETE cascade)
│   └── services/
│       └── notifications.js   # Dynamic risk-phased late fine notification algorithm
└── frontend/
    └── index.html             # Client dashboard (React 18 + Tailwind Dark Mode Interface)
```

## Running locally

### 1. Backend

```bash
cd backend
npm install
npx playwright install chromium
node seed.js
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

## 🔌 API Reference Matrix

The server serves REST endpoints under the prefix `http://localhost:4000/api/bills`.

| Method | Route Path | Functional Description |
| :--- | :--- | :--- |
| **GET** | `/accounts` | Retrieves all registered asset profiles directly from the master database table. |
| **GET** | `/dashboard` | Fetches consolidated metrics (Total Pending, Alerts Count) along with fully filtered bills arrays. Supports `?nickname=`, `?category=`, and `?status=` query strings. |
| **POST** | `/accounts` | Registers a new utility profile and triggers an immediate background scraper pass. |
| **POST** | `/` | Logs a manual un-settled utility statement entry. |
| **POST** | `/:id/pay` | Settles an invoice manually, archives the record status as paid, and populates the history ledger logs. |
| **POST** | `/run-cron` | Instantly spins up the headless automation web scraper browser workflow. |
| **DELETE**| `/accounts/:id` | Cascades out a profile record and purges its pending statements from database disk memory. |

### Client Payload Response Example (`GET /api/bills/dashboard`)
```json
{
  "nicknames": ["Parents' Home", "house 2"],
  "categories": ["Electricity", "Water", "Gas", "Internet", "Municipal/Home Tax"],
  "bills": [
    {
      "id": 1,
      "account_id": 2,
      "amount": 2450.00,
      "due_date": "2026-07-07",
      "status": "pending",
      "late_fine_amount": 50.00,
      "account_nickname": "Parents' Home",
      "category": "Electricity",
      "consumer_number": "2008471192",
      "official_vpa": "biller@upi",
      "portal_url": "[https://www.nbpdcl.co.in](https://www.nbpdcl.co.in)",
      "notification_phase": "URGENT"
    }
  ],
  "totalPendingAmount": 2450.00,
  "totalPendingCount": 1,
  "accountsCount": 2,
  "activeAlertsCount": 1
}
```
Computed Phase,Trigger / Timeline,UI Visual Matrix Treatment
NORMAL,More than 7 days remaining until deadline,"Neutral baseline display, safe operations badge."
ACTION,Less than or equal to 3 days remaining,"Orange warning container badge, displays standard base vs target cost metrics."
URGENT,Less than or equal to 24 hours remaining,Red critical accent container layout with flashing warning indicators.
OVERDUE,Past scheduled deadline target date,Locked high-priority warning layout with base cost + late fees applied.
—,status = 'paid',"All active warning badges are instantly stripped, updating rows to a calm green ""✓ Settled"" layout state."

