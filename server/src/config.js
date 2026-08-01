// config.js — load env for the Todo System server
import 'dotenv/config';

export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://cosmic@/todo_system?host=/var/run/postgresql',
  apiToken: process.env.TODO_API_TOKEN || '',
  port: Number(process.env.PORT || 3456),
  host: process.env.HOST || '192.168.1.180',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
};

export function requireApiToken() {
  if (!config.apiToken) {
    throw new Error('TODO_API_TOKEN is not set in server/.env');
  }
  return config.apiToken;
}
