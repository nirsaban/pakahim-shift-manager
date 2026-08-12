# Module: Notifications

## What actually exists today

Two real channels, despite three being named in `CLAUDE.md`'s stack section:

| Channel | Status | Where |
|---|---|---|
| **Email** (SMTP via `nodemailer`) | ✅ Implemented | `lib/mail/mailer.ts`: `sendOtpEmail`, `sendIncidentAlertEmail`. Best-effort — a mail failure never fails the underlying action (OTP request still returns `otp_sent`, incident still persists). |
| **WhatsApp deep link** (`wa.me`) | ✅ Implemented, link-only | `lib/utils/whatsapp.ts`. Not a bot/integration — just normalizes a phone number into a `https://wa.me/972...` link the UI renders as a button. One tap opens WhatsApp with that person pre-selected; nothing is sent automatically. |
| **Push (FCM)** | ❌ Not implemented | `User.fcmToken` column exists in the schema; `firebase-admin` is a listed dependency; **zero code anywhere sends a push notification or even collects a token.** This is a schema/dependency stub, not a working feature. |

This resolves `SPEC.md` conflict #1 (client wants WhatsApp + push, existing build assumed
FCM/email): the actual current state is neither — it's email + WhatsApp-deep-link only.
Real push notifications are unbuilt, not just "not this pass."

## Notification matrix (existing + this redesign's additions)

| Event | Recipients | Channel |
|---|---|---|
| OTP requested | The requesting user | Email |
| Incident reported | Team lead always; + `MAINTENANCE`-role users if routed there; + all `TEAM_LEAD`/`MAINTENANCE`/`ADMIN` if `EMERGENCY_BROADCAST` | Email to each with an address; UI also shows a `wa.me` link to the team lead as a fallback/faster path |
| Coverage requested `NEW` | The shift's team lead | Email — same pattern as incident reporting, reuse `sendMail`-style helper in `lib/mail/mailer.ts` |
| Coverage approved `NEW` | The requester (approved) **and** the new replacement (assigned) — two separate emails, different content | Email |
| Coverage rejected `NEW` | The requester only | Email, includes `decisionNote` if the team lead left one |
| Direct replacement assignment `NEW` | The newly assigned replacement (and the original worker, if the actor isn't them) | Email |

## Design for the new coverage notifications

Follows the exact pattern `sendIncidentAlertEmail` already establishes — same
best-effort, non-blocking send (`.catch(err => console.error(...))`, never throws into
the request handler), same RTL Hebrew HTML template style. Two new functions in
`lib/mail/mailer.ts`:

```
sendCoverageRequestEmail(to: teamLead.email, { requesterName, shiftDate, shiftTime, reason })
sendCoverageDecisionEmail(to: requester.email | replacement.email, { approved: boolean, shiftDate, shiftTime, decisionNote? })
```

## Open questions

- Should coverage notifications also get a `wa.me` fallback link like incidents do (team
  lead's phone, pre-filled with shift/date context)? Consistent with the existing
  pattern, cheap to add — flagged as a likely yes, not confirmed against a client answer.
- FCM being fully unbuilt means "instant" notification today is bounded by email
  deliverability (and the known `smtp.hostinger.com` intermittent-cert issue from
  operational history) — worth surfacing to the client as a real gap if "real-time" is a
  hard requirement for coverage decisions, not just incident alerts.
