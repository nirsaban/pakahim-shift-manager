'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TriangleAlert, CircleCheck, MessageCircle } from 'lucide-react';
import { he } from '@/lib/he';
import { Card, CardHeader } from '../../_components/ui/Card';
import { Button } from '../../_components/ui/Button';
import { Field, Input, Textarea, Select } from '../../_components/ui/Field';
import { toWhatsAppLink } from '@/lib/utils/whatsapp';

const SEVERITIES = [
  { value: 'low', label: he.incident.severityLow },
  { value: 'normal', label: he.incident.severityNormal },
  { value: 'high', label: he.incident.severityHigh },
  { value: 'critical', label: he.incident.severityCritical },
];

// q7 (client discovery): a regular fault goes to the team lead; a train-equipment fault
// also reaches מחלקת אחזקה; an emergency fans out to every relevant party at once.
const ROUTES = [
  { value: 'TEAM_LEAD', label: he.incident.routeTeamLead },
  { value: 'MAINTENANCE', label: he.incident.routeMaintenance },
  { value: 'EMERGENCY_BROADCAST', label: he.incident.routeEmergency },
];

export function ReportIncidentForm({ teamLeadPhone }: { teamLeadPhone?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('normal');
  const [route, setRoute] = useState('TEAM_LEAD');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/notifications/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, severity, route }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? he.error.serverError);
        return;
      }
      setSent(true);
      setTitle('');
      setDescription('');
      router.refresh();
    } catch {
      setError(he.error.networkError);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="danger" size="lg" onClick={() => setOpen(true)} className="w-full">
        <TriangleAlert size={18} />
        {he.dashboard.reportIncident}
      </Button>
    );
  }

  if (sent) {
    const waLink = toWhatsAppLink(teamLeadPhone);
    return (
      <Card className="flex flex-col gap-3 border-success-fg/20 bg-success-bg text-success-fg">
        <div className="flex items-center gap-2">
          <CircleCheck size={18} />
          <p className="text-sm font-medium">{he.incident.incidentSent}</p>
        </div>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-md)] bg-[#25D366] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle size={15} />
            {he.dashboard.contactViaWhatsapp}
          </a>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title={he.incident.reportTitle} icon={<TriangleAlert size={16} />} />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <Field label={he.incident.reportRoute}>
          <Select value={route} onChange={(e) => setRoute(e.target.value)}>
            {ROUTES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={he.incident.reportTitle}>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={he.incident.reportDescription}>
          <Textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Field>
        <Field label={he.incident.reportSeverity}>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        {error && <p className="text-sm text-danger-fg">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={loading} className="flex-1">
            {he.button.submit}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {he.button.cancel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
