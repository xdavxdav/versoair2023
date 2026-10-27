export type TipTotals = {
  debitedTotal: number;
  artistTipIncome: number;
  legacyCreditedWithoutDebit: number;
};

export type TipReconciliation = {
  ok: boolean;
  expectedArtistIncome: number;
  difference: number;
};

const cents = (n: number) => Math.round(n * 100);

// Each wallet-funded tip credits exactly half of the debit to the artist.
// Income recorded before debits existed is reported separately as legacy.
export function reconcileTips(t: TipTotals): TipReconciliation {
  const expected = cents(t.debitedTotal) / 2;
  const actual = cents(t.artistTipIncome) - cents(t.legacyCreditedWithoutDebit);
  const diff = actual - expected;
  return {
    ok: Math.abs(diff) <= 1,
    expectedArtistIncome: expected / 100,
    difference: diff / 100,
  };
}
