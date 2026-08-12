import { afterEach, describe, expect, it } from 'vitest';
import { resetOtpRoutingCache, resolveOtpRecipients } from './otp-routing';

function withMap(value: string | undefined) {
  if (value === undefined) delete process.env.OTP_REDIRECT_MAP;
  else process.env.OTP_REDIRECT_MAP = value;
  resetOtpRoutingCache();
}

afterEach(() => withMap(undefined));

describe('OTP delivery routing', () => {
  it('delivers to the account itself when nothing is configured', () => {
    withMap(undefined);
    expect(resolveOtpRecipients('someone@example.com')).toEqual(['someone@example.com']);
  });

  it('redirects a mapped account', () => {
    withMap('admin@example.com=owner@example.com');
    expect(resolveOtpRecipients('admin@example.com')).toEqual(['owner@example.com']);
  });

  it('leaves unmapped accounts alone', () => {
    withMap('admin@example.com=owner@example.com');
    expect(resolveOtpRecipients('other@example.com')).toEqual(['other@example.com']);
  });

  it('matches regardless of case', () => {
    withMap('Admin@Example.com=owner@example.com');
    expect(resolveOtpRecipients('aDMIN@example.COM')).toEqual(['owner@example.com']);
  });

  it('supports several redirects at once', () => {
    withMap('a@x.com=owner@x.com, b@x.com=a@x.com');
    expect(resolveOtpRecipients('a@x.com')).toEqual(['owner@x.com']);
    expect(resolveOtpRecipients('b@x.com')).toEqual(['a@x.com']);
  });

  it('ignores malformed entries rather than failing login', () => {
    withMap('not-an-email,a@x.com=owner@x.com,=,b@x.com=');
    expect(resolveOtpRecipients('a@x.com')).toEqual(['owner@x.com']);
    expect(resolveOtpRecipients('b@x.com')).toEqual(['b@x.com']);
  });

  // Docker Compose env_file does not shell-parse, so quotes can survive into
  // the value verbatim.
  it('tolerates a value that arrived with its quotes attached', () => {
    withMap('"a@x.com=owner@x.com,b@x.com=owner@x.com"');
    expect(resolveOtpRecipients('a@x.com')).toEqual(['owner@x.com']);
    expect(resolveOtpRecipients('b@x.com')).toEqual(['owner@x.com']);
  });

  // One code, several people — a shared account whose login both an admin and
  // its owner need to be able to complete.
  it('delivers to every destination when several are listed', () => {
    withMap('shared@x.local=owner@example.com;deputy@example.com');
    expect(resolveOtpRecipients('shared@x.local')).toEqual([
      'owner@example.com',
      'deputy@example.com',
    ]);
  });

  it('ignores an entry whose targets are all malformed', () => {
    withMap('a@x.com=nope;alsonope');
    expect(resolveOtpRecipients('a@x.com')).toEqual(['a@x.com']);
  });

  it('treats a self-mapping as no redirect', () => {
    withMap('a@x.com=a@x.com');
    expect(resolveOtpRecipients('a@x.com')).toEqual(['a@x.com']);
  });
});
