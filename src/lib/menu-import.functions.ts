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

    // Step 1: scrape full markdown via Firecrawl (no LLM truncation)
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        onlyMainContent: false,
        waitFor: 8000,
        formats: ["markdown"],
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
      data?: { markdown?: string; metadata?: { title?: string } };
      markdown?: string;
      metadata?: { title?: string };
      error?: string;
    };

    if (payload.success === false) {
      throw new Error(payload.error || "Firecrawl: extraction impossible.");
    }

    const markdown = payload.data?.markdown ?? payload.markdown ?? "";
    const pageTitle = payload.data?.metadata?.title ?? payload.metadata?.title;
    if (!markdown || markdown.length < 100) {
      throw new Error("Page vide ou inaccessible. Vérifie l'URL.");
    }

    // Step 2: extract dishes from markdown via Lovable AI (Gemini 2.5 Pro — large context)
    const aiKey = process.env.LOVABLE_API_KEY;
    if (!aiKey) throw new Error("LOVABLE_API_KEY manquante.");

    // Truncate very large pages to fit context safely
    const content = markdown.slice(0, 200_000);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You extract restaurant menus from markdown. Return STRICT JSON matching the provided tool schema. Include EVERY dish present, do not skip any. Prices are in EUROS as numbers (e.g. 12.5), never strings, never cents. Group by category (the menu section header). If a dish has no description, use empty string.",
          },
          {
            role: "user",
            content: `Extract ALL dishes from this restaurant menu page.\n\nPage title: ${pageTitle ?? ""}\n\nMARKDOWN:\n${content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_menu",
              description: "Return the complete extracted menu",
              parameters: {
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
          },
        ],
        tool_choice: { type: "function", function: { name: "return_menu" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      if (aiRes.status === 402)
        throw new Error("Crédits Lovable AI insuffisants.");
      if (aiRes.status === 429)
        throw new Error("Trop de requêtes Lovable AI, réessaie dans un instant.");
      throw new Error(`Lovable AI a échoué (${aiRes.status}): ${t.slice(0, 200)}`);
    }

    const aiJson = (await aiRes.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{ function?: { arguments?: string } }>;
        };
      }>;
    };
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let raw: unknown = null;
    try {
      raw = args ? JSON.parse(args) : null;
    } catch {
      raw = null;
    }

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
