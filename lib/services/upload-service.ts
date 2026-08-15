import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma';
import { importedShiftRowSchema, type ImportedShiftRow } from '../validation/shifts';
import { parseDuty } from '../roster/duty';
import { groupWorkbookByDate, type RosterDay } from '../roster/workbook';
import type { RosterRowInput } from '../roster/types';
import { dutyKey, persistRoster } from './roster-service';
import { notify } from './push-service';
import { formatIsraelDate, israelDateKey, israelParts, israelTime } from '../time/zone';
import { formatWorkerName } from '../utils/display-name';
import { he } from '../he';

/** One roster date inside an uploaded workbook. */
export interface DayImportResult {
  /** yyyy-mm-dd, so the client never has to re-derive the local date. */
  date: string;
  importedCount: number;
  skippedCount: number;
  dutyCount?: number;
  handoffCount?: number;
  deadheadCrossingCount?: number;
  /** Roster lines that repeated a (section, serial) an earlier line already took. */
  duplicateDutyCount?: number;
  rosterError?: string;
}

export interface ImportResult {
  fileId: string;
  status: 'IMPORTED' | 'FAILED';
  /** Totals across every date in the file. */
  importedCount: number;
  skippedCount: number;
  errorMessage?: string;
  needsConfirmation?: boolean;
  activeCoverageCount?: number;
  /** Which dates a confirmed re-upload would clear coverage on, and how much. */
  coverageByDate?: { date: string; count: number }[];
  /** Per-date breakdown. One entry for a normal daily file, several for a weekly one. */
  days: DayImportResult[];
  // Roster-engine results, summed. Absent when the roster layer failed - which
  // never fails the import itself, see the try/catch in importDay.
  dutyCount?: number;
  handoffCount?: number;
  deadheadCrossingCount?: number;
  rosterError?: string;
}

export async function getUploadHistory(tenantId: string, limit = 20) {
  return prisma.shiftFile.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** One roster date a file wrote, and whether that write still stands. */
export interface UploadedDate {
  /** yyyy-mm-dd. */
  date: string;
  /** Shifts currently held for that date - which may have come from a later file. */
  shiftCount: number;
  /** False when a newer upload has since replaced this date. */
  isCurrent: boolean;
}

export interface UploadRecord {
  id: string;
  filename: string;
  status: string;
  errorMessage: string | null;
  importedShiftCount: number;
  createdAt: Date;
  uploadedByName: string | null;
  dates: UploadedDate[];
}

/**
 * Upload history with the dates behind each file.
 *
 * An import is a destructive replace per date, so "which file is the roster for
 * Friday" is a real question with a real answer, and the answer is not always
 * the newest file overall - a Sunday-only re-upload does not touch Friday. Each
 * date is marked with whether this file is still the one that wrote it.
 */
export async function listUploadRecords(tenantId: string, limit = 50): Promise<UploadRecord[]> {
  const files = await prisma.shiftFile.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const uploaderIds = [...new Set(files.map((f) => f.uploadedBy))];
  const [uploaders, shiftCounts] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: uploaderIds } },
      select: { id: true, firstName: true, lastName: true, workerNumber: true },
    }),
    prisma.shift.groupBy({ by: ['date'], where: { tenantId }, _count: { _all: true } }),
  ]);

  const nameById = new Map(uploaders.map((u) => [u.id, formatWorkerName(u) || u.workerNumber]));
  const countByDate = new Map(shiftCounts.map((row) => [dateKey(row.date), row._count._all]));

  // Newest import wins a date, because that is exactly what the importer did to
  // the database. Files are already in descending order, so the first claim seen
  // is the surviving one.
  const ownerByDate = new Map<string, string>();
  for (const file of files) {
    if (file.status !== 'IMPORTED') continue;
    for (const date of file.importedDates) {
      const key = dateKey(date);
      if (!ownerByDate.has(key)) ownerByDate.set(key, file.id);
    }
  }

  return files.map((file) => ({
    id: file.id,
    filename: file.filename,
    status: file.status,
    errorMessage: file.errorMessage,
    importedShiftCount: file.importedShiftCount,
    createdAt: file.createdAt,
    uploadedByName: nameById.get(file.uploadedBy) ?? null,
    dates: file.importedDates.map((date) => {
      const key = dateKey(date);
      return {
        date: key,
        shiftCount: countByDate.get(key) ?? 0,
        isCurrent: ownerByDate.get(key) === file.id,
      };
    }),
  }));
}

// Sheet scanning, date/time parsing and section-name cleaning now live in
// lib/roster/sheet.ts so the parser and the importer cannot drift apart, and so
// scripts/verify-roster.ts can exercise the same code with no database.
//
// A roster row carries more than a Shift needs; `serial` is threaded through
// here so each created Shift can be linked back to its parsed Duty.
type ShiftRowWithSerial = ImportedShiftRow & { serial: string };

/**
 * What a worker would notice changing about their shift: the times, and the
 * notes blob (which carries the route text and the shift string). Used to decide
 * whether an import is worth a push notification.
 */
function shiftSignature(shift: { startTime: Date; endTime: Date; notes: string | null }): string {
  return `${shift.startTime.getTime()}|${shift.endTime.getTime()}|${shift.notes ?? ''}`;
}

const dateKey = israelDateKey;

// Narrows the full roster to the rows that can become a Shift: those need an
// inspector and both times. Rows without them stay in the roster layer as open
// duties. The `notes` blob is unchanged - the dashboard renders it today.
function toShiftRows(rosterRows: RosterRowInput[]): { rows: ShiftRowWithSerial[]; skipped: number } {
  const extracted: ShiftRowWithSerial[] = [];
  let skipped = 0;

  for (const row of rosterRows) {
    if (!row.name || !row.workerNumber || row.startMinutes === null || row.endMinutes === null) {
      skipped += 1;
      continue;
    }

    const noteParts: string[] = [];
    if (row.routeNote) noteParts.push(row.routeNote);
    if (row.shiftString) noteParts.push(`קרונות: ${row.shiftString}`);
    if (row.remarks) noteParts.push(row.remarks);
    if (row.mirs && row.mirs !== '-') noteParts.push(`מירס: ${row.mirs}`);
    if (row.traineeName && row.traineeName !== '-') noteParts.push(`מתלמד: ${row.traineeName}`);
    if (row.serial.startsWith('משני')) noteParts.push('(רשימת מילואים)');

    const parsed = importedShiftRowSchema.safeParse({
      region: row.section,
      workerNumber: row.workerNumber,
      name: row.name,
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
      notes: noteParts.join(' | '),
    });

    if (!parsed.success) {
      skipped += 1;
      continue;
    }

    extracted.push({ ...parsed.data, serial: row.serial });
  }

  return { rows: extracted, skipped };
}

interface ImportInput {
  tenantId: string;
  uploadedBy: string;
  filename: string;
  buffer: Buffer;
  confirmClearCoverage?: boolean;
}

// A re-upload replaces (deleteMany + recreate) every shift for a date - including
// any that already have an active coverage assignment (Shift.replacementId set, from a
// direct assignment or an approved CoverageRequest). Silently cascading that away would
// undo real team-lead decisions. See docs/data-model.md's open question on this.
async function countActiveCoverageByDate(
  tenantId: string,
  dates: Date[],
): Promise<{ date: string; count: number }[]> {
  const counts = await Promise.all(
    dates.map((date) => prisma.shift.count({ where: { tenantId, date, replacementId: { not: null } } })),
  );
  return dates
    .map((date, i) => ({ date: dateKey(date), count: counts[i] }))
    .filter((entry) => entry.count > 0);
}

/**
 * Teams and workers are tenant-wide, not per-day: a worker seen on Sunday is the
 * same row on Monday. Resolving them once per file rather than once per day keeps
 * a three-day upload from re-running ~750 sequential lookups.
 */
class RosterDirectory {
  private readonly teamIdByRegion = new Map<string, string>();
  private readonly workerIdByNumber = new Map<string, { id: string; role: string; teamId: string | null }>();

  private constructor(
    private readonly tenantId: string,
    private readonly teamLeadId: string | null,
    private readonly fallbackTeamId: string | null,
  ) {}

  static async load(tenantId: string): Promise<RosterDirectory> {
    const [fallbackTeam, teamLead] = await Promise.all([
      prisma.team.findFirst({ where: { tenantId } }),
      prisma.user.findFirst({ where: { tenantId, role: 'TEAM_LEAD' } }),
    ]);
    return new RosterDirectory(tenantId, teamLead?.id ?? null, fallbackTeam?.id ?? null);
  }

  async teamId(region: string): Promise<string> {
    const cached = this.teamIdByRegion.get(region);
    if (cached) return cached;

    if (!this.teamLeadId) {
      if (!this.fallbackTeamId) throw new Error('No team lead or team available to assign imported shifts to');
      this.teamIdByRegion.set(region, this.fallbackTeamId);
      return this.fallbackTeamId;
    }

    const team = await prisma.team.upsert({
      where: { tenantId_name: { tenantId: this.tenantId, name: region } },
      update: {},
      create: { tenantId: this.tenantId, name: region, teamLeadId: this.teamLeadId },
    });
    this.teamIdByRegion.set(region, team.id);
    return team.id;
  }

  async workerId(workerNumber: string, name: string, teamId: string): Promise<string> {
    let worker = this.workerIdByNumber.get(workerNumber) ?? null;

    if (!worker) {
      const found = await prisma.user.findUnique({
        where: { tenantId_workerNumber: { tenantId: this.tenantId, workerNumber } },
      });
      if (found) worker = { id: found.id, role: found.role, teamId: found.teamId };
    }

    if (!worker) {
      const created = await prisma.user.create({
        data: { tenantId: this.tenantId, workerNumber, firstName: name, role: 'PAKAHIM', teamId },
      });
      worker = { id: created.id, role: created.role, teamId: created.teamId };
    } else if (worker.role === 'PAKAHIM' && worker.teamId !== teamId) {
      // The roster file is the authoritative current placement - keep the worker's
      // team in sync, but never touch their name/email/city (self-reported data).
      await prisma.user.update({ where: { id: worker.id }, data: { teamId } });
      worker = { ...worker, teamId };
    }

    this.workerIdByNumber.set(workerNumber, worker);
    return worker.id;
  }
}

/** Every worker whose roster moved, per date - aggregated so a multi-day upload
 *  sends one push per worker instead of one per day. */
interface ChangeLog {
  assigned: Map<string, Date[]>;
  changed: Map<string, Date[]>;
  removed: Map<string, Date[]>;
}

function record(log: Map<string, Date[]>, workerId: string, date: Date): void {
  const dates = log.get(workerId);
  if (dates) dates.push(date);
  else log.set(workerId, [date]);
}

export async function importShiftFile(input: ImportInput): Promise<ImportResult> {
  const workbook = XLSX.read(input.buffer, { type: 'buffer', cellDates: true });
  const scan = groupWorkbookByDate(workbook);

  if (scan.days.length === 0) {
    return {
      fileId: '',
      status: 'FAILED',
      importedCount: 0,
      skippedCount: 0,
      days: [],
      errorMessage: he.admin.importNoValidRows,
    };
  }

  if (!input.confirmClearCoverage) {
    const coverageByDate = await countActiveCoverageByDate(
      input.tenantId,
      scan.days.map((d) => d.date),
    );
    const activeCoverageCount = coverageByDate.reduce((sum, entry) => sum + entry.count, 0);
    if (activeCoverageCount > 0) {
      return {
        fileId: '',
        status: 'FAILED',
        importedCount: 0,
        skippedCount: 0,
        days: [],
        needsConfirmation: true,
        activeCoverageCount,
        coverageByDate,
      };
    }
  }

  const file = await prisma.shiftFile.create({
    data: {
      tenantId: input.tenantId,
      filename: input.filename,
      fileUrl: `local://${input.filename}`,
      uploadedBy: input.uploadedBy,
      status: 'PENDING',
    },
  });

  const directory = await RosterDirectory.load(input.tenantId);
  const changes: ChangeLog = { assigned: new Map(), changed: new Map(), removed: new Map() };
  const days: DayImportResult[] = [];

  for (const day of scan.days) {
    days.push(await importDay(input.tenantId, day, directory, changes));
  }

  const importedCount = days.reduce((sum, d) => sum + d.importedCount, 0);
  // Rows dropped for want of a date are a real loss the admin needs told about,
  // so they count as skipped alongside the per-day ones.
  const skippedCount =
    days.reduce((sum, d) => sum + d.skippedCount, 0) + scan.dropped + scan.undated;

  if (importedCount === 0) {
    return failImport(file.id, he.admin.importNoValidRows);
  }

  const notes: string[] = [];
  if (skippedCount > 0) notes.push(he.admin.importSkippedRows(importedCount, skippedCount));
  if (scan.undated > 0) notes.push(he.admin.importUndatedRows(scan.undated));
  // A repeated מס״ד is a fault in the source file, not in the import - name it,
  // because the alternative (before this was handled) was losing the whole day's
  // parsed roster to a unique-constraint failure with nothing said about why.
  const duplicateDutyCount = days.reduce((sum, d) => sum + (d.duplicateDutyCount ?? 0), 0);
  if (duplicateDutyCount > 0) notes.push(he.admin.importDuplicateDuties(duplicateDutyCount));
  const errorMessage = notes.length > 0 ? notes.join(' · ') : null;

  await prisma.shiftFile.update({
    where: { id: file.id },
    data: {
      status: 'IMPORTED',
      importedShiftCount: importedCount,
      importedDates: scan.days.map((d) => d.date),
      errorMessage,
    },
  });

  notifyChangedShifts(changes);

  const rosterErrors = days.map((d) => d.rosterError).filter(Boolean) as string[];

  return {
    fileId: file.id,
    status: 'IMPORTED',
    importedCount,
    skippedCount,
    errorMessage: errorMessage ?? undefined,
    days,
    dutyCount: sumDefined(days, 'dutyCount'),
    handoffCount: sumDefined(days, 'handoffCount'),
    deadheadCrossingCount: sumDefined(days, 'deadheadCrossingCount'),
    rosterError: rosterErrors.length > 0 ? rosterErrors.join(' · ') : undefined,
  };
}

function sumDefined(days: DayImportResult[], key: 'dutyCount' | 'handoffCount' | 'deadheadCrossingCount') {
  const present = days.map((d) => d[key]).filter((v): v is number => typeof v === 'number');
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : undefined;
}

/**
 * Import one roster date: destructively replace that date's shifts, then rebuild
 * the parsed duty/handoff layer behind them.
 *
 * Each date stands alone. A grammar surprise or an empty day does not abort the
 * rest of the workbook - the admin gets a per-day breakdown instead of an
 * all-or-nothing failure on a five-day file.
 */
async function importDay(
  tenantId: string,
  day: RosterDay,
  directory: RosterDirectory,
  changes: ChangeLog,
): Promise<DayImportResult> {
  const { date } = day;
  const { rows, skipped } = toShiftRows(day.rosterRows);

  const shiftsToCreate: {
    tenantId: string;
    workerId: string;
    teamId: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    region: string;
    notes: string;
  }[] = [];

  // Lets each created Shift be matched back to the roster line it came from.
  // Keyed on (worker, start) rather than array position because
  // createManyAndReturn does not guarantee it returns rows in input order.
  const dutyKeyByWorkerStart = new Map<string, string>();
  const workerStartKey = (workerId: string, startTime: Date) => `${workerId}|${startTime.getTime()}`;

  for (const row of rows) {
    const teamId = await directory.teamId(row.region);
    const workerId = await directory.workerId(row.workerNumber, row.name, teamId);

    // Roster times are Israel wall-clock. Built through the zone helper rather
    // than with local-time setters so the instant is right whatever TZ the
    // server runs - see lib/time/zone.ts for what that used to cost us.
    const on = israelParts(date);
    const endsNextDay = row.endMinutes <= row.startMinutes;
    const startTime = israelTime(on.year, on.month, on.day, row.startMinutes);
    const endTime = israelTime(
      on.year,
      on.month,
      on.day,
      endsNextDay ? row.endMinutes + 24 * 60 : row.endMinutes,
    );

    shiftsToCreate.push({
      tenantId,
      workerId,
      teamId,
      date,
      startTime,
      endTime,
      region: row.region,
      notes: row.notes,
    });
    dutyKeyByWorkerStart.set(workerStartKey(workerId, startTime), dutyKey(row.region, row.serial));
  }

  // Snapshot the existing roster for this date BEFORE the destructive replace,
  // so the notification step can tell a genuine change from a re-upload of the
  // same file. Without this, every re-upload would push to all ~240 workers.
  const previousShifts = await prisma.shift.findMany({
    where: { tenantId, date },
    select: { workerId: true, startTime: true, endTime: true, notes: true },
  });
  const previousByWorker = new Map(previousShifts.map((s) => [s.workerId, shiftSignature(s)]));

  const shiftIdByKey = new Map<string, string>();

  await prisma.$transaction(
    async (tx) => {
      await tx.shift.deleteMany({ where: { tenantId, date } });
      const created = await tx.shift.createManyAndReturn({
        data: shiftsToCreate,
        select: { id: true, workerId: true, startTime: true },
      });
      for (const s of created) {
        const key = dutyKeyByWorkerStart.get(workerStartKey(s.workerId, s.startTime));
        if (key) shiftIdByKey.set(key, s.id);
      }
    },
    { timeout: 60_000 },
  );

  collectChanges(changes, date, previousByWorker, shiftsToCreate);

  const result: DayImportResult = {
    date: dateKey(date),
    importedCount: shiftsToCreate.length,
    skippedCount: skipped,
  };

  // The roster engine is additive and must never be able to break the daily
  // shift import. A grammar surprise or a schema drift here degrades to "no
  // handoffs today", not to a failed upload.
  try {
    const duties = day.rosterRows.map((r) => parseDuty(r));
    const persisted = await persistRoster({ tenantId, date, duties, shiftIdByKey });
    result.dutyCount = persisted.dutyCount;
    result.handoffCount = persisted.handoffCount;
    result.deadheadCrossingCount = persisted.deadheadCrossingCount;
    result.duplicateDutyCount = persisted.duplicateDutyCount;
  } catch (error) {
    result.rosterError = error instanceof Error ? error.message : String(error);
    console.error('[roster] failed to build duties/handoffs for', date.toISOString(), error);
  }

  return result;
}

/**
 * Three cases matter to a worker: newly scheduled, times/route changed, or no
 * longer on the roster. A re-upload of an unchanged file records nothing.
 */
function collectChanges(
  changes: ChangeLog,
  date: Date,
  previousByWorker: Map<string, string>,
  current: { workerId: string; startTime: Date; endTime: Date; notes: string }[],
): void {
  const currentWorkers = new Set<string>();

  for (const shift of current) {
    currentWorkers.add(shift.workerId);
    const before = previousByWorker.get(shift.workerId);
    if (before === undefined) record(changes.assigned, shift.workerId, date);
    else if (before !== shiftSignature(shift)) record(changes.changed, shift.workerId, date);
  }

  for (const workerId of previousByWorker.keys()) {
    if (!currentWorkers.has(workerId)) record(changes.removed, workerId, date);
  }
}

function dayLabel(date: Date): string {
  return formatIsraelDate(date, { weekday: 'long', day: '2-digit', month: '2-digit' });
}

/** "יום חמישי 13.08" for a single date, "3 ימים (13.08 – 15.08)" for a run of them. */
function whenLabel(dates: Date[]): string {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  if (sorted.length === 1) return dayLabel(sorted[0]);
  const short = (d: Date) => formatIsraelDate(d, { day: '2-digit', month: '2-digit' });
  return he.push.multipleDays(sorted.length, short(sorted[0]), short(sorted[sorted.length - 1]));
}

/**
 * Push only to the workers whose shift actually moved, once per worker for the
 * whole upload rather than once per date.
 *
 * Note this does fan out to everyone on a genuinely new roster day — which is
 * the intended behaviour ("tell me I'm scheduled"), and only reaches workers who
 * have actually subscribed a device.
 */
function notifyChangedShifts(changes: ChangeLog): void {
  const tag = 'roster-import';

  const fanOut = (
    log: Map<string, Date[]>,
    copy: { title: string; body: (when: string) => string },
  ) => {
    // Workers sharing the same set of dates share a message, so this is a
    // handful of notify() calls rather than one per worker.
    const byWhen = new Map<string, string[]>();
    for (const [workerId, dates] of log) {
      const when = whenLabel(dates);
      const bucket = byWhen.get(when);
      if (bucket) bucket.push(workerId);
      else byWhen.set(when, [workerId]);
    }
    for (const [when, workerIds] of byWhen) {
      notify(workerIds, { title: copy.title, body: copy.body(when), url: '/dashboard/shifts', tag });
    }
  };

  fanOut(changes.assigned, he.push.shiftAssigned);
  fanOut(changes.changed, he.push.shiftChanged);
  fanOut(changes.removed, he.push.shiftRemoved);
}

async function failImport(fileId: string, message: string): Promise<ImportResult> {
  await prisma.shiftFile.update({
    where: { id: fileId },
    data: { status: 'FAILED', errorMessage: message },
  });
  return { fileId, status: 'FAILED', importedCount: 0, skippedCount: 0, days: [], errorMessage: message };
}
