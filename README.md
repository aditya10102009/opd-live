# OPD Queue — Shared Live Demo

Browser-based **outpatient department (OPD) queue** prototype.  
Multiple phones/PCs share **one live queue** via a small Node.js server.

> Demo only — not a clinical system. Priority flags are **not** medical triage.  
> Payments and SMS are **sandbox** (no real money / no carrier SMS).

## Features

- Patient registration → department token (GM-, PD-, …)
- Priority queue (emergency / moderate / routine)
- Doctor **Call next**, start consult, complete, refer
- Reception, Lab, Pharmacy role flows
- Public TV-style token display
- Shared state across devices (REST + Server-Sent Events)
- Data saved under `server/data/` (JSON)

## Requirements

- [Node.js](https://nodejs.org/) **18+** (LTS recommended)
- No `npm install` needed (zero dependencies)

## Quick start

```bash
cd server
npm start
```

Or:

```bash
cd server
node index.js
```

Open **http://localhost:3847/** in two browsers to see the shared queue.

Default port: `3847` (override with `PORT=3000 node index.js`).

### Demo logins

| Role        | How                                      |
|-------------|------------------------------------------|
| Patient     | Patient → Demo skip OTP                  |
| Doctor      | Hospital → Doctor → Demo (`DOC001`)      |
| Reception   | Hospital → Reception → Demo              |
| Lab / Pharmacy | Hospital → choose role → Demo         |

## Project layout

```
opd-live/
├── public/
│   └── index.html      # UI (same prototype, wired to API)
├── server/
│   ├── index.js        # HTTP server, REST API, SSE
│   ├── store.js        # Shared queue logic + persistence
│   ├── package.json
│   └── data/           # state.json / feature.json (created at runtime)
└── README.md
```

## API (summary)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/state` | Full shared snapshot |
| GET | `/api/events` | Live SSE stream |
| GET | `/api/version` | Version number for polling |
| POST | `/api/register` | Register patient |
| POST | `/api/call-next` | `{ "dept", "doctorId" }` |
| POST | `/api/start-consult` | `{ "patientId" }` |
| POST | `/api/complete` | `{ "patientId", "fields" }` |
| POST | `/api/cancel` | `{ "patientId", "reason" }` |
| POST | `/api/reset` | Reseed demo data |

## Deploy (optional)

Any host that runs Node:

```bash
git clone <your-repo-url>
cd opd-queue-live/server
PORT=8080 node index.js
```

Examples: Railway, Render, Fly.io, a VPS.  
Put a reverse proxy (nginx / Cloudflare) in front for HTTPS in production.

## Disclaimer

This is a **prototype / teaching demo**. Do not use for real patient care, billing, or clinical decisions without a full product, security review, and regulatory compliance.
