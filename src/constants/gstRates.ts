export type GSTMode = 'RCM' | 'FORWARD_5' | 'FORWARD_12';

export const GST_MODE_LABELS: Record<GSTMode, string> = {
  RCM: 'RCM (0% — Reverse Charge)',
  FORWARD_5: 'Forward Charge @ 5% (No ITC)',
  FORWARD_12: 'Forward Charge @ 12% (With ITC)',
};

export const GST_RATES: Record<GSTMode, { cgst: number; sgst: number; igst: number }> = {
  RCM: { cgst: 0, sgst: 0, igst: 0 },
  FORWARD_5: { cgst: 2.5, sgst: 2.5, igst: 5 },
  FORWARD_12: { cgst: 6, sgst: 6, igst: 12 },
};
