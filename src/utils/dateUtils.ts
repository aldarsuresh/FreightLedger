export function toISO(date: Date = new Date()): string { return date.toISOString(); }
export function formatDate(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function formatDateShort(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function daysSince(isoString?: string | null): number {
  if (!isoString) return 0;
  const d = new Date(isoString);
  return isNaN(d.getTime()) ? 0 : Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}
