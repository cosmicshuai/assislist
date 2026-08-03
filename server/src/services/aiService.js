// services/aiService.js — DeepSeek-backed recommendation reasons
import { config } from '../config.js';
import { log } from '../middleware/logging.js';

const API_URL = 'https://api.deepseek.com/chat/completions';
const REQUEST_TIMEOUT_MS = 15_000;

// The two lists carry different entities: top_next holds tasks, long_term
// holds projects. Keeping that mapping in one place is what the previous
// version got wrong — it read `entry.task.id` for both.
const KINDS = {
  top_next: { entity: 'task', idKey: 'task_id' },
  long_term: { entity: 'project', idKey: 'project_id' },
};

function describe(list, kind) {
  const { entity } = KINDS[kind];
  return list.map((entry, i) => {
    const subject = entry[entity];
    return {
      id: subject.id,
      title: subject.title,
      urgency: subject.urgency,
      priority: subject.priority,
      due_date: subject.dueDate ? String(subject.dueDate).slice(0, 10) : null,
      status: subject.status,
      context: subject.context || null,
      current_reason: entry.reason,
      rank: i + 1,
    };
  });
}

function applyReasons(list, kind, enriched) {
  const { entity, idKey } = KINDS[kind];
  const byId = new Map((enriched || []).filter(Boolean).map((r) => [r[idKey], r.reason]));
  return list.map((entry) => {
    const reason = byId.get(entry[entity]?.id);
    return typeof reason === 'string' && reason.trim() ? { ...entry, reason } : entry;
  });
}

/**
 * Ask DeepSeek to write human, nuanced reasons for the recommendations.
 *
 * Contract: this never throws and never changes the shape of its input. Any
 * failure — no key, bad response, timeout, unexpected payload — degrades to
 * the rule-based reasons the caller already computed. Building the request
 * happens inside the try for exactly that reason.
 */
export async function enrichReasons({ topNext = [], longTerm = [] }) {
  const unchanged = { top_next: topNext, long_term: longTerm, ai: false };
  if (!config.deepseekApiKey) return unchanged;

  try {
    const payload = {
      model: 'deepseek-v4-flash',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a senior chief-of-staff helping a busy person prioritize. ' +
            'You will receive two lists (top_next = tasks to do next, long_term = projects with the highest long-term impact). ' +
            'For each item, rewrite its "reason" into ONE concise, specific, human sentence (max ~20 words) that ' +
            'explains why it belongs in that list. Use the title, urgency, due date, and context. ' +
            'Never invent facts. Output JSON exactly: ' +
            '{"top_next":[{"task_id":<id>,"reason":"..."}],"long_term":[{"project_id":<id>,"reason":"..."}]}.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            top_next: describe(topNext, 'top_next'),
            long_term: describe(longTerm, 'long_term'),
          }),
        },
      ],
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseekApiKey}`,
      },
      body: JSON.stringify(payload),
      // Without this a hung upstream hangs the recommendations request forever.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      log('warn', 'DeepSeek enrich rejected', { status: res.status });
      return unchanged;
    }

    const data = await res.json();
    const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    return {
      top_next: applyReasons(topNext, 'top_next', content.top_next),
      long_term: applyReasons(longTerm, 'long_term', content.long_term),
      ai: true,
    };
  } catch (e) {
    log('warn', 'DeepSeek enrich failed', { err: e.message });
    return unchanged;
  }
}
