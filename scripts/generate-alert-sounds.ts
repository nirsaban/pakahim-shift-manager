/**
 * Generates the pre-shift alert tones in public/sounds/.
 *
 * Synthesised rather than sourced: three short clips are a few kilobytes of
 * arithmetic, and generating them keeps the repo free of binary assets nobody
 * can diff, licence-check or regenerate. Run with:
 *
 *   npx tsx scripts/generate-alert-sounds.ts
 *
 * The output is committed - this script exists to make the clips reproducible,
 * not to run at build time.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SAMPLE_RATE = 22_050;

interface Partial {
  /** Hz. */
  frequency: number;
  /** Seconds from the start of the clip. */
  at: number;
  duration: number;
  gain: number;
}

/** Exponential decay, so each note reads as a struck tone rather than a beep. */
function envelope(t: number, duration: number, decay: number): number {
  if (t < 0 || t > duration) return 0;
  // Short fade-in kills the click a hard start would produce.
  const attack = Math.min(1, t / 0.004);
  return attack * Math.exp(-t * decay);
}

function render(partials: Partial[], decay: number, totalSeconds: number): Buffer {
  const frames = Math.round(SAMPLE_RATE * totalSeconds);
  const samples = new Int16Array(frames);

  for (let i = 0; i < frames; i++) {
    const t = i / SAMPLE_RATE;
    let value = 0;
    for (const p of partials) {
      const local = t - p.at;
      if (local < 0 || local > p.duration) continue;
      value += p.gain * Math.sin(2 * Math.PI * p.frequency * local) * envelope(local, p.duration, decay);
    }
    samples[i] = Math.max(-1, Math.min(1, value)) * 32_767;
  }

  return wav(samples);
}

/** 16-bit mono PCM WAV. */
function wav(samples: Int16Array): Buffer {
  const data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // format: PCM
  header.writeUInt16LE(1, 22); // channels: mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

/** Two rising notes - a soft "you have a moment" tone. */
function chime(): Buffer {
  return render(
    [
      { frequency: 880, at: 0, duration: 0.5, gain: 0.5 },
      { frequency: 1174.66, at: 0.16, duration: 0.6, gain: 0.45 },
    ],
    4.5,
    0.85,
  );
}

/** A struck bell: fundamental plus inharmonic partials, long decay. */
function bell(): Buffer {
  return render(
    [
      { frequency: 660, at: 0, duration: 1.2, gain: 0.42 },
      { frequency: 1320, at: 0, duration: 1.2, gain: 0.2 },
      { frequency: 1980, at: 0, duration: 1.0, gain: 0.12 },
      { frequency: 660, at: 0.42, duration: 1.0, gain: 0.3 },
    ],
    2.6,
    1.5,
  );
}

/** Four insistent beeps - the one you would want at 04:30. */
function alarm(): Buffer {
  const partials: Partial[] = [];
  for (let i = 0; i < 4; i++) {
    partials.push({ frequency: 1046.5, at: i * 0.22, duration: 0.14, gain: 0.55 });
    partials.push({ frequency: 2093, at: i * 0.22, duration: 0.14, gain: 0.2 });
  }
  return render(partials, 9, 1.0);
}

const outputDir = join(process.cwd(), 'public', 'sounds');
mkdirSync(outputDir, { recursive: true });

for (const [name, buffer] of [
  ['chime', chime()],
  ['bell', bell()],
  ['alarm', alarm()],
] as const) {
  const path = join(outputDir, `${name}.wav`);
  writeFileSync(path, buffer);
  console.log(`${path} (${(buffer.length / 1024).toFixed(1)} KB)`);
}
