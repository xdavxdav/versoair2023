export const GEOADMIN_PROPOSED_FEE_PERCENTAGES = [10, 15, 20] as const;
export type GeoAdminProposedFeePercent =
  (typeof GEOADMIN_PROPOSED_FEE_PERCENTAGES)[number];

export function calculateGeoAdminFeeXof(
  annualBasePriceXof: number | null,
  percent: GeoAdminProposedFeePercent,
) {
  if (
    annualBasePriceXof === null ||
    !Number.isFinite(annualBasePriceXof) ||
    annualBasePriceXof < 0
  ) {
    return null;
  }
  return Math.round((annualBasePriceXof * percent) / 100);
}

export function calculateGeoAdminTotalXof(
  annualBasePriceXof: number | null,
  percent: GeoAdminProposedFeePercent,
) {
  const addon = calculateGeoAdminFeeXof(annualBasePriceXof, percent);
  if (annualBasePriceXof === null || addon === null) return null;
  return annualBasePriceXof + addon;
}
