export function toISO(date: Date = new Date()): string { return date.toISOString(); }
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function formatDateShort(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function daysSince(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24));
}
