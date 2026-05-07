// HCM utility functions - HCM (Headcount Month) = 144 hours

export const HCM_HOURS = 144;

export function hoursToHcm(hours: number): number {
  return hours / HCM_HOURS;
}

export function hcmToHours(hcm: number): number {
  return hcm * HCM_HOURS;
}

export function formatHcm(hours: number): string {
  const hcm = hoursToHcm(hours);
  return hcm === 1 ? '1.0' : hcm.toFixed(2);
}

export function formatHcmWithUnit(hours: number): string {
  return `${formatHcm(hours)} HCM`;
}

export function formatHcmFull(hours: number): string {
  const hcm = hoursToHcm(hours);
  return hcm === 1 ? '1.0 HCM' : `${hcm.toFixed(2)} HCM`;
}