# Module: Locomotive drivers (נהגי קטר)

A second workforce on the same app, added 2026-10-05 after the פקחים version went live.
Same idea (log in, see today's shift), different people and different source files.
The rule throughout is **don't mix**: the פקחים app must behave exactly as before.

Status: phases 0–4 are done and live: tenant safety, data model and contacts import,
login, roster PDF upload, and the driver screen. Phase 5 (2026-10-06) brought the drivers
to parity with the פקחים app - see "Feature parity with פקחים" below.

## Scope (from the user, 2026-10-05)

- **South only.** The roster PDF has a צפון נהגים section; it is skipped entirely.
- **Roster is PDF only**: a Crystal Reports export, "דוח סידור עבודה יומי". No Excel export.
- **Login**:
  - First login: worker number, then the driver gives an email and a phone.
  - Later logins: phone number only.
  - The code goes to WhatsApp **and** email.
  - Drivers are pre-registered from the contact list, so there is no name or city form.
- **Roster admin**: one driver uploads the roster. He is a regular driver with an extra
  permission, the same pattern as the פקחים admin.
- The yellow highlight and `*` on some roster rows carry no meaning. Strip the `*` and
  ignore the highlight.

## Separation

Drivers are a **second tenant** (slug `drivers`). The פקחים tenant is slug `default`.

- **Tenant resolution:**
  - `getDefaultTenantId()` resolves the פקחים tenant by slug.
  - `getDriversTenantId()` resolves the drivers tenant.
  - Never use `tenant.findFirst()`: with two rows it returns either one.
- **Workforce on the session:**
  - Every session carries `workforce: 'pakahim' | 'drivers'` (JWT and Redis), see
    `lib/auth/workforce.ts`.
  - Tokens issued before the drivers existed carry none and read as פקחים.
- **Route wall (`proxy.ts`):**
  - A driver session reaches only `/drivers/**` and `/api/drivers/**` (plus logout).
  - A פקחים session reaches everything else.
  - Drivers get an allowlist, so a new פקחים route is closed to them by default.
  - `lib/auth/workforce.test.ts` reads every route under `app/` and checks both directions.
- **Roles:**
  - Drivers have `UserRole.DRIVER`.
  - The roster admin is a `DRIVER` with `isRosterAdmin`, never `ADMIN`. Every existing
    `role === 'ADMIN'` check is a פקחים check.
  - The פקחים admin screens' role lists do not include `DRIVER`.
- **Services that take an id from the request check the tenant:**
  - coverage decisions and replacements;
  - admin edits of workers and teams. Another tenant's row reads as not found.
- **Data:**
  - Driver roster lines go in `DriverDuty`, not `Duty`. `Duty` is the פקחים booklet
    grammar and feeds the handoff and swap engines, which know nothing about drivers.
  - Times live on the ordinary `Shift`, so pre-shift reminders work unchanged.
- **Home stations:** drivers do not get one. City aliases are a shared review queue
  shown to the פקחים admin, and drivers have no swap engine to feed.

## Contact list import

Source: "אלפון נהגים" PDF, one card per driver:

- name
- `עיר: …`
- `מספר עובד: …`
- phone

The real file (291 drivers, 16 without a worker number) lives in `fixtures/drivers/`,
which is **gitignored**: it holds phone numbers and the repo is public. Tests that read
it skip when it is absent.

```
npx tsx scripts/import-driver-contacts.ts fixtures/drivers/contacts.pdf --roster-admin <worker number>          # dry run
npx tsx scripts/import-driver-contacts.ts fixtures/drivers/contacts.pdf --roster-admin <worker number> --apply
```

**Parsing (`lib/driver-roster/contacts.ts`):**
- Lines are rebuilt from text positions before they are read.
- The PDF draws a line's pieces out of order: "עיר: באר שבע" arrives as "שבע" then
  "עיר: באר". Reading in drawing order turns the second half of a city into a phantom
  driver.
- Cards are recognised by their fixed labels and the phone shape.

**Applying (`lib/driver-roster/contacts-plan.ts`, `lib/services/driver-contacts-service.ts`):**
- Matching:
  - by worker number;
  - by phone only for a row that has no worker number yet.
- Re-running is a no-op.
- Nobody is deleted. Drivers missing from a newer list are reported.
- A driver who has logged in keeps their phone, because it is their login from then on.
- The first run creates the tenant and team `דרום`, with the roster admin as team lead.
- Full names go in `firstName`, as the פקחים import does. A Hebrew name has no reliable
  split point.

## Login

`/login` opens with a פקח / נהג קטר picker. The device remembers the last choice in
localStorage, and the פקחים form behind it is unchanged (`PakahimLogin`). The driver
form is `DriverLogin`, backed by four public routes under `/api/drivers/auth/`:

| Route | Step |
| --- | --- |
| `worker-number` | First login: is this a driver who has not logged in yet? Sends nothing. |
| `register` | First login: email + phone. The phone must match the contact list (`isSamePhone`), then a code is sent. |
| `phone` | Later logins: phone only, then a code is sent. |
| `verify` | Checks the code. `{workerNumber, otp}` saves the email; `{phone, otp}` logs in. Either way it opens a `drivers` session. |

- **Code delivery:** `deliverOtp({ allChannels: true })` sends to WhatsApp **and**
  email. פקחים keep "email only if WhatsApp failed".
- **The phone is the identity check:**
  - A worker number is printed on a roster everyone gets, so it proves nothing on its own.
  - A driver whose phone changed is sent to the roster admin to have it corrected.
- **First login does not touch the account until the code verifies:**
  - The submitted email waits in Redis until then.
  - The claim is guarded on `email: null`, so two attempts racing for one driver cannot both win.
- **Phone shared by two drivers:** phone login is refused rather than guessed.
- **OTP keys:**
  - first login: `drv-reg:{tenantId}:{workerNumber}`;
  - later logins: `drv:{userId}`.
  - Neither can collide with a פקחים code.

## Roster upload

The roster admin uploads the PDF at `/drivers/upload`.
- "בדוק קובץ" runs the import with `publish=false` and shows what would be written:
  counts, drivers missing from the contact list, skipped sections, and warnings in Hebrew.
- "פרסם סידור" runs the same call with `publish=true`.
- API: `POST /api/drivers/roster` (multipart `file`, `publish`).
  - Allowed only when `findRosterAdmin` passes. It reads the database, not the session,
    so revoking `isRosterAdmin` takes effect at once.
  - The file is checked by content (`%PDF-`) and capped at 10MB.

### Report format (`lib/driver-roster/roster.ts`)

"דוח סידור עבודה יומי" is a Crystal Reports table drawn as loose text, so rows and
columns are rebuilt from positions.

**Columns** are fixed x-bands on the page, measured on the 01.10.2026 report, right to left:

| Column | x from (pt) |
| --- | --- |
| name / worker numbers | ≥500 |
| Mirs | 458 |
| # | 440 |
| task (משימה) | 108 |
| origin (תחנת מוצא) | 68 |
| planned end | 33 |
| start | 0 |

Names are right-aligned, so the name column is decided by an item's **right** edge: a
long name starts left of 500.

**Page furniture:**
- Header: everything above y=740, with the title, the report date and the section
  ("מחלקה: דרום נהגים").
- Footer: everything below y=65 ("1 of 15", the department contact line).

**Rows:**
- A row starts at its start time and owns everything down to the next start time.
- A task that runs past the bottom of a page continues above the next page's first start
  time, and is joined back on.
- The name column, top to bottom, holds:
  - the driver's name, then their worker number;
  - optionally "חונך …" or "צופה …", that person's name (it may wrap) and their number.
- The second Mirs on a line belongs to that trainee or observer.
- The `*` and the yellow highlight mean nothing, and are dropped.

**Origin stations wrap over two or three lines** in three ways, and `joinOrigin` handles each:
- at a space: "אוטם" / "סבידור";
- at an underscore: "_מתחם" / "אשקלון";
- inside a word: "ראש_הע" / "ין_צפון".

**Train numbers** are the standalone numbers in the task. Tagged tokens like "233בת"
and times are left out.

**Sections:** only **דרום נהגים** is read. Other sections are reported as skipped.

### Publishing (`lib/driver-roster/roster-plan.ts`, `lib/services/driver-roster-service.ts`)

- **Times:**
  - Times are Israel wall clock (`israelTime`).
  - A shift whose end is at or before its start ends the next day.
- **Re-upload keeps shifts:**
  - Each driver's existing shift for that date is updated in place, not replaced.
  - Pre-shift reminders are de-duplicated per shift id, so a fresh id would remind the
    driver twice.
  - Shifts the new file no longer has are deleted.
- **Drivers missing from the contact list** (8 in the 01.10 file) are created as DRIVER
  users with name and number. They have no phone, so they cannot log in until one is added.
- **Rows with no worker number** are listed and not published.
- **Storage:** times go on `Shift`, the rest on `DriverDuty`.
- **History:** every publish leaves a `ShiftFile` in the drivers tenant.

## Driver screen (`/drivers`)

**My shift** (`MyShifts`) shows the next shift that has not ended:
- day ("היום" / "מחר" / the date) and times;
- an "on shift now" badge while it runs;
- origin station and Mirs;
- the train numbers as chips, the task text and the row number;
- the trainee or observer, with their worker number and Mirs.

Later shifts follow, one line each.

**Day roster** (`DriverDirectory`):
- **Which day:** one published roster day, chosen by `pickRosterDay`: today's, else the
  next published, else the latest.
- **No search:** the list shows who is on that day, by start time, each with a
  `tel:` link.
- **Search** covers every driver (name, worker number prefix, city), on shift or not.
  This is the lookup drivers used to do by hand in the emailed file.

**Times** are formatted on the server in Israel time and handed to the client as
strings, so a phone's own zone never comes into it. `relativeDayLabel` and
`pickRosterDay` are tested at 00:30 Israel time, when UTC and New York are still on the
previous day.

## Feature parity with פקחים (phase 5)

The client asked for "everything the פקחים section has" for drivers too, with the roster
admin (איתן) as a working driver who also has every admin power. This mirrors the
פקחים admin, who is likewise a worker plus admin, though there it is two accounts.

| פקחים feature | Drivers |
| --- | --- |
| Shift card: current/next, sick/holiday badge, replacement with WhatsApp | `MyShifts` (+ origin, Mirs, trains, trainee) |
| "Covering for" | same card, `getShiftsCoveringFor` |
| Handoffs / train companions | `TrainPartners`: other drivers whose task that day names the same train |
| My schedule (7 back, 14 ahead) | `MySchedule`, reused |
| Workload week/month/year | `WorkloadCard`, reused (`basePath="/drivers"`) |
| Incident report | `ReportIncidentForm`, reused; it reaches the team lead (the roster admin) |
| Settings: profile, email, reminders | `/settings`, shared |
| Push notifications, reminder tones | `NotificationsPrompt`, `AlertSoundPlayer`, reminder-service, unchanged |
| Push on roster import (assigned / changed / removed) | `notifyRosterChanges` in driver-roster-service |
| Team lead: upcoming roster, team status, team workload, incidents inbox | `/drivers/team` |
| Direct replacement assignment | `/drivers/team`, same `DirectAssignForm` and API |
| Admin: upload, upload history | `/drivers/upload`, `/drivers/uploads` |
| Admin: manage workers | `/drivers/manage`: add a driver; fix name, number, phone, city |
| Admin: analytics | stats card on `/drivers/team` |

**How it is shared without mixing:**
- **Services** treat `WORKER_ROLES` (`PAKAHIM`, `DRIVER`) as workers, and every
  id-based action checks the tenant.
- **The roster admin** passes `isDriversAdmin` where a team lead or admin would.
  - It applies only to his own tenant's teams (`canDecideForTeam`).
  - He never holds `ADMIN`.
- **Routes open to drivers** (`lib/auth/workforce.ts` `SHARED_PATHS`): only routes that
  act on the signed-in user or are tenant-checked.
  - `/settings`, `/api/users/me*`, `/api/push/subscribe`;
  - `/api/notifications/incidents*`, `/api/shifts/[id]/replacement`.
  - Everything else stays closed to them, and the test walks every route both ways.
- **Phone uniqueness:** a driver's phone is their login. Settings and the admin list
  refuse a phone another driver already has, because two drivers on one phone would lock
  both out of phone login.

**Not carried over:** these run on the פקחים booklet's leg grammar (stations and legs
per duty), which the drivers' report does not have in that form.
- swap suggestions;
- the commander board;
- the station-level handoff detail.

Timezone repair and WhatsApp pairing are global admin tools and stay with the פקחים admin.
