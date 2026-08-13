'use client';

import { useState, type FormEvent } from 'react';
import { CircleCheck, Save, TriangleAlert, UserRound } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';
import { Field, Input } from '../../_components/ui/Field';

export interface ProfileValues {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  workerNumber: string | null;
}

/**
 * A worker's own details.
 *
 * The worker number is shown but not editable, and says why: it is the roster
 * file's identifier for this person, so changing it would break the match on
 * every future import. Email is absent entirely — it decides where login codes
 * go, so it gets its own confirm-the-new-address flow in EmailChangeForm rather
 * than sitting in a form that saves on one click.
 */
export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');

  function update(field: keyof ProfileValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setStatus('idle');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setStatus('saving');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          city: values.city,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || he.error.serverError);
        setStatus('idle');
        return;
      }
      setStatus('saved');
    } catch {
      setError(he.error.networkError);
      setStatus('idle');
    }
  }

  return (
    <Card>
      <CardHeader title={he.settings.profileTitle} icon={<UserRound size={16} />} />
      <p className="-mt-2 mb-4 text-xs text-muted">{he.settings.profileSubtitle}</p>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label={he.settings.firstName}>
            <Input
              value={values.firstName}
              onChange={(e) => update('firstName', e.target.value)}
              required
              maxLength={60}
            />
          </Field>
          <Field label={he.settings.lastName}>
            <Input
              value={values.lastName}
              onChange={(e) => update('lastName', e.target.value)}
              maxLength={60}
            />
          </Field>
        </div>

        <Field label={he.settings.phone}>
          <Input
            type="tel"
            inputMode="tel"
            dir="ltr"
            className="text-start"
            placeholder="052-1234567"
            value={values.phone}
            onChange={(e) => update('phone', e.target.value)}
            maxLength={30}
          />
        </Field>
        <p className="-mt-2 text-xs text-muted">{he.settings.phoneHint}</p>

        <Field label={he.settings.city}>
          <Input value={values.city} onChange={(e) => update('city', e.target.value)} maxLength={60} />
        </Field>
        <p className="-mt-2 text-xs text-muted">{he.settings.cityHint}</p>

        {values.workerNumber && (
          <div>
            <Field label={he.settings.workerNumber}>
              <Input value={values.workerNumber} disabled dir="ltr" className="text-start" />
            </Field>
            <p className="mt-1 text-xs text-muted">{he.settings.workerNumberLocked}</p>
          </div>
        )}

        {/* Email is not here: changing where login codes go needs its own
            confirm-the-new-address flow, which lives in EmailChangeForm. */}

        {error && (
          <p className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-danger-bg p-3 text-sm text-danger-fg">
            <TriangleAlert size={14} className="shrink-0" />
            {error}
          </p>
        )}
        {status === 'saved' && (
          <p className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-success-bg p-3 text-sm text-success-fg">
            <CircleCheck size={14} className="shrink-0" />
            {he.settings.saved}
          </p>
        )}

        <Button type="submit" size="lg" disabled={status === 'saving'} className="w-full">
          <Save size={17} />
          {he.settings.save}
        </Button>
      </form>
    </Card>
  );
}
