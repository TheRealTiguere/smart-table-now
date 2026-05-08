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
  source: "ubereats" | "deliveroo" | "web";
  restaurantName: string;
  dishes: ScrapedDish[];
};

const inputSchema = z.object({ url: z.string().url() });

const dishSchema = z.object({
  restaurantName: z.string().default("Import"),
  dishes: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional().default(""),
        price: z.number(),
        photo: z.string().url().optional(),
        category: z.string().default("Import"),
      }),
    )
    .default([]),
});

export const scrapeMenu = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ScrapeResult> => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY n'est pas configurée.");
    }

    const url = data.url;
    const host = new URL(url).hostname.toLowerCase();
    const source: ScrapeResult["source"] = host.includes("ubereats")
      ? "ubereats"
      : host.includes("deliveroo")
        ? "deliveroo"
        : "web";

    // Use Firecrawl REST v2 with JSON extraction (LLM-powered, no fragile DOM parsing)
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        waitFor: 2500,
        formats: [
          {
            type: "json",
            prompt:
              "Extract the restaurant menu. Return restaurantName (string) and dishes (array). Each dish has: name (string), description (string, may be empty), price (number in EUROS, e.g. 12.5 — never cents, never strings, never including the currency symbol), photo (full https URL of the dish image if present, omit otherwise), category (the menu section/category name the dish belongs to, e.g. 'Entrées', 'Pizzas', 'Desserts'). Keep dishes in the order they appear and group them by category.",
            schema: {
              type: "object",
              properties: {
                restaurantName: { type: "string" },
                dishes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      price: { type: "number" },
                      photo: { type: "string" },
                      category: { type: "string" },
                    },
                    required: ["name", "price", "category"],
                  },
                },
              },
              required: ["restaurantName", "dishes"],
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 402) {
        throw new Error(
          "Crédits Firecrawl insuffisants. Recharge ton compte Firecrawl puis réessaie.",
        );
      }
      throw new Error(`Firecrawl a échoué (${res.status}): ${text.slice(0, 200)}`);
    }

    const payload = (await res.json()) as {
      success?: boolean;
      data?: { json?: unknown; metadata?: { title?: string } };
      json?: unknown;
      error?: string;
    };

    if (payload.success === false) {
      throw new Error(payload.error || "Firecrawl: extraction impossible.");
    }

    const raw = payload.data?.json ?? payload.json;
    const parsed = dishSchema.safeParse(raw);
    if (!parsed.success || parsed.data.dishes.length === 0) {
      throw new Error(
        "Aucun plat n'a pu être extrait depuis cette page. Vérifie l'URL ou essaie une autre page.",
      );
    }

    const dishes: ScrapedDish[] = parsed.data.dishes.map((d) => ({
      name: d.name.trim(),
      description: (d.description ?? "").trim(),
      price: Math.round(d.price * 100) / 100,
      photo: d.photo,
      category: (d.category || "Import").trim(),
    }));

    return {
      source,
      restaurantName:
        parsed.data.restaurantName?.trim() ||
        payload.data?.metadata?.title ||
        "Import",
      dishes,
    };
  });
