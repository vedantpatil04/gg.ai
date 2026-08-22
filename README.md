# GreenGuard AI — Environmental Intelligence Platform

> Monitor • Predict • Protect

A production-grade, full-stack environmental intelligence platform with real-time air quality, water quality, climate forecasting, AI-powered recommendations, citizen complaint management, and policy simulation.

---

## Tech Stack

| Layer    | Technology                                           |
| -------- | ---------------------------------------------------- |
| Frontend | React 19 · TypeScript · Vite · TanStack Router/Start |
| Styling  | Tailwind CSS v4 · Shadcn UI · Custom design system   |
| State    | TanStack Query v5                                    |
| Backend  | Node.js · Express.js · TypeScript                    |
| Database | MongoDB Atlas · Mongoose ODM                         |
| Auth     | JWT · Refresh tokens · bcrypt · RBAC                 |
| AI       | Google Gemini 1.5 Flash                              |
| Charts   | Recharts                                             |

---

## Project Structure

````
```text
greenguard-ai/
│
├── src/                                   # Frontend (TanStack Start + React 19)
│
│   ├── components/
│   │   ├── app-layout.tsx                 # Application layout (sidebar + topbar)
│   │   ├── ui-bits.tsx                    # Shared UI helpers (StatCard, Panel, Pill, etc.)
│   │   │
│   │   ├── command-center/                # Admin Intelligence Components
│   │   │   ├── authority-actions.tsx
│   │   │   ├── city-intelligence.tsx
│   │   │   ├── complaint-intelligence.tsx
│   │   │   ├── environmental-intelligence.tsx
│   │   │   ├── executive-overview.tsx
│   │   │   ├── executive-reports.tsx
│   │   │   └── trend-intelligence.tsx
│   │   │
│   │   └── ui/                            # Shadcn UI Components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── chart.tsx
│   │       ├── table.tsx
│   │       ├── dialog.tsx
│   │       ├── sheet.tsx
│   │       ├── sidebar.tsx
│   │       ├── tabs.tsx
│   │       ├── select.tsx
│   │       ├── input.tsx
│   │       ├── textarea.tsx
│   │       ├── badge.tsx
│   │       ├── avatar.tsx
│   │       ├── tooltip.tsx
│   │       └── ... (other reusable Shadcn components)
│   │
│   ├── hooks/
│   │   └── use-mobile.tsx
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                  # Axios instance
│   │   │   ├── auth.api.ts
│   │   │   ├── environmental.api.ts
│   │   │   ├── command.api.ts
│   │   │   ├── services.api.ts
│   │   │   └── example.functions.ts
│   │   │
│   │   ├── auth-context.tsx
│   │   ├── city-context.tsx
│   │   ├── mock-data.ts
│   │   ├── theme.tsx
│   │   ├── utils.ts
│   │   ├── config.server.ts
│   │   ├── error-page.ts
│   │   ├── error-capture.ts
│   │   └── lovable-error-reporting.ts
│   │
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx                      # Landing Page
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── forgot-password.tsx
│   │   ├── dashboard.tsx
│   │   ├── map.tsx
│   │   ├── copilot.tsx
│   │   ├── forecast.tsx
│   │   ├── citizen.tsx
│   │   ├── reports.tsx
│   │   ├── sustainability.tsx
│   │   ├── simulator.tsx
│   │   ├── profile.tsx
│   │   ├── settings.tsx
│   │   ├── command-center.tsx
│   │   └── README.md
│   │
│   ├── router.tsx
│   ├── routeTree.gen.ts
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
│
├── backend/                               # Express + TypeScript Backend
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       ├── models/
│       ├── validators/
│       ├── database/
│       ├── seed/
│       ├── utils/
│       └── app.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
````

````

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works) **or** local MongoDB
- Google Gemini API key (optional — AI features degrade gracefully)

### 1 — Clone & install

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
````

### 2 — Configure environment

```bash
# Backend — edit with your values
cp backend/.env.example backend/.env
```

Open `backend/.env` and set at minimum:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/greenguard
JWT_SECRET=<any-long-random-string>
JWT_REFRESH_SECRET=<different-long-random-string>

# Optional but recommended:
GEMINI_API_KEY=<your-gemini-key>   # from https://ai.google.dev/
```

The frontend `.env` already points to `http://localhost:5000/api`. If you change the backend port, update it:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3 — Seed the database

```bash
cd backend && npm run seed
```

This creates:

- **672 environmental readings** (48h × 14 cities)
- **10 alerts** across cities
- **8 reports** for Belagavi and major cities
- **4 demo users** (see below)

### 4 — Run the full stack

**Terminal 1 — Backend:**

```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend:**

```bash
npm run dev
```

Open **http://localhost:5173**

---

## Demo Accounts

| Role              | Email               | Password      |
| ----------------- | ------------------- | ------------- |
| **Administrator** | admin@greenguard.ai | Admin@123456  |
| **Authority**     | aanya.s@cpcb.gov.in | Authority@123 |
| **Citizen**       | priya.n@citizen.in  | Citizen@123   |

> Credentials are shown on the login page for convenience.

---

## API Reference

### Base URL

```
http://localhost:5000/api
```

### Auth

| Method | Endpoint                | Auth | Description             |
| ------ | ----------------------- | ---- | ----------------------- |
| POST   | `/auth/signup`          | —    | Register new user       |
| POST   | `/auth/login`           | —    | Login, returns JWT pair |
| POST   | `/auth/logout`          | ✓    | Revoke refresh token    |
| POST   | `/auth/refresh`         | —    | Get new access token    |
| POST   | `/auth/forgot-password` | —    | Send reset email        |
| POST   | `/auth/reset-password`  | —    | Reset with token        |
| GET    | `/auth/me`              | ✓    | Get current user        |
| PATCH  | `/auth/me`              | ✓    | Update profile          |
| PATCH  | `/auth/me/password`     | ✓    | Change password         |

> **Registration rules:** Citizen accounts are activated immediately by `/auth/signup`. Authority accounts are instead created as an **access request** — `approvalStatus: "pending"`, no tokens issued — and can only log in once an Administrator approves the request (see the Admin table below). Administrator accounts can never be created through `/auth/signup`, regardless of what the client sends; only pre-existing Administrator accounts can log in.

### Environmental

| Method | Endpoint                                       | Description                      |
| ------ | ---------------------------------------------- | -------------------------------- |
| GET    | `/environmental/cities`                        | All cities (latest reading each) |
| GET    | `/environmental/cities/:cityId`                | Single city live reading         |
| GET    | `/environmental/cities/:cityId/trend?hours=24` | Hourly trend data                |
| GET    | `/environmental/cities/:cityId/hotspots`       | Pollution hotspots               |
| GET    | `/environmental/cities/:cityId/dashboard`      | Dashboard composite              |

### Forecast

| Method | Endpoint                     | Description                          |
| ------ | ---------------------------- | ------------------------------------ |
| GET    | `/forecast/:cityId?hours=48` | Hourly forecast with confidence band |
| GET    | `/forecast/:cityId/weekly`   | 7-day outlook                        |

### Complaints (auth required)

| Method | Endpoint           | Description                                 |
| ------ | ------------------ | ------------------------------------------- |
| GET    | `/complaints`      | List (citizens see own, authority sees all) |
| GET    | `/complaints/mine` | Current user's complaints                   |
| POST   | `/complaints`      | Submit new complaint                        |
| PATCH  | `/complaints/:id`  | Update status/resolution                    |
| DELETE | `/complaints/:id`  | Delete                                      |

### Alerts

| Method | Endpoint                  | Description                                       |
| ------ | ------------------------- | ------------------------------------------------- |
| GET    | `/alerts/active`          | All active alerts (optionally filtered by cityId) |
| GET    | `/alerts/:cityId`         | Alerts for a city                                 |
| POST   | `/alerts`                 | Create alert (authority/admin)                    |
| PATCH  | `/alerts/:id/acknowledge` | Acknowledge                                       |
| PATCH  | `/alerts/:id/resolve`     | Resolve                                           |

### Reports

| Method | Endpoint         | Description                                       |
| ------ | ---------------- | ------------------------------------------------- |
| GET    | `/reports`       | List public reports                               |
| GET    | `/reports/stats` | Aggregate stats                                   |
| GET    | `/reports/:id`   | Single report                                     |
| POST   | `/reports`       | Generate report with AI summary (authority/admin) |

### GreenGuard Intelligence Center

| Method | Endpoint                   | Description                     |
| ------ | -------------------------- | ------------------------------- |
| POST   | `/copilot/ask`             | Ask a question (Gemini-powered) |
| GET    | `/copilot/recommendations` | AI action recommendations       |
| GET    | `/copilot/insights`        | Pattern intelligence insights   |

### Policy Simulator

| Method | Endpoint             | Description              |
| ------ | -------------------- | ------------------------ |
| POST   | `/simulator/run`     | Run what-if simulation   |
| GET    | `/simulator/history` | Saved simulations (auth) |

### Admin (administrator only)

| Method | Endpoint                                | Description                                                                               |
| ------ | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| GET    | `/admin/stats`                          | Platform stats                                                                            |
| GET    | `/admin/users`                          | All users                                                                                 |
| PATCH  | `/admin/users/:id`                      | Update role/status                                                                        |
| DELETE | `/admin/users/:id`                      | Delete user                                                                               |
| GET    | `/admin/authority-requests`             | List Authority accounts; optional `?status=pending\|approved\|rejected` filter, paginated |
| GET    | `/admin/authority-requests/:id`         | Single Authority request details                                                          |
| PATCH  | `/admin/authority-requests/:id/approve` | Approve a pending Authority request — enables login                                       |
| PATCH  | `/admin/authority-requests/:id/reject`  | Reject a pending Authority request — login stays blocked                                  |

---

## Supported Cities

| City         | Country   | Notes                      |
| ------------ | --------- | -------------------------- |
| **Belagavi** | India     | Fully seeded, all features |
| Bengaluru    | India     |                            |
| Mumbai       | India     |                            |
| Delhi        | India     |                            |
| Hyderabad    | India     |                            |
| Chennai      | India     |                            |
| Pune         | India     |                            |
| Kolkata      | India     |                            |
| Ahmedabad    | India     |                            |
| London       | UK        |                            |
| New York     | USA       |                            |
| Singapore    | Singapore |                            |
| Tokyo        | Japan     |                            |
| Dubai        | UAE       |                            |

---

## Features

### Frontend — Offline-first

Every page works without the backend running. When the API is unreachable, the app silently falls back to mock data. The topbar shows "Mock data" vs "Live API" so you always know the data source.

### Authentication & Authorization

- Access tokens expire in 15 minutes; refresh tokens in 7 days
- Silent refresh via Axios interceptor — users never see token errors
- Role-based UI: citizens see their own complaints; authorities can manage all; admins can manage users
- **Authority approval workflow** — a new Authority signup is an access request, not an active account: it's created with `approvalStatus: "pending"` and no session is started. An Administrator reviews it via the `/admin/authority-requests` endpoints and approves or rejects it. A pending or rejected Authority account is blocked at login, at token refresh, and on every subsequent authenticated request — even an access token issued while the account was still approved stops working the moment its status changes.
- **`approvalStatus` values** (on the `User` model — Citizen and Administrator accounts are always `approved`): `approved` — can log in; `pending` — Authority only, awaiting Administrator review; `rejected` — Authority only, review declined, login stays blocked.

### AI Integration (Gemini)

- **GreenGuard Intelligence Center chat** — ask natural language questions about any city's air quality
- **Policy Simulator** — AI insight on your policy lever combination
- **Report summaries** — auto-generated 3-sentence executive summaries
- **Recommendations** — city-specific actionable suggestions
- Graceful degradation — all AI features return sensible defaults if `GEMINI_API_KEY` is not set

---

## Deployment

### Backend (Railway / Render / Fly.io)

1. Set all environment variables from `.env.example`
2. Set `NODE_ENV=production`
3. `npm run build && npm start`

### Frontend (Vercel / Netlify)

1. Set `VITE_API_URL=https://your-backend-url/api`
2. Build command: `npm run build`
3. Output directory: `dist`

### MongoDB Atlas

1. Create free M0 cluster at https://cloud.mongodb.com
2. Whitelist `0.0.0.0/0` (or your server IP)
3. Create a database user and copy the connection string to `MONGODB_URI`
4. Run `npm run seed` once after deploying

---

## Health Check

```bash
curl http://localhost:5000/api/health
# {"success":true,"status":"healthy","timestamp":"...","version":"1.0.0"}
```

---

## Author & Connect

- **GitHub**: [vedantpatil04](https://github.com/vedantpatil04)
- **LinkedIn**: [Vedant Patil](https://www.linkedin.com/in/vedantpatil04)

