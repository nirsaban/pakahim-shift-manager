import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma';
import { importedShiftRowSchema, type ImportedShiftRow } from '../validation/shifts';
import { extractRosterRows, parseSheetDate } from '../roster/sheet';
import { parseDuty } from '../roster/duty';
import type { RosterRowInput } from '../roster/types';
import { dutyKey, persistRoster } from './roster-service';
import { notify } from './push-service';
import { he } from '../he';

export interface ImportResult {
  fileId: string;
  status: 'IMPORTED' | 'FAILED';
  importedCount: number;
  skippedCount: number;
  errorMessage?: string;
  needsConfirmation?: boolean;
  activeCoverageCount?: number;
  // Roster-engine results. Absent when the roster layer failed - which never
  // fails the import itself, see the try/catch in importShiftFile.
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

// Narrows the full roster to the rows that can become a Shift: those need an
// inspector and both times. Rows without them stay in the roster layer as open
// duties. The `notes` blob is unchanged - the dashboard renders it today.
function toShiftRows(
  rosterRows: RosterRowInput[],
  dropped: number,
): { rows: ShiftRowWithSerial[]; skipped: number } {
  const extracted: ShiftRowWithSerial[] = [];
  let skipped = dropped;

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

// A re-upload replaces (deleteMany + recreate) every shift for that date - including
// any that already have an active coverage assignment (Shift.replacementId set, from a
// direct assignment or an approved CoverageRequest). Silently cascading that away would
// undo real team-lead decisions. See docs/data-model.md's open question on this.
async function countActiveCoverageOnDate(tenantId: string, date: Date): Promise<number> {
  return prisma.shift.count({ where: { tenantId, date, replacementId: { not: null } } });
}

export async function importShiftFile(input: ImportInput): Promise<ImportResult> {
  const workbook = XLSX.read(input.buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

  const date = parseSheetDate(sheetName) ?? new Date(new Date().setHours(0, 0, 0, 0));

  if (!input.confirmClearCoverage) {
    const activeCoverageCount = await countActiveCoverageOnDate(input.tenantId, date);
    if (activeCoverageCount > 0) {
      return {
        fileId: '',
        status: 'FAILED',
        importedCount: 0,
        skippedCount: 0,
        needsConfirmation: true,
        activeCoverageCount,
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

  const roster = extractRosterRows(rawRows, 'כללי');
  const { rows, skipped } = toShiftRows(roster.rows, roster.dropped);

  if (rows.length === 0) {
    return failImport(file.id, 'לא נמצאו שורות תקינות לייבוא בקובץ');
  }

  const fallbackTeam = await prisma.team.findFirst({ where: { tenantId: input.tenantId } });
  const teamLead = await prisma.user.findFirst({ where: { tenantId: input.tenantId, role: 'TEAM_LEAD' } });

  const teamCache = new Map<string, string>();

  async function resolveTeamId(region: string): Promise<string> {
    const cached = teamCache.get(region);
    if (cached) return cached;

    if (!teamLead) {
      if (!fallbackTeam) throw new Error('No team lead or team available to assign imported shifts to');
      teamCache.set(region, fallbackTeam.id);
      return fallbackTeam.id;
    }

    const team = await prisma.team.upsert({
      where: { tenantId_name: { tenantId: input.tenantId, name: region } },
      update: {},
      create: { tenantId: input.tenantId, name: region, teamLeadId: teamLead.id },
    });
    teamCache.set(region, team.id);
    return team.id;
  }

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
    const teamId = await resolveTeamId(row.region);

    let worker = await prisma.user.findUnique({
      where: { tenantId_workerNumber: { tenantId: input.tenantId, workerNumber: row.workerNumber } },
    });

    if (!worker) {
      worker = await prisma.user.create({
        data: {
          tenantId: input.tenantId,
          workerNumber: row.workerNumber,
          firstName: row.name,
          role: 'PAKAHIM',
          teamId,
        },
      });
    } else if (worker.role === 'PAKAHIM' && worker.teamId !== teamId) {
      // The roster file is the authoritative current placement - keep the worker's
      // team in sync, but never touch their name/email/city (self-reported data).
      worker = await prisma.user.update({ where: { id: worker.id }, data: { teamId } });
    }

    const startTime = new Date(date);
    startTime.setMinutes(row.startMinutes);
    const endTime = new Date(date);
    endTime.setMinutes(row.endMinutes);
    if (row.endMinutes <= row.startMinutes) {
      endTime.setDate(endTime.getDate() + 1);
    }

    shiftsToCreate.push({
      tenantId: input.tenantId,
      workerId: worker.id,
      teamId,
      date,
      startTime,
      endTime,
      region: row.region,
      notes: row.notes,
    });
    dutyKeyByWorkerStart.set(workerStartKey(worker.id, startTime), dutyKey(row.region, row.serial));
  }

  const errorMessage = skipped > 0 ? `יובאו ${shiftsToCreate.length} משמרות, ${skipped} שורות דולגו` : null;

  // Snapshot the existing roster for this date BEFORE the destructive replace,
  // so the notification step can tell a genuine change from a re-upload of the
  // same file. Without this, every re-upload would push to all ~240 workers.
  const previousShifts = await prisma.shift.findMany({
    where: { tenantId: input.tenantId, date },
    select: { workerId: true, startTime: true, endTime: true, notes: true },
  });
  const previousByWorker = new Map(previousShifts.map((s) => [s.workerId, shiftSignature(s)]));

  const shiftIdByKey = new Map<string, string>();

  await prisma.$transaction(
    async (tx) => {
      await tx.shift.deleteMany({ where: { tenantId: input.tenantId, date } });
      const created = await tx.shift.createManyAndReturn({
        data: shiftsToCreate,
        select: { id: true, workerId: true, startTime: true },
      });
      for (const s of created) {
        const key = dutyKeyByWorkerStart.get(workerStartKey(s.workerId, s.startTime));
        if (key) shiftIdByKey.set(key, s.id);
      }
      await tx.shiftFile.update({
        where: { id: file.id },
        data: { status: 'IMPORTED', importedShiftCount: shiftsToCreate.length, errorMessage },
      });
    },
    { timeout: 60_000 },
  );

  const result: ImportResult = {
    fileId: file.id,
    status: 'IMPORTED',
    importedCount: shiftsToCreate.length,
    skippedCount: skipped,
    errorMessage: errorMessage ?? undefined,
  };

  notifyChangedShifts(date, previousByWorker, shiftsToCreate);

  // The roster engine is additive and must never be able to break the daily
  // shift import. A grammar surprise or a schema drift here degrades to "no
  // handoffs today", not to a failed upload.
  try {
    const duties = roster.rows.map((r) => parseDuty(r));
    const persisted = await persistRoster({ tenantId: input.tenantId, date, duties, shiftIdByKey });
    result.dutyCount = persisted.dutyCount;
    result.handoffCount = persisted.handoffCount;
    result.deadheadCrossingCount = persisted.deadheadCrossingCount;
  } catch (error) {
    result.rosterError = error instanceof Error ? error.message : String(error);
    console.error('[roster] failed to build duties/handoffs for', date.toISOString(), error);
  }

  return result;
}

/**
 * Push only to the workers whose shift actually moved.
 *
 * Three cases matter to a worker: newly scheduled, times/route changed, or no
 * longer on the roster. A re-upload of an unchanged file notifies nobody.
 *
 * Note this does fan out to everyone on a genuinely new roster day — which is
 * the intended behaviour ("tell me I'm scheduled"), and only reaches workers who
 * have actually subscribed a device.
 */
function notifyChangedShifts(
  date: Date,
  previousByWorker: Map<string, string>,
  current: { workerId: string; startTime: Date; endTime: Date; notes: string }[],
): void {
  const assigned: string[] = [];
  const changed: string[] = [];
  const currentWorkers = new Set<string>();

  for (const shift of current) {
    currentWorkers.add(shift.workerId);
    const before = previousByWorker.get(shift.workerId);
    if (before === undefined) assigned.push(shift.workerId);
    else if (before !== shiftSignature(shift)) changed.push(shift.workerId);
  }

  const removed = [...previousByWorker.keys()].filter((id) => !currentWorkers.has(id));

  const when = date.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const tag = `roster-${date.toISOString().slice(0, 10)}`;

  if (assigned.length > 0) {
    notify(assigned, {
      title: he.push.shiftAssigned.title,
      body: he.push.shiftAssigned.body(when),
      url: '/dashboard',
      tag,
    });
  }
  if (changed.length > 0) {
    notify(changed, {
      title: he.push.shiftChanged.title,
      body: he.push.shiftChanged.body(when),
      url: '/dashboard',
      tag,
    });
  }
  if (removed.length > 0) {
    notify(removed, {
      title: he.push.shiftRemoved.title,
      body: he.push.shiftRemoved.body(when),
      url: '/dashboard',
      tag,
    });
  }
}

async function failImport(fileId: string, message: string): Promise<ImportResult> {
  await prisma.shiftFile.update({
    where: { id: fileId },
    data: { status: 'FAILED', errorMessage: message },
  });
  return { fileId, status: 'FAILED', importedCount: 0, skippedCount: 0, errorMessage: message };
}
