/**
 * Safe RFC4122 v4 UUID generator for React Native Hermes / Expo.
 * Zero external or global crypto dependencies.
 */
export function generateUUID(): string {
  let d = Date.now();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
