import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  FileSpreadsheet,
  Hash,
  MessageCircle,
  Siren,
  Smartphone,
  TrainFront,
  Users,
} from 'lucide-react';
import { he } from '@/lib/he';
import { Brand } from '../_components/Brand';
import { Card } from '../_components/ui/Card';
import { Button } from '../_components/ui/Button';

export const metadata = {
  title: `${he.landing.metaTitle} - ${he.brand.name}`,
  description: he.landing.hero.subtitle,
};

const FEATURE_ICONS = [CalendarClock, Users, Siren, FileSpreadsheet, BarChart3, Smartphone];
const STEP_ICONS = [Hash, MessageCircle, CalendarClock];

function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 pt-14 pb-16 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-1.5 text-sm font-medium text-muted shadow-[var(--shadow-card)]">
        <TrainFront size={15} className="text-primary-500" />
        {he.landing.hero.badge}
      </span>
      <h1 className="max-w-2xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">
        <span className="brand-gradient-text">{he.landing.hero.title}</span>
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-muted">{he.landing.hero.subtitle}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link href="/login">
          <Button size="lg">{he.landing.hero.ctaPrimary}</Button>
        </Link>
        <Link href="#how">
          <Button variant="secondary" size="lg">
            {he.landing.hero.ctaSecondary}
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="pb-16">
      <Card className="brand-gradient border-0 p-8 text-white sm:p-10">
        <h2 className="text-2xl font-bold">{he.landing.problem.title}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-white/85">{he.landing.problem.body}</p>
      </Card>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="pb-16">
      <h2 className="text-center text-2xl font-bold text-foreground">{he.landing.how.title}</h2>
      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {he.landing.how.steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <li key={step.title}>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <span className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white">
                    <Icon size={18} />
                  </span>
                  <span className="text-sm font-semibold text-muted">{i + 1}</span>
                </div>
                <h3 className="mt-4 font-bold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Features() {
  return (
    <section className="pb-16">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">{he.landing.features.title}</h2>
        <p className="mt-2 text-muted">{he.landing.features.subtitle}</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {he.landing.features.items.map((item, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <Card key={item.title} className="h-full">
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-info-bg text-info-fg">
                <Icon size={18} />
              </span>
              <h3 className="mt-4 font-bold text-foreground">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className="pb-16">
      <h2 className="text-center text-2xl font-bold text-foreground">{he.landing.faq.title}</h2>
      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-4">
        {he.landing.faq.items.map((item) => (
          <Card key={item.q}>
            <h3 className="font-bold text-foreground">{item.q}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.a}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="pb-16">
      <Card className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
        <h2 className="text-2xl font-bold text-foreground">{he.landing.cta.title}</h2>
        <p className="max-w-xl leading-relaxed text-muted">{he.landing.cta.body}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <a href="https://geniriflow.miltech.cloud/#contact" target="_blank" rel="noreferrer">
            <Button size="lg">{he.landing.cta.button}</Button>
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            {he.landing.cta.workers}
            <ArrowLeft size={15} />
          </Link>
        </div>
      </Card>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
      <header className="flex items-center justify-between pt-6">
        <Brand size="compact" />
        <Link href="/login">
          <Button variant="secondary" size="md">
            {he.landing.nav.login}
          </Button>
        </Link>
      </header>

      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <Faq />
      <FinalCta />

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <a
          href="https://geniriflow.miltech.cloud"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground"
        >
          {he.landing.footer.builtBy}
        </a>
      </footer>
    </main>
  );
}
