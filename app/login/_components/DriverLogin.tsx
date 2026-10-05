'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MessageCircle, ShieldCheck, TriangleAlert } from 'lucide-react';
import { he } from '@/lib/he';
import { homePathFor } from '@/lib/auth/workforce';
import { Card } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';
import { Field, Input } from '../../_components/ui/Field';
import { ErrorText } from './ErrorText';

/**
 * The locomotive drivers' login (docs/modules/drivers.md):
 * - a returning driver: phone, then code;
 * - the first time: worker number, then email + phone, then code.
 * The code goes to WhatsApp and email both.
 */

type Step = 'phone' | 'workerNumber' | 'details' | 'otp';

/** Which of the two logins the code step finishes. */
type Mode = 'phone' | 'firstLogin';

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { res, data: await res.json().catch(() => ({})) };
}

export function DriverLogin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [mode, setMode] = useState<Mode>('phone');
  const [phone, setPhone] = useState('');
  const [workerNumber, setWorkerNumber] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  // null: a code went out moments ago (cooldown), so which channels it took is unknown.
  const [channels, setChannels] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function goTo(next: Step, message = '') {
    setError(message);
    setStep(next);
  }

  /** Runs one request with the loading flag and network error handled. */
  async function run(e: FormEvent, action: () => Promise<void>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await action();
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  /** Advance to the code step after a send - or after a cooldown, when a code already went out. */
  function toOtpStep(res: Response, data: { channels?: string[]; reason?: string; error?: string }, next: Mode) {
    if (res.ok || (res.status === 429 && data.reason === 'cooldown')) {
      setChannels(res.ok ? (data.channels ?? []) : null);
      setMode(next);
      setOtp('');
      goTo('otp');
      return true;
    }
    return false;
  }

  const handlePhone = (e: FormEvent) =>
    run(e, async () => {
      const { res, data } = await post('/api/drivers/auth/phone', { phone });
      if (toOtpStep(res, data, 'phone')) return;
      if (data.reason === 'needs_first_login') return goTo('workerNumber', data.error);
      setError(data.error ?? he.error.serverError);
    });

  const handleWorkerNumber = (e: FormEvent) =>
    run(e, async () => {
      const { res, data } = await post('/api/drivers/auth/worker-number', { workerNumber });
      if (res.ok) {
        setName(data.name ?? '');
        return goTo('details');
      }
      if (data.reason === 'already_registered') return goTo('phone', data.error);
      setError(data.error ?? he.error.serverError);
    });

  const handleDetails = (e: FormEvent) =>
    run(e, async () => {
      const { res, data } = await post('/api/drivers/auth/register', { workerNumber, email, phone });
      if (toOtpStep(res, data, 'firstLogin')) return;
      setError(data.error ?? he.error.serverError);
    });

  const handleOtp = (e: FormEvent) =>
    run(e, async () => {
      const body = mode === 'phone' ? { phone, otp } : { workerNumber, otp };
      const { res, data } = await post('/api/drivers/auth/verify', body);
      if (!res.ok) return setError(data.error ?? he.auth.invalidOtp);
      router.push(homePathFor('drivers'));
      router.refresh();
    });

  const subtitle =
    step === 'workerNumber'
      ? he.drivers.firstLoginSubtitle
      : step === 'details'
        ? he.drivers.detailsSubtitle(name)
        : he.drivers.phoneSubtitle;

  return (
    <Card className="w-full max-w-sm">
      <h1 className="mb-1 text-2xl font-bold text-foreground">{he.auth.login}</h1>
      {step !== 'otp' && <p className="mb-6 text-sm text-muted">{subtitle}</p>}

      {step === 'phone' && (
        <form onSubmit={handlePhone} className="flex flex-col gap-4">
          <Field label={he.auth.phone}>
            <PhoneInput value={phone} onChange={setPhone} autoFocus />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <ContinueButton loading={loading} />
          <Button type="button" variant="ghost" onClick={() => goTo('workerNumber')}>
            {he.drivers.firstLoginLink}
          </Button>
        </form>
      )}

      {step === 'workerNumber' && (
        <form onSubmit={handleWorkerNumber} className="flex flex-col gap-4">
          <Field label={he.auth.workerNumber}>
            <Input
              type="text"
              required
              value={workerNumber}
              onChange={(e) => setWorkerNumber(e.target.value)}
              className="text-center text-lg tracking-wide"
              dir="ltr"
              autoFocus
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <ContinueButton loading={loading} />
          <Button type="button" variant="ghost" onClick={() => goTo('phone')}>
            {he.drivers.backToPhone}
          </Button>
        </form>
      )}

      {step === 'details' && (
        <form onSubmit={handleDetails} className="flex flex-col gap-4">
          <Field label={he.auth.email}>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" autoFocus />
          </Field>
          <Field label={he.auth.phone}>
            <PhoneInput value={phone} onChange={setPhone} />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {he.auth.sendCode}
          </Button>
          <Button type="button" variant="ghost" onClick={() => goTo('workerNumber')}>
            {he.button.back}
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleOtp} className="mt-5 flex flex-col gap-4">
          <SentNotice channels={channels} />
          <Field label={he.auth.emailOtp}>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="text-center text-lg tracking-[0.5em]"
              dir="ltr"
              autoFocus
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {he.auth.verifyOtp}
          </Button>
          <Button type="button" variant="ghost" onClick={() => goTo(mode === 'phone' ? 'phone' : 'details')}>
            {he.button.back}
          </Button>
        </form>
      )}
    </Card>
  );
}

function PhoneInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-center text-lg tracking-wide"
      dir="ltr"
      autoFocus={autoFocus}
    />
  );
}

function ContinueButton({ loading }: { loading: boolean }) {
  return (
    <Button type="submit" size="lg" disabled={loading} className="w-full">
      {he.auth.continueButton}
      <ArrowRight size={18} className="rtl:rotate-180" />
    </Button>
  );
}

/** Where the code went. Nothing delivered is said plainly - the driver should not wait for it. */
function SentNotice({ channels }: { channels: string[] | null }) {
  // A cooldown: the earlier code is still valid, but where it went is not known here.
  if (channels === null) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-info-bg px-3.5 py-2.5 text-sm text-info-fg">
        <MessageCircle size={16} className="shrink-0" />
        {he.drivers.otpRecentlySent}
      </div>
    );
  }
  const whatsapp = channels.includes('whatsapp');
  const email = channels.includes('email');
  if (!whatsapp && !email) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-danger-bg px-3.5 py-2.5 text-sm text-danger-fg">
        <TriangleAlert size={16} className="shrink-0" />
        {he.drivers.otpNotDelivered}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-info-bg px-3.5 py-2.5 text-sm text-info-fg">
      {whatsapp ? <MessageCircle size={16} className="shrink-0" /> : <ShieldCheck size={16} className="shrink-0" />}
      {whatsapp && email ? he.drivers.otpSentBoth : whatsapp ? he.auth.otpSentWhatsapp : he.auth.otpSentEmail}
    </div>
  );
}
