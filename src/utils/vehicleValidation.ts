const VEHICLE_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
export function validateVehicleNumber(value: string): boolean {
  return VEHICLE_REGEX.test(value.replace(/[-\s]/g, '').toUpperCase());
}
export function formatVehicleNumber(value: string): string {
  return value.replace(/[-\s]/g, '').toUpperCase();
}
