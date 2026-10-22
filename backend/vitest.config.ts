import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/miniledger_test',
      JWT_SECRET: 'test-secret',
      UPLOAD_DIR: 'tmp-test-uploads',
    },
    fileParallelism: false,
  },
});
