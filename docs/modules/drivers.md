# Module: Locomotive drivers (נהגי קטר)

A second workforce on the same app, added 2026-10-05 after the פקחים version went live.
Same idea (log in, see today's shift), different people and different source files.
The rule throughout is **don't mix**: the פקחים app must behave exactly as before.

Status: phase 0 (tenant safety) and phase 1 (data model, contacts import) are done.
Login (phase 2), roster PDF upload (phase 3) and the driver screen (phase 4) are next.

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
