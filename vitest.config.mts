import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // lib/roster and lib/reference are pure — no jsdom, no Prisma, no Next runtime.
    environment: 'node',
    include: ['lib/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
