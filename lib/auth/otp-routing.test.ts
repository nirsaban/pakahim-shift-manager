import { afterEach, describe, expect, it } from 'vitest';
import { resetOtpRoutingCache, resolveOtpRecipient } from './otp-routing';

function withMap(value: string | undefined) {
  if (value === undefined) delete process.env.OTP_REDIRECT_MAP;
  else process.env.OTP_REDIRECT_MAP = value;
  resetOtpRoutingCache();
}

afterEach(() => withMap(undefined));

describe('OTP delivery routing', () => {
  it('delivers to the account itself when nothing is configured', () => {
    withMap(undefined);
    expect(resolveOtpRecipient('someone@example.com')).toBe('someone@example.com');
  });

  it('redirects a mapped account', () => {
    withMap('admin@example.com=owner@example.com');
    expect(resolveOtpRecipient('admin@example.com')).toBe('owner@example.com');
  });

  it('leaves unmapped accounts alone', () => {
    withMap('admin@example.com=owner@example.com');
    expect(resolveOtpRecipient('other@example.com')).toBe('other@example.com');
  });

  it('matches regardless of case', () => {
    withMap('Admin@Example.com=owner@example.com');
    expect(resolveOtpRecipient('aDMIN@example.COM')).toBe('owner@example.com');
  });

  it('supports several redirects at once', () => {
    withMap('a@x.com=owner@x.com, b@x.com=a@x.com');
    expect(resolveOtpRecipient('a@x.com')).toBe('owner@x.com');
    expect(resolveOtpRecipient('b@x.com')).toBe('a@x.com');
  });

  it('ignores malformed entries rather than failing login', () => {
    withMap('not-an-email,a@x.com=owner@x.com,=,b@x.com=');
    expect(resolveOtpRecipient('a@x.com')).toBe('owner@x.com');
    expect(resolveOtpRecipient('b@x.com')).toBe('b@x.com');
  });

  // Docker Compose env_file does not shell-parse, so quotes can survive into
  // the value verbatim.
  it('tolerates a value that arrived with its quotes attached', () => {
    withMap('"a@x.com=owner@x.com,b@x.com=owner@x.com"');
    expect(resolveOtpRecipient('a@x.com')).toBe('owner@x.com');
    expect(resolveOtpRecipient('b@x.com')).toBe('owner@x.com');
  });

  it('treats a self-mapping as no redirect', () => {
    withMap('a@x.com=a@x.com');
    expect(resolveOtpRecipient('a@x.com')).toBe('a@x.com');
  });
});
