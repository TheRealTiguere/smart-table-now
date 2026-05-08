import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scrapeMenu, type ScrapeResult, type ScrapedDish } from "@/lib/menu-import.functions";
import { useConfig } from "@/lib/config-store";
import { X, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DupStrategy = "ignore" | "replace";

export function ImportMenuModal({ onClose, initialUrl, autoStart }: { onClose: () => void; initialUrl?: string; autoStart?: boolean }) {
  const scrape = useServerFn(scrapeMenu);
  const { categories, dishes, addCategory, addDish, updateDish, setLastImportUrl } = useConfig();

  const [url, setUrl] = useState(initialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dupStrategy, setDupStrategy] = useState<DupStrategy>("ignore");

  // Map name|price → existing dish id (case-insensitive name, price rounded to 2dp)
  const dupKey = (name: string, price: number) =>
    `${name.trim().toLowerCase()}|${(Math.round(price * 100) / 100).toFixed(2)}`;
  const existingByKey = new Map(dishes.map((d) => [dupKey(d.name, d.price), d.id]));
  const findDup = (d: ScrapedDish) => existingByKey.get(dupKey(d.name, d.price));

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

    const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const neededCats = [...new Set(picked.map((d) => d.category))];
    for (const name of neededCats) {
      if (!catMap.has(name.toLowerCase())) addCategory(name);
    }
    const fresh = useConfig.getState().categories;
    const freshMap = new Map(fresh.map((c) => [c.name.toLowerCase(), c.id]));

    let created = 0;
    let replaced = 0;
    let ignored = 0;
    for (const d of picked) {
      const catId = freshMap.get(d.category.toLowerCase());
      if (!catId) continue;
      const dupId = findDup(d);
      if (dupId) {
        if (dupStrategy === "ignore") {
          ignored++;
          continue;
        }
        // replace: update existing dish in place
        updateDish(dupId, {
          name: d.name,
          desc: d.description ?? "",
          price: Number.isFinite(d.price) ? d.price : 0,
          categoryId: catId,
          photo: d.photo,
        });
        replaced++;
        continue;
      }
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
      created++;
    }
    const parts = [
      created > 0 && `${created} créé${created > 1 ? "s" : ""}`,
      replaced > 0 && `${replaced} remplacé${replaced > 1 ? "s" : ""}`,
      ignored > 0 && `${ignored} ignoré${ignored > 1 ? "s" : ""}`,
    ].filter(Boolean);
    toast.success(`Import terminé · ${parts.join(" · ") || "rien à faire"}.`);
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

          {result && (() => {
            const existingCats = new Set(categories.map((c) => c.name.toLowerCase()));
            const selectedDishes = [...selected].map((i) => result.dishes[i]);
            const selectedCatNames = new Set(selectedDishes.map((d) => d.category.toLowerCase()));
            const newCatsCount = [...selectedCatNames].filter((n) => !existingCats.has(n)).length;
            const reusedCatsCount = selectedCatNames.size - newCatsCount;
            const dupCount = selectedDishes.filter((d) => findDup(d)).length;
            const newDishesCount = selectedDishes.length - dupCount;
            return (
            <>
              <div className="mt-5 rounded-xl bg-surface px-4 py-3">
                <p className="text-[13px] font-medium">{result.restaurantName}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {result.source} · {result.dishes.length} plats trouvés
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[18px] font-semibold tabular-nums">{newDishesCount}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nouveaux plats</p>
                  </div>
                  <div className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[18px] font-semibold tabular-nums text-amber-500">{dupCount}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Doublons</p>
                  </div>
                  <div className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[18px] font-semibold tabular-nums text-primary">+{newCatsCount}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Nouv. catégories</p>
                  </div>
                  <div className="rounded-lg bg-card px-3 py-2">
                    <p className="text-[18px] font-semibold tabular-nums">{reusedCatsCount}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cat. existantes</p>
                  </div>
                </div>

                {dupCount > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-card px-3 py-2.5">
                    <span className="text-[12px] font-medium">Doublons (même nom + prix) :</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setDupStrategy("ignore")}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium ${dupStrategy === "ignore" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                      >
                        Ignorer
                      </button>
                      <button
                        type="button"
                        onClick={() => setDupStrategy("replace")}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium ${dupStrategy === "replace" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                      >
                        Remplacer
                      </button>
                    </div>
                  </div>
                )}
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
                              <div className="flex items-center gap-2">
                                <p className="truncate text-[14px] font-medium">{dish.name}</p>
                                {findDup(dish) && (
                                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                    Doublon · {dupStrategy === "ignore" ? "ignoré" : "remplacé"}
                                  </span>
                                )}
                              </div>
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
            );
          })()}
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
