import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scrapeMenu, type ScrapeResult, type ScrapedDish } from "@/lib/menu-import.functions";
import { useConfig } from "@/lib/config-store";
import { X, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ImportMenuModal({ onClose }: { onClose: () => void }) {
  const scrape = useServerFn(scrapeMenu);
  const { categories, addCategory, addDish } = useConfig();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await scrape({ data: { url: url.trim() } });
      setResult(r);
      setSelected(new Set(r.dishes.map((_, i) => i)));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    const s = new Set(selected);
    if (s.has(i)) s.delete(i);
    else s.add(i);
    setSelected(s);
  }

  function toggleCat(catName: string, items: { idx: number }[]) {
    const allSelected = items.every((it) => selected.has(it.idx));
    const s = new Set(selected);
    if (allSelected) items.forEach((it) => s.delete(it.idx));
    else items.forEach((it) => s.add(it.idx));
    setSelected(s);
  }

  function handleImport() {
    if (!result) return;
    const picked: ScrapedDish[] = [...selected]
      .sort((a, b) => a - b)
      .map((i) => result.dishes[i]);

    // Ensure categories exist (case-insensitive match)
    const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const neededCats = [...new Set(picked.map((d) => d.category))];
    for (const name of neededCats) {
      if (!catMap.has(name.toLowerCase())) {
        addCategory(name);
      }
    }
    // After adds, re-read config for new IDs
    const fresh = useConfig.getState().categories;
    const freshMap = new Map(fresh.map((c) => [c.name.toLowerCase(), c.id]));

    let ok = 0;
    for (const d of picked) {
      const catId = freshMap.get(d.category.toLowerCase());
      if (!catId) continue;
      addDish({
        name: d.name,
        desc: d.description ?? "",
        price: Number.isFinite(d.price) ? d.price : 0,
        categoryId: catId,
        photo: d.photo,
        tags: [],
        allergens: [],
        customAllergens: [],
        available: true,
      });
      ok++;
    }
    toast.success(`${ok} plat${ok > 1 ? "s" : ""} importé${ok > 1 ? "s" : ""}.`);
    onClose();
  }

  // Group by category for display
  const grouped = result
    ? Object.entries(
        result.dishes.reduce<Record<string, { dish: ScrapedDish; idx: number }[]>>(
          (acc, dish, idx) => {
            (acc[dish.category] ??= []).push({ dish, idx });
            return acc;
          },
          {},
        ),
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-xl font-semibold">Importer depuis Uber Eats / Deliveroo</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form onSubmit={handleScrape} className="flex gap-2">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.ubereats.com/fr/store/... ou https://deliveroo.fr/fr/menu/..."
              className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Récupérer
            </button>
          </form>

          {!result && !loading && (
            <p className="mt-4 text-[12px] text-muted-foreground">
              Colle l'URL publique de ta page restaurant. On lit la carte (catégories, plats, prix, photos) puis tu choisis ce que tu importes.
            </p>
          )}

          {result && (
            <>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-surface px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">{result.restaurantName}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {result.source} · {result.dishes.length} plats trouvés · {selected.size} sélectionnés
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-5">
                {grouped.map(([catName, items]) => {
                  const allSel = items.every((it) => selected.has(it.idx));
                  return (
                    <div key={catName}>
                      <button
                        type="button"
                        onClick={() => toggleCat(catName, items)}
                        className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      >
                        {allSel ? "☑" : "☐"} {catName} ({items.length})
                      </button>
                      <ul className="divide-y divide-border rounded-xl bg-surface">
                        {items.map(({ dish, idx }) => (
                          <li key={idx} className="flex items-start gap-3 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(idx)}
                              onChange={() => toggle(idx)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-[14px] font-medium">{dish.name}</p>
                              {dish.description && (
                                <p className="line-clamp-2 text-[12px] text-muted-foreground">{dish.description}</p>
                              )}
                            </div>
                            <span className="text-[14px] font-medium tabular-nums">
                              {dish.price.toFixed(2)}€
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {result && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-full px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-secondary"
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              Importer {selected.size} plat{selected.size > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
