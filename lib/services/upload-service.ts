import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma';
import { importedShiftRowSchema, type ImportedShiftRow } from '../validation/shifts';

export interface ImportResult {
  fileId: string;
  status: 'IMPORTED' | 'FAILED';
  importedCount: number;
  skippedCount: number;
  errorMessage?: string;
}

export async function getUploadHistory(tenantId: string, limit = 20) {
  return prisma.shiftFile.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

const HEADER_COL0 = 'מס"ד';
const HEADER_COL1 = 'שם הפקח';

function cell(row: unknown[], index: number): string {
  const value = row[index];
  return value === undefined || value === null ? '' : String(value).trim();
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((c) => c === '' || c === undefined || c === null);
}

function isBlockHeader(row: unknown[]): boolean {
  return cell(row, 0) === HEADER_COL0 && cell(row, 1) === HEADER_COL1;
}

// The sheet name is the roster's date, e.g. "02.08.26" -> 2026-08-02.
function parseSheetDate(sheetName: string): Date | null {
  const match = sheetName.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  const date = new Date(year, Number(mm) - 1, Number(dd));
  date.setHours(0, 0, 0, 0);
  return date;
}

// Block header titles look like "פקחים דרום לינק דיזל+חשמלי יום א' 02.08.26" -
// strip the trailing day-name + date so the same region collapses to one Team.
function cleanRegionName(raw: string): string {
  return raw.replace(/\s+יום\s+\S+\s+\d{1,2}\.\d{1,2}\.\d{2,4}\s*$/, '').trim();
}

// Time cells are inconsistent in the source file: some are plain "HH:MM"
// strings, some are Excel time-serials that `xlsx` (cellDates:true) turns
// into Date objects anchored at 1899-12-30 - read with UTC getters, verified
// against neighboring string-typed times in the same rows.
function timeOfDayMinutes(value: unknown): number | null {
  if (value instanceof Date) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
  }
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }
  return null;
}

function extractRows(rawRows: unknown[][], fallbackRegion: string): { rows: ImportedShiftRow[]; skipped: number } {
  const extracted: ImportedShiftRow[] = [];
  let skipped = 0;
  let currentRegion = fallbackRegion;

  for (const row of rawRows) {
    if (isBlankRow(row)) continue;

    if (isBlockHeader(row)) {
      const title = cell(row, 9);
      currentRegion = title ? cleanRegionName(title) : fallbackRegion;
      continue;
    }

    const seq = cell(row, 0);
    const name = cell(row, 1);
    const mirs = cell(row, 2);
    const workerNumber = cell(row, 3);
    const traineeName = cell(row, 4);
    const startMinutes = timeOfDayMinutes(row[7]);
    const endMinutes = timeOfDayMinutes(row[8]);
    const route = cell(row, 9);
    const trainSets = cell(row, 10);
    const note = cell(row, 11);

    if (!name || !workerNumber || startMinutes === null || endMinutes === null) {
      skipped += 1;
      continue;
    }

    const noteParts: string[] = [];
    if (route) noteParts.push(route);
    if (trainSets) noteParts.push(`קרונות: ${trainSets}`);
    if (note) noteParts.push(note);
    if (mirs && mirs !== '-') noteParts.push(`מירס: ${mirs}`);
    if (traineeName && traineeName !== '-') noteParts.push(`מתלמד: ${traineeName}`);
    if (seq.startsWith('משני')) noteParts.push('(רשימת מילואים)');

    const parsed = importedShiftRowSchema.safeParse({
      region: currentRegion,
      workerNumber,
      name,
      startMinutes,
      endMinutes,
      notes: noteParts.join(' | '),
    });

    if (!parsed.success) {
      skipped += 1;
      continue;
    }

    extracted.push(parsed.data);
  }

  return { rows: extracted, skipped };
}

interface ImportInput {
  tenantId: string;
  uploadedBy: string;
  filename: string;
  buffer: Buffer;
}

export async function importShiftFile(input: ImportInput): Promise<ImportResult> {
  const file = await prisma.shiftFile.create({
    data: {
      tenantId: input.tenantId,
      filename: input.filename,
      fileUrl: `local://${input.filename}`,
      uploadedBy: input.uploadedBy,
      status: 'PENDING',
    },
  });

  const workbook = XLSX.read(input.buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

  const date = parseSheetDate(sheetName) ?? new Date(new Date().setHours(0, 0, 0, 0));
  const { rows, skipped } = extractRows(rawRows, 'כללי');

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
          role: 'TAKAHIM',
          teamId,
        },
      });
    } else if (worker.role === 'TAKAHIM' && worker.teamId !== teamId) {
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
  }

  const errorMessage = skipped > 0 ? `יובאו ${shiftsToCreate.length} משמרות, ${skipped} שורות דולגו` : null;

  await prisma.$transaction([
    prisma.shift.deleteMany({ where: { tenantId: input.tenantId, date } }),
    ...shiftsToCreate.map((s) => prisma.shift.create({ data: s })),
    prisma.shiftFile.update({
      where: { id: file.id },
      data: { status: 'IMPORTED', importedShiftCount: shiftsToCreate.length, errorMessage },
    }),
  ]);

  return {
    fileId: file.id,
    status: 'IMPORTED',
    importedCount: shiftsToCreate.length,
    skippedCount: skipped,
    errorMessage: errorMessage ?? undefined,
  };
}

async function failImport(fileId: string, message: string): Promise<ImportResult> {
  await prisma.shiftFile.update({
    where: { id: fileId },
    data: { status: 'FAILED', errorMessage: message },
  });
  return { fileId, status: 'FAILED', importedCount: 0, skippedCount: 0, errorMessage: message };
}
