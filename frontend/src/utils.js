export const PROC_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#64748b'
];

export function getProcessColor(pid) {
  if (!pid) return '#64748b';
  const num = parseInt(pid.replace(/\D/g, '')) || 0;
  return PROC_COLORS[num % PROC_COLORS.length];
}
