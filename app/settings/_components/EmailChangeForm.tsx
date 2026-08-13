'use client';

import { useState, type FormEvent } from 'react';
import { AtSign, CircleCheck, Info, Mail, ShieldCheck, TriangleAlert } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';
import { Field, Input } from '../../_components/ui/Field';

/**
 * Changing the address login codes are sent to — two steps, never one.
 *
 * Asking sends a code to the NEW address and changes nothing; only the code
 * coming back moves the account. That is what stops a live session on someone
 * else's phone from quietly redirecting every future login code, and the copy
 * says so rather than making the extra step look like friction for its own sake.
 */
export function EmailChangeForm({ current }: { current: string | null }) {
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/users/me/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || he.error.serverError);
        return;
      }
      setStep('code');
    } catch {
      setError(he.error.networkError);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/users/me/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || he.error.serverError);
        return;
      }
      setSaved(data.email as string);
      setStep('idle');
      setCode('');
      setEmail('');
    } catch {
      setError(he.error.networkError);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setStep('idle');
    setCode('');
    setError('');
  }

  const shown = saved ?? current;

  return (
    <Card>
      <CardHeader title={he.settings.email} icon={<AtSign size={16} />} />

      <div className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-surface-sunken p-3.5">
        <span className="text-xs text-muted">{he.settings.emailWhyItMatters}</span>
        <span dir="ltr" className="text-start font-medium text-foreground">
          {shown || he.settings.emailNone}
        </span>
      </div>

      {saved && (
        <p className="mt-3 flex items-center gap-1.5 rounded-[var(--radius-md)] bg-success-bg p-3 text-sm text-success-fg">
          <CircleCheck size={14} className="shrink-0" />
          {he.settings.emailChanged}
        </p>
      )}

      {step === 'idle' ? (
        <form onSubmit={send} className="mt-4 flex flex-col gap-3.5">
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-info-bg p-3 text-xs text-info-fg">
            <Info size={14} className="mt-0.5 shrink-0" />
            {he.settings.emailStepIntro}
          </p>

          <Field label={he.settings.newEmail}>
            <Input
              type="email"
              dir="ltr"
              className="text-start"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSaved(null);
                setError('');
              }}
              required
              maxLength={200}
            />
          </Field>

          {error && (
            <p className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-danger-bg p-3 text-sm text-danger-fg">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" size="lg" variant="secondary" disabled={busy || !email} className="w-full">
            <Mail size={17} />
            {he.settings.sendCode}
          </Button>
        </form>
      ) : (
        <form onSubmit={confirm} className="mt-4 flex flex-col gap-3.5">
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-info-bg p-3 text-xs text-info-fg">
            <Mail size={14} className="mt-0.5 shrink-0" />
            {he.settings.codeSentTo(email)}
          </p>

          <Field label={he.settings.confirmationCode}>
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              className="text-center text-2xl tracking-[0.4em]"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
            />
          </Field>

          {error && (
            <p className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-danger-bg p-3 text-sm text-danger-fg">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="lg" disabled={busy || code.length !== 6} className="flex-1">
              <ShieldCheck size={17} />
              {he.settings.confirmEmail}
            </Button>
            <Button type="button" size="lg" variant="secondary" onClick={cancel} disabled={busy}>
              {he.settings.cancelEmailChange}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
