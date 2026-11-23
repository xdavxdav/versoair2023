import { useCallback, useEffect, useState } from "react";

interface AdminOffer {
  key: string;
  name: string;
  amountCents: number;
  active: boolean;
}

/** GeoAdmin editor for community and activity prices (CAD). */
export default function OfferPricesPanel() {
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/payments/offers/admin", {
      credentials: "include",
    });
    if (!res.ok) {
      setMessage("Could not load prices (owner access required).");
      return;
    }
    const body = await res.json();
    setOffers(body.data);
    setDrafts(
      Object.fromEntries(
        body.data.map((o: AdminOffer) => [o.key, (o.amountCents / 100).toFixed(2)]),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(key: string, patch: { amountCents?: number; active?: boolean }) {
    setMessage("");
    const res = await fetch(`/api/v1/payments/offers/${key}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => null);
    setMessage(res.ok ? "Saved." : (body?.error ?? "Save failed."));
    if (res.ok) await load();
  }

  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-bold text-white mb-1">
        Community, activity &amp; event hosting prices (CAD)
      </h3>
      <p className="text-[11px] text-gray-500 mb-3">
        Changes apply to new checkouts immediately. Turning an offer off hides
        its Pay button — for activities it reopens free RSVP, and for Event
        hosting fee it lets members submit events for review at no charge.
      </p>
      <div className="space-y-2">
        {offers.map((offer) => (
          <div key={offer.key} className="flex flex-wrap items-center gap-3">
            <span className="w-48 text-sm text-gray-200">{offer.name}</span>
            <span className="text-gray-500 text-sm">CA$</span>
            <input
              type="number"
              min="1"
              max="500"
              step="0.01"
              value={drafts[offer.key] ?? ""}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [offer.key]: e.target.value }))
              }
              className="w-24 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-white"
            />
            <button
              type="button"
              onClick={() =>
                save(offer.key, {
                  amountCents: Math.round(Number(drafts[offer.key]) * 100),
                })
              }
              className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Save price
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={offer.active}
                onChange={(e) => save(offer.key, { active: e.target.checked })}
              />
              On sale
            </label>
          </div>
        ))}
      </div>
      {message ? <p className="mt-2 text-xs text-gray-400">{message}</p> : null}
    </div>
  );
}
