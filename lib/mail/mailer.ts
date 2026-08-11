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
