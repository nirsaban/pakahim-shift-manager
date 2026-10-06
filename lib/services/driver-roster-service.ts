import { prisma } from '../db/prisma';
import { he } from '../he';
import { readPdfTextItems, type PdfTextItem } from '../driver-roster/pdf';
import { isWeeklyLinkReport } from '../driver-roster/weekly';
import { importWeeklyRoster, type WeeklyRosterSummary } from './driver-weekly-service';
import { parseDriverRoster, type DriverRosterRow } from '../driver-roster/roster';
import { planRosterPublish, shiftWindow, type RosterDate } from '../driver-roster/roster-plan';
import { formatIsraelDate, israelMidnight } from '../time/zone';
import { notify } from './push-service';
import { DRIVERS_SOUTH_TEAM } from './driver-contacts-service';

/**
 * Reads the drivers' daily roster PDF and, when asked, publishes it into the
 * drivers tenant. The same call previews (publish: false) and publishes, so
 * what the roster admin approved is exactly what gets written.
 *
 * Writes only shifts, DriverDuty rows and - for drivers missing from the
 * contact list - DRIVER users, all in the tenant passed in.
 */

export interface DriverRosterSummary {
  kind: 'daily';
  date: string;
  rowCount: number;
  newShiftCount: number;
  updatedShiftCount: number;
  removedShiftCount: number;
  newDrivers: { workerNumber: string; name: string }[];
  skippedSections: string[];
  warnings: string[];
  rows: {
    serial: number;
    start: string;
    end: string;
    name: string;
    workerNumber: string | null;
    originStation: string | null;
    task: string;
    companion: string | null;
  }[];
}

export type DriverRosterResult = { ok: true; summary: DriverRosterSummary } | { ok: false; error: string };

export interface ImportDriverRosterInput {
  tenantId: string;
  uploadedBy: string;
  filename: string;
  pages: Pick<PdfTextItem, 'str' | 'x' | 'y' | 'width' | 'dir'>[][];
  publish: boolean;
}

export type RosterFileResult =
  | { ok: true; summary: DriverRosterSummary | WeeklyRosterSummary }
  | { ok: false; error: string };

/** The two rosters the department sends. */
export type RosterKind = 'daily' | 'weekly';

export function parseRosterKind(value: unknown): RosterKind | null {
  return value === 'daily' || value === 'weekly' ? value : null;
}

/**
 * Either roster the department sends: the daily "דוח סידור עבודה יומי" or the
 * weekly "דוח לינק יומי ושבועי", told apart by the title on the first page.
 *
 * The admin also says which one he is uploading. When the file is the other
 * kind it is refused rather than imported anyway: the daily overrides weekly
 * days, so the two must not be confused.
 */
export async function importRosterFile(
  input: Omit<ImportDriverRosterInput, 'pages'> & { data: Uint8Array; expected: RosterKind | null },
): Promise<RosterFileResult> {
  const { data, expected, ...rest } = input;
  let pages;
  try {
    pages = await readPdfTextItems(data);
  } catch {
    return { ok: false, error: he.drivers.upload.errors.unreadable };
  }
  const detected: RosterKind = isWeeklyLinkReport(pages) ? 'weekly' : 'daily';
  if (expected && expected !== detected) return { ok: false, error: he.drivers.upload.errors.wrongKind[detected] };
  return detected === 'weekly' ? importWeeklyRoster({ ...rest, pages }) : importDriverRoster({ ...rest, pages });
}

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const formatDate = (d: RosterDate) => `${pad(d.day)}/${pad(d.month)}/${d.year}`;

function companionLabel(row: DriverRosterRow): string | null {
  if (!row.companion) return null;
  const { role, name, workerNumber } = row.companion;
  return workerNumber ? `${role} ${name} (${workerNumber})` : `${role} ${name}`;
}

export async function importDriverRoster(input: ImportDriverRosterInput): Promise<DriverRosterResult> {
  const parsed = parseDriverRoster(input.pages);
  if (!parsed.date) return { ok: false, error: he.drivers.upload.errors.noDate };
  if (parsed.rows.length === 0) return { ok: false, error: he.drivers.upload.errors.noRows };
  const date = parsed.date;

  const team = await prisma.team.findUnique({
    where: { tenantId_name: { tenantId: input.tenantId, name: DRIVERS_SOUTH_TEAM } },
  });
  if (!team) return { ok: false, error: he.drivers.upload.errors.noTeam };

  const day = israelMidnight(date.year, date.month, date.day);
  const [drivers, existing] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: input.tenantId, role: 'DRIVER', workerNumber: { not: null } },
      select: { id: true, workerNumber: true },
    }),
    prisma.shift.findMany({
      where: { tenantId: input.tenantId, date: day },
      select: { id: true, workerId: true, startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    }),
  ]);
  const driverIdByNumber = new Map(drivers.map((d) => [d.workerNumber!, d.id]));
  const plan = planRosterPublish(parsed.rows, driverIdByNumber, existing);

  const summary: DriverRosterSummary = {
    kind: 'daily',
    date: formatDate(date),
    rowCount: parsed.rows.length,
    newShiftCount: plan.shifts.filter((s) => !s.existingShiftId).length,
    updatedShiftCount: plan.shifts.filter((s) => s.existingShiftId).length,
    removedShiftCount: plan.removeShiftIds.length,
    newDrivers: plan.newDrivers,
    skippedSections: parsed.skippedSections,
    warnings: [
      ...parsed.warnings,
      ...plan.unlinked.map((r) => he.drivers.upload.warning.unlinked(r.serial, r.workerName)),
    ],
    rows: parsed.rows.map((r) => ({
      serial: r.serial,
      start: clock(r.startMinutes),
      end: clock(r.endMinutes),
      name: r.workerName,
      workerNumber: r.workerNumber,
      originStation: r.originStation,
      task: r.task,
      companion: companionLabel(r),
    })),
  };
  if (!input.publish) return { ok: true, summary };

  await prisma.$transaction(
    async (tx) => {
      if (plan.newDrivers.length > 0) {
        await tx.user.createMany({
          data: plan.newDrivers.map((d) => ({
            tenantId: input.tenantId,
            role: 'DRIVER' as const,
            teamId: team.id,
            workerNumber: d.workerNumber,
            firstName: d.name,
          })),
        });
        const created = await tx.user.findMany({
          where: { tenantId: input.tenantId, workerNumber: { in: plan.newDrivers.map((d) => d.workerNumber) } },
          select: { id: true, workerNumber: true },
        });
        for (const d of created) driverIdByNumber.set(d.workerNumber!, d.id);
      }

      if (plan.removeShiftIds.length > 0) {
        await tx.shift.deleteMany({ where: { tenantId: input.tenantId, id: { in: plan.removeShiftIds } } });
      }

      for (const { row, workerId, existingShiftId } of plan.shifts) {
        const window = shiftWindow(date, row);
        const duty = {
          serial: row.serial,
          // Taking a day over from the weekly report makes it the daily's.
          source: 'DAILY' as const,
          link: null,
          mirs: row.mirs,
          originStation: row.originStation,
          task: row.task,
          trainNumbers: row.trainNumbers,
          companionRole: row.companion?.role ?? null,
          companionName: row.companion?.name ?? null,
          companionWorkerNumber: row.companion?.workerNumber ?? null,
          companionMirs: row.companionMirs,
        };
        const shift = {
          workerId: workerId ?? driverIdByNumber.get(row.workerNumber!)!,
          teamId: team.id,
          ...window,
          region: team.name,
        };

        if (existingShiftId) {
          await tx.shift.update({
            where: { id: existingShiftId },
            data: {
              ...shift,
              driverDuty: { upsert: { create: { tenantId: input.tenantId, ...duty }, update: duty } },
            },
          });
        } else {
          await tx.shift.create({
            data: {
              tenantId: input.tenantId,
              ...shift,
              driverDuty: { create: { tenantId: input.tenantId, ...duty } },
            },
          });
        }
      }

      await tx.shiftFile.create({
        data: {
          tenantId: input.tenantId,
          filename: input.filename,
          fileUrl: `local://${input.filename}`,
          uploadedBy: input.uploadedBy,
          status: 'IMPORTED',
          importedShiftCount: plan.shifts.length,
          importedDates: [day],
          errorMessage: summary.warnings.length > 0 ? summary.warnings.join(' · ') : null,
        },
      });
    },
    // A day is ~200 rows, each a write or two; the 5s default is too tight.
    { timeout: 60_000 },
  );

  notifyRosterChanges(date, day, plan, existing, driverIdByNumber);
  return { ok: true, summary };
}

/**
 * Tells drivers what this publish changed for them, as the פקחים import does:
 * newly on the day, times moved, or off the day. An unchanged re-upload sends
 * nothing. Best-effort, after the write - a push outage must not fail a publish.
 */
function notifyRosterChanges(
  date: RosterDate,
  day: Date,
  plan: ReturnType<typeof planRosterPublish>,
  existing: { id: string; workerId: string; startTime: Date; endTime: Date }[],
  driverIdByNumber: Map<string, string>,
): void {
  const before = new Map(existing.map((s) => [s.id, s]));
  const assigned = new Set<string>();
  const changed = new Set<string>();
  const stillOn = new Set<string>();

  for (const { row, workerId, existingShiftId } of plan.shifts) {
    const id = workerId ?? driverIdByNumber.get(row.workerNumber!);
    if (!id) continue;
    stillOn.add(id);
    const previous = existingShiftId ? before.get(existingShiftId) : undefined;
    if (!previous) {
      assigned.add(id);
      continue;
    }
    const window = shiftWindow(date, row);
    if (window.startTime.getTime() !== previous.startTime.getTime() || window.endTime.getTime() !== previous.endTime.getTime()) {
      changed.add(id);
    }
  }
  const removed = plan.removeShiftIds
    .map((id) => before.get(id)?.workerId)
    .filter((id): id is string => Boolean(id) && !stillOn.has(id!));

  const when = formatIsraelDate(day, { weekday: 'long', day: '2-digit', month: '2-digit' });
  const send = (ids: Iterable<string>, copy: { title: string; body: (when: string) => string }) => {
    const list = [...ids];
    if (list.length > 0) notify(list, { title: copy.title, body: copy.body(when), url: '/drivers', tag: 'roster-import' });
  };
  send(assigned, he.push.shiftAssigned);
  send(changed, he.push.shiftChanged);
  send(removed, he.push.shiftRemoved);
}
