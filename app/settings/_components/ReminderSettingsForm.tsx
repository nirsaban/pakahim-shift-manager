'use client';

import { useRef, useState, type FormEvent } from 'react';
import { BellRing, CircleCheck, Info, Play, Save, TriangleAlert } from 'lucide-react';
import { he } from '@/lib/he';
import {
  LEAD_MINUTE_OPTIONS,
  REMINDER_SOUNDS,
  type ReminderSound,
} from '@/lib/notifications/reminder-rules';
import { SOUND_FILES } from '@/lib/notifications/sound-files';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';
import { Field, Select } from '../../_components/ui/Field';

export interface ReminderValues {
  enabled: boolean;
  leadMinutes: number;
  sound: ReminderSound;
}

/**
 * The worker's control over their pre-shift reminder: whether it fires, how far
 * ahead, and what it sounds like.
 *
 * The preview button matters more than it looks: it is the only way to hear a
 * tone before committing to being woken by it, AND it doubles as the gesture
 * that unlocks audio playback for this tab, so a reminder arriving later while
 * the app is open can actually make a sound.
 */
export function ReminderSettingsForm({ initial }: { initial: ReminderValues }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function update<K extends keyof ReminderValues>(field: K, value: ReminderValues[K]) {
    setValues((v) => ({ ...v, [field]: value }));
    setStatus('idle');
  }

  function preview() {
    const file = SOUND_FILES[values.sound];
    if (!file) return;
    // One element reused, so rapid taps replace the tone instead of layering it.
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = file;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setStatus('saving');
    try {
      const res = await fetch('/api/users/me/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
      <CardHeader title={he.settings.remindersTitle} icon={<BellRing size={16} />} />
      <p className="-mt-2 mb-4 text-xs text-muted">{he.settings.remindersSubtitle}</p>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <label className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface-sunken p-3.5">
          <span className="text-sm font-medium text-foreground">{he.settings.reminderEnabled}</span>
          <input
            type="checkbox"
            checked={values.enabled}
            onChange={(e) => update('enabled', e.target.checked)}
            className="h-5 w-5 accent-[var(--color-primary-600)]"
          />
        </label>

        {!values.enabled && (
          <p className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-warning-bg p-3 text-sm text-warning-fg">
            <TriangleAlert size={14} className="shrink-0" />
            {he.settings.reminderDisabledNote}
          </p>
        )}

        {/* Still editable while disabled: a worker turning reminders back on
            should find their old lead time and tone waiting, not reset. */}
        <Field label={he.settings.leadTime}>
          <Select
            value={values.leadMinutes}
            onChange={(e) => update('leadMinutes', Number(e.target.value))}
          >
            {LEAD_MINUTE_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {he.settings.leadMinutes(minutes)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={he.settings.sound}>
          <div className="flex items-center gap-2">
            <Select
              value={values.sound}
              onChange={(e) => update('sound', e.target.value as ReminderSound)}
              className="flex-1"
            >
              {REMINDER_SOUNDS.map((sound) => (
                <option key={sound} value={sound}>
                  {he.settings.soundOption[sound]}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={preview}
              disabled={values.sound === 'SILENT'}
            >
              <Play size={16} />
              {he.settings.preview}
            </Button>
          </div>
        </Field>

        <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-info-bg p-3 text-xs text-info-fg">
          <Info size={14} className="mt-0.5 shrink-0" />
          {he.settings.soundLimitation}
        </p>

        {error && (
          <p className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-danger-bg p-3 text-sm text-danger-fg">
            <TriangleAlert size={14} className="shrink-0" />
            {error}
          </p>
        )}
        {status === 'saved' && (
          <p className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-success-bg p-3 text-sm text-success-fg">
            <CircleCheck size={14} className="shrink-0" />
            {he.settings.remindersSaved}
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
