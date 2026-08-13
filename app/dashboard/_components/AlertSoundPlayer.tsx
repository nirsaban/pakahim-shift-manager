'use client';

import { useEffect, useRef } from 'react';
import { SOUND_FILES } from '@/lib/notifications/sound-files';
import type { ReminderSound } from '@/lib/notifications/reminder-rules';

/**
 * Plays the worker's chosen tone when a push arrives and the app is open.
 *
 * This exists because of a hard limit rather than a preference: a Web Push
 * notification cannot carry a custom ringtone — `Notification.sound` is
 * implemented nowhere, and a locked phone plays whatever the OS notification
 * channel says. The one place a PWA genuinely controls the sound is a page it
 * already owns, so the service worker forwards the tone here and this plays it.
 *
 * Renders nothing. Browser autoplay policy means the very first tone may be
 * blocked until the worker has interacted with the page — the preview button in
 * /settings is what usually unlocks it, and a blocked play is swallowed rather
 * than thrown, because a missing sound must never break the dashboard.
 */
export function AlertSoundPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.type !== 'play-alert-sound') return;

      const file = SOUND_FILES[data.sound as ReminderSound];
      if (!file) return;

      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = file;
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  return null;
}
