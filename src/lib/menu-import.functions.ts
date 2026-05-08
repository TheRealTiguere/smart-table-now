import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ScrapedDish = {
  name: string;
  description: string;
  price: number; // euros
  photo?: string;
  category: string;
};

export type ScrapeResult = {
  source: "ubereats" | "deliveroo";
  restaurantName: string;
  dishes: ScrapedDish[];
};

const inputSchema = z.object({ url: z.string().url() });

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en récupérant la page`);
  return await res.text();
}

function extractNextData(html: string): unknown {
  const m = html.match(
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!m) throw new Error("Page non reconnue (pas de __NEXT_DATA__).");
  return JSON.parse(m[1]);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function deepFind(obj: any, predicate: (v: any) => boolean): any | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  if (predicate(obj)) return obj;
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    const r = deepFind(v, predicate);
    if (r !== undefined) return r;
  }
  return undefined;
}

function collect(obj: any, predicate: (v: any) => boolean, out: any[] = []) {
  if (!obj || typeof obj !== "object") return out;
  if (predicate(obj)) out.push(obj);
  for (const k of Object.keys(obj)) collect((obj as any)[k], predicate, out);
  return out;
}

function parseUberEats(data: any, url: string): ScrapeResult {
  // Uber Eats stores menu in props.pageProps.storeV1 / catalogSectionsMap / catalog
  const store =
    deepFind(data, (v) => v && typeof v.title === "string" && v.location) ||
    deepFind(data, (v) => v && typeof v.storeName === "string");
  const restaurantName: string =
    store?.title || store?.storeName || "Import Uber Eats";

  // Collect items: shape varies. Look for objects with "title" + "price" (number, in cents) + "uuid"
  const itemsMap = deepFind(
    data,
    (v) =>
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.values(v).some(
        (it: any) =>
          it && typeof it.title === "string" && typeof it.price === "number",
      ),
  );

  const itemsById = new Map<string, any>();
  if (itemsMap && typeof itemsMap === "object") {
    for (const [id, it] of Object.entries(itemsMap)) {
      const item = it as any;
      if (item && typeof item.title === "string" && typeof item.price === "number") {
        itemsById.set(id, item);
      }
    }
  }

  // Sections (categories) — array with title + itemUuids/items
  const sections = collect(
    data,
    (v) =>
      v &&
      typeof v === "object" &&
      typeof v.title === "string" &&
      (Array.isArray(v.itemUuids) || Array.isArray(v.items)),
  );

  const dishes: ScrapedDish[] = [];
  const seen = new Set<string>();

  for (const sec of sections) {
    const cat: string = sec.title;
    const ids: string[] = sec.itemUuids ?? sec.items ?? [];
    for (const id of ids) {
      const it = itemsById.get(id) ?? (typeof id === "object" ? id : undefined);
      if (!it || seen.has(it.uuid ?? id)) continue;
      seen.add(it.uuid ?? id);
      const photo: string | undefined =
        it.imageUrl ||
        it.image?.items?.[0]?.url ||
        it.itemImageUrl ||
        undefined;
      dishes.push({
        name: it.title,
        description: it.titleBadge?.text || it.itemDescription || it.description || "",
        price: Math.round((it.price ?? 0) / 100 * 100) / 100, // cents → euros
        photo,
        category: cat,
      });
    }
  }

  // Fallback: if no sections matched, take all items, category "Import"
  if (dishes.length === 0 && itemsById.size > 0) {
    for (const [, it] of itemsById) {
      dishes.push({
        name: it.title,
        description: it.itemDescription || it.description || "",
        price: Math.round((it.price ?? 0) / 100 * 100) / 100,
        photo: it.imageUrl,
        category: "Import",
      });
    }
  }

  if (dishes.length === 0) {
    throw new Error("Aucun plat trouvé sur cette page Uber Eats.");
  }

  return { source: "ubereats", restaurantName, dishes };
}

function parseDeliveroo(data: any, _url: string): ScrapeResult {
  // Deliveroo: props.initialState.menuPage or menu.menu with menu_categories[].items[]
  const restaurantName: string =
    deepFind(data, (v) => v && typeof v.name === "string" && v.location_name)
      ?.name || "Import Deliveroo";

  // Find a menu node with categories
  const menuRoot =
    deepFind(
      data,
      (v) =>
        v &&
        typeof v === "object" &&
        Array.isArray(v.menu_categories) &&
        v.menu_categories.length > 0,
    ) ||
    deepFind(
      data,
      (v) =>
        v && typeof v === "object" && Array.isArray(v.categories) && v.categories.length > 0 &&
        v.categories[0]?.items,
    );

  const cats: any[] = menuRoot?.menu_categories ?? menuRoot?.categories ?? [];
  const dishes: ScrapedDish[] = [];

  for (const cat of cats) {
    const catName: string = cat.name ?? cat.title ?? "Catégorie";
    const items: any[] = cat.items ?? cat.menu_items ?? [];
    for (const it of items) {
      const priceCents =
        it.price?.fractional ??
        it.price?.amount ??
        it.price_fractional ??
        (typeof it.price === "number" ? it.price : 0);
      dishes.push({
        name: it.name ?? it.title,
        description: it.description ?? "",
        price: Math.round(((priceCents ?? 0) / 100) * 100) / 100,
        photo: it.image?.url || it.image_url || undefined,
        category: catName,
      });
    }
  }

  if (dishes.length === 0) {
    throw new Error("Aucun plat trouvé sur cette page Deliveroo.");
  }

  return { source: "deliveroo", restaurantName, dishes };
}

export const scrapeMenu = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ScrapeResult> => {
    const url = data.url;
    const host = new URL(url).hostname.toLowerCase();

    let html: string;
    try {
      html = await fetchHtml(url);
    } catch (e) {
      throw new Error(
        `Impossible de récupérer la page (${(e as Error).message}). La plateforme bloque peut-être les requêtes serveur.`,
      );
    }

    const next = extractNextData(html);

    if (host.includes("ubereats")) return parseUberEats(next, url);
    if (host.includes("deliveroo")) return parseDeliveroo(next, url);
    throw new Error(
      "URL non reconnue. Utilise un lien ubereats.com ou deliveroo.fr.",
    );
  });
