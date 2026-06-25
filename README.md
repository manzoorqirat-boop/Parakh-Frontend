# Parakh Web — Frontend

React/Vite/TypeScript single-page app for the Parakh audit management system.
Part of the **QMSofts** suite. Talks to the Parakh .NET backend.

- **Stack:** React 19 · Vite 6 · TypeScript · Tailwind CSS v4 · shadcn-style owned components
- **Server state:** TanStack Query + Axios (JWT interceptor)
- **Routing:** React Router v7
- **Charts:** Recharts

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:5000` (your local Parakh
backend). Change the target in `vite.config.ts` if your API runs elsewhere.

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
```

---

## Structure

```
src/
  auth/            AuthContext — login, session boot, role checks
  components/
    ui/            Owned primitives: buttons, cards, inputs, badges,
                   status badges, lifecycle rail, modal, toast
    AppLayout.tsx  Sidebar shell + page header
  lib/
    api.ts         Axios client, token store, error normaliser
    hooks.ts       TanStack Query hooks for every endpoint
    utils.ts       cn(), date + enum formatters
  pages/           Login, Dashboard, Auditees, Audits, CAPAs (+ detail pages)
  types/           TypeScript mirror of the backend domain
  main.tsx         Providers + router
```

---

## How it maps to the backend

Every screen drives the backend lifecycle:

- **Dashboard** → `/dashboard/summary`, `/dashboard/risk-heatmap`
- **Auditees** → CRUD + qualification updates
- **Audit detail** → the full state machine: schedule → start → raise findings →
  report draft → **request signature (ERES Gate 1)**
- **CAPA detail** → start → submit for verification → record effectiveness →
  **request closure (ERES Gate 2)**

The **lifecycle rail** on the audit and CAPA detail pages is the signature UI
element — it shows each record's position in its state machine.

Signature actions (Gate 1 / Gate 2) trigger the backend, which builds the PDF and
creates an ERES envelope. The record advances to Signed/Closed only when ERES
posts back to the webhook — so after requesting a signature, the status reflects
"in progress" until signing completes server-side.

---

## Notes

- Auth tokens are stored in localStorage (matches the backend's deferred-hardening
  note on JWT storage; revisit alongside the backend item).
- Some create forms take raw GUIDs (lead auditor, finding ID) for now — these are
  the natural next refinement, replacing them with searchable pickers backed by
  user/finding lookup endpoints.
```
