export function generateLRNumber(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}
