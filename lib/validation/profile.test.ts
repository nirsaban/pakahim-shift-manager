import { describe, expect, it } from 'vitest';
import { confirmEmailChangeSchema, requestEmailChangeSchema, updateProfileSchema } from './profile';
import { emailChangeSubject } from '../services/email-change-service';

describe('updateProfileSchema', () => {
  it('accepts an Israeli mobile in any of the ways a worker writes it', () => {
    for (const phone of ['052-1234567', '0521234567', '+972 52 123 4567', '00972521234567']) {
      expect(updateProfileSchema.safeParse({ firstName: 'א', phone }).success).toBe(true);
    }
  });

  it('rejects a landline, which could never receive a code', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'א', phone: '03-1234567' }).success).toBe(false);
  });

  it('rejects gibberish in the phone field', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'א', phone: 'not a phone' }).success).toBe(false);
  });

  it('allows clearing the phone entirely', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'א', phone: null }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ firstName: 'א', phone: '' }).success).toBe(true);
  });

  it('requires a first name', () => {
    expect(updateProfileSchema.safeParse({ firstName: '' }).success).toBe(false);
  });

  it('carries no field the roster owns', () => {
    const parsed = updateProfileSchema.parse({
      firstName: 'א',
      // A client sending these must not be able to move itself between teams.
      ...({ workerNumber: '999', teamId: 'other', role: 'ADMIN' } as object),
    });
    expect(parsed).not.toHaveProperty('workerNumber');
    expect(parsed).not.toHaveProperty('teamId');
    expect(parsed).not.toHaveProperty('role');
  });
});

describe('email change schemas', () => {
  it('normalizes the address, so the uniqueness check cannot be dodged by case', () => {
    const parsed = requestEmailChangeSchema.parse({ email: '  Worker@Example.COM ' });
    expect(parsed.email).toBe('worker@example.com');
  });

  it('rejects a malformed address', () => {
    expect(requestEmailChangeSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('requires exactly six digits for the code', () => {
    expect(confirmEmailChangeSchema.safeParse({ email: 'a@b.com', code: '123456' }).success).toBe(true);
    expect(confirmEmailChangeSchema.safeParse({ email: 'a@b.com', code: '12345' }).success).toBe(false);
    expect(confirmEmailChangeSchema.safeParse({ email: 'a@b.com', code: '12345a' }).success).toBe(false);
  });
});

describe('emailChangeSubject', () => {
  // The whole flow rests on this: possessing a code proves control of the ONE
  // address it was sent to, and of nothing else.
  it('binds the code to one address, so it cannot confirm a different one', () => {
    expect(emailChangeSubject('u1', 'new@example.com')).not.toBe(
      emailChangeSubject('u1', 'attacker@example.com'),
    );
  });

  it('binds the code to one user, so it cannot move someone else account', () => {
    expect(emailChangeSubject('u1', 'a@b.com')).not.toBe(emailChangeSubject('u2', 'a@b.com'));
  });

  it('treats the address case-insensitively, matching the schema normalization', () => {
    expect(emailChangeSubject('u1', 'A@B.com')).toBe(emailChangeSubject('u1', 'a@b.com'));
  });

  it('is namespaced away from the login OTP, so neither can satisfy the other', () => {
    expect(emailChangeSubject('u1', 'a@b.com').startsWith('email-change:')).toBe(true);
  });
});
