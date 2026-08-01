// services/captureService.js — turn a captured todo + breakdown into a task tree
import { PgTaskRepository } from '../repositories/PgTaskRepository.js';
import { deriveUrgency } from './urgencyService.js';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export class CaptureValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CaptureValidationError';
    this.status = 400;
  }
}

/**
 * Validate a capture payload.
 * Expected shape (from Hermes capture skill / ticket 04 contract):
 * {
 *   title: string,
 *   context?: string,
 *   breakdown?: [
 *     { title: string, context?: string, priority?: string,
 *       due_date?: string, depends_on?: number[] }  // indices into breakdown
 *   ]
 * }
 */
export function validateCapture(body) {
  if (!body || typeof body !== 'object') {
    throw new CaptureValidationError('Body must be a JSON object');
  }
  const { title, context, breakdown } = body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new CaptureValidationError('title is required (non-empty string)');
  }
  if (context !== undefined && typeof context !== 'string') {
    throw new CaptureValidationError('context must be a string');
  }
  if (breakdown !== undefined) {
    if (!Array.isArray(breakdown)) {
      throw new CaptureValidationError('breakdown must be an array');
    }
    if (breakdown.length > 8) {
      throw new CaptureValidationError('breakdown cannot exceed 8 subtasks');
    }
    breakdown.forEach((item, i) => {
      if (!item || typeof item !== 'object' || !item.title || typeof item.title !== 'string' || !item.title.trim()) {
        throw new CaptureValidationError(`breakdown[${i}].title is required`);
      }
      if (item.context !== undefined && typeof item.context !== 'string') {
        throw new CaptureValidationError(`breakdown[${i}].context must be a string`);
      }
      if (item.priority !== undefined && !PRIORITIES.includes(item.priority)) {
        throw new CaptureValidationError(`breakdown[${i}].priority invalid: ${item.priority}`);
      }
      if (item.due_date !== undefined && typeof item.due_date !== 'string') {
        throw new CaptureValidationError(`breakdown[${i}].due_date must be an ISO date string`);
      }
      if (item.depends_on !== undefined) {
        if (!Array.isArray(item.depends_on)) {
          throw new CaptureValidationError(`breakdown[${i}].depends_on must be an array of indices`);
        }
        for (const idx of item.depends_on) {
          if (!Number.isInteger(idx) || idx < 0 || idx >= breakdown.length || idx === i) {
            throw new CaptureValidationError(`breakdown[${i}].depends_on index out of range or self: ${idx}`);
          }
        }
      }
    });
  }
  return { title: title.trim(), context: context ?? '', breakdown };
}

export async function capture(body) {
  const payload = validateCapture(body);
  const repo = new PgTaskRepository();

  const parent = {
    title: payload.title,
    context: payload.context,
    priority: 'medium',
    urgency: 'medium',
    source: 'whatsapp',
  };

  const children = (payload.breakdown || []).map((b) => ({
    title: b.title.trim(),
    context: b.context ?? '',
    priority: b.priority ?? 'medium',
    urgency: deriveUrgency({ priority: b.priority ?? 'medium', dueDate: b.due_date }),
    dueDate: b.due_date || null,
    dependsOn: b.depends_on || [],
    source: 'whatsapp',
  }));

  // Dedupe hint: only for the top-level capture title
  const similar = await repo.findSimilar(payload.title, 3);

  const result = await repo.createTree(parent, children);
  return {
    task: result.parent,
    subtasks: result.children,
    similar,
  };
}
