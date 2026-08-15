# Module: time and zones (`lib/time/zone.ts`)

Every time in this product is **Israel local time**. The roster file states wall clock,
workers read wall clock, and the pre-shift reminder has to fire against it.

## The bug this module exists to prevent

The importer used to build shift instants with `new Date(year, month, day)` plus
`setMinutes(...)`, which reads **the server's** zone. Nothing set `TZ` in the image, so
production ran UTC:

| | stored | reads as, in Israel |
|---|---|---|
| roster line | `04:00` | — |
| what was written | `2026-08-14T04:00:00Z` | 07:00 ❌ |
| what it should be | `2026-08-14T01:00:00Z` | 04:00 ✅ |

It stayed hidden because the *display* was wrong in the same direction: server-rendered
`toLocaleTimeString('he-IL')` formatted back in UTC and printed `04:00`. The only visible
symptom was the pre-shift reminder, which compares stored instants against a real `now` —
so at 03:30 it stayed silent, and fired at 06:30 for a shift already an hour underway.

## The rule

**Never build or read a roster instant with local-time getters/setters.** `getHours()`,
`setHours()`, `getDay()`, `new Date(y, m, d)` and `setDate()` all read the process zone.
Use the helpers instead:

| need | helper |
|---|---|
| wall clock → instant | `israelTime(y, m, d, minutesPastMidnight)` |
| roster date | `israelMidnight(y, m, d)` / `startOfIsraelDay(instant)` |
| calendar-day arithmetic | `addIsraelDays(instant, n)` |
| grouping key | `israelDateKey(instant)` → `yyyy-mm-dd` |
| weekday / minute-of-day | `israelWeekday` / `israelMinutesOfDay` |
| rendering | `formatIsraelTime` / `formatIsraelDate` / `formatIsraelDateTime` |

`minutes` may exceed 1440 — a duty ending 02:40 is minute 1600 of its own roster date,
which is how the roster itself expresses it.

Results are identical under `TZ=UTC`, `TZ=Asia/Jerusalem` and anything else; the suite is
run under all three. `TZ=Asia/Jerusalem` is still set in the Dockerfile and compose file so
that plain `toLocaleString` calls and container logs are right, but **no data path depends
on it** any more.

## DST, twice a year

Israel is UTC+2 (IST) in winter, +3 (IDT) in summer, switching at 02:00. `israelTime`
brackets the transition by sampling the offset a day either side, so:

- **Ambiguous** (autumn, clocks back): 01:00 happens twice. The **first** — still on summer
  time — is taken, matching Temporal, `java.time` and moment-timezone, and keeping a duty's
  end from appearing to precede a later duty's start.
- **Nonexistent** (spring, clocks forward): 02:30 never occurs. It is pushed forward to
  03:30 rather than throwing at an admin who only uploaded the file they were sent.

`addIsraelDays` is calendar arithmetic, not `+86400000` — the two DST weekends contain a
23- and a 25-hour day, and a fixed-millisecond step silently breaks streak counting.

## Existing rows

Rows written before the fix are identified by `Shift.date` sitting at exactly
`00:00:00.000Z`; a repaired roster date is Israeli midnight (21:00Z or 22:00Z the day
before), so the discriminator cannot mistake one for the other and the repair is safe to
run twice.

```
npm run fix:timezone            # dry run, prints what it would change
npm run fix:timezone -- --apply
```

It keeps the wall-clock reading and re-anchors it, so it works for dates whose source file
is long gone — which is why it exists rather than just re-uploading. `Shift`, `Duty` and
`ShiftFile.importedDates` are all covered.
