import nodemailer from 'nodemailer';
import { he } from '../he';

const port = Number(process.env.SMTP_PORT ?? 465);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `קוד האימות שלך - ${he.brand.name}`,
    text: `קוד האימות שלך הוא: ${code}\nהקוד תקף ל-5 דקות.`,
    html: `<div dir="rtl" style="font-family: sans-serif; font-size: 16px;">
      <p>קוד האימות שלך הוא:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>הקוד תקף ל-5 דקות.</p>
    </div>`,
  });
}

const REASON_LABELS: Record<string, string> = {
  SICK: 'מחלה',
  HOLIDAY: 'חופשה',
  SWAP: 'החלפה',
  OTHER: 'אחר',
};

function formatShiftWindow(date: Date, startTime: Date, endTime: Date): string {
  const d = date.toLocaleDateString('he-IL');
  const s = startTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const e = endTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return `${d}, ${s}-${e}`;
}

interface CoverageRequestEmailInput {
  requesterName: string;
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  reason: string;
}

export async function sendCoverageRequestEmail(to: string, input: CoverageRequestEmailInput): Promise<void> {
  const window = formatShiftWindow(input.shiftDate, input.startTime, input.endTime);
  const reasonLabel = REASON_LABELS[input.reason] ?? input.reason;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `בקשת כיסוי משמרת: ${input.requesterName}`,
    text: `${input.requesterName} ביקש/ה כיסוי למשמרת ${window}.\nסיבה: ${reasonLabel}\n\nהיכנס/י לאפליקציה כדי לאשר או לדחות.`,
    html: `<div dir="rtl" style="font-family: sans-serif; font-size: 16px;">
      <p><strong>${input.requesterName}</strong> ביקש/ה כיסוי למשמרת:</p>
      <p>${window}</p>
      <p>סיבה: ${reasonLabel}</p>
      <p>היכנס/י לאפליקציה כדי לאשר או לדחות את הבקשה.</p>
    </div>`,
  });
}

interface CoverageDecisionEmailInput {
  approved: boolean;
  assignedAsReplacement?: boolean;
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  replacementName?: string;
  decisionNote?: string;
}

export async function sendCoverageDecisionEmail(to: string, input: CoverageDecisionEmailInput): Promise<void> {
  const window = formatShiftWindow(input.shiftDate, input.startTime, input.endTime);
  const note = input.decisionNote ? `\n\nהערה: ${input.decisionNote}` : '';

  let subject: string;
  let bodyText: string;
  if (input.assignedAsReplacement) {
    subject = `שובצת לכסות משמרת: ${window}`;
    bodyText = `שובצת לכסות משמרת ${window}.${note}`;
  } else if (input.approved) {
    subject = `בקשת הכיסוי שלך אושרה`;
    bodyText = `בקשת הכיסוי שלך למשמרת ${window} אושרה.${input.replacementName ? `\n${input.replacementName} יכסה/תכסה את המשמרת.` : ''}${note}`;
  } else {
    subject = `בקשת הכיסוי שלך נדחתה`;
    bodyText = `בקשת הכיסוי שלך למשמרת ${window} נדחתה.${note}`;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: bodyText,
    html: `<div dir="rtl" style="font-family: sans-serif; font-size: 16px;">
      <p>${bodyText.replace(/\n/g, '<br/>')}</p>
    </div>`,
  });
}

interface IncidentAlertInput {
  title: string;
  description: string;
  severity: string;
  workerName: string;
}

export async function sendIncidentAlertEmail(to: string, incident: IncidentAlertInput): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `דיווח תקרית חדש: ${incident.title}`,
    text: `${incident.workerName} דיווח/ה על תקרית:\n${incident.title}\nחומרה: ${incident.severity}\n\n${incident.description}`,
    html: `<div dir="rtl" style="font-family: sans-serif; font-size: 16px;">
      <p><strong>${incident.workerName}</strong> דיווח/ה על תקרית חדשה:</p>
      <p><strong>${incident.title}</strong> (חומרה: ${incident.severity})</p>
      <p>${incident.description}</p>
    </div>`,
  });
}
