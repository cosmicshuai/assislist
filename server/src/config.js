// config.js — load env for the AssisList server
import 'dotenv/config';

export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://assislist:assislist@localhost:5432/assislist',
  apiToken: process.env.TODO_API_TOKEN || '',
  agentToken: process.env.TODO_AGENT_TOKEN || '',
  port: Number(process.env.PORT || 3456),
  host: process.env.HOST || '0.0.0.0',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  autoMigrate: process.env.AUTO_MIGRATE !== 'false',
};

export function requireApiToken() {
  if (!config.apiToken) {
    throw new Error('TODO_API_TOKEN is not set in server/.env');
  }
  return config.apiToken;
}

// Optional: when unset, the server falls back to single-token (user-only) mode.
export function hasAgentToken() {
  return Boolean(config.agentToken);
}
