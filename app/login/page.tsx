'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, TriangleAlert } from 'lucide-react';
import { he } from '@/lib/he';
import { Brand } from '../_components/Brand';
import { Card } from '../_components/ui/Card';
import { Button } from '../_components/ui/Button';
import { Field, Input } from '../_components/ui/Field';

type Step = 'workerNumber' | 'register' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('workerNumber');
  const [workerNumber, setWorkerNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    city: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateRegisterField<K extends keyof typeof registerForm>(key: K, value: string) {
    setRegisterForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerNumber }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setStep('otp');
        return;
      }
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      if (data.status === 'needs_registration') {
        setRegisterForm((prev) => ({
          ...prev,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
        }));
        setStep('register');
      } else {
        setStep('otp');
      }
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerNumber, ...registerForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerNumber, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? he.auth.invalidOtp);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm">
        <Brand />
      </div>
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-foreground">{he.auth.login}</h1>
        <p className="mb-6 text-sm text-muted">
          {step === 'register' ? he.auth.registerSubtitle : he.auth.workerNumberSubtitle}
        </p>

        {step === 'workerNumber' && (
          <form onSubmit={handleLookup} className="flex flex-col gap-4">
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
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {he.auth.continueButton}
              <ArrowRight size={18} className="rtl:rotate-180" />
            </Button>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Field label={he.onboarding.firstName}>
              <Input
                required
                value={registerForm.firstName}
                onChange={(e) => updateRegisterField('firstName', e.target.value)}
              />
            </Field>
            <Field label={he.onboarding.lastName}>
              <Input
                required
                value={registerForm.lastName}
                onChange={(e) => updateRegisterField('lastName', e.target.value)}
              />
            </Field>
            <Field label={he.onboarding.city}>
              <Input
                required
                value={registerForm.city}
                onChange={(e) => updateRegisterField('city', e.target.value)}
              />
            </Field>
            <Field label={he.auth.email}>
              <Input
                type="email"
                required
                value={registerForm.email}
                onChange={(e) => updateRegisterField('email', e.target.value)}
                dir="ltr"
              />
            </Field>
            <Field label={he.auth.phone}>
              <Input
                type="tel"
                required
                value={registerForm.phone}
                onChange={(e) => updateRegisterField('phone', e.target.value)}
                dir="ltr"
              />
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {he.button.register}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('workerNumber')}>
              {he.button.back}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-info-bg px-3.5 py-2.5 text-sm text-info-fg">
              <ShieldCheck size={16} className="shrink-0" />
              {he.auth.emailOtpSent}
            </div>
            <Field label={he.auth.emailOtp}>
              <Input
                type="text"
                inputMode="numeric"
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
            <Button type="button" variant="ghost" onClick={() => setStep('workerNumber')}>
              {he.button.back}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}

function ErrorText({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-danger-fg">
      <TriangleAlert size={14} className="shrink-0" />
      {children}
    </p>
  );
}
