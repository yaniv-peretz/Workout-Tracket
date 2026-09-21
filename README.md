# workout

A local-first workout logger. Vue 3 + Vite + TypeScript, data in **Chrome IndexedDB** via Dexie.

No server, no auth, no API, no cloud database. Once the page has loaded, everything works offline
and nothing ever leaves the browser.

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
```

IndexedDB is scoped per origin, so always run it from a real origin (`localhost:5173`, or the
GitHub Pages URL) — never by opening `index.html` off disk, or you get a different, empty database.

## Data model

Three object stores. The program is seed data, not application logic.

| Store      | Key path | Indexes                                          | Holds |
| ---------- | -------- | ------------------------------------------------ | ----- |
| `workouts` | `++id`   | `order`, `name`                                  | The editable program: a day plus its exercise list |
| `sessions` | `++id`   | `date`, `type`, `[type+date]`                    | One training session: **date, type, id** |
| `entries`  | `++id`   | `sessionId`, `exerciseName`, `date`, `[exerciseName+date]` | **sessionId, exercise name, sets as JSON** |

```ts
session = { id, date: '2026-09-21', type: 'Upper A', templateId, startedAt, completedAt }

entry   = { id, sessionId, exerciseName: 'Row', date: '2026-09-21', order, kind,
            sets: [ { weightKg: 70, reps: 10, rir: null, minutes: null, avgHr: null, done: true },
                    { weightKg: 70, reps: 9,  ... } ],
            notes, updatedAt }
```

Two deliberate choices:

- **History is keyed by exercise *name*, not by a template id.** `Row` in Upper A and `Row` in
  Upper B share one history, and renaming or deleting a day never orphans what you logged.
- **`date` is denormalised onto every entry**, so "history for this exercise" is one indexed
  range query over `[exerciseName+date]` instead of a join against sessions.

`localStorage` holds only the last day tapped and the id of a session in progress — nothing else.

## What it does in the gym

1. Home screen is four buttons: Upper A, Lower A, Upper B, Lower B.
2. Tap one — sets are materialised from the template, **weight prefilled from last time**. You
   mostly type reps and tap ✓.
3. Each exercise shows its target, what you did last session, and `↺` for the full history.
4. When every set hit the top of the rep range at the same weight, it *suggests* the next load.
   It never changes your weight for you — tap **Use** or ignore it.
5. Reopening the tab mid-workout resumes the open session.

## The program is yours to edit

**Program** → rename days, reorder or retarget exercises, change sets / rep range / RIR / kg
increment, add exercises or whole new days. None of it touches code. **Restore default program**
puts the seeded one back without deleting logged sessions.

Cardio exercises (the Lower B bike work) log **minutes + average HR** instead of kg × reps.

## Installing it on your phone

It is an installable PWA. Open the Pages URL in Chrome and either tap **Install app** on the home
screen, or use Chrome's menu → *Add to Home screen*. It then launches fullscreen with no browser
chrome, from its own icon.

Once installed the app shell is precached by a service worker, so it **opens and logs offline** —
useful in a basement gym with no signal. Your data was always local; this makes the app itself
local too. New versions are picked up automatically on the next launch (`registerType: 'autoUpdate'`).

Installability needs HTTPS, which the Pages URL provides. On `localhost` it also works; opening
`index.html` off disk does not.

## Backups

Browser storage is not durable — you or Chrome can clear it, and Incognito storage is discarded on
close. **Backup** → export the whole database as JSON, and import it back (a replace, so ids and
session links survive intact).

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`.
Pages must be enabled once under **Settings → Pages → Source: GitHub Actions** — the workflow
cannot do it for you, since creating a Pages site needs `administration:write` and `GITHUB_TOKEN`
never holds that. `vite.config.ts` uses
`base: './'`, so the same build works on localhost and under `/<repo>/` on Pages.

The Pages URL is just a stable origin to load the app from. Your training data stays in your
phone's Chrome.

## Inspecting the data

Chrome DevTools → **Application → IndexedDB → workout** → `workouts` / `sessions` / `entries`.
