// services/urgencyService.js — derive urgency from priority + due date
const LEVELS = { low: 0, medium: 1, high: 2, urgent: 3 };
const NAMES = ['low', 'medium', 'high', 'urgent'];

export function deriveUrgency({ priority = 'medium', dueDate = null }) {
  const base = LEVELS[priority] ?? 1;
  if (dueDate) {
    const now = Date.now();
    const due = new Date(dueDate).getTime();
    const hoursLeft = (due - now) / 36e5;
    if (hoursLeft <= 48) return 'urgent';
    if (hoursLeft <= 24 * 7) return NAMES[Math.max(base, 2)];
    if (hoursLeft <= 24 * 30) return NAMES[Math.max(base, 1)];
  }
  return priority; // no date -> priority is the urgency
}
