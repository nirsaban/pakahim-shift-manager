# Screen: commander view (`/admin/commander`)

Where every inspector is, right now — and at any minute of the day the slider is dragged
to. Open to `TEAM_LEAD`, `SHIBUTZ`, `ADMIN`, `SUPER_ADMIN`; the role is checked in the page
itself, because the proxy only proves a session is live, and this screen shows the whole
roster with names and phone numbers.

## What it can and cannot know

**The roster file has no timetable.** It states when a duty starts, when it ends, and the
ordered list of trains and operations in between — and nothing about when any individual
leg happens. So the board cannot *report* a position, only *derive* one:

1. Each leg is weighted by how long it ought to take — `estimateTravelMinutes` over the
   stop-distance graph transcribed from the ops booklet (`lib/reference/lines.ts`), the same
   graph the swap engine scores with.
2. A leg with an unknown endpoint (the roster leaves interior transfers null rather than
   guessing) gets an average weight instead, and is marked `ESTIMATED` rather than `STATED`.
   The progress bar is drawn in a muted colour for those.
3. The weights are scaled onto the duty's **real** duration. The start and end times are
   facts from the file; the weights only decide how the time between them is apportioned.

That limitation is printed on the screen, not buried here. A derived position presented as
a live feed would be worse than no screen at all — an inspector is not actually being
tracked, and nobody should act as if they are.

## Shape

`getCommanderSnapshot(tenantId, date)` sends **the whole day** to the client once: the
slider is the point of the screen, and re-querying per drag would make it useless. The
position maths (`lib/roster/position.ts`) is pure, so the browser recomputes all ~250
duties per frame. The payload is trimmed to what the board draws — no shift strings, no
remarks, no parse warnings.

While following "now" the board re-reads the clock every 30s rather than the server: the
roster it is drawing from does not change during a shift.

## Groupings

Two, because they answer different questions:

- **By train** — asked when something happens to a train ("who is on 6716").
- **By station** — asked when something happens at a station ("who is at ההגנה").

Busiest group first: an unusual concentration is the thing worth looking at.

Each row shows the inspector, their current segment, how far through it they are, their
shift window, and who they hand the train to next (from the handoff engine).

## Measured against the real 14.08.26 roster

```
08:00 — 44 inspectors active across 34 trains
13:42 — 47 active across 34 trains
22:00 — 0 active   (Friday roster; correct, it ends before Shabbat)
```

## Related

- `/admin/uploads` links each imported date straight through to this view for that day.
- `lib/roster/position.ts` — the estimator, with tests covering past-midnight duties,
  legs with no stated endpoints, and duties with no parsed legs at all.
