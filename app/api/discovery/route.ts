import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { saveDiscoveryAnswerSchema } from '@/lib/validation/discovery';
import { he } from '@/lib/he';

export async function GET() {
  const answers = await prisma.discoveryAnswer.findMany();
  return NextResponse.json({ answers });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = saveDiscoveryAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: he.error.required }, { status: 400 });
  }

  try {
    const { questionId, section, question, answer, method } = parsed.data;
    const saved = await prisma.discoveryAnswer.upsert({
      where: { questionId },
      create: { questionId, section, question, answer, method },
      update: { section, question, answer, method },
    });
    return NextResponse.json({ answer: saved });
  } catch {
    return NextResponse.json({ error: he.error.serverError }, { status: 500 });
  }
}
