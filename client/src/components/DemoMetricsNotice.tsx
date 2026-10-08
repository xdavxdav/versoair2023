export default function DemoMetricsNotice() {
  return (
    <aside
      role="note"
      aria-label="Demonstration data notice"
      className="mb-5 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      <p className="font-semibold">DEMO DATA — illustrative only</p>
      <p className="mt-1 text-amber-50/90">
        Use these example figures and charts to preview the dashboard and its
        controls. This is not verified live business, financial, occupancy, or
        advertising reporting; do not use these values as factual results.
      </p>
    </aside>
  );
}
