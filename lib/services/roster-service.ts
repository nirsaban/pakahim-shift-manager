import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { detectHandoffs } from '../roster/handoff';
import { assignShiftIds, dedupeDutiesByIdentity } from '../roster/identity';
import { generateSwapSuggestions, type WorkerHome } from '../roster/swaps';
import type { ParsedDuty } from '../roster/types';

export interface PersistRosterInput {
  tenantId: string;
  date: Date;
  duties: ParsedDuty[];
  /** `${section}|${serial}` -> Shift.id, for the roster lines that have a worker. */
  shiftIdByKey?: Map<string, string>;
}

export interface PersistRosterResult {
  dutyCount: number;
  legCount: number;
  handoffCount: number;
  deadheadCrossingCount: number;
  swapSuggestionCount: number;
  workersWithHomeStation: number;
  parseFailureCount: number;
  /** Roster lines dropped for claiming a (section, serial) an earlier line took. */
  duplicateDutyCount: number;
}

/**
 * Home stations are sparse by design — they fill in as workers onboard. Anything
 * that depends on them degrades to "no suggestion" rather than to a guess.
 */
async function loadWorkerHomes(tenantId: string): Promise<Map<string, WorkerHome>> {
  const workers = await prisma.user.findMany({
    where: { tenantId, workerNumber: { not: null } },
    select: { id: true, workerNumber: true, homeStation: { select: { code: true } } },
  });
  return new Map(
    workers.map((w) => [
      w.workerNumber as string,
      { workerId: w.id, homeStation: w.homeStation?.code ?? null },
    ]),
  );
}

export function dutyKey(section: string, serial: string): string {
  return `${section}|${serial}`;
}

/**
 * Replace the parsed roster for one date: duties, their legs, and the handoff
 * graph derived from them.
 *
 * Mirrors the importer's existing destructive-replace semantics — a re-upload
 * for a date is authoritative. DISMISSED and CONVERTED swap suggestions are
 * deliberately kept: they record a human decision, and silently deleting them
 * would resurface advice a scheduler already rejected.
 */
export async function persistRoster(input: PersistRosterInput): Promise<PersistRosterResult> {
  const { tenantId, date, shiftIdByKey } = input;

  // Deduplicate BEFORE deriving anything: a repeated (section, serial) violates
  // Duty's own uniqueness and used to abort the entire date's roster layer, so a
  // day would end up with imported shifts and no duties, handoffs or swaps
  // behind them. Handoffs and swaps are then derived from the surviving set, so
  // they can never point at a line that was never stored.
  const { kept: duties, duplicates } = dedupeDutiesByIdentity(input.duties);
  if (duplicates.length > 0) {
    console.warn(
      `[roster] ${duplicates.length} duplicate duty identities on ${date.toISOString().slice(0, 10)}:`,
      duplicates.map((d) => dutyKey(d.section, d.serial)).join(', '),
    );
  }
  const shiftIds = assignShiftIds(duties, shiftIdByKey);

  const dutyData: Prisma.DutyCreateManyInput[] = duties.map((d, i) => ({
    tenantId,
    date,
    section: d.section,
    serial: d.serial,
    isReinforcement: d.isReinforcement,
    startMinutes: d.startMinutes,
    endMinutes: d.endMinutes,
    shiftString: d.shiftString,
    routeNote: d.routeNote?.raw ?? null,
    remarks: d.remarks || null,
    trailingNote: d.trailingNote,
    workerNumber: d.workerNumber || null,
    workerName: d.name || null,
    templateHash: d.templateHash,
    parseStatus: d.parseStatus,
    parseWarnings: d.warnings.length > 0 ? (d.warnings as unknown as Prisma.InputJsonValue) : undefined,
    firstActiveTrain: d.firstActiveTrain,
    lastActiveTrain: d.lastActiveTrain,
    startStation: d.startStation,
    startSource: d.startSource,
    endStation: d.endStation,
    endSource: d.endSource,
    finalStation: d.finalStation,
    startTransport: d.startTransport,
    endTransport: d.endTransport,
    shiftId: shiftIds[i],
  }));

  const handoffs = detectHandoffs(duties);
  const homesByWorkerNumber = await loadWorkerHomes(tenantId);
  const swaps = generateSwapSuggestions({ duties, handoffs, homesByWorkerNumber });

  return prisma.$transaction(
    async (tx) => {
      // NEW suggestions are regenerated; decided ones are history.
      await tx.swapSuggestion.deleteMany({ where: { tenantId, date, status: 'NEW' } });
      await tx.handoff.deleteMany({ where: { tenantId, date } });
      await tx.duty.deleteMany({ where: { tenantId, date } }); // cascades legs

      const created = await tx.duty.createManyAndReturn({ data: dutyData, select: { id: true, section: true, serial: true } });

      // Key by the (date, section, serial) uniqueness rather than trusting row
      // order back from the driver.
      const idByKey = new Map(created.map((c) => [dutyKey(c.section, c.serial), c.id]));

      const legData: Prisma.DutyLegCreateManyInput[] = [];
      for (const d of duties) {
        const dutyId = idByKey.get(dutyKey(d.section, d.serial));
        if (!dutyId) continue;
        for (const leg of d.legs) {
          legData.push({
            dutyId,
            seq: leg.seq,
            kind: leg.kind,
            isDuty: leg.isDuty,
            rawTokens: leg.rawTokens,
            trainNumber: leg.trainNumber,
            lineCode: leg.lineCode,
            isServiceMove: leg.isServiceMove,
            opCode: leg.opCode,
            opOperands: leg.opOperands,
            atMinutes: leg.atMinutes,
            fromStation: leg.fromStation,
            fromSource: leg.fromSource,
            toStation: leg.toStation,
            toSource: leg.toSource,
          });
        }
      }
      if (legData.length > 0) await tx.dutyLeg.createMany({ data: legData });

      const handoffData: Prisma.HandoffCreateManyInput[] = [];
      for (const h of handoffs) {
        const predecessorDutyId = idByKey.get(dutyKey(h.predecessor.section, h.predecessor.serial));
        const successorDutyId = idByKey.get(dutyKey(h.successor.section, h.successor.serial));
        if (!predecessorDutyId || !successorDutyId) continue;
        handoffData.push({
          tenantId,
          date,
          section: h.successor.section,
          trainNumber: h.trainNumber,
          predecessorDutyId,
          successorDutyId,
          station: h.station,
          predecessorEndMinutes: h.predecessorEndMinutes,
          successorStartMinutes: h.successorStartMinutes,
          gapMinutes: h.gapMinutes,
          isReinforcement: h.isReinforcement,
          confidence: h.confidence,
          bothSidesDeadhead: h.bothSidesDeadhead,
          predecessorExitTrain: h.predecessorExitTrain,
          successorEntryTrain: h.successorEntryTrain,
        });
      }
      const createdHandoffs =
        handoffData.length > 0
          ? await tx.handoff.createManyAndReturn({
              data: handoffData,
              select: { id: true, predecessorDutyId: true, successorDutyId: true },
            })
          : [];
      const handoffIdByPair = new Map(
        createdHandoffs.map((h) => [`${h.predecessorDutyId}|${h.successorDutyId}`, h.id]),
      );

      const swapData: Prisma.SwapSuggestionCreateManyInput[] = [];
      for (const s of swaps) {
        const dutyAId = idByKey.get(dutyKey(s.dutyA.section, s.dutyA.serial));
        const dutyBId = idByKey.get(dutyKey(s.dutyB.section, s.dutyB.serial));
        if (!dutyAId || !dutyBId) continue;
        swapData.push({
          tenantId,
          date,
          kind: s.kind,
          handoffId: s.handoff ? (handoffIdByPair.get(`${dutyAId}|${dutyBId}`) ?? null) : null,
          dutyAId,
          dutyBId,
          workerAId: s.workerAId,
          workerBId: s.workerBId,
          score: s.score,
          savedMinutes: s.savedMinutes,
          rationale: s.rationale as unknown as Prisma.InputJsonValue,
          evidence: s.evidence as unknown as Prisma.InputJsonValue,
        });
      }
      if (swapData.length > 0) {
        // A pair that a scheduler already dismissed or converted still holds the
        // unique (tenant, date, kind, dutyA, dutyB) slot — skip rather than
        // resurrect it.
        await tx.swapSuggestion.createMany({ data: swapData, skipDuplicates: true });
      }

      return {
        dutyCount: created.length,
        legCount: legData.length,
        handoffCount: handoffData.length,
        deadheadCrossingCount: handoffs.filter((h) => h.bothSidesDeadhead).length,
        swapSuggestionCount: swapData.length,
        workersWithHomeStation: [...homesByWorkerNumber.values()].filter((h) => h.homeStation).length,
        parseFailureCount: duties.filter((d) => d.parseStatus === 'FAILED').length,
        duplicateDutyCount: duplicates.length,
      };
    },
    { timeout: 60_000 },
  );
}

export async function getDutiesForDate(tenantId: string, date: Date) {
  return prisma.duty.findMany({
    where: { tenantId, date },
    orderBy: [{ section: 'asc' }, { serial: 'asc' }],
    include: { legs: { orderBy: { seq: 'asc' } } },
  });
}

export async function getHandoffsForDate(tenantId: string, date: Date) {
  return prisma.handoff.findMany({
    where: { tenantId, date },
    orderBy: [{ successorStartMinutes: 'asc' }],
    include: {
      predecessorDuty: {
        select: { id: true, serial: true, workerName: true, workerNumber: true, shiftString: true, endMinutes: true, endStation: true },
      },
      successorDuty: {
        select: { id: true, serial: true, workerName: true, workerNumber: true, shiftString: true, startMinutes: true, startStation: true },
      },
    },
  });
}
