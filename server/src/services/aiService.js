// services/aiService.js — DeepSeek-backed recommendation reasons
import { config } from '../config.js';

const API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * Ask DeepSeek to write human, nuanced reasons for the recommended tasks.
 * Returns [{ task_id, reason }] for each requested kind. Falls back to the
 * rule-based reasons if the API key is missing or the call fails.
 */
export async function enrichReasons({ topNext, longTerm }) {
  if (!config.deepseekApiKey) {
    return { top_next: topNext, long_term: longTerm, ai: false };
  }

  const buildList = (list) =>
    list.map(({ task, reason }, i) => ({
      id: task.id,
      title: task.title,
      urgency: task.urgency,
      priority: task.priority,
      due_date: task.dueDate ? task.dueDate.slice(0, 10) : null,
      status: task.status,
      context: task.context || null,
      current_reason: reason,
      rank: i + 1,
    }));

  const payload = {
    model: 'deepseek-v4-flash',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a senior chief-of-staff helping a busy person prioritize. ' +
          'You will receive two lists of tasks (top_next = do next, long_term = highest long-term impact). ' +
          'For each task, rewrite its "reason" into ONE concise, specific, human sentence (max ~20 words) that ' +
          'explains why it belongs in that list. Use the task title, urgency, due date, and context. ' +
          'Never invent facts. Output JSON exactly: {"top_next":[{"task_id":<id>,"reason":"..."}],"long_term":[{"task_id":<id>,"reason":"..."}]}.',
      },
      {
        role: 'user',
        content: JSON.stringify({ top_next: buildList(topNext), long_term: buildList(longTerm) }),
      },
    ],
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseekApiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('DeepSeek error:', res.status, await res.text());
      return { top_next: topNext, long_term: longTerm, ai: false };
    }
    const data = await res.json();
    const content = JSON.parse(data.choices?.[0]?.message?.content || '{}');

    const apply = (list, enriched) => {
      const byId = new Map((enriched || []).map((r) => [r.task_id, r.reason]));
      return list.map((item) => ({
        ...item,
        reason: byId.get(item.task.id) || item.reason,
      }));
    };

    return {
      top_next: apply(topNext, content.top_next),
      long_term: apply(longTerm, content.long_term),
      ai: true,
    };
  } catch (e) {
    console.error('DeepSeek enrich failed:', e.message);
    return { top_next: topNext, long_term: longTerm, ai: false };
  }
}
