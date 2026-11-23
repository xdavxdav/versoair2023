import { useCallback, useEffect, useState } from "react";
import { Package, Printer, Plus } from "lucide-react";
import { authenticatedFetch } from "@/lib/auth";

interface AdminPackItem {
  id: number;
  name: string;
  included: boolean;
}

interface AdminPack {
  id: number;
  name: string;
  slug: string;
  tier: string;
  description: string | null;
  price_cents: number;
  active: boolean;
  items?: AdminPackItem[];
}

interface AdminPrintProduct {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  price_cents: number;
  turnaround_days: number;
  active: boolean;
}

const PACK_TIERS = ["basic", "standard", "premium", "pro"] as const;
const PRINT_CATEGORIES = [
  "business_cards",
  "flyers",
  "brochures",
  "posters",
  "banners",
  "stickers",
  "custom",
] as const;

/**
 * Owner-only GeoAdmin panel to create, price (CAD), and activate/deactivate
 * Marketing Packs and Print Products without SQL.
 */
export default function MarketingCatalogPanel() {
  const [packs, setPacks] = useState<AdminPack[]>([]);
  const [printProducts, setPrintProducts] = useState<AdminPrintProduct[]>([]);
  const [packPriceDrafts, setPackPriceDrafts] = useState<Record<number, string>>({});
  const [printPriceDrafts, setPrintPriceDrafts] = useState<Record<number, string>>({});
  const [available, setAvailable] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [showNewPack, setShowNewPack] = useState(false);
  const [showNewPrint, setShowNewPrint] = useState(false);

  const [newPack, setNewPack] = useState({
    name: "",
    tier: "standard",
    priceDollars: "",
    description: "",
    featuresText: "",
  });

  const [newPrint, setNewPrint] = useState({
    name: "",
    category: "business_cards",
    priceDollars: "",
    turnaroundDays: "3",
    description: "",
  });

  const load = useCallback(async () => {
    const res = await authenticatedFetch("/api/marketing/admin/catalog");
    if (!res.ok) {
      setAvailable(false);
      return;
    }
    const body = await res.json();
    const nextPacks: AdminPack[] = body?.data?.packs ?? [];
    const nextPrint: AdminPrintProduct[] = body?.data?.printProducts ?? [];
    setAvailable(true);
    setPacks(nextPacks);
    setPrintProducts(nextPrint);
    setPackPriceDrafts(
      Object.fromEntries(
        nextPacks.map((p) => [p.id, (p.price_cents / 100).toFixed(2)]),
      ),
    );
    setPrintPriceDrafts(
      Object.fromEntries(
        nextPrint.map((p) => [p.id, (p.price_cents / 100).toFixed(2)]),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (available === false) return null;

  async function createPack(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const priceCents = Math.round(Number(newPack.priceDollars) * 100);
    const features = newPack.featuresText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const res = await authenticatedFetch("/api/marketing/admin/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPack.name,
        tier: newPack.tier,
        priceCents,
        description: newPack.description || null,
        features,
        active: true,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(body?.error ?? "Could not create marketing pack.");
      return;
    }
    setNewPack({
      name: "",
      tier: "standard",
      priceDollars: "",
      description: "",
      featuresText: "",
    });
    setShowNewPack(false);
    setMessage("Marketing pack created.");
    await load();
  }

  async function patchPack(
    id: number,
    patch: { priceCents?: number; active?: boolean },
  ) {
    setMessage("");
    const res = await authenticatedFetch(`/api/marketing/admin/packs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => null);
    setMessage(res.ok ? "Pack updated." : (body?.error ?? "Update failed."));
    if (res.ok) await load();
  }

  async function createPrintProduct(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const priceCents = Math.round(Number(newPrint.priceDollars) * 100);
    const turnaroundDays = Math.round(Number(newPrint.turnaroundDays) || 3);
    const res = await authenticatedFetch("/api/marketing/admin/print-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPrint.name,
        category: newPrint.category,
        priceCents,
        turnaroundDays,
        description: newPrint.description || null,
        active: true,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage(body?.error ?? "Could not create print product.");
      return;
    }
    setNewPrint({
      name: "",
      category: "business_cards",
      priceDollars: "",
      turnaroundDays: "3",
      description: "",
    });
    setShowNewPrint(false);
    setMessage("Print product created.");
    await load();
  }

  async function patchPrintProduct(
    id: number,
    patch: { priceCents?: number; active?: boolean },
  ) {
    setMessage("");
    const res = await authenticatedFetch(
      `/api/marketing/admin/print-products/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    const body = await res.json().catch(() => null);
    setMessage(
      res.ok ? "Print product updated." : (body?.error ?? "Update failed."),
    );
    if (res.ok) await load();
  }

  return (
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-4 mb-4 space-y-5">
      <div>
        <h3 className="text-sm font-bold text-white mb-1">
          Marketing shop catalog (CAD)
        </h3>
        <p className="text-[11px] text-gray-500">
          Owner-only storefront catalog for{" "}
          <span className="font-mono text-gray-400">/marketing/packs</span> and{" "}
          <span className="font-mono text-gray-400">/marketing/print</span>.
          Checkout always reads these CAD prices from the server.
        </p>
      </div>

      {/* Marketing Packs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <Package className="w-3.5 h-3.5" />
            <span>Marketing Packs ({packs.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setShowNewPack((v) => !v)}
            className="inline-flex items-center gap-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1 text-[11px] font-medium text-gray-200"
          >
            <Plus className="w-3 h-3" />
            {showNewPack ? "Cancel" : "Add pack"}
          </button>
        </div>

        {showNewPack && (
          <form
            onSubmit={createPack}
            className="bg-gray-950/60 border border-gray-800 rounded p-3 mb-3 space-y-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Pack name (e.g. Starter Brand Pack)"
                value={newPack.name}
                onChange={(e) =>
                  setNewPack((s) => ({ ...s, name: e.target.value }))
                }
                className="rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
              />
              <select
                value={newPack.tier}
                onChange={(e) =>
                  setNewPack((s) => ({ ...s, tier: e.target.value }))
                }
                className="rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
              >
                {PACK_TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    Tier: {tier}
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                min="1"
                max="5000"
                step="0.01"
                placeholder="Price in CA$ (e.g. 149.00)"
                value={newPack.priceDollars}
                onChange={(e) =>
                  setNewPack((s) => ({ ...s, priceDollars: e.target.value }))
                }
                className="rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <input
              type="text"
              placeholder="Short description (optional)"
              value={newPack.description}
              onChange={(e) =>
                setNewPack((s) => ({ ...s, description: e.target.value }))
              }
              className="w-full rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
            />
            <textarea
              rows={2}
              placeholder="Included deliverables — one per line (optional)"
              value={newPack.featuresText}
              onChange={(e) =>
                setNewPack((s) => ({ ...s, featuresText: e.target.value }))
              }
              className="w-full rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              type="submit"
              className="rounded bg-amber-600 hover:bg-amber-700 px-3 py-1 text-xs font-semibold text-white"
            >
              Create pack
            </button>
          </form>
        )}

        {packs.length === 0 ? (
          <p className="text-[11px] text-gray-500">
            No marketing packs configured yet. Add a pack above to publish it on
            /marketing/packs.
          </p>
        ) : (
          <div className="space-y-2">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="flex flex-wrap items-center gap-2.5 text-xs border-b border-gray-800/40 pb-2 last:border-0"
              >
                <span className="w-44 font-medium text-gray-200 truncate">
                  {pack.name}
                </span>
                <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] uppercase text-gray-400">
                  {pack.tier}
                </span>
                <span className="text-gray-500">CA$</span>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="0.01"
                  value={packPriceDrafts[pack.id] ?? ""}
                  onChange={(e) =>
                    setPackPriceDrafts((d) => ({
                      ...d,
                      [pack.id]: e.target.value,
                    }))
                  }
                  className="w-24 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    patchPack(pack.id, {
                      priceCents: Math.round(
                        Number(packPriceDrafts[pack.id]) * 100,
                      ),
                    })
                  }
                  className="rounded bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                >
                  Save price
                </button>
                <label className="flex items-center gap-1 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(pack.active)}
                    onChange={(e) =>
                      patchPack(pack.id, { active: e.target.checked })
                    }
                  />
                  On sale
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print Products */}
      <div className="border-t border-gray-800/60 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
            <Printer className="w-3.5 h-3.5" />
            <span>Print Products ({printProducts.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setShowNewPrint((v) => !v)}
            className="inline-flex items-center gap-1 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2.5 py-1 text-[11px] font-medium text-gray-200"
          >
            <Plus className="w-3 h-3" />
            {showNewPrint ? "Cancel" : "Add print product"}
          </button>
        </div>

        {showNewPrint && (
          <form
            onSubmit={createPrintProduct}
            className="bg-gray-950/60 border border-gray-800 rounded p-3 mb-3 space-y-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                placeholder="Product name (e.g. 500 Business Cards)"
                value={newPrint.name}
                onChange={(e) =>
                  setNewPrint((s) => ({ ...s, name: e.target.value }))
                }
                className="rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
              />
              <select
                value={newPrint.category}
                onChange={(e) =>
                  setNewPrint((s) => ({ ...s, category: e.target.value }))
                }
                className="rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
              >
                {PRINT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                min="1"
                max="5000"
                step="0.01"
                placeholder="Price in CA$ (e.g. 45.00)"
                value={newPrint.priceDollars}
                onChange={(e) =>
                  setNewPrint((s) => ({ ...s, priceDollars: e.target.value }))
                }
                className="rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="number"
                min="1"
                max="90"
                placeholder="Turnaround days"
                value={newPrint.turnaroundDays}
                onChange={(e) =>
                  setNewPrint((s) => ({
                    ...s,
                    turnaroundDays: e.target.value,
                  }))
                }
                className="rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <input
              type="text"
              placeholder="Short description / paper stock & dimensions (optional)"
              value={newPrint.description}
              onChange={(e) =>
                setNewPrint((s) => ({ ...s, description: e.target.value }))
              }
              className="w-full rounded bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              type="submit"
              className="rounded bg-green-600 hover:bg-green-700 px-3 py-1 text-xs font-semibold text-white"
            >
              Create print product
            </button>
          </form>
        )}

        {printProducts.length === 0 ? (
          <p className="text-[11px] text-gray-500">
            No print products configured yet. Add a product above to publish it
            on /marketing/print.
          </p>
        ) : (
          <div className="space-y-2">
            {printProducts.map((product) => (
              <div
                key={product.id}
                className="flex flex-wrap items-center gap-2.5 text-xs border-b border-gray-800/40 pb-2 last:border-0"
              >
                <span className="w-44 font-medium text-gray-200 truncate">
                  {product.name}
                </span>
                <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] uppercase text-gray-400">
                  {product.category.replace(/_/g, " ")}
                </span>
                <span className="text-gray-500">CA$</span>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  step="0.01"
                  value={printPriceDrafts[product.id] ?? ""}
                  onChange={(e) =>
                    setPrintPriceDrafts((d) => ({
                      ...d,
                      [product.id]: e.target.value,
                    }))
                  }
                  className="w-24 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    patchPrintProduct(product.id, {
                      priceCents: Math.round(
                        Number(printPriceDrafts[product.id]) * 100,
                      ),
                    })
                  }
                  className="rounded bg-green-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-green-700"
                >
                  Save price
                </button>
                <label className="flex items-center gap-1 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={Boolean(product.active)}
                    onChange={(e) =>
                      patchPrintProduct(product.id, {
                        active: e.target.checked,
                      })
                    }
                  />
                  On sale
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {message ? <p className="text-xs text-gray-300">{message}</p> : null}
    </div>
  );
}
