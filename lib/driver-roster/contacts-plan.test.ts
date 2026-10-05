import { describe, expect, it } from 'vitest';
import type { DriverContact } from './contacts';
import { planContactsImport, type ExistingDriver } from './contacts-plan';

const contact = (over: Partial<DriverContact> = {}): DriverContact => ({
  name: 'א א',
  city: 'לוד',
  workerNumber: '700001',
  phone: '050-0000001',
  page: 1,
  ...over,
});

const driver = (over: Partial<ExistingDriver> = {}): ExistingDriver => ({
  id: 'u1',
  workerNumber: '700001',
  firstName: 'א א',
  city: 'לוד',
  phone: '050-0000001',
  email: null,
  ...over,
});

describe('planContactsImport', () => {
  it('creates every driver on a first import', () => {
    const plan = planContactsImport([contact(), contact({ workerNumber: '700002', phone: '050-0000002' })], []);
    expect(plan.create).toHaveLength(2);
    expect(plan.create[0]).toEqual({ workerNumber: '700001', firstName: 'א א', city: 'לוד', phone: '050-0000001' });
  });

  it('changes nothing when the list is imported again', () => {
    const plan = planContactsImport([contact()], [driver()]);
    expect(plan).toEqual({ create: [], update: [], unchanged: 1, notInList: [] });
  });

  it('treats a differently written phone as the same phone', () => {
    const plan = planContactsImport([contact({ phone: '0500000001' })], [driver()]);
    expect(plan.unchanged).toBe(1);
  });

  it('updates name, city and phone of a driver who has not logged in yet', () => {
    const plan = planContactsImport(
      [contact({ name: 'א ב', city: 'יבנה', phone: '050-0000009' })],
      [driver()],
    );
    expect(plan.update).toEqual([
      { id: 'u1', name: 'א ב', changes: { firstName: 'א ב', city: 'יבנה', phone: '050-0000009' } },
    ]);
  });

  it('keeps the phone of a driver who has already logged in', () => {
    const plan = planContactsImport([contact({ phone: '050-0000009' })], [driver({ email: 'a@example.com' })]);
    expect(plan.update).toEqual([]);
    expect(plan.unchanged).toBe(1);
  });

  it('does not blank a city the list leaves empty', () => {
    const plan = planContactsImport([contact({ city: null })], [driver()]);
    expect(plan.unchanged).toBe(1);
  });

  it('fills in a worker number the earlier list was missing, matching by phone', () => {
    const plan = planContactsImport([contact()], [driver({ workerNumber: null })]);
    expect(plan.update).toEqual([{ id: 'u1', name: 'א א', changes: { workerNumber: '700001' } }]);
  });

  it('never matches by phone a driver who already has a different worker number', () => {
    const plan = planContactsImport([contact({ workerNumber: '700002' })], [driver()]);
    expect(plan.create).toHaveLength(1);
    expect(plan.notInList.map((d) => d.id)).toEqual(['u1']);
  });

  it('reports drivers the list no longer mentions instead of deleting them', () => {
    const plan = planContactsImport([], [driver()]);
    expect(plan.notInList.map((d) => d.id)).toEqual(['u1']);
  });
});
