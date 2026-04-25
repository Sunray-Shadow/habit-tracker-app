# Habit Tracker

A personal habit tracker with flexible measurement types and a clean, Oura-inspired UI. Log your habits daily, review trends over time, and build routines that stick.

---

## Features

### Current (v1)
- **Six measurement types** — Toggle (yes/no), Number (with optional unit and target), Text (free-text note), Scale (slider with user-defined min/max), Choices (custom option sets), and Emoji (happy / neutral / sad)
- **Today screen** — a checklist of all active habits, tap to log
- **Past-day editing** — navigate back to any previous day and update entries
- **Trends view** — per-habit charts: line chart for numeric values, calendar heatmap for toggle / scale / emoji
- **Mobile-first** — responsive layout that works seamlessly on desktop
- **Offline-first** — all data stored in `localStorage`; no account required

### Planned
- Cloud sync and multi-device support
- User accounts and authentication
- Apple Health integration
- Push / reminder notifications
- Habit streaks and achievement badges
- Data export (CSV / JSON)
- Shareable habit templates

---

## Tech Stack

| Layer | Choice |
|---|---|
| Markup | Vanilla HTML5 |
| Styling | Vanilla CSS3 (custom properties, CSS Grid, Flexbox) |
| Logic | Vanilla JavaScript (ES Modules) |
| Storage | `localStorage` (v1) — data layer abstracted for a future cloud backend |
| Charts | TBD — lightweight canvas or SVG library |
| Hosting | TBD (GitHub Pages / Netlify / Vercel) |

No build step, no bundler, no dependencies required to run locally.

---

## Running Locally

Because the app uses ES Modules you need to serve it over HTTP (browsers block module imports from `file://`).

**Option A — Python (no install required)**
```bash
cd habit-tracker-app
python3 -m http.server 8080
# open http://localhost:8080
```

**Option B — Node `serve`**
```bash
npx serve .
```

**Option C — VS Code Live Server**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html`, and choose *Open with Live Server*.

---

## Project Structure

```
habit-tracker-app/
├── index.html          # Entry point — Today screen
├── trends.html         # Trends / charts screen
├── css/
│   ├── reset.css       # Minimal CSS reset
│   ├── tokens.css      # Design tokens (colors, spacing, radius, motion)
│   └── app.css         # Component styles
├── js/
│   ├── main.js         # App bootstrap
│   ├── store.js        # Data layer (localStorage adapter; swap for API later)
│   ├── habits.js       # Habit CRUD logic
│   ├── log.js          # Daily log logic
│   └── charts.js       # Trends rendering
└── assets/
    └── icons/          # SVG icons
```

---

## Data Model (v1)

Data is stored in `localStorage` under two keys:

```jsonc
// "habits" — array of habit definitions
[
  {
    "id": "uuid",
    "name": "Morning run",
    "type": "number",       // toggle | number | text | scale | choices | emoji
    "unit": "km",           // optional
    "target": 5,            // optional
    "options": [],          // for type=choices
    "scale": { "min": 1, "max": 10 },  // for type=scale
    "createdAt": "ISO8601",
    "archivedAt": null
  }
]

// "log" — map of date → habitId → entry
{
  "2026-04-25": {
    "uuid": { "value": 4.2, "loggedAt": "ISO8601" }
  }
}
```

The `store.js` module is the only file that touches `localStorage`. Replacing it with an API client later requires no changes to UI code.

---

## Roadmap

| Milestone | Scope |
|---|---|
| **v1 — MVP** | Six habit types, Today screen, past-day editing, Trends view, localStorage |
| **v2 — Sync** | User accounts, cloud backend, multi-device sync |
| **v3 — Mobile** | PWA manifest, push notifications, home-screen install |
| **v4 — Integrations** | Apple Health, data export, sharing |

---

## Design Principles

- **Oura-inspired aesthetic** — generous whitespace, soft neutral palette, large rounded cards, subtle motion
- **Mobile-first** — designed at 390 px, scales up gracefully
- **Storage-agnostic** — UI never calls `localStorage` directly; all persistence goes through the store module
- **No framework lock-in** — plain HTML/CSS/JS keeps the codebase portable and dependency-free

---

## License

MIT
