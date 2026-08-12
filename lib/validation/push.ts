import { z } from 'zod';

/** Shape produced by PushSubscription.toJSON() in the browser. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
