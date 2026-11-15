const VEHICLE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$|^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;
export function validateVehicleNumber(value: string): boolean {
  if (!value) return false;
  const clean = value.replace(/[-\s]/g, '').toUpperCase();
  return VEHICLE_REGEX.test(clean) || (clean.length >= 7 && clean.length <= 12 && /^[A-Z0-9]+$/.test(clean));
}
export function formatVehicleNumber(value: string): string {
  if (!value) return '';
  return value.replace(/[-\s]/g, '').toUpperCase();
}
