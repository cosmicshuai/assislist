// drizzle.config.ts — Todo System
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://cosmic@/todo_system?host=/var/run/postgresql',
  },
  strict: true,
  verbose: true,
});
